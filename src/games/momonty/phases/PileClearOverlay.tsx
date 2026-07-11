import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import type React from "react";
import { useOverlayHold } from "@web/state/hooks";
import { CountdownRing } from "@web/design/effects/CountdownRing";
import type { MomontyView } from "@shared/games/momonty/logic";
import "./pile-clear-overlay.css";

const HOLD_MS = 10000;

/**
 * PileClearOverlay — §4-1 "공유더미 정리 → 새 리드 획득".
 *
 * Renders briefly when the engine broadcasts a `trickClear` event as a
 * result of all-pass (or quad clear). Highlights who took the pile, how
 * many cards were retired, and the remaining hand counts. Auto-dismisses
 * after 3.5 s or on CTA tap. Freezes the play-surface timer while up.
 */
export function PileClearOverlay() {
  const events = useStore((s) => s.gameView?.lastEvents);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const view = useStore((s) => s.gameView?.view) as MomontyView | undefined;
  const [open, setOpen] = useState<null | {
    winnerSeatId: string;
    winnerCards: { value: number | null }[];
    cardCount: number;
    kind: "all-pass" | "quad";
  }>(null);

  useEffect(() => {
    if (!Array.isArray(events)) return;
    let winnerSeatId: string | undefined;
    let winnerCards: { value: number | null }[] = [];
    let cardCount = 0;
    let clearKind: "all-pass" | "quad" | null = null;
    let lastPlayCards: { value: number | null }[] | undefined;
    let lastPlayActor: string | undefined;
    for (const e of events as any[]) {
      if (e?.type === "play" && e.payload?.cards && e.actorSeatId) {
        lastPlayCards = e.payload.cards;
        lastPlayActor = e.actorSeatId;
      }
      if (e?.type === "trickClear") {
        clearKind = "all-pass";
        winnerSeatId = e.actorSeatId;
        winnerCards = e.payload?.cards ?? [];
        cardCount = e.payload?.count ?? winnerCards.length;
      }
      if (e?.type === "quadClear") {
        clearKind = "quad";
        winnerSeatId = e.actorSeatId ?? lastPlayActor;
        winnerCards = lastPlayCards ?? [];
        cardCount = winnerCards.length;
      }
    }
    if (!clearKind || !winnerSeatId) return;
    // Quad clear plays its own celebratory FX layer first (EventFx runs
    // ~1.6 s). Defer the pile-clear overlay so the two don't fight for
    // the screen; all-pass has no effect, opens immediately.
    const delay = clearKind === "quad" ? 1700 : 0;
    const payload = { winnerSeatId, winnerCards, cardCount, kind: clearKind };
    const t = window.setTimeout(() => setOpen(payload), delay);
    return () => window.clearTimeout(t);
  }, [version, events]);

  useOverlayHold(!!open);
  // Manual-dismiss only. Users complained the overlay closed before they
  // could read it. Freeze the play surface via overlayHold while up;
  // tapping the CTA (or backdrop) hides it.

  if (!open || !view) return null;
  const seatNames = view.seatNames ?? {};
  const isMe = open.winnerSeatId === view.mySeatId;
  const winnerName = isMe
    ? "내가"
    : seatNames[open.winnerSeatId] ?? open.winnerSeatId.slice(-4);
  const others = view.seatOrder.filter((s) => (view.handCounts[s] ?? 0) > 0);

  return (
    <div className="pile-clear-scrim">
      <div className="pile-clear-card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="pile-clear-eyebrow">
          {open.kind === "all-pass" ? "전원 패스 · 공유더미 정리" : "쿼드 클리어 · 공유더미 회수"}
        </div>
        <div className="pile-clear-title">공유더미가 정리됩니다</div>

        {(() => {
          const topValue = open.winnerCards[0]?.value ?? "★";
          const topWild = open.winnerCards[0]?.value == null;
          return (
            <>
              <div className="pile-clear-stack">
                <span className="pile-clear-back back-1" />
                <span className="pile-clear-back back-2" />
                <span className={`pile-clear-front ${topWild ? "wild" : ""}`}>{topValue}</span>
              </div>
              <div className="pile-clear-qty">
                마지막 낸 카드 · <b>{topValue}×{open.winnerCards.length || 1}</b>
                {" · "}
                이번 리드 총 <b>{open.cardCount}장</b>
              </div>
            </>
          );
        })()}

        <div className={`pile-clear-lead ${isMe ? "me" : ""}`}>
          <span className="pile-clear-lead-avatar">
            {isMe ? "나" : winnerName.slice(0, 2)}
          </span>
          <div className="pile-clear-lead-body">
            <div className="pile-clear-lead-title">
              {isMe
                ? "내가 마지막에 냈어요"
                : `${winnerName}(이)가 마지막에 냈어요`}
            </div>
            <div className="pile-clear-lead-sub">
              {isMe
                ? "내가 새 리드를 시작합니다"
                : `${winnerName} 리드로 새 라운드 시작`}
            </div>
          </div>
          <span className="pile-clear-lead-icon">🎏</span>
        </div>

        <div className="pile-clear-hands">
          <div className="pile-clear-hands-label">남은 손패 현황</div>
          <div className="pile-clear-hands-rows">
            {others.map((s) => (
              <div key={s} className="pile-clear-hands-row">
                <span
                  className={
                    s === view.mySeatId ? "pile-clear-hand-me" : "pile-clear-hand-name"
                  }
                >
                  {s === view.mySeatId
                    ? `나 (${seatNames[s] ?? s.slice(-4)})`
                    : seatNames[s] ?? s.slice(-4)}
                </span>
                <span className="pile-clear-hand-count">{view.handCounts[s] ?? 0}장</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pile-clear-cta-row">
          <CountdownRing
            active
            durationMs={HOLD_MS}
            onDone={() => setOpen(null)}
            tone="brand"
            size={40}
          >
            {(sec) => <span className="pile-clear-ring-sec">{sec}</span>}
          </CountdownRing>
          <button
            type="button"
            className="pile-clear-cta"
            onClick={() => setOpen(null)}
          >
            {open.kind === "all-pass" ? "새 리드 시작 ▶" : "계속 리드 ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
