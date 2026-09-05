use crate::model::{Exposure, IpFamily, PortEntry};
use crate::resolver::ProcessResolver;
use crate::scanner::ListeningSocket;
use std::collections::BTreeMap;
use std::net::IpAddr;

const SYSTEM_PATH_PREFIXES: &[&str] = &[
    "/System/",
    "/usr/libexec/",
    "/usr/sbin/",
    "/sbin/",
    "/Library/Apple/",
];

pub fn normalize_addr(addr: IpAddr) -> IpAddr {
    let IpAddr::V6(v6) = addr else {
        return addr;
    };
    if let Some(v4) = v6.to_ipv4_mapped() {
        return IpAddr::V4(v4);
    }
    if v6.is_unspecified() || v6.is_loopback() {
        return addr;
    }
    match v6.to_ipv4() {
        Some(v4) => IpAddr::V4(v4),
        None => addr,
    }
}

pub fn is_all_interfaces(addr: IpAddr) -> bool {
    match addr {
        IpAddr::V4(v4) => v4.is_unspecified(),
        IpAddr::V6(v6) => v6.is_unspecified(),
    }
}

pub fn is_system_path(path: &str) -> bool {
    !path.is_empty()
        && SYSTEM_PATH_PREFIXES
            .iter()
            .any(|prefix| path.starts_with(prefix))
}

pub fn normalize(sockets: Vec<ListeningSocket>, resolver: &mut ProcessResolver) -> Vec<PortEntry> {
    let mut merged: BTreeMap<(u32, u16), PortEntry> = BTreeMap::new();

    for socket in sockets {
        let family = match socket.local_addr {
            IpAddr::V4(_) => IpFamily::V4,
            IpAddr::V6(_) => IpFamily::V6,
        };
        let normalized = normalize_addr(socket.local_addr);
        let addr_text = normalized.to_string();
        let all_interfaces = is_all_interfaces(normalized);

        let entry = merged
            .entry((socket.pid, socket.port))
            .or_insert_with(|| {
                let info = resolver.resolve(socket.pid);
                PortEntry {
                    port: socket.port,
                    pid: socket.pid,
                    is_system: is_system_path(&info.exec_path),
                    process_name: info.name,
                    exec_path: info.exec_path,
                    bind_addrs: Vec::new(),
                    exposure: Exposure::Localhost,
                    families: Vec::new(),
                }
            });

        if !entry.bind_addrs.contains(&addr_text) {
            entry.bind_addrs.push(addr_text);
        }
        if !entry.families.contains(&family) {
            entry.families.push(family);
        }
        if all_interfaces {
            entry.exposure = Exposure::AllInterfaces;
        }
    }

    let mut entries: Vec<PortEntry> = merged.into_values().collect();
    for entry in &mut entries {
        entry.families.sort();
        entry.bind_addrs.sort();
    }
    entries.sort_by_key(|entry| (entry.port, entry.pid));
    entries
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scanner::scan_listening_sockets;

    fn socket(port: u16, addr: &str, pid: u32) -> ListeningSocket {
        ListeningSocket {
            port,
            local_addr: addr.parse().expect("주소 파싱"),
            pid,
        }
    }

    #[test]
    fn maps_ipv4_compatible_ipv6_to_v4() {
        assert_eq!(
            normalize_addr("::7f00:1".parse().unwrap()),
            "127.0.0.1".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn maps_ipv4_mapped_ipv6_to_v4() {
        assert_eq!(
            normalize_addr("::ffff:127.0.0.1".parse().unwrap()),
            "127.0.0.1".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn keeps_unspecified_and_loopback_v6() {
        assert_eq!(
            normalize_addr("::".parse().unwrap()),
            "::".parse::<IpAddr>().unwrap()
        );
        assert_eq!(
            normalize_addr("::1".parse().unwrap()),
            "::1".parse::<IpAddr>().unwrap()
        );
    }

    #[test]
    fn merges_v4_and_v6_of_same_process_and_port() {
        let mut resolver = ProcessResolver::new();
        let entries = normalize(
            vec![socket(7000, "0.0.0.0", 714), socket(7000, "::", 714)],
            &mut resolver,
        );
        assert_eq!(entries.len(), 1, "같은 (pid, port)는 한 행으로 병합된다");
        assert_eq!(entries[0].families, vec![IpFamily::V4, IpFamily::V6]);
        assert_eq!(entries[0].exposure, Exposure::AllInterfaces);
    }

    #[test]
    fn keeps_same_port_of_different_processes_separate() {
        let mut resolver = ProcessResolver::new();
        let entries = normalize(
            vec![socket(8080, "127.0.0.1", 100), socket(8080, "127.0.0.1", 200)],
            &mut resolver,
        );
        assert_eq!(entries.len(), 2, "PID가 다르면 병합하지 않는다");
    }

    #[test]
    fn classifies_exposure() {
        let mut resolver = ProcessResolver::new();
        let entries = normalize(
            vec![socket(3000, "127.0.0.1", 1), socket(4000, "0.0.0.0", 2)],
            &mut resolver,
        );
        assert_eq!(entries[0].exposure, Exposure::Localhost);
        assert_eq!(entries[1].exposure, Exposure::AllInterfaces);
    }

    #[test]
    fn classifies_system_paths() {
        assert!(is_system_path(
            "/System/Library/CoreServices/ControlCenter.app/Contents/MacOS/ControlCenter"
        ));
        assert!(is_system_path("/usr/libexec/rapportd"));
        assert!(!is_system_path(
            "/Applications/AhnLab/ASTx/astxAgent.app/Contents/MacOS/astxAgent"
        ));
        assert!(!is_system_path(
            "/Library/Application Support/iniLINE/CrossEX/crossex/CrossEXService"
        ));
        assert!(!is_system_path(""), "경로를 모르면 시스템으로 단정하지 않는다");
    }

    #[test]
    fn print_normalized() {
        let sockets = scan_listening_sockets().expect("스캔 성공");
        let raw_count = sockets.len();
        let mut resolver = ProcessResolver::new();
        let entries = normalize(sockets, &mut resolver);
        println!("원시 소켓 {raw_count}개 → 정규화 {}행", entries.len());
        for e in &entries {
            println!(
                "  {:<6} {:<22} {:<28} {:?} {:?} sys={}",
                e.port,
                e.bind_addrs.join(","),
                e.process_name,
                e.families,
                e.exposure,
                e.is_system
            );
        }
    }
}
