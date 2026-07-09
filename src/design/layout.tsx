import type { CSSProperties, ReactNode } from "react";

/**
 * Layout primitives. Zero inline styles at call sites — variants are
 * expressed by `className` combinations declared in `layout.css`.
 *
 * The primitives intentionally accept minimal props. If you need a
 * one-off tweak, extend `layout.css` rather than reintroducing
 * `style={{}}` at the call site.
 */

type Div = { children: ReactNode; className?: string; style?: CSSProperties };

export function Stack({
  children,
  gap = 10,
  className = "",
  style,
}: Div & { gap?: 4 | 6 | 8 | 10 | 12 | 16 }) {
  return (
    <div className={`stack stack-${gap} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Row({
  children,
  gap = 8,
  between,
  center,
  wrap,
  className = "",
  style,
}: Div & { gap?: 6 | 8 | 12; between?: boolean; center?: boolean; wrap?: boolean }) {
  const classes = [
    "row",
    gap === 6 ? "row-tight" : gap === 12 ? "row-wide" : "",
    between ? "row-between" : "",
    center ? "row-center" : "",
    wrap ? "row-wrap" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}

export function ScreenBody({
  children,
  tight,
  className = "",
  style,
}: Div & { tight?: boolean }) {
  return (
    <div
      className={`screen-body ${tight ? "screen-body-tight" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function FooterBar({ children }: { children: ReactNode }) {
  return <div className="footer-bar">{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <div className="hint">{children}</div>;
}

export function Helper({ children }: { children: ReactNode }) {
  return <div className="helper">{children}</div>;
}

/* -------------------------- Reused pieces -------------------------- */

export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="chip-btn" onClick={onClick}>
      규칙 ⓘ
    </button>
  );
}

export function StatusBadge({
  tone = "idle",
  pulse,
  children,
}: {
  tone?: "active" | "idle" | "pos";
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="status-badge" data-tone={tone}>
      {pulse ? <span className="pulse" /> : null}
      {children}
    </span>
  );
}

export function HeaderActions({ children }: { children: ReactNode }) {
  return <div className="header-actions">{children}</div>;
}

export function PhaseHeader({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="phase-header">
      <div className="stack stack-4">
        <div className="title">{title}</div>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {right ? <HeaderActions>{right}</HeaderActions> : null}
    </div>
  );
}

/* -------------------------- Overlay shells -------------------------- */

export function OverlayScrim({
  children,
  align = "center",
  onClose,
}: {
  children: ReactNode;
  align?: "center" | "bottom";
  onClose?: () => void;
}) {
  return (
    <div className={`overlay-scrim ${align}`} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}>
        {children}
      </div>
    </div>
  );
}

export function DialogCard({ children }: { children: ReactNode }) {
  return <div className="dialog-card">{children}</div>;
}
