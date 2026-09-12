use crate::model::PortEntry;
use crate::normalize::normalize;
use crate::resolver::ProcessResolver;
use crate::scanner::scan_listening_sockets;

#[tauri::command]
pub fn list_ports() -> Result<Vec<PortEntry>, String> {
    let sockets = scan_listening_sockets()?;
    let mut resolver = ProcessResolver::new();
    Ok(normalize(sockets, &mut resolver))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Exposure, IpFamily};

    fn sample() -> PortEntry {
        PortEntry {
            port: 8080,
            pid: 1234,
            process_name: String::from("java"),
            exec_path: String::from("/opt/homebrew/bin/java"),
            bind_addrs: vec![String::from("127.0.0.1")],
            exposure: Exposure::Localhost,
            is_system: false,
            families: vec![IpFamily::V6],
        }
    }

    #[test]
    fn serializes_with_camel_case_keys() {
        let json = serde_json::to_value(sample()).expect("직렬화 성공");
        let object = json.as_object().expect("객체여야 한다");
        let mut keys: Vec<&str> = object.keys().map(String::as_str).collect();
        keys.sort();
        assert_eq!(
            keys,
            vec![
                "bindAddrs",
                "execPath",
                "exposure",
                "families",
                "isSystem",
                "pid",
                "port",
                "processName",
            ]
        );
    }

    #[test]
    fn serializes_enums_as_camel_case_strings() {
        let json = serde_json::to_value(sample()).expect("직렬화 성공");
        assert_eq!(json["exposure"], "localhost");
        assert_eq!(json["families"][0], "v6");

        let exposed = serde_json::to_value(Exposure::AllInterfaces).expect("직렬화 성공");
        assert_eq!(exposed, "allInterfaces");
        let v4 = serde_json::to_value(IpFamily::V4).expect("직렬화 성공");
        assert_eq!(v4, "v4");
    }

    #[test]
    fn print_contract_keys() {
        let json = serde_json::to_value(sample()).expect("직렬화 성공");
        for key in json.as_object().expect("객체").keys() {
            println!("RUSTKEY {key}");
        }
    }

    #[test]
    fn list_ports_returns_entries() {
        let entries = list_ports().expect("커맨드가 성공해야 한다");
        assert!(!entries.is_empty());
    }
}
