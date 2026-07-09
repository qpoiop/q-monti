import { PlayingCard } from "@web/design/PlayingCard";
import { Button } from "@web/design/primitives";
import { send } from "@web/state/store";
import type { MomontyView } from "@shared/games/momonty/logic";
import "./draw-rank.css";

/**
 * Phase — DRAWING_RANK.
 *
 * Design (from mockup):
 *   골드 subtitle "라운드 N · 서열 결정"
 *   Big title "카드를 뽑아 자리를 정합니다"
 *   Small note (subtitle)
 *   3 fanned cards — outer two face-down, centre raised, gold-ringed,
 *   shows the drawn value once picked.
 *   Gold pill "내 카드 N · 예상 M위"
 *   Draw progress card listing each seat.
 *   CTA at the bottom.
 */
export function DrawRank({ view }: { view: MomontyView }) {
  const mySeatId = view.mySeatId ?? null;
  const picks = view.drawRank?.picks ?? {};
  const myPick = mySeatId ? picks[mySeatId] : undefined;
  const already = myPick != null;
  const seatNames = view.seatNames ?? {};
  const total = view.seatOrder.length;
  const doneCount = Object.keys(picks).length;

  // Predict rank position based on current pick sorted with existing picks.
  const expectedPos = (() => {
    if (myPick == null) return null;
    const sorted = [...view.seatOrder]
      .filter((s) => picks[s] != null)
      .sort((a, b) => (picks[a] ?? 99) - (picks[b] ?? 99));
    const idx = sorted.indexOf(mySeatId!);
    return idx >= 0 ? idx + 1 : null;
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
        <div className="draw-rank-centre">
          <PlayingCard
            tone="royal"
            value={already ? myPick : undefined}
            label={already ? undefined : "?"}
            size="lg"
            crown={already && myPick === 1}
            selected
          />
        </div>
        <PlayingCard tone="back" label="?" size="lg" />
      </div>

      {already ? (
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
        <div className="draw-rank-hint">아직 뽑지 않았어요 · 카드 뽑기 버튼을 눌러 주세요</div>
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
            const name = seatNames[seatId] ?? (mine ? "나" : seatId);
            return (
              <div key={seatId} className="draw-rank-row" data-mine={mine ? "true" : "false"}>
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
          {already ? "다음 플레이어를 기다리는 중" : "카드 뽑기"}
        </Button>
      </div>
    </div>
  );
}
