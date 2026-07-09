import type { ReactNode } from "react";
import { Button } from "./primitives";

/**
 * Shared confirm dialog. Same visual language for test-mode exit,
 * live-room exit, and any other yes/no prompt. Consuming screens pass
 * the copy in — the component does not embed context-specific text.
 */
export function ConfirmDialog({
  open,
  icon = "🚪",
  title,
  message,
  cancelLabel = "취소",
  confirmLabel = "확인",
  onCancel,
  onConfirm,
  danger,
}: {
  open: boolean;
  icon?: string;
  title: string;
  message?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="confirm-scrim" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">{icon}</div>
        <div className="confirm-title">{title}</div>
        {message ? <div className="confirm-message">{message}</div> : null}
        <div className="confirm-actions">
          <Button full variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button full variant={danger ? "primary" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
