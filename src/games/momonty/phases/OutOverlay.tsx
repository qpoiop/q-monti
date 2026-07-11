import { useEffect, useMemo, useState } from "react";
import type { MomontyView } from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";
import { RANK_ICON, previewRankFor } from "../rank-ui";
import "./out-overlay.css";

/**
 * OutOverlay — celebratory §5-1 overlay when the viewing seat empties
 * their hand mid-round. Auto-dismisses after 4 s; tapping the CTA
 * (관전하기) hides it immediately so the seat can watch the rest of
 * the round play out.
 */
export function OutOverlay({ view }: { view: MomontyView }) {
  const mySeat = view.mySeatId;
  const outIdx = useMemo(
    () => (mySeat ? view.outOrder.indexOf(mySeat) : -1),
    [mySeat, view.outOrder]
  );
  const myHandLen = view.myHand?.length ?? 999;
  const active =
    !!mySeat &&
    myHandLen === 0 &&
    outIdx >= 0 &&
    view.phase === "PLAYING";

  const [dismissed, setDismissed] = useState<string | null>(null);
  const key = mySeat ? `${view.round}:${mySeat}` : "";

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setDismissed(key), 4600);
    return () => clearTimeout(t);
  }, [active, key]);

  if (!active || dismissed === key) return null;

  const nth = outIdx + 1;
  const nthLabel =
    nth === 1 ? "1번째" : nth === 2 ? "2번째" : nth === 3 ? "3번째" : `${nth}번째`;

  const seatNames = view.seatNames ?? {};
  const orderRows = view.seatOrder.map((seatId) => {
    const idx = view.outOrder.indexOf(seatId);
    const done = idx >= 0;
    const name =
      seatId === mySeat
        ? `나 (${seatNames[seatId] ?? "나"})`
        : seatNames[seatId] ?? seatId.slice(-4);
    return { seatId, done, order: idx + 1, name, isMe: seatId === mySeat };
  });

  const lastPlay = [...view.historyTail]
    .reverse()
    .find((h: any) => h.type === "play" && h.seatId === mySeat) as
    | { type: string; seatId: string; payload: { cards: { id: string; value: number | null }[] } }
    | undefined;
  const lastCards = lastPlay?.payload?.cards ?? [];

  return (
    <div className="out-overlay" onClick={() => setDismissed(key)}>
      <div className="out-scrim" />
      <div className="out-panel">
        <div className="out-eyebrow">🎉</div>
        <div className="out-title">아웃!</div>
        <div className="out-sub">
          마지막 카드를 냈습니다 · 이번 라운드 <b>{nthLabel}</b> 아웃
        </div>
        {lastCards.length > 0 ? (
          <div className="out-cards">
            {lastCards.map((c, i) => (
              <span
                key={c.id}
                className={`out-card ${c.value == null ? "wild" : ""}`}
                style={{
                  transform: `rotate(${(i - (lastCards.length - 1) / 2) * 6}deg)`,
                }}
              >
                {c.value == null ? "★" : c.value}
              </span>
            ))}
          </div>
        ) : null}
        {(() => {
          const rank = previewRankFor(nth, view.seatOrder.length);
          return (
            <div className="out-rank-preview" data-tier={rank.toLowerCase()}>
              <div className="out-rank-preview-label">다음 라운드 내 서열</div>
              <div className="out-rank-preview-name">
                {RANK_ICON[rank]} {RANK_LABEL_KO[rank]}
              </div>
              <div className="out-rank-preview-sub">
                {nth}위 확정
                {rank === "GRAND_MOMONTY"
                  ? " · 리드 시작권"
                  : rank === "MOMONTY"
                  ? " · 과세 특전 유지"
                  : rank === "GRAND_PEON"
                  ? " · 상납 2장"
                  : rank === "PEON"
                  ? " · 상납 1장"
                  : " · 상인"}
              </div>
            </div>
          );
        })()}
        <div className="out-order-card">
          <div className="out-order-label">아웃 순서</div>
          <div className="out-order-rows">
            {orderRows.map((r) => (
              <div
                key={r.seatId}
                className="out-order-row"
                data-me={r.isMe ? "true" : "false"}
                data-done={r.done ? "true" : "false"}
              >
                <span className="out-order-name">
                  {r.done ? `${r.order}위 · ` : ""}
                  {r.name}
                </span>
                <span className="out-order-tag">
                  {r.done
                    ? r.isMe
                      ? "방금 아웃 ✓"
                      : "아웃 ✓"
                    : "플레이 중…"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="out-cta"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(key);
          }}
        >
          관전하기 ▶
        </button>
      </div>
    </div>
  );
}
