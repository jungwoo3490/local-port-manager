import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useKillProcess } from "../hooks/useKillProcess";
import { usePanelVisibility } from "../hooks/usePanelVisibility";
import { usePortFilters } from "../hooks/usePortFilters";
import { usePortList } from "../hooks/usePortList";
import { FilterBar } from "./FilterBar";
import { KillConfirmDialog } from "./KillConfirmDialog";
import { PanelMessage } from "./PanelMessage";
import { PortList } from "./PortList";
import { PortSkeleton } from "./PortSkeleton";
import { SearchBar } from "./SearchBar";

export function PortPanel() {
  const isVisible = usePanelVisibility();
  const { ports, status, error, refetch } = usePortList(isVisible);
  const { pendingKill, killingPids, killFailure, notice, requestKill, confirmKill, cancelKill } =
    useKillProcess(refetch);
  const filters = usePortFilters(ports, isVisible);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (pendingKill !== null) {
        cancelKill();
      } else {
        void invoke("hide_panel");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingKill, cancelKill]);

  useEffect(() => {
    if (!isVisible) {
      cancelKill();
    }
  }, [isVisible, cancelKill]);

  const visibleEntries = filters.entries;
  const hasData = ports.length > 0;
  const isInitialLoading = status === "loading" && !hasData;
  const isBlockingError = status === "error" && !hasData;
  const isStale = error !== null && hasData;

  const footerText =
    filters.hiddenSystemCount > 0
      ? `시스템 프로세스 ${filters.hiddenSystemCount}개 숨김 · 내 권한으로 보이는 포트만 표시됩니다`
      : "내 권한으로 보이는 포트만 표시됩니다";

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
    return (
      <PortList
        entries={visibleEntries}
        killingPids={killingPids}
        killFailure={killFailure}
        onKill={requestKill}
      />
    );
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

      <div className="panel__controls">
        <SearchBar
          query={filters.query}
          inputRef={filters.searchInputRef}
          onChange={filters.changeQuery}
          onClear={filters.clearQuery}
        />
        <FilterBar
          devPortsOnly={filters.devPortsOnly}
          hideSystem={filters.hideSystem}
          onToggleDevPortsOnly={filters.toggleDevPortsOnly}
          onToggleHideSystem={filters.toggleHideSystem}
        />
      </div>

      <div className="panel__body">{renderBody()}</div>

      <footer className={notice !== null ? "panel__footer panel__footer--notice" : "panel__footer"}>
        {notice ?? footerText}
      </footer>

      <KillConfirmDialog target={pendingKill} onConfirm={confirmKill} onCancel={cancelKill} />
    </div>
  );
}
