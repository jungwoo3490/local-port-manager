import { rowKeyOf } from "../hooks/useKillProcess";
import type { KillFailure } from "../hooks/useKillProcess";
import type { PortEntry } from "../types/port";
import { PortRow } from "./PortRow";

interface PortListProps {
  entries: PortEntry[];
  killingPids: ReadonlySet<number>;
  killFailure: KillFailure | null;
  onKill: (entry: PortEntry) => void;
}

export function PortList({ entries, killingPids, killFailure, onKill }: PortListProps) {
  return (
    <ul className="port-list">
      {entries.map((entry) => {
        const rowKey = rowKeyOf(entry);
        return (
          <PortRow
            key={rowKey}
            entry={entry}
            isKilling={killingPids.has(entry.pid)}
            failureMessage={killFailure?.rowKey === rowKey ? killFailure.message : null}
            onKill={onKill}
          />
        );
      })}
    </ul>
  );
}
