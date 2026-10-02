import { useEffect, useRef } from "react";
import type { PortEntry } from "../types/port";

interface KillConfirmDialogProps {
  target: PortEntry | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function KillConfirmDialog({ target, onConfirm, onCancel }: KillConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (target !== null) {
      cancelButtonRef.current?.focus();
    }
  }, [target]);

  if (target === null) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kill-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="dialog__title" id="kill-dialog-title">
          시스템 프로세스를 종료할까요?
        </p>
        <p className="dialog__detail">
          <strong>{target.processName}</strong> (PID {target.pid})은 macOS가 실행한 프로세스입니다.
          종료하면 관련 시스템 기능이 멈출 수 있습니다.
        </p>
        <p className="dialog__path">{target.execPath}</p>
        <div className="dialog__actions">
          <button className="dialog__button" type="button" ref={cancelButtonRef} onClick={onCancel}>
            취소
          </button>
          <button className="dialog__button dialog__button--danger" type="button" onClick={onConfirm}>
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
