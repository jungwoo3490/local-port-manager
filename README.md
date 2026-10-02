# Local Port Manager

로컬에 오픈된 포트와 그 포트에 바인딩된 프로세스를 조회 및 종료할 수 있는 macOS 메뉴바 앱입니다.

<img width="380" height="478" alt="스크린샷 2026-10-03 오전 5 01 49" src="https://github.com/user-attachments/assets/9787fef9-8103-4237-b4bf-3c1739571e11" />


## 기능

**열린 포트 목록**

- LISTEN 상태의 TCP 포트를 포트 번호 순으로 표시합니다.
- 각 행에 포트, 프로세스명, PID, 바인드 주소, 실행 파일 경로를 표시합니다.
- 동일한 프로세스가 IPv4와 IPv6로 같은 포트를 연 경우 하나의 행으로 병합합니다.
- `0.0.0.0` 또는 `::`에 바인딩된 포트는 `외부` 배지로, macOS가 실행한 프로세스는 `시스템` 배지로 구분합니다.
- 패널이 열려 있는 동안 2초 주기로 갱신하며, 패널을 닫으면 갱신을 중단합니다.

**프로세스 종료**

- 각 행의 `종료` 버튼으로 프로세스를 종료합니다.
- SIGTERM을 먼저 전송하고, 3초 내에 종료되지 않으면 SIGKILL로 강제 종료합니다.
- 시스템 프로세스(`/System/`, `/usr/libexec/` 등의 경로에서 실행된 프로세스)는 종료 전에 확인 절차를 거칩니다.

**검색과 필터**

- 포트 번호 또는 프로세스명으로 검색할 수 있습니다.
- `개발 포트만` 필터는 3000~9999 범위의 포트만 표시합니다.
- `시스템 숨김` 필터는 시스템 프로세스를 목록에서 제외하며, 기본으로 활성화되어 있습니다.

현재 사용자 권한으로 조회 가능한 포트만 표시됩니다. root 소유 프로세스가 연 포트는 목록에 포함되지 않습니다.

## 설치 및 실행

**Prerequisites**

- macOS
- Rust (>= 1.88)
- bun
- Xcode Command Line Tools

**개발 모드로 실행**

```sh
git clone https://github.com/jungwoo3490/local-port-manager.git
cd local-port-manager
bun install
bun run tauri dev
```

최초 실행 시 Rust 의존성 컴파일로 인해 수 분이 소요됩니다. 실행 후에는 별도의 창 없이 메뉴바에 아이콘이 표시됩니다.

**앱으로 설치**

```sh
bun run tauri build
cp -R src-tauri/target/release/bundle/macos/local-port-manager.app /Applications/
open /Applications/local-port-manager.app
```

코드 서명을 하지 않으므로 직접 빌드한 Mac에서만 바로 실행됩니다. 다른 Mac으로 복사하면 Gatekeeper가 차단합니다.
