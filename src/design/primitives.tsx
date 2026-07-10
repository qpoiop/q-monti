import type { CSSProperties, ReactNode } from "react";

/* -------------------------- Button --------------------------- */

type ButtonVariant = "primary" | "accent" | "accent-soft" | "ghost" | "outline" | "danger";

export function Button({
  children,
  onClick,
  variant = "primary",
  full = false,
  disabled,
  style,
  size = "md",
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
}) {
  // Responsive sizing — reads from CSS clamp so buttons breathe on
  // small phones and stay readable on tablets. Sizes exposed as CSS
  // custom properties per size preset.
  const base: CSSProperties = {
    padding: `var(--btn-py) 16px`,
    borderRadius: 14,
    fontWeight: 800,
    fontSize: "var(--btn-fz)",
    textAlign: "center",
    width: full ? "100%" : undefined,
    // Button labels should never wrap — Korean text like "방 나가기"
    // was breaking mid-word in narrow flex rows and looked broken.
    whiteSpace: "nowrap",
    minWidth: 0,
    transition: "transform var(--dur-fast) var(--easing), opacity var(--dur-fast)",
    ["--btn-py" as any]:
      size === "sm"
        ? "clamp(9px, 1.3vh, 12px)"
        : size === "lg"
        ? "clamp(15px, 2.4vh, 20px)"
        : "clamp(12px, 2vh, 17px)",
    ["--btn-fz" as any]:
      size === "sm"
        ? "clamp(12px, 1.6vh, 13.5px)"
        : size === "lg"
        ? "clamp(15px, 2.2vh, 18px)"
        : "clamp(13.5px, 2vh, 16px)",
  };
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, var(--brand-purple-1), var(--brand-purple-2))",
      color: "#fff",
      boxShadow: "var(--shadow-cta)",
    },
    accent: {
      background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
      color: "var(--accent-text-on)",
    },
    "accent-soft": {
      background: "var(--accent-soft)",
      border: "1px solid var(--accent-border)",
      color: "var(--accent-3)",
    },
    ghost: {
      background: "var(--glass-3)",
      border: "1px solid var(--glass-border-3)",
      color: "var(--text-3)",
    },
    outline: {
      background: "transparent",
      border: "1px solid var(--glass-border-3)",
      color: "var(--text-3)",
    },
    danger: {
      background: "rgba(248, 113, 113, 0.14)",
      border: "1px solid rgba(248, 113, 113, 0.5)",
      color: "var(--neg-2)",
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="prim-btn"
      style={{ ...base, ...variants[variant], ...style }}
    >
      {loading ? "…" : children}
    </button>
  );
}

/* -------------------------- Card --------------------------- */

export function Card({
  children,
  style,
  interactive,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  style?: CSSProperties;
  interactive?: boolean;
  onClick?: () => void;
  tone?: "default" | "highlight" | "dashed" | "accent";
}) {
  const tones: Record<string, CSSProperties> = {
    default: {
      background: "var(--glass-3)",
      border: "1px solid var(--glass-border-2)",
    },
    highlight: {
      background: "var(--glass-4)",
      border: "1px solid var(--glass-border-3)",
    },
    dashed: {
      background: "var(--glass-1)",
      border: "1px dashed var(--glass-border-3)",
    },
    accent: {
      background: "var(--accent-soft)",
      border: "1px solid var(--accent-border)",
    },
  };
  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 13,
        ...tones[tone],
        cursor: interactive || onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------- Pill / Badge --------------------------- */

export function Pill({
  children,
  tone = "default",
  style,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "positive" | "purple" | "muted";
  style?: CSSProperties;
}) {
  const tones: Record<string, CSSProperties> = {
    default: {
      background: "var(--glass-3)",
      border: "1px solid var(--glass-border-2)",
      color: "var(--text-2)",
    },
    accent: {
      background: "var(--accent-soft)",
      border: "1px solid var(--accent-border)",
      color: "var(--accent-3)",
    },
    positive: {
      background: "var(--pos-bg)",
      border: "1px solid var(--pos-border)",
      color: "var(--pos-1)",
    },
    purple: {
      background: "rgba(200,85,240,.14)",
      border: "1px solid rgba(200,85,240,.35)",
      color: "#e0b6ff",
    },
    muted: {
      background: "var(--glass-2)",
      border: "1px solid var(--glass-border-1)",
      color: "var(--text-5)",
    },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        fontFamily: "var(--font-brand)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: ".04em",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* -------------------------- Toggle --------------------------- */

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: value ? "var(--accent-1)" : "rgba(255,255,255,.18)",
        position: "relative",
        transition: "background var(--dur-fast) var(--easing)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left var(--dur-fast) var(--easing)",
        }}
      />
    </button>
  );
}

/* -------------------------- Segmented --------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: ReactNode; sub?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "11px 0",
              borderRadius: 11,
              background: active
                ? "linear-gradient(135deg, var(--accent-1), var(--accent-2))"
                : "var(--glass-2)",
              border: active ? "none" : "1px solid var(--glass-border-2)",
              color: active ? "var(--accent-text-on)" : "var(--text-5)",
              fontWeight: active ? 800 : 700,
              fontSize: 12.5,
            }}
          >
            <div>{o.label}</div>
            {o.sub ? (
              <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>{o.sub}</div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------- Stepper --------------------------- */

export function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: "var(--glass-4)",
          color: "var(--text-2)",
          fontSize: 16,
        }}
      >
        −
      </button>
      <span
        style={{
          fontFamily: "var(--font-brand)",
          fontWeight: 800,
          fontSize: 16,
          color: "#fff",
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: "var(--accent-1)",
          opacity: 0.75,
          color: "#fff",
          fontSize: 16,
        }}
      >
        ＋
      </button>
    </div>
  );
}

/* -------------------------- Header --------------------------- */

export function ScreenHeader({
  title,
  right,
  onBack,
}: {
  title: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="screen-header">
      <div className="screen-header-left">
        {onBack ? (
          <button type="button" onClick={onBack} className="back-btn" aria-label="back">
            ←
          </button>
        ) : null}
        <span className="screen-header-title">{title}</span>
      </div>
      {right}
    </div>
  );
}

/* -------------------------- SettingRow --------------------------- */

export function SettingRow({
  label,
  hint,
  right,
}: {
  label: ReactNode;
  hint?: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 14px",
        borderRadius: 13,
        background: "var(--glass-3)",
        border: "1px solid var(--glass-border-2)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--text-2)", fontSize: 12.5, fontWeight: 600 }}>{label}</div>
        {hint ? (
          <div style={{ color: "#8a82ad", fontSize: 10, marginTop: 2 }}>{hint}</div>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/* -------------------------- BrandChip --------------------------- */

export function BrandChip({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "linear-gradient(135deg, var(--accent-1), var(--accent-2))",
        color: "var(--accent-text-on)",
        fontFamily: "var(--font-brand)",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: ".1em",
        padding: "5px 14px",
        borderRadius: 999,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------- Sticky bottom bar --------------------------- */

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: "auto", padding: 16, display: "flex", gap: 8 }}>{children}</div>
  );
}
