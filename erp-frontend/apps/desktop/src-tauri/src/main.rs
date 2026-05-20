// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn print_label(data: String) -> Result<String, String> {
    // TODO: Implement local printer driver integration
    println!("Printing label: {}", data);
    Ok(format!("Printed: {}", data))
}

#[tauri::command]
fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": "1.0.0"
    });
    Ok(info)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![print_label, get_system_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
