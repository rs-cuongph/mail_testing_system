use std::{
    collections::VecDeque,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use anyhow::{anyhow, Context, Result};
use keyring::Entry;
use rusqlite::Connection;
use tauri::{App, AppHandle, Emitter, Manager, Window, WindowEvent};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent, TerminatedPayload},
    ShellExt,
};

use crate::tray;

const DEFAULT_BACKEND_PORT: u16 = 7654;
const KEYRING_SERVICE: &str = "com.mailsystem.tauri";

#[derive(Clone, Default)]
pub struct SidecarRuntime {
    inner: Arc<Mutex<SidecarState>>,
}

#[derive(Default)]
struct SidecarState {
    port: Option<u16>,
    child: Option<CommandChild>,
    shutting_down: bool,
    restart_timestamps: VecDeque<Instant>,
}

struct SidecarEnvironment {
    vars: Vec<(String, String)>,
    database_path: PathBuf,
}

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let runtime = app.state::<SidecarRuntime>().clone_handle();
    let app_handle = app.handle().clone();

    tauri::async_runtime::block_on(async {
        runtime.startup(app_handle.clone()).await?;
        tray::create_tray(&app_handle)?;
        if let Some(window) = app_handle.get_webview_window("main") {
            window.show()?;
            window.set_focus()?;
        }
        Ok::<(), anyhow::Error>(())
    })?;

    Ok(())
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };

    let close_behavior = crate::commands::read_close_behavior(&window.app_handle())
        .unwrap_or_else(|_| "tray".to_string());

    if close_behavior == "quit" {
        api.prevent_close();
        let app_handle = window.app_handle().clone();
        let runtime = app_handle.state::<SidecarRuntime>().clone_handle();
        tauri::async_runtime::spawn(async move {
            let _ = runtime.shutdown().await;
            app_handle.exit(0);
        });
        return;
    }

    api.prevent_close();
    let _ = window.hide();
}

impl SidecarRuntime {
    pub fn clone_handle(&self) -> Self {
        self.clone()
    }

    pub fn current_port(&self) -> Option<u16> {
        self.inner.lock().ok().and_then(|state| state.port)
    }

    pub async fn startup(&self, app: AppHandle) -> Result<()> {
        let port = find_available_port(DEFAULT_BACKEND_PORT)?;
        let environment = build_environment(&app, port)?;

        self.run_migrations(&app, &environment).await?;
        self.spawn_backend(app, &environment, port).await?;
        wait_for_backend(port).await?;

        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        let mut child = {
            let mut state = self
                .inner
                .lock()
                .map_err(|_| anyhow!("Sidecar state lock poisoned"))?;
            state.shutting_down = true;
            state.port = None;
            state.child.take()
        };

        if let Some(child_ref) = child.as_mut() {
            let _ = child_ref.kill();
        }

        Ok(())
    }

    async fn restart(&self, app: AppHandle) -> Result<()> {
        self.shutdown().await?;
        self.startup(app).await
    }

    async fn run_migrations(&self, app: &AppHandle, environment: &SidecarEnvironment) -> Result<()> {
        let mut command = app
            .shell()
            .sidecar("backend")
            .map_err(|err| anyhow!(err.to_string()))?;

        command = command.arg("--migrate");
        for (key, value) in &environment.vars {
            command = command.env(key, value);
        }

        let status = command.status().await.map_err(|err| anyhow!(err.to_string()))?;
        if !status.success() {
            return Err(anyhow!(
                "Sidecar migration command failed with {:?}",
                status.code()
            ));
        }

        Ok(())
    }

    async fn spawn_backend(
        &self,
        app: AppHandle,
        environment: &SidecarEnvironment,
        port: u16,
    ) -> Result<()> {
        let mut command = app
            .shell()
            .sidecar("backend")
            .map_err(|err| anyhow!(err.to_string()))?;

        for (key, value) in &environment.vars {
            command = command.env(key, value);
        }

        let (mut rx, child) = command.spawn().map_err(|err| anyhow!(err.to_string()))?;

        {
            let mut state = self
                .inner
                .lock()
                .map_err(|_| anyhow!("Sidecar state lock poisoned"))?;
            state.port = Some(port);
            state.shutting_down = false;
            state.child = Some(child);
        }

        let runtime = self.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        println!("[backend] {}", String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Stderr(line) => {
                        eprintln!("[backend] {}", String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Error(error) => {
                        eprintln!("[backend] {error}");
                    }
                    CommandEvent::Terminated(payload) => {
                        if let Err(error) = runtime.handle_termination(app.clone(), payload).await {
                            eprintln!("[backend] restart handler failed: {error}");
                        }
                    }
                }
            }
        });

