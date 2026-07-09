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
    <div className="toast-wrap">
      <div className="toast pop-in">{visible.text}</div>
    </div>
  );
}
