import { Pill, Button, Card } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { openRules } from "@web/screens/RulesSheet";
import type { MoorumonState } from "@shared/games/moorumon/logic";

const SUIT_LABELS = ["🐈‍⬛", "🧀", "🎋", "🐆"];

export function MoorumonPlayView({ view }: { view: MoorumonState }) {
  const mySeat = useStore((s) => s.session.userId);
  if (!view) return null;
  const seatOrder = view.seatOrder;
  const mySeatId = seatOrder.find((s) => s === mySeat) ?? seatOrder[0];
  const myTurn = seatOrder[view.currentSeatIdx] === mySeatId;
  const myHand = view.hands[mySeatId] ?? [];
  const opponent = seatOrder.find((s) => s !== mySeatId);
  const myScore = view.score[mySeatId] ?? 0;
  const oppScore = opponent ? view.score[opponent] : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 14px", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "var(--accent-3)", fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 12 }}>
          모루먼쇼 · 으뜸 {SUIT_LABELS[view.trumpSuit]}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openRules("moorumon")}
            style={{ padding: "5px 10px", borderRadius: 999, background: "var(--glass-2)", border: "1px solid var(--glass-border-1)", color: "var(--text-4)", fontSize: 11 }}
          >
            규칙 ⓘ
          </button>
          <Pill tone={myTurn ? "accent" : "muted"}>{myTurn ? "내 차례" : "상대 차례"}</Pill>
        </div>
      </div>

      {/* Score gauge */}
      <div style={{ display: "flex", gap: 8 }}>
        <ScoreBar label="나" score={myScore} target={view.config.targetScore} tone="accent" />
        <ScoreBar label="상대" score={oppScore} target={view.config.targetScore} tone="muted" />
      </div>

      {/* Trick center */}
      <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
        <div style={{ color: "var(--text-5)", fontSize: 11 }}>트릭 · 더미 {view.deck.length}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 8, minHeight: 60 }}>
          {view.currentTrick.plays.map((p) => (
            <div
              key={p.seatId + p.card.id}
              style={{
                width: 46,
                height: 60,
                borderRadius: 8,
                background: "linear-gradient(160deg,#fdfcff,#e7e2f5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#1a1140",
                fontFamily: "var(--font-brand)",
                fontWeight: 800,
                boxShadow: p.card.suit === view.trumpSuit ? "0 0 12px var(--accent-glow)" : "0 3px 8px -3px #000",
              }}
            >
              <span style={{ fontSize: 12 }}>{SUIT_LABELS[p.card.suit]}</span>
              <span style={{ fontSize: 18 }}>{p.card.rank}</span>
            </div>
          ))}
          {view.currentTrick.plays.length === 0 ? (
            <div style={{ color: "var(--text-5)", fontSize: 12, alignSelf: "center" }}>대기 중…</div>
          ) : null}
        </div>
      </Card>

      {/* Hand */}
      <div style={{ marginTop: "auto", display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {myHand.map((c) => (
          <button
            key={c.id}
            disabled={!myTurn}
            onClick={() => send({ t: "action", action: { t: "play", cardId: c.id } })}
            style={{
              width: 46,
              height: 66,
              borderRadius: 9,
              background: "linear-gradient(160deg,#fdfcff,#e7e2f5)",
              color: "#1a1140",
              fontFamily: "var(--font-brand)",
              fontWeight: 800,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              boxShadow: c.suit === view.trumpSuit ? "0 0 12px var(--accent-glow)" : "0 6px 12px -6px #000",
              opacity: myTurn ? 1 : 0.65,
            }}
          >
            <span style={{ fontSize: 12 }}>{SUIT_LABELS[c.suit]}</span>
            <span style={{ fontSize: 20 }}>{c.rank}</span>
            <span style={{ fontSize: 9, color: "#8a8298" }}>{c.points ? `${c.points}p` : ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, target, tone }: { label: string; score: number; target: number; tone: "accent" | "muted" }) {
  const pct = Math.min(100, Math.round((score / target) * 100));
  return (
    <div style={{ flex: 1, padding: 10, borderRadius: 12, background: tone === "accent" ? "var(--accent-soft)" : "var(--glass-3)", border: `1px solid ${tone === "accent" ? "var(--accent-border)" : "var(--glass-border-2)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: tone === "accent" ? "var(--accent-3)" : "var(--text-4)", fontSize: 11, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-brand)", fontWeight: 800 }}>{score} / {target}</span>
      </div>
      <div style={{ height: 6, background: "var(--glass-2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tone === "accent" ? "linear-gradient(90deg,var(--accent-1),var(--accent-2))" : "var(--glass-border-3)" }} />
      </div>
    </div>
  );
}
