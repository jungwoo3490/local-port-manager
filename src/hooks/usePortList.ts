import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PortEntry } from "../types/port";

const POLL_INTERVAL_MS = 2000;

export type PortListStatus = "loading" | "ready" | "error";

export interface PortListResult {
  ports: PortEntry[];
  status: PortListStatus;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePortList(isActive: boolean): PortListResult {
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [status, setStatus] = useState<PortListStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const fetchPorts = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    try {
      const entries = await invoke<PortEntry[]>("list_ports");
      setPorts(entries);
      setError(null);
      setStatus("ready");
    } catch (reason) {
      setError(String(reason));
      setStatus((previous) => (previous === "ready" ? "ready" : "error"));
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    function stopPolling() {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    if (!isActive) {
      stopPolling();
      return;
    }

    void fetchPorts();
    timerRef.current = window.setInterval(() => void fetchPorts(), POLL_INTERVAL_MS);
    return stopPolling;
  }, [isActive, fetchPorts]);

  return { ports, status, error, refetch: fetchPorts };
}
