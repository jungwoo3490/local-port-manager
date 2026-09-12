import { usePanelVisibility } from "../hooks/usePanelVisibility";
import { usePortList } from "../hooks/usePortList";
import { PortList } from "./PortList";

export function PortPanel() {
  const isVisible = usePanelVisibility();
  const { ports, status, error } = usePortList(isVisible);

  const isInitialLoading = status === "loading" && ports.length === 0;
  const isFailed = status === "error" && ports.length === 0;

  return (
    <div className="panel">
      <header className="panel__header">
        <span className="panel__title">열린 포트</span>
        <span className="panel__count">{ports.length}</span>
      </header>

      <div className="panel__body">
        {isInitialLoading && <p className="panel__message">불러오는 중…</p>}
        {isFailed && <p className="panel__message">{error}</p>}
        {!isInitialLoading && !isFailed && <PortList entries={ports} />}
      </div>

      <footer className="panel__footer">내 권한으로 보이는 포트만 표시됩니다</footer>
    </div>
  );
}
