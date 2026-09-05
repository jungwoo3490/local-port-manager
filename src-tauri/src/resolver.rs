use libproc::libproc::proc_pid;
use std::collections::HashMap;

pub const UNKNOWN_PROCESS_NAME: &str = "(알 수 없음)";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessInfo {
    pub name: String,
    pub exec_path: String,
}

#[derive(Default)]
pub struct ProcessResolver {
    cache: HashMap<u32, ProcessInfo>,
}

impl ProcessResolver {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn resolve(&mut self, pid: u32) -> ProcessInfo {
        if let Some(cached) = self.cache.get(&pid) {
            return cached.clone();
        }
        let info = lookup(pid);
        self.cache.insert(pid, info.clone());
        info
    }

    pub fn cached_count(&self) -> usize {
        self.cache.len()
    }
}

fn lookup(pid: u32) -> ProcessInfo {
    let name =
        proc_pid::name(pid as i32).unwrap_or_else(|_| String::from(UNKNOWN_PROCESS_NAME));
    let exec_path = proc_pid::pidpath(pid as i32).unwrap_or_default();
    ProcessInfo { name, exec_path }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scanner::scan_listening_sockets;

    #[test]
    fn resolves_current_process() {
        let mut resolver = ProcessResolver::new();
        let info = resolver.resolve(std::process::id());
        assert_ne!(info.name, UNKNOWN_PROCESS_NAME);
        assert!(!info.exec_path.is_empty(), "실행 경로가 채워져야 한다");
    }

    #[test]
    fn missing_pid_does_not_panic() {
        let mut resolver = ProcessResolver::new();
        let info = resolver.resolve(u32::MAX);
        assert_eq!(info.name, UNKNOWN_PROCESS_NAME);
        assert!(info.exec_path.is_empty());
    }

    #[test]
    fn caches_repeated_lookups() {
        let mut resolver = ProcessResolver::new();
        let pid = std::process::id();
        let first = resolver.resolve(pid);
        let second = resolver.resolve(pid);
        assert_eq!(first, second);
        assert_eq!(resolver.cached_count(), 1, "같은 PID는 한 번만 캐시된다");
    }

    #[test]
    fn print_resolved_sockets() {
        let mut sockets = scan_listening_sockets().expect("스캔이 성공해야 한다");
        sockets.sort_by_key(|s| (s.port, s.pid));
        let mut resolver = ProcessResolver::new();

        println!("소켓 {}개", sockets.len());
        for s in &sockets {
            let info = resolver.resolve(s.pid);
            println!("  {:<6} pid={:<7} {:<32} {}", s.port, s.pid, info.name, info.exec_path);
        }
        println!(
            "고유 PID {}개 (소켓 {}개 대비 조회 {}회 절약)",
            resolver.cached_count(),
            sockets.len(),
            sockets.len() - resolver.cached_count()
        );
    }
}
