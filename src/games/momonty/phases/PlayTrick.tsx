import { useEffect, useMemo, useRef, useState } from "react";
import { send, useStore } from "@web/state/store";
import type {
  Card as MCard,
  MomontyView,
  TrickForm,
} from "@shared/games/momonty/logic";
import { OutOverlay } from "./OutOverlay";
import "./play-trick.css";

/**
 * Phase — PLAYING.
 *
 * Header (turn pill + timer ring) · Opp strip · Requirement pill ·
 * Pile · Selected preview (reserved height) · Hand · Action bar.
 *
 * Rules baked into the UI:
 *   - Cards that cannot possibly contribute to a valid follow are
 *     disabled at the DOM level — the click does nothing.
 *   - Selected preview always occupies the same height so the layout
 *     doesn't jump every time the user taps.
 *   - Timer counts down; at 0 the seat auto-passes when following, or
 *     the button label reads "시간 초과" when leading (server will
 *     handle actual forfeit).
 */

const EMPTY_EVENTS_ARR: unknown[] = [];
type SortMode = "asc" | "desc" | "group";

type ClsError = "form-mismatch" | "too-weak" | null;

interface Classification {
  kind: "single" | "pair" | "triple" | "quad" | "straight";
  value: number;
  size: number;
  jesters: number;
  wildBase: number;
  cards: MCard[];
}

function classify(cards: MCard[]): Classification | null {
  if (cards.length === 0) return null;
  const jesters = cards.filter((c) => c.value === null);
  const numbered = cards.filter((c) => c.value != null) as (MCard & { value: number })[];
  if (numbered.length === 0) return null;
  const values = numbered.map((c) => c.value).sort((a, b) => a - b);
  const uniq = new Set(values);
  const base = values[0];
  if (uniq.size === 1 && cards.length <= 4) {
    const kind =
      cards.length === 1
        ? "single"
        : cards.length === 2
        ? "pair"
        : cards.length === 3
        ? "triple"
        : "quad";
    return {
      kind,
      value: base,
      size: cards.length,
      jesters: jesters.length,
      wildBase: base,
      cards,
    };
  }
  if (cards.length >= 3) {
    const len = cards.length;
    for (let start = Math.max(1, Math.max(...values) - len + 1); start <= base; start++) {
      const target = new Set<number>();
      for (let i = 0; i < len; i++) target.add(start + i);
      let missing = 0;
      for (const v of target) if (!values.includes(v)) missing++;
      if (missing === jesters.length) {
        return {
          kind: "straight",
          value: start,
          size: len,
          jesters: jesters.length,
          wildBase: start,
          cards,
        };
      }
    }
  }
  return null;
}

function checkAgainstForm(
  form: TrickForm,
  cls: Classification,
  great: boolean
): ClsError {
  if (form.kind === "none") return null;
  if (form.kind === "straight" && cls.kind === "straight") {
    if (form.length !== cls.size) return "form-mismatch";
    const target = form.startValue;
    return great ? (cls.value > target ? null : "too-weak") : cls.value < target ? null : "too-weak";
  }
  if (form.kind !== cls.kind) return "form-mismatch";
  const target = "value" in form ? form.value : 0;
  return great ? (cls.value > target ? null : "too-weak") : cls.value < target ? null : "too-weak";
}

/**
 * Whether a card can EVER contribute to a follow given the current
 * form. Jesters always qualify, numbered cards must be strictly lower
 * than the target value.
 */
interface WildTip {
  value: number;
  size: number;
  baseCount: number;
  wildCount: number;
  cardIds: string[];
}

function countJesters(hand: MCard[]): number {
  return hand.filter((c) => c.value === null).length;
}

/**
 * Suggests jester-backed plays. Only fires when jesters are in hand.
 * Leading: recommends the LARGEST feasible set per value (padding with
 *   jesters up to 4-of-a-kind). Ranked by value ascending — cheaper
 *   plays first, so the tip drives seats to play their weaker cards.
 * Following: only surfaces sets that legally beat the current form.
 *
 * Only top 3 tips returned; excessive suggestions clutter the frame.
 */
