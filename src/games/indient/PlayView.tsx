import { Pill, Button, Card } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { openRules } from "@web/screens/RulesSheet";
import type { IndientState } from "@shared/games/indient/logic";
import { PlayingCard } from "@web/design/PlayingCard";

export function IndientPlayView({ view }: { view: IndientState }) {
  const mySeat = useStore((s) => s.session.userId);
  if (!view) return null;
  const seatOrder = view.seatOrder;
  const mySeatId = seatOrder.find((s) => s === mySeat) ?? seatOrder[0];
  const myTurn = seatOrder[view.currentSeatIdx] === mySeatId;
  const opponent = seatOrder.find((s) => s !== mySeatId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 14px", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "var(--accent-3)", fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 12 }}>
          모디언트릭 · R {view.round}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openRules("indient")}
            style={{ padding: "5px 10px", borderRadius: 999, background: "var(--glass-2)", border: "1px solid var(--glass-border-1)", color: "var(--text-4)", fontSize: 11 }}
          >
            규칙 ⓘ
          </button>
          <Pill tone={myTurn ? "accent" : "muted"}>{myTurn ? "내 차례" : "상대 차례"}</Pill>
        </div>
      </div>

      {/* Opponent card */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ color: "var(--text-5)", fontSize: 11 }}>상대 카드 · {opponent}</div>
        {opponent ? (
          <PlayingCard size="lg" value={view.cards[opponent]} tone="royal" />
        ) : null}
      </div>

      {/* Pot */}
      <Card tone="accent" style={{ textAlign: "center" }}>
        <div style={{ color: "var(--accent-3)", fontSize: 11 }}>팟</div>
        <div style={{ color: "#fff", fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: 26 }}>
          {view.pot}
        </div>
      </Card>

      {/* My card (hidden to me) */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ color: "var(--text-5)", fontSize: 11 }}>내 카드 (안 보임)</div>
        <PlayingCard size="lg" label="?" tone="back" />
        <div style={{ color: "var(--text-6)", fontSize: 10 }}>👁 상대만 봅니다</div>
      </div>

      {/* Chips */}
      <div style={{ display: "flex", justifyContent: "space-around", color: "var(--text-3)", fontSize: 12 }}>
        <div>내 칩 <b style={{ color: "#fff", fontFamily: "var(--font-brand)" }}>{view.chips[mySeatId] ?? 0}</b></div>
        <div>상대 칩 <b style={{ color: "#fff", fontFamily: "var(--font-brand)" }}>{opponent ? view.chips[opponent] : 0}</b></div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
        <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "check" } })}>체크/콜</Button>
        <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "raise", amount: 2 } })}>레이즈 +2</Button>
        <Button variant="danger" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "fold" } })}>폴드</Button>
        <Button variant="accent" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "declare", claim: "higher" } })}>선언(높다)</Button>
      </div>
    </div>
  );
}
