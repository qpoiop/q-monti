import { useEffect, useMemo, useRef, useState } from "react";
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
 * Header (turn pill + timer ring) · Opp strip · Requirement pill ·
 * Pile · Selected preview · Hand · Action bar.
 *
 * Timer is a client-side countdown reset whenever `currentSeatId`
 * changes (i.e. the turn passes). Ring uses a CSS custom property
 * so we don't repaint the SVG on every tick.
 */

const TURN_LIMIT = 15;

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

/**
 * Given the current form and a classified selection, describe what's
 * wrong (or null if it plays legally).
 *
 *   - form-mismatch → selection size or kind doesn't match the form
 *   - too-weak       → matches form but doesn't beat current value
 */
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

function isValidCardInForm(card: MCard, form: TrickForm): boolean {
  if (form.kind === "none") return true;
  if (card.value === null) return true;
  const targetValue =
    "value" in form ? form.value : form.kind === "straight" ? form.startValue : 0;
  return card.value < targetValue;
}

export function PlayTrick({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const hand = view.myHand ?? [];
  const myTurn = view.currentSeatId === view.mySeatId;
  const isLeading = view.currentTrick.form.kind === "none";
  const canPass = !isLeading;
  const seatNames = view.seatNames ?? {};

  const selectedCards = selected
    .map((id) => hand.find((c) => c.id === id))
    .filter(Boolean) as MCard[];
  const cls = classify(selectedCards);
  const formError = cls ? checkAgainstForm(view.currentTrick.form, cls, view.taxation.greatRevolution) : null;
  const hasWild = selectedCards.some((c) => c.value === null);
  const submitOk =
    myTurn &&
    selectedCards.length > 0 &&
    cls != null &&
    (isLeading || formError === null);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      <PlayHeader isLeading={isLeading} myTurn={myTurn} seatKey={view.currentSeatId ?? ""} />

      <OpponentStrip view={view} />

      {requirementText ? <div className="req-pill">{requirementText}</div> : null}

      {isLeading ? <EmptyPile /> : <PileBox view={view} seatNames={seatNames} />}

      {selectedCards.length > 0 && cls ? (
        <SelectedPreview
          cls={cls}
          formError={formError}
          hasWild={hasWild}
          isLeading={isLeading}
        />
      ) : null}

      <div className="hand-label">
        내 손패 <b>{hand.length}장</b> · 같은 숫자끼리 묶임
      </div>
      <HandStrip
        hand={hand}
        selected={selected}
        form={view.currentTrick.form}
        onToggle={toggle}
      />

      <div className="action-bar">
        {isLeading ? (
          <button
            type="button"
            className="side-btn"
            onClick={() => setSelected([])}
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

function describeForm(f: TrickForm): string {
  if (f.kind === "single") return "1장";
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
}: {
  isLeading: boolean;
  myTurn: boolean;
  seatKey: string;
}) {
  const [remaining, setRemaining] = useState(TURN_LIMIT);
  const seatRef = useRef(seatKey);
  useEffect(() => {
    if (seatRef.current !== seatKey) {
      seatRef.current = seatKey;
      setRemaining(TURN_LIMIT);
    }
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [seatKey]);
  const pct = remaining / TURN_LIMIT;
  const expired = remaining === 0;
  return (
    <div className="play-header">
      <span className={`turn-pill ${myTurn ? "on" : "off"}`}>
        {myTurn ? <span className="turn-dot" /> : null}
        {myTurn ? (isLeading ? "내 리드 차례" : "내 차례") : "상대 차례"}
      </span>
      <div
        className={`timer-ring ${expired ? "expired" : ""}`}
        style={{ ["--timer-pct" as any]: pct }}
      >
        <div className="timer-ring-inner">
          <span className="timer-value">{remaining}</span>
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
        return (
          <div
            key={s}
            className="opp-cell"
            data-turn={isTurn ? "true" : "false"}
            data-passed={passed ? "true" : "false"}
            data-lead={isLead ? "true" : "false"}
          >
            <div className="opp-name">
              {names[s] ?? s.slice(-2)}
              {isLead ? <span className="opp-lead-chip">선</span> : null}
            </div>
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
  const passCount = view.currentTrick.passSeatIds.length;
  const activeSeats = view.seatOrder.filter(
    (s) => (view.handCounts[s] ?? 0) > 0
  ).length;
  const remaining = Math.max(0, activeSeats - passCount - 1); // -1 = the topPlay seat
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
  const label =
    formError === "form-mismatch"
      ? "· 형태 불일치"
      : formError === "too-weak"
      ? "· 더 낮아야 함"
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
}: {
  hand: MCard[];
  selected: string[];
  form: TrickForm;
  onToggle: (id: string) => void;
}) {
  const sorted = useMemo(() => {
    return [...hand].sort((a, b) => {
      if (a.value == null && b.value == null) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return a.value - b.value;
    });
  }, [hand]);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const isSel = selected.includes(c.id);
    const valid = isValidCardInForm(c, form);
    const wild = c.value == null;
    const tone = wild ? "wild" : c.value! === 1 ? "royal" : "white";
    const disabled = form.kind !== "none" && !valid && !wild;
    const prev = sorted[i - 1];
    // Insert a small separator when the value changes (creates visual
    // grouping without pretending cards overlap).
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
        onClick={() => onToggle(c.id)}
      >
        {c.value === 1 ? <span className="mini-crown">👑</span> : null}
        {c.value ?? "★"}
      </button>
    );
  }
  return <div className="hand-strip">{nodes}</div>;
}

function sameValue(a: MCard, b: MCard): boolean {
  if (a.value == null && b.value == null) return true;
  return a.value === b.value;
}
