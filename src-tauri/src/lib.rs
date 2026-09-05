// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod model;
mod normalize;
mod resolver;
mod scanner;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, Position, Rect, Size, WindowEvent,
};
use tauri_nspanel::{ManagerExt, WebviewWindowExt};

const NONACTIVATING_PANEL_MASK: i32 = 1 << 7;
const MAIN_MENU_WINDOW_LEVEL: i32 = 24;
const SCREEN_EDGE_MARGIN: f64 = 8.0;

#[tauri::command]
fn hide_panel(app: tauri::AppHandle) {
    if let Ok(panel) = app.get_webview_panel("main") {
        panel.order_out(None);
    }
}

fn position_panel_under_tray(app: &tauri::AppHandle, rect: Rect) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let scale = window.scale_factor().unwrap_or(1.0);

    let (tray_x, tray_y) = match rect.position {
        Position::Physical(p) => (p.x as f64, p.y as f64),
        Position::Logical(p) => (p.x * scale, p.y * scale),
    };
    let (tray_w, tray_h) = match rect.size {
        Size::Physical(s) => (s.width as f64, s.height as f64),
        Size::Logical(s) => (s.width * scale, s.height * scale),
    };

    let Ok(panel_size) = window.outer_size() else {
        return;
    };
    let panel_w = panel_size.width as f64;

    let mut x = tray_x + tray_w / 2.0 - panel_w / 2.0;
    let y = tray_y + tray_h;

    if let Ok(Some(monitor)) = window.current_monitor() {
        let margin = SCREEN_EDGE_MARGIN * scale;
        let left = monitor.position().x as f64 + margin;
        let right = monitor.position().x as f64 + monitor.size().width as f64 - panel_w - margin;
        if right > left {
            x = x.clamp(left, right);
        }
    }

    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn toggle_panel(app: &tauri::AppHandle, tray_rect: Option<Rect>) {
    let Ok(panel) = app.get_webview_panel("main") else {
        return;
    };
    if panel.is_visible() {
        panel.order_out(None);
    } else {
        if let Some(rect) = tray_rect {
            position_panel_under_tray(app, rect);
        }
        panel.show();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_nspanel::init())
        .on_window_event(|window, event| {
            if let WindowEvent::Focused(false) = event {
                if let Ok(panel) = window.app_handle().get_webview_panel("main") {
                    panel.order_out(None);
                }
            }
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app
                .get_webview_window("main")
                .expect("main window should exist");
            let panel = window.to_panel()?;
            panel.set_level(MAIN_MENU_WINDOW_LEVEL + 1);
            panel.set_style_mask(NONACTIVATING_PANEL_MASK);

            let icon = Image::from_bytes(include_bytes!("../icons/tray-placeholder.png"))?;

            let show_item = MenuItem::with_id(app, "show", "패널 열기", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(icon)
                .icon_as_template(true)
                .tooltip("Local Port Manager")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => toggle_panel(app, None),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        toggle_panel(tray.app_handle(), Some(rect));
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, hide_panel])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
