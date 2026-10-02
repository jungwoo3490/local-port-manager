import type { PortEntry } from "../types/port";

interface PortRowProps {
  entry: PortEntry;
  isKilling: boolean;
  failureMessage: string | null;
  onKill: (entry: PortEntry) => void;
}

export function PortRow({ entry, isKilling, failureMessage, onKill }: PortRowProps) {
  return (
    <li className={isKilling ? "port-row port-row--killing" : "port-row"}>
      <div className="port-row__main">
        <span className="port-row__port">{entry.port}</span>
        <span className="port-row__name" title={entry.processName}>
          {entry.processName}
        </span>
        <span className="port-row__badges">
          {entry.exposure === "allInterfaces" && (
            <span className="badge badge--exposed" title="모든 인터페이스에 바인딩됨">
              외부
            </span>
          )}
          {entry.isSystem && (
            <span className="badge badge--system" title="시스템 프로세스">
              시스템
            </span>
          )}
        </span>
        <button
          className={entry.isSystem ? "kill-button kill-button--system" : "kill-button"}
          type="button"
          disabled={isKilling}
          onClick={() => onKill(entry)}
        >
          {isKilling ? <span className="spinner" aria-label="종료 중" /> : "종료"}
        </button>
      </div>
      <div className="port-row__meta">
        <span>PID {entry.pid}</span>
        <span>{entry.bindAddrs.join(", ")}</span>
        <span>{entry.families.join("/")}</span>
      </div>
      <div className="port-row__path" title={entry.execPath}>
        {entry.execPath || "경로 확인 불가"}
      </div>
      {failureMessage !== null && <div className="port-row__failure">{failureMessage}</div>}
    </li>
  );
}