/**
 * Suggests every playable set combo for the current seat. Includes
 * plain (no jester) plays AND jester-backed builds. Straights are
 * still out of scope for the panel to keep the frame compact.
 *
 * Leader: any same-value group of size 1..4.
 * Follower: only combos whose value beats the current form and whose
 *   size matches the form (single↔single, pair↔pair, …). Wild fills
 *   the gap when the numbered stack is short.
 *
 * Top tip is rendered as a visual card build; remaining ones as
 * compact chips. All chips tap-set the target card ids so the tester
 * doesn't have to hunt-and-peck across the hand strip.
 */
function computeWildTips(hand: MCard[], form: TrickForm, great: boolean, cardMax = 12): WildTip[] {
  if (form.kind === "straight") return [];
  const jesters = hand.filter((c) => c.value === null);
  const targetSize =
    form.kind === "single" ? 1 :
    form.kind === "pair" ? 2 :
    form.kind === "triple" ? 3 :
    form.kind === "quad" ? 4 : 0;
  const threshold = form.kind === "none" ? null : ("value" in form ? form.value : null);
  const byValue = new Map<number, MCard[]>();
  for (const c of hand) {
    if (c.value == null) continue;
    const arr = byValue.get(c.value) ?? [];
    arr.push(c);
    byValue.set(c.value, arr);
  }
  const tips: WildTip[] = [];
  const beatsThreshold = (v: number): boolean => {
    if (threshold == null) return true;
    return great ? v > threshold : v < threshold;
  };
  // Iterate every possible target value (1..cardMax), not just the ones
  // sitting in hand. Lets jester-only plays surface when they'd beat the
  // pile — previously we skipped these because byValue didn't include v.
  for (let v = 1; v <= cardMax; v++) {
    if (!beatsThreshold(v)) continue;
    const cards = byValue.get(v) ?? [];
    // Wild has to combo with a numbered card — a solo jester is worthless
    // (auto-13 rule), so we only generate tips anchored on real cards.
    if (cards.length === 0) continue;
    if (form.kind === "none") {
      const maxAchievable = Math.min(4, cards.length + jesters.length);
      for (let s = 1; s <= maxAchievable; s++) {
        const wildNeeded = Math.max(0, s - cards.length);
        if (wildNeeded > jesters.length) continue;
        const baseCount = s - wildNeeded;
        tips.push({
          value: v,
          size: s,
          baseCount,
          wildCount: wildNeeded,
          cardIds: [
            ...cards.slice(0, baseCount),
            ...jesters.slice(0, wildNeeded),
          ].map((c) => c.id),
        });
      }
    } else {
      if (targetSize < 1) continue;
      const needed = targetSize;
      const wildNeeded = Math.max(0, needed - cards.length);
      if (wildNeeded > jesters.length) continue;
      const baseCount = needed - wildNeeded;
      tips.push({
        value: v,
        size: needed,
        baseCount,
        wildCount: wildNeeded,
        cardIds: [
          ...cards.slice(0, baseCount),
          ...jesters.slice(0, wildNeeded),
        ].map((c) => c.id),
      });
    }
  }
  // Post-process:
  //   - Dedupe per value keeping the largest size; a rec of both 11×3
  //     and 11×2 for the same hand is redundant, the smaller is strictly
  //     a subset.
  let processed = tips;
  const bestByValue = new Map<number, WildTip>();
  for (const t of processed) {
    const cur = bestByValue.get(t.value);
    if (
      !cur ||
      t.size > cur.size ||
      (t.size === cur.size && t.wildCount < cur.wildCount)
    ) {
      bestByValue.set(t.value, t);
    }
  }
  processed = [...bestByValue.values()];
  // Weakest cards first (higher value = weaker in Momonti); within a
  // value, larger sets preferred so peons dump their thickest bricks,
  // and among ties fewer wilds so jesters stay in reserve.
  processed.sort((a, b) => {
    return b.value - a.value || b.size - a.size || a.wildCount - b.wildCount;
  });
  return processed.slice(0, 6);
}

function canFollowWithCard(card: MCard, form: TrickForm): boolean {
  if (form.kind === "none") return true;
  if (card.value === null) return true;
  const target = "value" in form ? form.value : form.kind === "straight" ? form.startValue : 0;
  return card.value < target;
}

