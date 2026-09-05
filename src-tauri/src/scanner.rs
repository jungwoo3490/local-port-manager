use netstat2::{
    get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, TcpState,
};
use std::net::IpAddr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListeningSocket {
    pub port: u16,
    pub local_addr: IpAddr,
    pub pid: u32,
}

pub fn scan_listening_sockets() -> Result<Vec<ListeningSocket>, String> {
    let families = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let sockets = get_sockets_info(families, ProtocolFlags::TCP)
        .map_err(|e| format!("소켓 정보를 가져오지 못했습니다: {e}"))?;

    Ok(sockets
        .into_iter()
        .filter_map(|info| {
            let ProtocolSocketInfo::Tcp(tcp) = &info.protocol_socket_info else {
                return None;
            };
            if tcp.state != TcpState::Listen {
                return None;
            }
            let pid = info.associated_pids.first().copied()?;
            Some(ListeningSocket {
                port: tcp.local_port,
                local_addr: tcp.local_addr,
                pid,
            })
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_returns_listening_sockets() {
        let sockets = scan_listening_sockets().expect("스캔이 성공해야 한다");
        assert!(
            !sockets.is_empty(),
            "LISTEN 소켓이 최소 하나는 있어야 한다 (테스트 환경에 열린 포트가 없으면 실패할 수 있음)"
        );
    }

    #[test]
    fn every_socket_has_pid_and_port() {
        let sockets = scan_listening_sockets().expect("스캔이 성공해야 한다");
        for socket in &sockets {
            assert!(socket.pid > 0, "PID가 0인 소켓이 있다: {socket:?}");
            assert!(socket.port > 0, "포트가 0인 소켓이 있다: {socket:?}");
        }
    }

    #[test]
    fn print_scan_result() {
        let mut sockets = scan_listening_sockets().expect("스캔이 성공해야 한다");
        sockets.sort_by_key(|s| (s.port, s.pid));
        println!("총 {}개", sockets.len());
        for s in &sockets {
            println!("  {:<6} {:<22} pid={}", s.port, s.local_addr.to_string(), s.pid);
        }
    }
}
