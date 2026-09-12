import type { PortEntry } from "../types/port";
import { PortRow } from "./PortRow";

interface PortListProps {
  entries: PortEntry[];
}

export function PortList({ entries }: PortListProps) {
  return (
    <ul className="port-list">
      {entries.map((entry) => (
        <PortRow key={`${entry.pid}-${entry.port}`} entry={entry} />
      ))}
    </ul>
  );
}
