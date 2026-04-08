mod commands;
mod sidecar;
mod tray;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(sidecar::SidecarRuntime::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_backend_url,
            commands::get_credential,
            commands::set_credential,
            commands::delete_credential,
            commands::get_close_behavior,
            commands::set_close_behavior,
            commands::get_notifications_enabled,
            commands::set_notifications_enabled
        ])
        .setup(|app| sidecar::setup(app))
        .on_window_event(sidecar::handle_window_event)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
