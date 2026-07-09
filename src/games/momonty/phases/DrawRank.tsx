import { useEffect, useRef, useState } from "react";
import { PlayingCard } from "@web/design/PlayingCard";
import { Button } from "@web/design/primitives";
import { send } from "@web/state/store";
import type { MomontyView } from "@shared/games/momonty/logic";
import "./draw-rank.css";

/**
 * Phase — DRAWING_RANK.
 *
 * Layout:
 *   Round eyebrow · big title · sub note
 *   Three fanned cards (outer two face-down · centre highlight)
 *   "내 카드 N · 예상 M위" gold pill after a pick
 *   Draw progress card — the picked seat gets a focus highlight so
 *     it's clear whose result just landed, and the row auto-scrolls
 *     into view for large parties.
 *   CTA anchored at the bottom.
 *
 * Number-roll animation
 *   When we detect a new pick for `mySeatId`, the centre card cycles
 *   random values for ~700ms before settling on the real number,
 *   giving the pick a game-show reveal.
 */
export function DrawRank({ view }: { view: MomontyView }) {
  const mySeatId = view.mySeatId ?? null;
  const picks = view.drawRank?.picks ?? {};
  const myPick = mySeatId ? picks[mySeatId] : undefined;
  const already = myPick != null;
  const seatNames = view.seatNames ?? {};
  const total = view.seatOrder.length;
  const doneCount = Object.keys(picks).length;

  const [rolling, setRolling] = useState<number | null>(null);
  const prevPickRef = useRef<number | undefined>(myPick);
  useEffect(() => {
    if (myPick != null && prevPickRef.current == null) {
      // A new pick just arrived for me — spin numbers before settling.
      let ticks = 0;
      const id = setInterval(() => {
        setRolling(1 + Math.floor(Math.random() * view.config.cardMax));
        ticks += 1;
        if (ticks > 8) {
          clearInterval(id);
          setRolling(null);
        }
      }, 70);
      return () => clearInterval(id);
    }
    prevPickRef.current = myPick;
  }, [myPick, view.config.cardMax]);

  // Predicted position based on all currently-revealed picks.
  const expectedPos = (() => {
    if (myPick == null) return null;
    const sorted = [...view.seatOrder]
      .filter((s) => picks[s] != null)
      .sort((a, b) => (picks[a] ?? 99) - (picks[b] ?? 99));
    const idx = sorted.indexOf(mySeatId!);
    return idx >= 0 ? idx + 1 : null;
  })();

  // Recently-picked seat (last person to draw) → focus row.
  const focusedSeat = (() => {
    const drawn = view.seatOrder.filter((s) => picks[s] != null);
    return drawn[drawn.length - 1] ?? null;
  })();

  return (
    <div className="draw-rank">
      <div className="draw-rank-heading">
        <div className="draw-rank-eyebrow">라운드 {view.round} · 서열 결정</div>
        <div className="draw-rank-title">카드를 뽑아 자리를 정합니다</div>
        <div className="draw-rank-sub">낮은 숫자일수록 높은 서열</div>
      </div>

      <div className="draw-rank-fan">
        <PlayingCard tone="back" label="?" size="lg" />
        <div className={`draw-rank-centre ${rolling != null ? "rolling" : already ? "settled" : ""}`}>
          <PlayingCard
            tone="royal"
            value={rolling ?? (already ? myPick : undefined)}
            label={rolling == null && !already ? "?" : undefined}
            size="lg"
            crown={already && myPick === 1 && rolling == null}
            selected
          />
        </div>
        <PlayingCard tone="back" label="?" size="lg" />
      </div>

      {already && rolling == null ? (
        <div className="draw-rank-result">
          내 카드 <b>{myPick}</b>
          {expectedPos ? (
            <>
              {" · "}
              예상 <b>{expectedPos}위</b>
            </>
          ) : null}
        </div>
      ) : (
        <div className="draw-rank-hint">
          {rolling != null ? "카드를 뽑는 중…" : "카드 뽑기 버튼을 눌러 주세요"}
        </div>
      )}

      <div className="draw-rank-progress">
        <div className="draw-rank-progress-head">
          <span className="draw-rank-progress-label">뽑기 현황</span>
          <span className="draw-rank-progress-count">
            {doneCount}/{total}
          </span>
        </div>
        <div className="draw-rank-progress-list">
          {view.seatOrder.map((seatId) => {
            const pick = picks[seatId];
            const mine = seatId === mySeatId;
            const isFocus = seatId === focusedSeat && pick != null;
            const name = seatNames[seatId] ?? (mine ? "나" : seatId);
            return (
              <div
                key={seatId}
                className="draw-rank-row"
                data-mine={mine ? "true" : "false"}
                data-focus={isFocus ? "true" : "false"}
              >
                <span className="draw-rank-row-name">{name}</span>
                <span className="draw-rank-row-value" data-done={pick != null ? "true" : "false"}>
                  {pick != null ? (
                    <>
                      {pick === 1 ? <span className="crown-mini">👑</span> : null}
                      {pick}
                    </>
                  ) : (
                    "뽑는 중…"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="draw-rank-cta">
        <Button
          full
          variant="primary"
          disabled={already}
          onClick={() => send({ t: "action", action: { t: "drawRank" } })}
        >
          {already ? "다른 플레이어를 기다리는 중" : "카드 뽑기"}
        </Button>
      </div>
    </div>
  );
}
