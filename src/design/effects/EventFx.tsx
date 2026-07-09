import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import { Particles } from "./Particles";

/**
 * Reactive effect layer.
 *
 * Watches `gameView.lastEvents` for triggers and displays a short-lived
 * particle overlay. Events are game-specific but this component owns the
 * mapping, so game-view components stay clean.
 *
 * Duration is bounded (`FX_MS`) — hidden after the burst ends. Multiple
 * overlapping events queue and play sequentially.
 */
const FX_MS = 1600;
// STABLE empty array — returning a new [] from the selector each call would
// trip useSyncExternalStore into believing the snapshot changed on every
// render (Object.is fails on new array literals) and infinite-loop.
const EMPTY_EVENTS: unknown[] = [];

type Fx =
  | { kind: "revolution" }
  | { kind: "quad" }
  | { kind: "roundEnd" }
  | { kind: "matchEnd" };

export function EventFx() {
  const events = useStore((s) => s.gameView?.lastEvents ?? EMPTY_EVENTS);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const [active, setActive] = useState<Fx | null>(null);

  useEffect(() => {
    if (!events.length) return;
    // Pick the most dramatic event in this batch.
    const rank = (e: any): number => {
      switch (e?.type) {
        case "matchEnd":
          return 4;
        case "revolution":
          return 3;
        case "roundEnd":
          return 2;
        case "quadClear":
          return 1;
        default:
          return 0;
      }
    };
    const chosen = [...events].sort((a, b) => rank(b) - rank(a))[0] as any;
    const kind: Fx["kind"] | null =
      chosen?.type === "revolution"
        ? "revolution"
        : chosen?.type === "quadClear"
        ? "quad"
        : chosen?.type === "roundEnd"
        ? "roundEnd"
        : chosen?.type === "matchEnd"
        ? "matchEnd"
        : null;
    if (!kind) return;
    setActive({ kind });
    const t = setTimeout(() => setActive(null), FX_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  if (!active) return null;
  const variant =
    active.kind === "revolution"
      ? "jester-burst"
      : active.kind === "quad"
      ? "gold-shimmer"
      : active.kind === "roundEnd"
      ? "ember"
      : "crown-rain";
  const label =
    active.kind === "revolution"
      ? "✊ 혁명!"
      : active.kind === "quad"
      ? "쿼드 클리어"
      : active.kind === "roundEnd"
      ? "라운드 종료"
      : "매치 종료";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 240,
      }}
    >
      <Particles variant={variant as any} density={1.5} />
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#fff",
          fontFamily: "var(--font-brand)",
          fontWeight: 900,
          fontSize: 32,
          textShadow: "0 6px 30px rgba(0,0,0,.7)",
          animation: "m-pop var(--dur-med) var(--easing) both",
        }}
      >
        {label}
      </div>
    </div>
  );
}
