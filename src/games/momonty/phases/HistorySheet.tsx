import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import type { MomontyView } from "@shared/games/momonty/logic";
import "./history-sheet.css";

/**
 * Dimi (더미) history bottom sheet — mockup §4-2.
 *
 * Reads plays from `view.historyTail`. Three filter chips:
 *   - 이번 덱: entries since last trick clear
 *   - 라운드 전체: entries this round
 *   - 카운팅: aggregate remaining strong cards
 *
 * Opened via a global `momonti:history:open` window event so the play
 * view's history chip can trigger without prop-drilling.
 */

let opener: (() => void) | null = null;
export function openHistorySheet(): void {
  opener?.();
}

export function HistorySheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"trick" | "round" | "count">("trick");
  const view = useStore((s) => s.gameView?.view) as MomontyView | undefined;
  useEffect(() => {
    opener = () => setOpen(true);
    const onOpen = () => setOpen(true);
    window.addEventListener("momonti:history:open", onOpen);
    return () => {
      opener = null;
      window.removeEventListener("momonti:history:open", onOpen);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open || !view) return null;

  const seatNames = view.seatNames ?? {};
  const historyTail = view.historyTail ?? [];

  interface Rec {
    seatId?: string;
    cards: { value: number | null }[];
    type: string;
    isLead?: boolean;
    tookPile?: boolean;
    followedByAllPass?: boolean;
  }
  const playsThisTrick: Rec[] = [];
  const playsThisRound: Rec[] = [];

  // Walk forward — capture per-trick lead + winner + trailing all-pass.
  let curTrick: Rec[] = [];
  const flushTrick = (): void => {
    if (curTrick.length === 0) return;
    curTrick[0].isLead = true;
    // Winner = last non-pass entry.
    for (let i = curTrick.length - 1; i >= 0; i--) {
      if (curTrick[i].type === "play") {
        curTrick[i].tookPile = true;
        // If everyone after them passed, tag "이후 전원 패스".
        const passAfter = curTrick.slice(i + 1).every((r) => r.type !== "play");
        if (i < curTrick.length - 1 && passAfter) curTrick[i].followedByAllPass = true;
        break;
      }
    }
    for (const r of curTrick) playsThisRound.push(r);
  };
  for (const e of historyTail as any[]) {
    if (e.type === "trickClear") {
      flushTrick();
      curTrick = [];
      continue;
    }
    if (e.type === "play" && e.payload?.cards) {
      curTrick.push({
        seatId: e.seatId,
        cards: e.payload.cards,
        type: "play",
      });
    } else if (e.type === "pass") {
      curTrick.push({ seatId: e.seatId, cards: [], type: "pass" });
    } else if (e.type === "autoPass") {
      curTrick.push({ seatId: e.seatId, cards: [], type: "auto-pass" });
    }
  }
  // Anything left in curTrick is the ongoing trick.
  for (const r of curTrick) {
    if (curTrick[0] === r) r.isLead = true;
    playsThisTrick.push(r);
    playsThisRound.push(r);
  }
  // Newest first for display.
  playsThisTrick.reverse();
  playsThisRound.reverse();

  const rows = tab === "trick" ? playsThisTrick : tab === "round" ? playsThisRound : [];
  const sets = Math.max(1, view.config.cardSets);
  const totalDealt = ((view.config.cardMax * (view.config.cardMax + 1)) / 2) * sets;
  const remainingByValue = new Map<number, number>();
  for (let v = 1; v <= view.config.cardMax; v++) {
    remainingByValue.set(v, v * sets);
  }
  let jestersRemaining = view.config.jestersPerSet * sets;
  for (const p of playsThisRound) {
    for (const c of p.cards) {
      if (c.value == null) jestersRemaining -= 1;
      else remainingByValue.set(c.value, (remainingByValue.get(c.value) ?? 0) - 1);
    }
  }

  return (
    <div className="history-scrim" onClick={() => setOpen(false)}>
      <div className="history-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="history-grabber" />
        <div className="history-head">
          <span className="history-title">더미 히스토리</span>
          <button
            type="button"
            className="history-close"
            onClick={() => setOpen(false)}
            aria-label="close"
          >
            ✕
          </button>
        </div>
        <div className="history-sub">
          라운드 {view.round} ·{" "}
          {tab === "trick"
            ? "이번 리드에 나온 세트 (최신순)"
            : tab === "round"
            ? "이번 라운드에 나온 세트 (최신순)"
            : "남은 카드 카운팅"}
        </div>
        <div className="history-tabs">
          <button
            type="button"
            className={`history-tab ${tab === "trick" ? "active" : ""}`}
            onClick={() => setTab("trick")}
          >
            이번 리드
          </button>
          <button
            type="button"
            className={`history-tab ${tab === "round" ? "active" : ""}`}
            onClick={() => setTab("round")}
          >
            라운드 전체
          </button>
          <button
            type="button"
            className={`history-tab ${tab === "count" ? "active" : ""}`}
            onClick={() => setTab("count")}
          >
            카운팅
          </button>
        </div>
        <div className="history-body">
          {tab === "count" ? (
            <div className="history-count">
              <div className="history-count-label">남은 강카드 카운팅</div>
              <div className="history-count-chips">
                {[...remainingByValue.entries()].map(([val, left]) => (
                  <span
                    key={val}
                    className={`history-count-chip ${left === 0 ? "empty" : ""}`}
                  >
                    {val}×{left}
                  </span>
                ))}
                <span className={`history-count-chip wild ${jestersRemaining === 0 ? "empty" : ""}`}>
                  ★×{jestersRemaining}
                </span>
              </div>
              <div className="history-count-total">
                덱 총 {totalDealt + view.config.jestersPerSet * sets}장 · 남은 조합 참고
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="history-empty">아직 기록이 없어요</div>
          ) : (
            rows.map((r, i) => {
              const isMe = r.seatId === view.mySeatId;
              const displayName = r.seatId
                ? isMe
                  ? `나 (${seatNames[r.seatId] ?? "나"})`
                  : seatNames[r.seatId] ?? r.seatId
                : "-";
              return (
                <div
                  key={i}
                  className={`history-row ${r.tookPile ? "took-pile" : ""} ${
                    r.type === "play" ? "" : "passed"
                  }`}
                >
                  <span className="history-row-idx">{rows.length - i}</span>
                  {r.type === "play" ? (
                    <span className="history-mini-cards">
                      {r.cards.map((c, j) => (
                        <span
                          key={j}
                          className={`history-mini-card ${c.value == null ? "wild" : ""}`}
                        >
                          {c.value ?? "★"}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="history-pass-pill">
                      {r.type === "auto-pass" ? "자동 패스" : "패스"}
                    </span>
                  )}
                  <span className={`history-actor ${isMe ? "me" : ""}`}>
                    {r.isLead ? "👑 " : ""}
                    {displayName}
                    {r.isLead ? " · 리드" : ""}
                  </span>
                  {r.tookPile ? (
                    <span className="history-tag took">최종 획득 ✓</span>
                  ) : r.followedByAllPass ? (
                    <span className="history-tag pass-after">이후 전원 패스</span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
