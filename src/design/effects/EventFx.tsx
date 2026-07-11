import { useEffect, useRef, useState } from "react";
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
  | { kind: "quad"; byMe: boolean; actorName?: string }
  | { kind: "roundEnd" }
  | { kind: "matchEnd" };

export function EventFx() {
  const events = useStore((s) => s.gameView?.lastEvents ?? EMPTY_EVENTS);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const view = useStore((s) => (s.gameView?.view as any) ?? null);
  const [active, setActive] = useState<Fx | null>(null);
  // Prevent a rapid-fire storm (e.g., two mirror bumps carrying the same
  // quadClear event) from re-triggering the FX. We stamp each processed
  // version and refuse to re-play the same one.
  const firedVersionRef = useRef<number>(-1);

  useEffect(() => {
    if (!events.length) return;
    if (version === firedVersionRef.current) return;
    firedVersionRef.current = version;
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
    if (kind === "quad") {
      const actor = chosen?.actorSeatId as string | undefined;
      const mySeatId = view?.mySeatId as string | undefined;
      const actorName = actor ? view?.seatNames?.[actor] : undefined;
      setActive({ kind, byMe: !!actor && actor === mySeatId, actorName });
    } else {
      setActive({ kind } as Fx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Ownership of the "hide after FX_MS" timer lives here so cleanup on
  // active-change doesn't accidentally cancel a pending null-set.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), FX_MS);
    return () => clearTimeout(t);
  }, [active]);

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

  const bgFor = (kind: Fx["kind"]): string => {
    if (kind === "quad") {
      return "radial-gradient(65% 55% at 50% 42%, rgba(242,193,78,.42), transparent 65%), radial-gradient(80% 80% at 50% 50%, rgba(200,85,240,.14), transparent 70%)";
    }
    if (kind === "revolution") {
      return "radial-gradient(70% 60% at 50% 42%, rgba(200,85,240,.42), transparent 65%)";
    }
    return "radial-gradient(70% 60% at 50% 42%, rgba(255,255,255,.14), transparent 65%)";
  };
  const gradientText: React.CSSProperties =
    active.kind === "quad"
      ? {
          background: "linear-gradient(135deg, #ffe6a0, #f2c14e 40%, #c855f0)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : { color: "#fff" };

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 240,
        background: bgFor(active.kind),
        animation: "m-fade-in 0.28s var(--easing)",
      }}
    >
      <Particles variant={variant as any} density={1.5} />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-brand)",
          fontWeight: 900,
          fontSize: 44,
          letterSpacing: "0.02em",
          textShadow: "0 8px 40px rgba(0,0,0,.8), 0 0 22px rgba(242,193,78,.4)",
          animation: "quad-pop 1.6s var(--easing) both",
          ...gradientText,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          top: "calc(40% + 60px)",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-body)",
          fontWeight: 700,
          fontSize: 12,
          color: "#f8d98a",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.85,
          animation: "m-fade-in 0.5s var(--easing) both 0.15s",
        }}
      >
        {active.kind === "quad"
          ? active.byMe
            ? "QUAD CLEAR · 계속 리드"
            : `QUAD CLEAR · ${active.actorName ?? "상대"} 리드`
          : active.kind === "revolution"
          ? "REVOLUTION"
          : active.kind === "roundEnd"
          ? "ROUND END"
          : "MATCH END"}
      </div>
      <style>{`
        @keyframes quad-pop {
          0% { opacity: 0; transform: scale(0.65) rotate(-4deg); }
          20% { opacity: 1; transform: scale(1.1) rotate(2deg); }
          40% { transform: scale(1) rotate(0deg); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
