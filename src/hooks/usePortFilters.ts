import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { filterPorts } from "../lib/filterPorts";
import type { PortEntry } from "../types/port";

const DEV_PORTS_ONLY_KEY = "lpm.devPortsOnly";
const HIDE_SYSTEM_KEY = "lpm.hideSystem";

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

export interface PortFiltersResult {
  query: string;
  devPortsOnly: boolean;
  hideSystem: boolean;
  entries: PortEntry[];
  hiddenSystemCount: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  changeQuery: (value: string) => void;
  clearQuery: () => void;
  toggleDevPortsOnly: () => void;
  toggleHideSystem: () => void;
}

export function usePortFilters(ports: PortEntry[], isVisible: boolean): PortFiltersResult {
  const [query, setQuery] = useState("");
  const [devPortsOnly, setDevPortsOnly] = useState(() => readFlag(DEV_PORTS_ONLY_KEY, false));
  const [hideSystem, setHideSystem] = useState(() => readFlag(HIDE_SYSTEM_KEY, true));
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible) {
      searchInputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [isVisible]);

  const { entries, hiddenSystemCount } = useMemo(
    () => filterPorts(ports, { query, devPortsOnly, hideSystem }),
    [ports, query, devPortsOnly, hideSystem],
  );

  const clearQuery = useCallback(() => {
    setQuery("");
    searchInputRef.current?.focus();
  }, []);

  const toggleDevPortsOnly = useCallback(() => {
    setDevPortsOnly((previous) => {
      writeFlag(DEV_PORTS_ONLY_KEY, !previous);
      return !previous;
    });
  }, []);

  const toggleHideSystem = useCallback(() => {
    setHideSystem((previous) => {
      writeFlag(HIDE_SYSTEM_KEY, !previous);
      return !previous;
    });
  }, []);

  return {
    query,
    devPortsOnly,
    hideSystem,
    entries,
    hiddenSystemCount,
    searchInputRef,
    changeQuery: setQuery,
    clearQuery,
    toggleDevPortsOnly,
    toggleHideSystem,
  };
}
