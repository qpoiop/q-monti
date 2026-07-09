import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";

/**
 * App-wide toast. Two sources:
 *   1. `store.toast` — driven by server errors, `roomCreated` codes, etc.
 *   2. `momonti:toast` window event — fired by phase views for instant
 *      contextual feedback (pass, play, trick clear).
 */
export function Toast() {
  const t = useStore((s) => s.toast);
  const [visible, setVisible] = useState<{ text: string; ts: number } | null>(null);
  useEffect(() => {
    if (!t) return;
    setVisible(t);
    const id = setTimeout(() => setVisible(null), 2400);
    return () => clearTimeout(id);
  }, [t?.ts]);
  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string") {
        setVisible({ text: detail, ts: Date.now() });
      }
    };
    window.addEventListener("momonti:toast", on);
    return () => window.removeEventListener("momonti:toast", on);
  }, []);
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setVisible(null), 2400);
    return () => clearTimeout(id);
  }, [visible?.ts]);
  if (!visible) return null;
  return (
    <div className="toast-wrap">
      <div className="toast pop-in">{visible.text}</div>
    </div>
  );
}
