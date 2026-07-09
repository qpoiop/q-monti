import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";

export function Toast() {
  const t = useStore((s) => s.toast);
  const [visible, setVisible] = useState<{ text: string; ts: number } | null>(null);
  useEffect(() => {
    if (!t) return;
    setVisible(t);
    const id = setTimeout(() => setVisible(null), 2600);
    return () => clearTimeout(id);
  }, [t?.ts]);
  if (!visible) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: "rgba(20,15,40,.94)",
          border: "1px solid var(--glass-border-3)",
          borderRadius: 999,
          padding: "10px 18px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          boxShadow: "0 12px 28px -12px rgba(0,0,0,.7)",
          animation: "m-pop var(--dur-med) var(--easing)",
        }}
      >
        {visible.text}
      </div>
    </div>
  );
}
