use anyhow::anyhow;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

use crate::sidecar::SidecarRuntime;

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .menu_on_left_click(false)
        .tooltip("Mail Catcher")
        .icon(
            app.default_window_icon()
                .cloned()
                .ok_or_else(|| tauri::Error::Anyhow(anyhow!("Missing default app icon")))?,
        )
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                let app_handle = app.clone();
                let runtime = app.state::<SidecarRuntime>().clone_handle();
                tauri::async_runtime::spawn(async move {
                    let _ = runtime.shutdown().await;
                    app_handle.exit(0);
                });
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
