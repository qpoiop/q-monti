import { useMemo, useState } from "react";
import { send } from "@web/state/store";
import type {
  Card as MCard,
  MomontyView,
  TrickForm,
} from "@shared/games/momonty/logic";
import "./play-trick.css";

/**
 * Phase — PLAYING.
 *
 * Layout matches 시안 § 3 exactly:
 *   Header  — gold pulsing "내 리드 차례" / "내 차례" pill  · timer ring
 *   Opp strip — 3-4 opponent cells with name + 🂠N
 *   Pile — empty state (dashed) OR active box with top cards + actor
 *   Requirement pill — "현재 세트 3장 · 10보다 낮은 3장만 가능"
 *   Selection preview — "선택: 10 ×3" + mini cards on right
 *   Hand — grouped same-value cards with tone-per-value + gold selection glow
 *   Action bar — 정렬 (lead) / 패스 (follow) + gradient CTA
 */

interface Classification {
  kind: "none" | "single" | "pair" | "triple" | "quad" | "straight";
  value: number;
  size: number;
  jesters: number;
  wildBase?: number;
  cards: MCard[];
}

function classify(cards: MCard[]): Classification | null {
  if (cards.length === 0)
    return { kind: "none", value: 0, size: 0, jesters: 0, cards: [] };
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

function beats(current: TrickForm, cand: Classification, great: boolean): boolean {
  if (current.kind === "none") return true;
  if (cand.kind === "none") return false;
  if (current.kind !== cand.kind) return false;
  if (current.kind === "straight" && cand.kind === "straight") {
    if (current.length !== cand.size) return false;
  }
  const cur =
    "value" in current
      ? current.value
      : current.kind === "straight"
      ? current.startValue
      : 0;
  return great ? cand.value > cur : cand.value < cur;
}

function isValidCardInForm(card: MCard, form: TrickForm): boolean {
  if (form.kind === "none") return true;
  if (card.value === null) return true;
  const targetValue =
    "value" in form ? form.value : form.kind === "straight" ? form.startValue : 0;
  return card.value < targetValue;
}

export function PlayTrick({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<"value" | "group">("group");
  const hand = view.myHand ?? [];
  const myTurn = view.currentSeatId === view.mySeatId;
  const isLeading = view.currentTrick.form.kind === "none";
  const canPass = !isLeading;
  const seatNames = view.seatNames ?? {};

  const selectedCards = selected
    .map((id) => hand.find((c) => c.id === id))
    .filter(Boolean) as MCard[];
  const cls = classify(selectedCards);
  const canBeat = cls ? beats(view.currentTrick.form, cls, view.taxation.greatRevolution) : false;
  const hasWild = selectedCards.some((c) => c.value === null);
  const submitOk = myTurn && selectedCards.length > 0 && cls != null && (isLeading || canBeat);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = () => {
    if (!submitOk || !cls) return;
    const wildAsValue = cls.wildBase;
    send({
      t: "action",
      action: {
        t: "playCards",
        cardIds: selected,
        wildAsValue,
        straightLength: cls.kind === "straight" ? cls.size : undefined,
      },
    });
    const label = hasWild
      ? `${cls.value} ×${cls.size} (★ 와일드) ${isLeading ? "리드" : "내기"} 완료`
      : `${cls.value} ×${cls.size} ${isLeading ? "리드" : "내기"} 완료`;
    window.dispatchEvent(new CustomEvent("momonti:toast", { detail: label }));
    setSelected([]);
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
    if (!isLeading && !canBeat) return `${cls.value} ×${cls.size} · 더 낮음`;
    const suffix = isLeading ? "리드 ▶" : "내기 ▶";
    return hasWild
      ? `${cls.value} ×${cls.size} (★와일드) ${suffix}`
      : `${cls.value} ×${cls.size} ${suffix}`;
  })();

  const ctaTone: "gold" | "green" | "purple" | "muted" = !myTurn
    ? "muted"
    : hasWild
    ? "purple"
    : isLeading
    ? "gold"
    : submitOk
    ? "green"
    : "muted";

  return (
    <div className="play-trick">
      <PlayHeader isLeading={isLeading} myTurn={myTurn} />

      <OpponentStrip view={view} />

      {requirementText ? <div className="req-pill">{requirementText}</div> : null}

      {isLeading ? <EmptyPile /> : <PileBox view={view} seatNames={seatNames} />}

      {selectedCards.length > 0 && cls ? (
        <SelectedPreview
          cls={cls}
          canBeat={isLeading || canBeat}
          hasWild={hasWild}
          isLeading={isLeading}
        />
      ) : null}

      <div className="hand-header">
        <span className="hand-label">
          내 손패 <b>{hand.length}장</b> · 같은 숫자끼리 묶임
        </span>
      </div>
      <HandStrip
        hand={hand}
        selected={selected}
        form={view.currentTrick.form}
        onToggle={toggle}
        sortMode={sortMode}
      />

      <div className="action-bar">
        {isLeading ? (
          <button
            type="button"
            className="side-btn"
            onClick={() =>
              setSortMode((m) => (m === "group" ? "value" : "group"))
            }
          >
            정렬
          </button>
        ) : (
          <button
            type="button"
            className="pass-btn"
            disabled={!myTurn || !canPass}
            onClick={() => {
              setSelected([]);
              send({ t: "action", action: { t: "pass" } });
              window.dispatchEvent(
                new CustomEvent("momonti:toast", { detail: "패스했어요 · 다음 사람 차례" })
              );
            }}
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

/* -------------------------- Sub-components -------------------------- */

function PlayHeader({ isLeading, myTurn }: { isLeading: boolean; myTurn: boolean }) {
  return (
    <div className="play-header">
      <span className={`turn-pill ${myTurn ? "on" : "off"}`}>
        {myTurn ? <span className="turn-dot" /> : null}
        {myTurn ? (isLeading ? "내 리드 차례" : "내 차례") : "상대 차례"}
      </span>
      <div className="timer-ring">
        <div className="timer-ring-inner">
          <span className="timer-value">15</span>
          <span className="timer-unit">s</span>
        </div>
      </div>
    </div>
  );
}

function OpponentStrip({ view }: { view: MomontyView }) {
  const others = view.seatOrder.filter((s) => s !== view.mySeatId);
  const names = view.seatNames ?? {};
  return (
    <div className="opp-strip">
      {others.map((s) => {
        const passed = view.currentTrick.passSeatIds.includes(s);
        const isTurn = view.currentSeatId === s;
        return (
          <div
            key={s}
            className="opp-cell"
            data-turn={isTurn ? "true" : "false"}
            data-passed={passed ? "true" : "false"}
          >
            <div className="opp-name">{names[s] ?? s.slice(-2)}</div>
            <div className="opp-count">
              <span className="opp-back-icon" aria-hidden>
                🂠
              </span>
              {view.handCounts[s] ?? 0}
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
      <span className="pile-empty-icon" aria-hidden>
        🂠
      </span>
      <span className="pile-empty-title">공유더미 비어 있음</span>
      <span className="pile-empty-hint">아무 세트나 리드할 수 있어요</span>
    </div>
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
  return (
    <div className="pile pile-active">
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
    </div>
  );
}

function SelectedPreview({
  cls,
  canBeat,
  hasWild,
  isLeading,
}: {
  cls: Classification;
  canBeat: boolean;
  hasWild: boolean;
  isLeading: boolean;
}) {
  const tone = !canBeat ? "bad" : hasWild ? "wild" : isLeading ? "lead" : "good";
  const label = !canBeat
    ? "· 더 낮음"
    : cls.kind === "none"
    ? ""
    : hasWild
    ? "· ★ 와일드"
    : isLeading
    ? "· 리드 준비"
    : "· 더 강함 ✓";
  return (
    <div className={`sel-pill sel-${tone}`}>
      <span>
        선택: {cls.value} <b>×{cls.size}</b> {label}
      </span>
      <span className="sel-mini">
        {cls.cards.map((c) => (
          <span key={c.id} className={`sel-mini-card ${c.value == null ? "wild" : ""}`}>
            {c.value ?? "★"}
          </span>
        ))}
      </span>
    </div>
  );
}

function HandStrip({
  hand,
  selected,
  form,
  onToggle,
  sortMode,
}: {
  hand: MCard[];
  selected: string[];
  form: TrickForm;
  onToggle: (id: string) => void;
  sortMode: "value" | "group";
}) {
  const sorted = useMemo(() => {
    // Both modes sort ascending; "group" applies additional per-value grouping
    // hint via CSS by giving neighbouring same-value cards a shared marker.
    return [...hand].sort((a, b) => {
      if (a.value == null && b.value == null) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return a.value - b.value;
    });
  }, [hand, sortMode]);
  return (
    <div className="hand-strip">
      {sorted.map((c, i) => {
        const isSel = selected.includes(c.id);
        const valid = isValidCardInForm(c, form);
        const wild = c.value == null;
        const tone = wild ? "wild" : c.value! === 1 ? "royal" : "white";
        const disabled = form.kind !== "none" && !valid && !wild;
        const prev = sorted[i - 1];
        const groupsWithPrev =
          !wild && prev && !isDif(c, prev);
        return (
          <button
            key={c.id}
            type="button"
            className={`hand-card ${groupsWithPrev ? "grouped" : ""}`}
            data-tone={tone}
            data-selected={isSel ? "true" : "false"}
            data-disabled={disabled ? "true" : "false"}
            onClick={() => onToggle(c.id)}
          >
            {c.value === 1 ? <span className="mini-crown">👑</span> : null}
            {c.value ?? "★"}
          </button>
        );
      })}
    </div>
  );
}

function isDif(a: MCard, b: MCard): boolean {
  if (a.value == null && b.value == null) return false;
  return a.value !== b.value;
}
