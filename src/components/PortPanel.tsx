import { usePanelVisibility } from "../hooks/usePanelVisibility";
import { usePortList } from "../hooks/usePortList";
import { PanelMessage } from "./PanelMessage";
import { PortList } from "./PortList";
import { PortSkeleton } from "./PortSkeleton";

export function PortPanel() {
  const isVisible = usePanelVisibility();
  const { ports, status, error, refetch } = usePortList(isVisible);

  const visibleEntries = ports;
  const hasData = ports.length > 0;
  const isInitialLoading = status === "loading" && !hasData;
  const isBlockingError = status === "error" && !hasData;
  const isStale = error !== null && hasData;

  function renderBody() {
    if (isInitialLoading) {
      return <PortSkeleton />;
    }
    if (isBlockingError) {
      return (
        <PanelMessage
          title="포트를 읽지 못했습니다"
          detail={error ?? undefined}
          action={
            <button className="panel-message__action" type="button" onClick={() => void refetch()}>
              다시 시도
            </button>
          }
        />
      );
    }
    if (!hasData) {
      return <PanelMessage title="열린 포트가 없습니다" detail="LISTEN 상태인 TCP 포트가 하나도 없습니다." />;
    }
    if (visibleEntries.length === 0) {
      return <PanelMessage title="검색 결과가 없습니다" detail="검색어나 필터를 지워보세요." />;
    }
    return <PortList entries={visibleEntries} />;
  }

  return (
    <div className="panel">
      <header className="panel__header">
        <span className="panel__title">열린 포트</span>
        {hasData && <span className="panel__count">{visibleEntries.length}</span>}
        {isStale && (
          <span className="panel__stale" title={error ?? undefined}>
            갱신 실패
          </span>
        )}
      </header>

      <div className="panel__body">{renderBody()}</div>

      <footer className="panel__footer">내 권한으로 보이는 포트만 표시됩니다</footer>
    </div>
  );
}
