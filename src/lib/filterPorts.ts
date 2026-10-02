import type { PortEntry } from "../types/port";

export const DEV_PORT_MIN = 3000;
export const DEV_PORT_MAX = 9999;

export interface PortFilterOptions {
  query: string;
  devPortsOnly: boolean;
  hideSystem: boolean;
}

export interface PortFilterResult {
  entries: PortEntry[];
  hiddenSystemCount: number;
}

function matchesQuery(entry: PortEntry, query: string): boolean {
  if (/^\d+$/.test(query)) {
    return String(entry.port).startsWith(query);
  }
  return entry.processName.toLowerCase().includes(query.toLowerCase());
}

export function filterPorts(ports: PortEntry[], options: PortFilterOptions): PortFilterResult {
  const query = options.query.trim();
  let hiddenSystemCount = 0;

  const entries = ports.filter((entry) => {
    if (options.hideSystem && entry.isSystem) {
      hiddenSystemCount += 1;
      return false;
    }
    if (options.devPortsOnly && (entry.port < DEV_PORT_MIN || entry.port > DEV_PORT_MAX)) {
      return false;
    }
    if (query !== "" && !matchesQuery(entry, query)) {
      return false;
    }
    return true;
  });

  return { entries, hiddenSystemCount };
}
