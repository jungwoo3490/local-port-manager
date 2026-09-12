import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function usePanelVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const panel = getCurrentWindow();
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    panel.isVisible().then((visible) => {
      if (!cancelled) {
        setIsVisible(visible);
      }
    });

    panel
      .onFocusChanged(({ payload: focused }) => {
        setIsVisible(focused);
      })
      .then((stop) => {
        if (cancelled) {
          stop();
        } else {
          unlisten = stop;
        }
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return isVisible;
}
