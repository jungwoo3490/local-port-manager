import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { KillError, KillOutcome } from "../types/kill";
import type { PortEntry } from "../types/port";

const NOTICE_DURATION_MS = 4000;

export interface KillFailure {
  rowKey: string;
  message: string;
}

export interface KillProcessResult {
  pendingKill: PortEntry | null;
  killingPids: ReadonlySet<number>;
  killFailure: KillFailure | null;
  notice: string | null;
  requestKill: (entry: PortEntry) => void;
  confirmKill: () => void;
  cancelKill: () => void;
}

export function rowKeyOf(entry: PortEntry): string {
  return `${entry.pid}-${entry.port}`;
}

function isKillError(value: unknown): value is KillError {
  return typeof value === "object" && value !== null && "kind" in value;
}

function describeFailure(reason: unknown): string {
  if (!isKillError(reason)) {
    return String(reason);
  }
  switch (reason.kind) {
    case "permissionDenied":
      return "권한이 없습니다. 다른 사용자 또는 root 소유 프로세스입니다.";
    case "invalidPid":
      return "종료할 수 없는 프로세스입니다.";
    case "failed":
      return reason.message;
  }
}

export function useKillProcess(refetch: () => Promise<void>): KillProcessResult {
  const [pendingKill, setPendingKill] = useState<PortEntry | null>(null);
  const [killingPids, setKillingPids] = useState<ReadonlySet<number>>(new Set());
  const [killFailure, setKillFailure] = useState<KillFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const killingRef = useRef<Set<number>>(new Set());
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current);
    }
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, NOTICE_DURATION_MS);
  }, []);

  const executeKill = useCallback(
    async (entry: PortEntry) => {
      if (killingRef.current.has(entry.pid)) {
        return;
      }
      killingRef.current.add(entry.pid);
      setKillingPids(new Set(killingRef.current));
      setKillFailure(null);

      try {
        const outcome = await invoke<KillOutcome>("kill_process", { pid: entry.pid });
        if (outcome.escalated) {
          showNotice(`${entry.processName}이(가) 응답하지 않아 강제 종료했습니다`);
        }
        await refetch();
      } catch (reason) {
        setKillFailure({ rowKey: rowKeyOf(entry), message: describeFailure(reason) });
      } finally {
        killingRef.current.delete(entry.pid);
        setKillingPids(new Set(killingRef.current));
      }
    },
    [refetch, showNotice],
  );

  const requestKill = useCallback(
    (entry: PortEntry) => {
      if (killingRef.current.has(entry.pid)) {
        return;
      }
      if (entry.isSystem) {
        setPendingKill(entry);
        return;
      }
      void executeKill(entry);
    },
    [executeKill],
  );

  const confirmKill = useCallback(() => {
    if (pendingKill === null) {
      return;
    }
    const target = pendingKill;
    setPendingKill(null);
    void executeKill(target);
  }, [pendingKill, executeKill]);

  const cancelKill = useCallback(() => {
    setPendingKill(null);
  }, []);

  return { pendingKill, killingPids, killFailure, notice, requestKill, confirmKill, cancelKill };
}