export function PlayTrick({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("asc");
  const [passBanner, setPassBanner] = useState(false);
  const hand = view.myHand ?? [];
  // React to the shared event log so we can flash a brief "N명 자동 패스"
  // and "덱 정리" overlay whenever the server tick tells us something
  // interesting happened. Live rooms will produce the same events; test
  // mode wires them through the local reducer.
  const events = useStore((s) => s.gameView?.lastEvents ?? EMPTY_EVENTS_ARR);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const [flash, setFlash] = useState<null | { kind: "auto-pass" | "clear" | "quad"; count?: number }>(null);
  useEffect(() => {
    if (!events || !Array.isArray(events)) return;
    // Count auto-pass events in the latest batch. Fall back to a generic
    // clear notice when the pile just cleared.
    let autoPass = 0;
    let clear = false;
    let quad = false;
    for (const e of events as any[]) {
      if (e?.type === "autoPass") autoPass += 1;
      if (e?.type === "quadClear") quad = true;
      if (e?.type === "trickClear") clear = true;
    }
    // Nothing new — leave the existing flash alone (its own timer will
    // clear it). Previously we set a fresh timeout on every version bump
    // and its cleanup killed the ORIGINAL timeout, which is why the quad
    // clear text got stranded when bots kept dispatching in the interim.
    if (!(autoPass || quad || clear)) return;
    if (autoPass > 0) setFlash({ kind: "auto-pass", count: autoPass });
    else if (quad) setFlash({ kind: "quad" });
    else if (clear) setFlash({ kind: "clear" });
    const id = window.setTimeout(() => setFlash(null), 1500);
    return () => window.clearTimeout(id);
  }, [version, events]);
  const myTurn = view.currentSeatId === view.mySeatId;
  const isLeading = view.currentTrick.form.kind === "none";
  const isMyOut = !!view.mySeatId && (view.myHand?.length ?? 999) === 0;
  const canPass = !isLeading;
  const seatNames = view.seatNames ?? {};

  const selectedCards = selected
    .map((id) => hand.find((c) => c.id === id))
    .filter(Boolean) as MCard[];
  const cls = classify(selectedCards);
  const formError = cls ? checkAgainstForm(view.currentTrick.form, cls, view.taxation.greatRevolution) : null;
  const hasWild = selectedCards.some((c) => c.value === null);
  const wildTips = useMemo(
    () => (myTurn ? computeWildTips(hand, view.currentTrick.form, view.taxation.greatRevolution, view.config.cardMax) : []),
    [hand, view.currentTrick.form, view.taxation.greatRevolution, myTurn]
  );
  const submitOk =
    myTurn &&
    selectedCards.length > 0 &&
    cls != null &&
    (isLeading || formError === null);

  const toggle = (card: MCard) => {
    // Block interaction with cards that can't help follow the current form.
    if (!isLeading && !canFollowWithCard(card, view.currentTrick.form)) return;
    setSelected((prev) =>
      prev.includes(card.id) ? prev.filter((x) => x !== card.id) : [...prev, card.id]
    );
  };

  const submit = () => {
    if (!submitOk || !cls) return;
    send({
      t: "action",
      action: {
        t: "playCards",
        cardIds: selected,
        wildAsValue: cls.wildBase,
        straightLength: cls.kind === "straight" ? cls.size : undefined,
      },
    });
    const label = hasWild
      ? `${cls.value} ×${cls.size} (★ 와일드) ${isLeading ? "리드" : "내기"} 완료`
      : `${cls.value} ×${cls.size} ${isLeading ? "리드" : "내기"} 완료`;
    window.dispatchEvent(new CustomEvent("momonti:toast", { detail: label }));
    setSelected([]);
  };

  const doPass = () => {
    setSelected([]);
    setPassBanner(true);
    setTimeout(() => setPassBanner(false), 1400);
    send({ t: "action", action: { t: "pass" } });
  };

  /**
   * Timeout auto-action for the current seat.
   * - If there's at least one recommended combo, submit the top tip
   *   (weakest value + largest size). Feels smarter than blind pass.
   * - Otherwise: leaders dump the weakest single (highest numbered
   *   value); followers pass. Leader can't legally pass, so we always
   *   have to play something to keep the round moving.
   */
  const doTimeout = () => {
    if (!myTurn) return;
    if (wildTips.length > 0) {
      const top = wildTips[0];
      send({
        t: "action",
        action: {
          t: "playCards",
          cardIds: top.cardIds,
          wildAsValue: top.value,
        },
      });
      return;
    }
    if (isLeading) {
      const numbered = hand.filter((c) => c.value != null) as (MCard & { value: number })[];
      if (numbered.length > 0) {
        let weakest = numbered[0];
        for (const c of numbered) if (c.value > weakest.value) weakest = c;
        send({
          t: "action",
          action: {
            t: "playCards",
            cardIds: [weakest.id],
            wildAsValue: weakest.value,
          },
        });
        return;
      }
      const jester = hand.find((c) => c.value == null);
      if (jester) {
        send({
          t: "action",
          action: { t: "playCards", cardIds: [jester.id], wildAsValue: 12 },
        });
      }
      return;
    }
    doPass();
  };

  const requirementText = (() => {
    const f = view.currentTrick.form;
    if (f.kind === "none") return null;
    if (f.kind === "straight") {
      return (
        <>
          현재 스트레이트 <b>{f.length}장</b> · <b>{f.startValue}</b>보다 낮은 스트레이트 필요
        </>
      );
    }
    const size = f.kind === "single" ? 1 : f.kind === "pair" ? 2 : f.kind === "triple" ? 3 : 4;
    return (
      <>
        현재 세트 <b>{size}장</b> · <b>{f.value}</b>보다 낮은 {size}장만 가능
      </>
    );
  })();

  const ctaLabel = (() => {
    if (!myTurn) {
      const actor = view.currentSeatId ? seatNames[view.currentSeatId] ?? view.currentSeatId : "";
      return `${actor} 차례 대기…`;
    }
    if (selectedCards.length === 0) return isLeading ? "카드를 골라 리드" : "카드 선택 또는 패스";
    if (!cls) return "낼 수 없는 조합";
    if (formError === "form-mismatch")
      return `형태 불일치 · ${describeForm(view.currentTrick.form)} 필요`;
    if (formError === "too-weak") return `${cls.value} ×${cls.size} · 더 낮아야 함`;
    const suffix = isLeading ? "리드 ▶" : "내기 ▶";
    return hasWild
      ? `${cls.value} ×${cls.size} (★와일드) ${suffix}`
      : `${cls.value} ×${cls.size} ${suffix}`;
  })();

  const ctaTone: "gold" | "green" | "purple" | "muted" = !myTurn
    ? "muted"
    : hasWild && submitOk
    ? "purple"
    : isLeading && submitOk
    ? "gold"
    : submitOk
    ? "green"
    : "muted";

  return (
    <div className="play-trick">
      <OutOverlay view={view} />
      <PlayHeader
        isLeading={isLeading}
        myTurn={myTurn}
        seatKey={view.currentSeatId ?? ""}
        limitSec={view.config.turnLimitSec}
        onTimeout={
          myTurn
            ? doTimeout
            : () => {
                // Test mode fallback: viewer isn't the acting seat but
                // the round still needs to advance. Route to the local
                // test store; live rooms do nothing (server drives).
                import("@web/state/testStore").then(({ autoTurnTimeout, getTestState }) => {
                  if (getTestState()) autoTurnTimeout();
                });
              }
        }
      />
      <OpponentStrip view={view} />

      {requirementText ? <div className="req-pill">{requirementText}</div> : null}

      {isLeading ? <EmptyPile /> : <PileBox view={view} seatNames={seatNames} />}

      {wildTips.length > 0 && myTurn ? (
        <div className="tip-row">
          <button
            type="button"
            className={`tip-top ${wildTips[0].wildCount > 0 ? "with-wild" : ""}`}
            onClick={() => setSelected(wildTips[0].cardIds)}
          >
            <span className="tip-top-label">
              {wildTips[0].wildCount > 0 ? "와일드 추천조합" : "추천 조합"} ·{" "}
              <b>{wildTips[0].value}</b>
              <span className="tip-top-x">×{wildTips[0].size}</span>
            </span>
            <span className="tip-top-cards">
              {Array.from({ length: wildTips[0].baseCount }).map((_, i) => (
                <span key={`b${i}`} className="tip-mini">
                  {wildTips[0].value}
                </span>
              ))}
              {Array.from({ length: wildTips[0].wildCount }).map((_, i) => (
                <span key={`w${i}`} className="tip-mini wild">
                  ★
                </span>
              ))}
            </span>
          </button>
          {wildTips.slice(1, 4).map((t, i) => (
            <button
              key={i}
              type="button"
              className={`tip-alt ${t.wildCount > 0 ? "with-wild" : ""}`}
              onClick={() => setSelected(t.cardIds)}
            >
              {t.value}
              <span className="tip-alt-x">×{t.size}</span>
              {t.wildCount > 0 ? <span className="tip-alt-wild">★{t.wildCount}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {/* Reserved slot — always occupies space so the layout doesn't jump. */}
      <div className="sel-slot">
        {selectedCards.length > 0 && cls ? (
          <SelectedPreview
            cls={cls}
            formError={formError}
            hasWild={hasWild}
            isLeading={isLeading}
          />
        ) : null}
      </div>

      {!myTurn && !isMyOut ? (
        <div className="waiting-band" aria-live="polite">
          <span className="waiting-dot" />
          <span className="waiting-name">
            {view.currentSeatId
              ? seatNames[view.currentSeatId] ?? view.currentSeatId.slice(-4)
              : "다음 참가자"}
          </span>
          <span className="waiting-label">차례 · 기다리는 중…</span>
        </div>
      ) : null}
      <div className="hand-label">
        내 손패 <b>{hand.length}장</b> · 같은 숫자끼리 묶임
      </div>
      <HandStrip
        hand={hand}
        selected={selected}
        form={view.currentTrick.form}
        onToggle={toggle}
        sortMode={sortMode}
        disabled={!myTurn}
      />

      {flash ? (
        <div className={`play-flash play-flash-${flash.kind}`} aria-live="polite">
          {flash.kind === "auto-pass"
            ? `${flash.count ?? 0}명 자동 패스 · 낼 카드 없음`
            : flash.kind === "quad"
            ? "🎯 쿼드 클리어 · 계속 리드"
            : "덱 정리 · 새 리드 시작"}
        </div>
      ) : null}

      {(passBanner || (!!view.mySeatId && view.currentTrick.passSeatIds.includes(view.mySeatId))) ? (
        <PassBanner />
      ) : null}

      <div className="action-bar">
        {isLeading ? (
          <button
            type="button"
            className="side-btn"
            title="손패 정렬 · 낮은 순 → 높은 순 → 묶음 순"
            onClick={() =>
              setSortMode((m) => (m === "asc" ? "desc" : m === "desc" ? "group" : "asc"))
            }
          >
            {sortMode === "asc" ? "↑ 낮은 순" : sortMode === "desc" ? "↓ 높은 순" : "≡ 묶음"}
          </button>
        ) : (
          <button
            type="button"
            className="pass-btn"
            disabled={!myTurn || !canPass}
            onClick={doPass}
          >
            패스
          </button>
        )}
        <button
          type="button"
          className={`cta-btn cta-${ctaTone}`}
          disabled={!submitOk}
          onClick={submit}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function describeForm(f: TrickForm): string {
  if (f.kind === "single") return "1장 (싱글)";
  if (f.kind === "pair") return "2장 (페어)";
  if (f.kind === "triple") return "3장 (트리플)";
  if (f.kind === "quad") return "4장 (쿼드)";
  if (f.kind === "straight") return `${f.length}장 스트레이트`;
  return "";
}

/* -------------------------- Sub-components -------------------------- */

function PlayHeader({
  isLeading,
  myTurn,
  seatKey,
  limitSec,
  onTimeout,
}: {
  isLeading: boolean;
  myTurn: boolean;
  seatKey: string;
  limitSec: number;
  onTimeout?: () => void;
}) {
  const limit = Math.max(5, Math.floor(limitSec));
  const limitMs = limit * 1000;
  const [remainingMs, setRemainingMs] = useState(limitMs);
  const firedRef = useRef(false);
  const paused = useStore((s) => !!s.overlayHold);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);
  useEffect(() => {
    // requestAnimationFrame-driven countdown gives a smooth 60fps
    // progress instead of the previous 1s step-jumps in the ring. Also
    // resets on seat/overlay changes, so the ring starts fresh whenever
    // the actionable turn changes hands.
    firedRef.current = false;
    setRemainingMs(limitMs);
    if (paused) return;
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const left = Math.max(0, limitMs - (now - start));
      setRemainingMs(left);
      if (left <= 0) {
        if (!firedRef.current && onTimeoutRef.current) {
          firedRef.current = true;
          const cb = onTimeoutRef.current;
          queueMicrotask(() => cb());
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [seatKey, limitMs, paused]);
  const pct = remainingMs / limitMs;
  const expired = remainingMs <= 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const warning = !expired && remainingMs <= 5000;
  return (
    <div className="play-header">
      <span
        className={`turn-pill ${myTurn ? "on" : "off"} ${isLeading && myTurn ? "lead" : ""}`}
      >
        {myTurn ? <span className="turn-dot" /> : null}
        {myTurn
          ? isLeading
            ? "내 리드 차례"
            : "내 차례"
          : "상대 차례"}
      </span>
      <div
        className={`timer-ring ${expired ? "expired" : ""} ${warning ? "warning" : ""}`}
        style={{ ["--timer-pct" as any]: pct }}
      >
        <div className="timer-ring-inner">
          <span className="timer-value">{seconds}</span>
          <span className="timer-unit">s</span>
        </div>
      </div>
    </div>
  );
}

function OpponentStrip({ view }: { view: MomontyView }) {
  const others = view.seatOrder.filter((s) => s !== view.mySeatId);
  const names = view.seatNames ?? {};
  const leaderId = view.currentTrick.leaderSeatId;
  return (
    <div className="opp-strip">
      {others.map((s) => {
        const passed = view.currentTrick.passSeatIds.includes(s);
        const isTurn = view.currentSeatId === s;
        const isLead = s === leaderId;
        const count = view.handCounts[s] ?? 0;
        const isOut = count === 0;
        return (
          <div
            key={s}
            className="opp-cell"
            data-turn={isTurn ? "true" : "false"}
            data-passed={passed ? "true" : "false"}
            data-lead={isLead ? "true" : "false"}
            data-out={isOut ? "true" : "false"}
          >
            <div className="opp-name">
              {names[s] ?? s.slice(-2)}
              {isLead ? <span className="opp-lead-chip">선</span> : null}
            </div>
            <div className="opp-count">
              {isOut ? (
                <span className="opp-out-tag">완주</span>
              ) : passed ? (
                <span className="opp-pass-tag">패스</span>
              ) : (
                <>🂠<span>{count}</span></>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyPile() {
  return (
    <div className="pile pile-empty">
      <HistoryPileChip />
      <span className="pile-empty-icon" aria-hidden>
        🂠
      </span>
      <span className="pile-empty-title">공유더미 비어 있음</span>
      <span className="pile-empty-hint">아무 세트나 리드할 수 있어요</span>
    </div>
  );
}

function HistoryPileChip() {
  return (
    <button
      type="button"
      className="pile-history-chip"
      onClick={() => window.dispatchEvent(new CustomEvent("momonti:history:open"))}
      aria-label="더미 히스토리 열기"
    >
      📜 히스토리
    </button>
  );
}

function PileBox({
  view,
  seatNames,
}: {
  view: MomontyView;
  seatNames: Record<string, string>;
}) {
  const top = view.currentTrick.topPlay;
  if (!top) return null;
  const from = seatNames[top.seatId] ?? top.seatId.slice(-2);
  const passCount = view.currentTrick.passSeatIds.length;
  const activeSeats = view.seatOrder.filter(
    (s) => (view.handCounts[s] ?? 0) > 0
  ).length;
  const remaining = Math.max(0, activeSeats - passCount - 1);
  return (
    <div className="pile pile-active">
      <HistoryPileChip />
      <div className="pile-head">
        <span className="pile-head-label">공유더미 · 현재 최고</span>
        <span className="pile-head-actor">{from} · 방금 냄</span>
      </div>
      <div className="pile-cards">
        {top.cards.map((c) => (
          <div key={c.id} className={`pile-card ${c.value == null ? "wild" : ""}`}>
            {c.value == null ? "★" : c.value}
          </div>
        ))}
      </div>
      <div className="pile-footer">
        패스 <b className="pile-pass">{passCount}</b> · 남은 인원{" "}
        <b className="pile-remain">{remaining}</b>명
      </div>
    </div>
  );
}

function SelectedPreview({
  cls,
  formError,
  hasWild,
  isLeading,
}: {
  cls: Classification;
  formError: ClsError;
  hasWild: boolean;
  isLeading: boolean;
}) {
  const tone: "good" | "bad" | "wild" | "lead" =
    formError !== null
      ? "bad"
      : hasWild
      ? "wild"
      : isLeading
      ? "lead"
      : "good";
  const status =
    formError === "form-mismatch"
      ? "형태 불일치"
      : formError === "too-weak"
      ? "더 낮은 값 필요"
      : isLeading
      ? "리드 준비 완료"
      : "따라내기 가능";
  const shape =
    cls.kind === "straight"
      ? `스트레이트 ${cls.size}장`
      : `${cls.value}×${cls.size}`;
  return (
    <div className={`sel-pill sel-${tone}`}>
      <div className="sel-pill-line">
        <span className="sel-pill-shape">{shape}</span>
        {hasWild ? <span className="sel-pill-badge">★ 와일드</span> : null}
        <span className="sel-pill-status">{status}</span>
      </div>
      <div className="sel-mini">
        {sortForDisplay(cls).map((c) => (
          <span key={c.id} className={`sel-mini-card ${c.value == null ? "wild" : ""}`}>
            {c.value ?? "★"}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Selected preview should read left-to-right in the natural order for
 * the combo — straights ascend from startValue, sets stay clustered.
 * Previously we rendered in tap order which showed 9-7-8 for a 7-8-9
 * straight when the user tapped 9 first.
 */
function sortForDisplay(cls: Classification): MCard[] {
  if (cls.kind === "straight") {
    // Assign each numbered card to its target rank ascending; jesters
    // fill the gaps at the appropriate positions.
    const numbered = cls.cards
      .filter((c) => c.value != null)
      .slice()
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
    const jesters = cls.cards.filter((c) => c.value == null);
    const out: MCard[] = [];
    let jIdx = 0;
    for (let i = 0; i < cls.size; i++) {
      const target = cls.value + i;
      const nextNumbered = numbered[0];
      if (nextNumbered && nextNumbered.value === target) {
        out.push(nextNumbered);
        numbered.shift();
      } else if (jIdx < jesters.length) {
        out.push(jesters[jIdx++]);
      } else if (nextNumbered) {
        // Fallback — shouldn't happen if classify() approved the combo.
        out.push(nextNumbered);
        numbered.shift();
      }
    }
    return out;
  }
  // Same-value sets: keep numbered cards first, wilds at the end.
  return [
    ...cls.cards.filter((c) => c.value != null),
    ...cls.cards.filter((c) => c.value == null),
  ];
}

function PassBanner() {
  return (
    <div className="pass-banner" aria-live="assertive">
      <span className="pass-banner-emoji">🙅</span>
      <div className="pass-banner-body">
        <div className="pass-banner-title">패스했습니다</div>
        <div className="pass-banner-sub">
          이번 리드는 참여 불가 · 새 리드 시작 시 복귀
        </div>
      </div>
    </div>
  );
}

function HandStrip({
  hand,
  selected,
  form,
  onToggle,
  sortMode,
  disabled: allDisabled,
}: {
  hand: MCard[];
  selected: string[];
  form: TrickForm;
  onToggle: (c: MCard) => void;
  sortMode: SortMode;
  disabled?: boolean;
}) {
  const sorted = useMemo(() => {
    const arr = [...hand];
    if (sortMode === "asc" || sortMode === "group") {
      arr.sort((a, b) => {
        if (a.value == null && b.value == null) return 0;
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        return a.value! - b.value!;
      });
    } else {
      // desc
      arr.sort((a, b) => {
        if (a.value == null && b.value == null) return 0;
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        return b.value! - a.value!;
      });
    }
    return arr;
  }, [hand, sortMode]);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const isSel = selected.includes(c.id);
    const wild = c.value == null;
    const tone = wild ? "wild" : c.value! === 1 ? "royal" : "white";
    const disabled = allDisabled || (form.kind !== "none" && !canFollowWithCard(c, form));
    const prev = sorted[i - 1];
    if (prev && !sameValue(prev, c)) {
      nodes.push(<span key={`sep-${i}`} className="group-sep" aria-hidden />);
    }
    nodes.push(
      <button
        key={c.id}
        type="button"
        className="hand-card"
        data-tone={tone}
        data-selected={isSel ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        disabled={disabled}
        onClick={() => onToggle(c)}
      >
        {c.value === 1 ? <span className="mini-crown">👑</span> : null}
        {c.value ?? "★"}
      </button>
    );
  }
  return <div className={`hand-strip ${allDisabled ? "waiting" : ""}`}>{nodes}</div>;
}

function sameValue(a: MCard, b: MCard): boolean {
  if (a.value == null && b.value == null) return true;
  return a.value === b.value;
}