        Ok(())
    }

    async fn handle_termination(&self, app: AppHandle, payload: TerminatedPayload) -> Result<()> {
        let should_restart = {
            let mut state = self
                .inner
                .lock()
                .map_err(|_| anyhow!("Sidecar state lock poisoned"))?;
            state.child = None;

            if state.shutting_down || payload.code == Some(0) {
                false
            } else {
                let now = Instant::now();
                while let Some(timestamp) = state.restart_timestamps.front() {
                    if now.duration_since(*timestamp) > Duration::from_secs(60) {
                        state.restart_timestamps.pop_front();
                    } else {
                        break;
                    }
                }

                if state.restart_timestamps.len() >= 3 {
                    false
                } else {
                    state.restart_timestamps.push_back(now);
                    true
                }
            }
        };

        if should_restart {
            self.restart(app).await?;
            return Ok(());
        }

        app.emit(
            "sidecar:crashed",
            format!(
                "Backend exited with code {:?} and signal {:?}",
                payload.code, payload.signal
            ),
        )?;

        Ok(())
    }
}

fn build_environment(app: &AppHandle, port: u16) -> Result<SidecarEnvironment> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to resolve app data directory")?;
    let data_dir = app_data_dir.join("data");
    let attachments_dir = app_data_dir.join("attachments");
    std::fs::create_dir_all(&data_dir)?;
    std::fs::create_dir_all(&attachments_dir)?;

    let database_path = data_dir.join("mail-testing-system.db");
    let frontend_urls = [
        "tauri://localhost",
        "http://tauri.localhost",
        "http://localhost",
        "http://localhost:5173",
    ]
    .join(",");

    let mut vars = vec![
        ("PORT".to_string(), port.to_string()),
        (
            "DATABASE_URL".to_string(),
            format!("file:{}", database_path.display()),
        ),
        (
            "ATTACHMENT_STORAGE_DIR".to_string(),
            attachments_dir.display().to_string(),
        ),
        ("FRONTEND_URL".to_string(), frontend_urls),
    ];

    if let Some((credential_key, password)) = read_active_credential_seed(&database_path)? {
        vars.push(("ACTIVE_IMAP_CREDENTIAL_KEY".to_string(), credential_key));
        vars.push(("ACTIVE_IMAP_PASSWORD".to_string(), password));
    }

    Ok(SidecarEnvironment {
        vars,
        database_path,
    })
}

fn read_active_credential_seed(database_path: &Path) -> Result<Option<(String, String)>> {
    if !database_path.exists() {
        return Ok(None);
    }

    let connection = Connection::open(database_path)?;
    let mut statement = connection.prepare(
        "SELECT credentialKey FROM ImapProfile WHERE isActive = 1 AND credentialKey IS NOT NULL LIMIT 1",
    )?;
    let credential_key = statement.query_row([], |row| row.get::<_, String>(0)).ok();

    let Some(credential_key) = credential_key else {
        return Ok(None);
    };

    let entry = Entry::new(KEYRING_SERVICE, &credential_key).map_err(|err| anyhow!(err.to_string()))?;
    let password = entry.get_password().map_err(|err| anyhow!(err.to_string()))?;

    Ok(Some((credential_key, password)))
}

fn find_available_port(start_port: u16) -> Result<u16> {
    for port in start_port..start_port + 200 {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }

    Err(anyhow!("Unable to find an available backend port"))
}

async fn wait_for_backend(port: u16) -> Result<()> {
    let url = format!("http://127.0.0.1:{port}/api/config");

    for _ in 0..40 {
        match reqwest::get(&url).await {
            Ok(response) if response.status().is_success() => return Ok(()),
            _ => {
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    }

    Err(anyhow!("Backend did not become healthy at {url}"))
}
