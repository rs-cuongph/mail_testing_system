use keyring::Entry;
use serde_json::json;
use tauri::{AppHandle, State};
use tauri_plugin_store::StoreExt;
use uuid::Uuid;

use crate::sidecar::SidecarRuntime;

const KEYRING_SERVICE: &str = "com.mailsystem.tauri";
const PREFERENCES_STORE: &str = "preferences.json";
const CLOSE_BEHAVIOR_KEY: &str = "closeBehavior";
const NOTIFICATIONS_ENABLED_KEY: &str = "notificationsEnabled";

#[tauri::command]
pub fn get_backend_url(runtime: State<'_, SidecarRuntime>) -> Result<String, String> {
    runtime
        .current_port()
        .map(|port| format!("http://127.0.0.1:{port}/api"))
        .ok_or_else(|| "Backend sidecar is not ready".to_string())
}

#[tauri::command]
pub fn get_credential(credential_key: String) -> Result<Option<String>, String> {
    if credential_key.trim().is_empty() {
        return Ok(None);
    }

    let entry =
        Entry::new(KEYRING_SERVICE, credential_key.trim()).map_err(|err| err.to_string())?;
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn set_credential(
    credential_key: Option<String>,
    password: String,
) -> Result<String, String> {
    if password.trim().is_empty() {
        return Err("Password is required".to_string());
    }

    let key = credential_key
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let entry = Entry::new(KEYRING_SERVICE, &key).map_err(|err| err.to_string())?;
    entry
        .set_password(password.trim())
        .map_err(|err| err.to_string())?;

    Ok(key)
}

#[tauri::command]
pub fn delete_credential(credential_key: String) -> Result<(), String> {
    if credential_key.trim().is_empty() {
        return Ok(());
    }

    let entry =
        Entry::new(KEYRING_SERVICE, credential_key.trim()).map_err(|err| err.to_string())?;
    let _ = entry.delete_credential();
    Ok(())
}

#[tauri::command]
pub fn get_close_behavior(app: AppHandle) -> Result<String, String> {
    read_close_behavior(&app)
}

#[tauri::command]
pub fn set_close_behavior(app: AppHandle, value: String) -> Result<String, String> {
    let normalized = match value.as_str() {
        "quit" => "quit",
        _ => "tray",
    };

    write_string_preference(&app, CLOSE_BEHAVIOR_KEY, normalized)?;
    Ok(normalized.to_string())
}

#[tauri::command]
pub fn get_notifications_enabled(app: AppHandle) -> Result<bool, String> {
    read_notifications_enabled(&app)
}

#[tauri::command]
pub fn set_notifications_enabled(app: AppHandle, enabled: bool) -> Result<bool, String> {
    write_bool_preference(&app, NOTIFICATIONS_ENABLED_KEY, enabled)?;
    Ok(enabled)
}

pub(crate) fn read_close_behavior(app: &AppHandle) -> Result<String, String> {
    read_string_preference(app, CLOSE_BEHAVIOR_KEY, "tray")
}

pub(crate) fn read_notifications_enabled(app: &AppHandle) -> Result<bool, String> {
    read_bool_preference(app, NOTIFICATIONS_ENABLED_KEY, true)
}

fn read_string_preference(app: &AppHandle, key: &str, default: &str) -> Result<String, String> {
    let store = app.store(PREFERENCES_STORE).map_err(|err| err.to_string())?;
    Ok(store
        .get(key)
        .and_then(|value| value.as_str().map(ToOwned::to_owned))
        .unwrap_or_else(|| default.to_string()))
}

fn read_bool_preference(app: &AppHandle, key: &str, default: bool) -> Result<bool, String> {
    let store = app.store(PREFERENCES_STORE).map_err(|err| err.to_string())?;
    Ok(store
        .get(key)
        .and_then(|value| value.as_bool())
        .unwrap_or(default))
}

fn write_string_preference(app: &AppHandle, key: &str, value: &str) -> Result<(), String> {
    let store = app.store(PREFERENCES_STORE).map_err(|err| err.to_string())?;
    store.set(key.to_string(), json!(value));
    store.save().map_err(|err| err.to_string())
}

fn write_bool_preference(app: &AppHandle, key: &str, value: bool) -> Result<(), String> {
    let store = app.store(PREFERENCES_STORE).map_err(|err| err.to_string())?;
    store.set(key.to_string(), json!(value));
    store.save().map_err(|err| err.to_string())
}
