use serde::Serialize;
use std::thread::sleep;
use std::time::{Duration, Instant};

const TERM_GRACE: Duration = Duration::from_secs(3);
const KILL_GRACE: Duration = Duration::from_secs(1);
const POLL_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KillOutcome {
    pub escalated: bool,
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum KillError {
    PermissionDenied,
    InvalidPid,
    Failed { message: String },
}

enum SignalResult {
    Sent,
    NoSuchProcess,
    PermissionDenied,
    Other(String),
}

fn to_raw_pid(pid: u32) -> Option<libc::pid_t> {
    if pid <= 1 {
        return None;
    }
    libc::pid_t::try_from(pid).ok()
}

fn send_signal(pid: libc::pid_t, signal: libc::c_int) -> SignalResult {
    let result = unsafe { libc::kill(pid, signal) };
    if result == 0 {
        return SignalResult::Sent;
    }
    let error = std::io::Error::last_os_error();
    match error.raw_os_error() {
        Some(libc::ESRCH) => SignalResult::NoSuchProcess,
        Some(libc::EPERM) => SignalResult::PermissionDenied,
        _ => SignalResult::Other(error.to_string()),
    }
}

fn is_alive(pid: libc::pid_t) -> bool {
    !matches!(send_signal(pid, 0), SignalResult::NoSuchProcess)
}

fn wait_for_exit(pid: libc::pid_t, timeout: Duration, poll: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        if !is_alive(pid) {
            return true;
        }
        if Instant::now() >= deadline {
            return false;
        }
        sleep(poll);
    }
}

pub fn terminate(pid: u32) -> Result<KillOutcome, KillError> {
    terminate_with(pid, TERM_GRACE, KILL_GRACE, POLL_INTERVAL)
}

fn terminate_with(
    pid: u32,
    term_grace: Duration,
    kill_grace: Duration,
    poll: Duration,
) -> Result<KillOutcome, KillError> {
    let raw_pid = to_raw_pid(pid).ok_or(KillError::InvalidPid)?;

    match send_signal(raw_pid, libc::SIGTERM) {
        SignalResult::Sent => {}
        SignalResult::NoSuchProcess => return Ok(KillOutcome { escalated: false }),
        SignalResult::PermissionDenied => return Err(KillError::PermissionDenied),
        SignalResult::Other(message) => return Err(KillError::Failed { message }),
    }

    if wait_for_exit(raw_pid, term_grace, poll) {
        return Ok(KillOutcome { escalated: false });
    }

    match send_signal(raw_pid, libc::SIGKILL) {
        SignalResult::Sent => {}
        SignalResult::NoSuchProcess => return Ok(KillOutcome { escalated: false }),
        SignalResult::PermissionDenied => return Err(KillError::PermissionDenied),
        SignalResult::Other(message) => return Err(KillError::Failed { message }),
    }

    if wait_for_exit(raw_pid, kill_grace, poll) {
        Ok(KillOutcome { escalated: true })
    } else {
        Err(KillError::Failed {
            message: String::from("강제 종료 신호를 보냈지만 프로세스가 종료되지 않았습니다"),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    const TEST_POLL: Duration = Duration::from_millis(20);

    fn spawn_detached(script: &str) -> u32 {
        let output = Command::new("sh")
            .arg("-c")
            .arg(format!("({script}) >/dev/null 2>&1 & echo $!"))
            .output()
            .expect("sh 실행");
        String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse()
            .expect("PID 파싱")
    }

    fn raw(pid: u32) -> libc::pid_t {
        to_raw_pid(pid).expect("유효한 PID")
    }

    #[test]
    fn terminates_cooperative_process_without_escalation() {
        let pid = spawn_detached("exec sleep 300");
        assert!(is_alive(raw(pid)));

        let started = Instant::now();
        let outcome = terminate_with(pid, Duration::from_secs(3), KILL_GRACE, TEST_POLL);

        assert_eq!(outcome, Ok(KillOutcome { escalated: false }));
        assert!(!is_alive(raw(pid)));
        assert!(
            started.elapsed() < Duration::from_secs(1),
            "SIGTERM에 바로 죽는 프로세스는 유예 시간을 다 기다리지 않는다: {:?}",
            started.elapsed()
        );
    }

    #[test]
    fn escalates_to_sigkill_when_sigterm_is_ignored() {
        let pid = spawn_detached("trap '' TERM; while :; do sleep 1; done");
        sleep(Duration::from_millis(300));
        assert!(is_alive(raw(pid)));

        let outcome = terminate_with(pid, Duration::from_millis(500), KILL_GRACE, TEST_POLL);

        assert_eq!(outcome, Ok(KillOutcome { escalated: true }));
        assert!(!is_alive(raw(pid)));
    }

    #[test]
    fn missing_process_counts_as_success() {
        let pid = spawn_detached("exec sleep 300");
        assert_eq!(
            terminate_with(pid, Duration::from_secs(3), KILL_GRACE, TEST_POLL),
            Ok(KillOutcome { escalated: false })
        );
        assert_eq!(
            terminate_with(pid, Duration::from_secs(3), KILL_GRACE, TEST_POLL),
            Ok(KillOutcome { escalated: false }),
            "이미 죽은 PID는 성공으로 처리한다"
        );
    }

    #[test]
    fn root_owned_process_is_permission_denied() {
        let output = Command::new("pgrep")
            .args(["-u", "root", "-x", "launchd"])
            .output()
            .expect("pgrep 실행");
        let root_pid: u32 = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| line.trim().parse().ok())
            .find(|pid| *pid > 1)
            .or_else(|| {
                let any = Command::new("pgrep").args(["-u", "root"]).output().ok()?;
                String::from_utf8_lossy(&any.stdout)
                    .lines()
                    .filter_map(|line| line.trim().parse().ok())
                    .find(|pid| *pid > 1)
            })
            .expect("root 소유 프로세스가 하나는 있어야 한다");

        assert_eq!(
            terminate_with(root_pid, Duration::from_millis(200), KILL_GRACE, TEST_POLL),
            Err(KillError::PermissionDenied)
        );
        assert!(is_alive(raw(root_pid)));
    }

    #[test]
    fn rejects_dangerous_pids() {
        assert_eq!(terminate(0), Err(KillError::InvalidPid));
        assert_eq!(terminate(1), Err(KillError::InvalidPid));
        assert_eq!(terminate(u32::MAX), Err(KillError::InvalidPid));
    }

    #[test]
    fn serializes_error_with_kind_tag() {
        let denied = serde_json::to_value(KillError::PermissionDenied).expect("직렬화");
        assert_eq!(denied["kind"], "permissionDenied");

        let failed = serde_json::to_value(KillError::Failed {
            message: String::from("x"),
        })
        .expect("직렬화");
        assert_eq!(failed["kind"], "failed");
        assert_eq!(failed["message"], "x");

        let outcome = serde_json::to_value(KillOutcome { escalated: true }).expect("직렬화");
        assert_eq!(outcome["escalated"], true);
    }
}
