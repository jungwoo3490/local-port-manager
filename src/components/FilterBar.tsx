interface FilterBarProps {
  devPortsOnly: boolean;
  hideSystem: boolean;
  onToggleDevPortsOnly: () => void;
  onToggleHideSystem: () => void;
}

export function FilterBar({ devPortsOnly, hideSystem, onToggleDevPortsOnly, onToggleHideSystem }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <button
        className={devPortsOnly ? "filter-chip filter-chip--on" : "filter-chip"}
        type="button"
        aria-pressed={devPortsOnly}
        onClick={onToggleDevPortsOnly}
      >
        개발 포트만
      </button>
      <button
        className={hideSystem ? "filter-chip filter-chip--on" : "filter-chip"}
        type="button"
        aria-pressed={hideSystem}
        onClick={onToggleHideSystem}
      >
        시스템 숨김
      </button>
    </div>
  );
}
