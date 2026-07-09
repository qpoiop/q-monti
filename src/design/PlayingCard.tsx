import type { CSSProperties, MouseEventHandler } from "react";

export interface CardRenderProps {
  /** Numeric value, or null for face-down / jester (use `label`). */
  value?: number | null;
  /** Optional non-numeric symbol (e.g. "★" for jester, "?" for face-down). */
  label?: string;
  /** Card size preset. */
  size?: "xs" | "sm" | "md" | "lg";
  /** Face style controls color of the pip text. */
  tone?: "white" | "jester" | "gold" | "back" | "royal";
  /** Selected / highlighted state (used for tax return picks). */
  selected?: boolean;
  /** Crown badge over the card (for the "1" king card in Momonti). */
  crown?: boolean;
  /** Rotation angle in degrees (for fanned displays). */
  rotate?: number;
  /** Small offset to stagger overlapped cards. */
  offsetX?: number;
  offsetY?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}

const SIZE_TABLE = {
  xs: { w: 26, h: 36, fontSize: 13, radius: 6 },
  sm: { w: 30, h: 42, fontSize: 15, radius: 7 },
  md: { w: 40, h: 56, fontSize: 22, radius: 9 },
  lg: { w: 54, h: 76, fontSize: 26, radius: 11 },
} as const;

export function PlayingCard({
  value,
  label,
  size = "sm",
  tone = "white",
  selected,
  crown,
  rotate,
  offsetX,
  offsetY,
  onClick,
  style,
}: CardRenderProps) {
  const s = SIZE_TABLE[size];
  const bg =
    tone === "back"
      ? "linear-gradient(160deg, var(--surface-3), #241d44)"
      : tone === "jester"
      ? "linear-gradient(160deg, #2a2350, #1a1636)"
      : tone === "gold"
      ? "linear-gradient(160deg, #fff7e6, #fdecc4)"
      : tone === "royal"
      ? "linear-gradient(160deg, #fdfcff, #e7e2f5)"
      : "linear-gradient(160deg, #fdfcff, #e7e2f5)";
  const color =
    tone === "back"
      ? "var(--text-6)"
      : tone === "jester"
      ? "#e0b6ff"
      : tone === "royal"
      ? "var(--gold-4)"
      : value != null && value <= 2
      ? "var(--gold-4)"
      : value != null && value <= 5
      ? "#2a2350"
      : "#8a8298";
  const shadow = selected
    ? "0 0 0 2px var(--accent-1), 0 10px 20px -6px var(--accent-glow)"
    : tone === "jester"
    ? "0 6px 12px -4px #000"
    : "0 3px 7px -3px #000";
  const border =
    tone === "jester"
      ? "1.5px solid var(--brand-purple-2)"
      : selected
      ? "none"
      : "none";
  const transform = [
    rotate ? `rotate(${rotate}deg)` : "",
    offsetX ? `translateX(${offsetX}px)` : "",
    offsetY ? `translateY(${offsetY}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      onClick={onClick}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: s.radius,
        background: bg,
        color,
        fontFamily: "var(--font-brand)",
        fontWeight: 800,
        fontSize: s.fontSize,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: shadow,
        border: border || undefined,
        transform: transform || undefined,
        cursor: onClick ? "pointer" : undefined,
        position: "relative",
        transition: "transform var(--dur-fast) var(--easing), box-shadow var(--dur-fast)",
        flex: "none",
        ...style,
      }}
    >
      {crown ? (
        <span style={{ position: "absolute", top: -8, fontSize: 12 }}>👑</span>
      ) : null}
      {label ?? (value != null ? value : "")}
    </div>
  );
}
