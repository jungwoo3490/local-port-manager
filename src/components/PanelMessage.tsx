import type { ReactNode } from "react";

interface PanelMessageProps {
  title: string;
  detail?: string;
  action?: ReactNode;
}

export function PanelMessage({ title, detail, action }: PanelMessageProps) {
  return (
    <div className="panel-message">
      <p className="panel-message__title">{title}</p>
      {detail && <p className="panel-message__detail">{detail}</p>}
      {action}
    </div>
  );
}
