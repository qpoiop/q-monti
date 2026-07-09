import { useState } from "react";
import { Pill, Button, Card } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { openRules } from "@web/screens/RulesSheet";
import type { BinchiState } from "@shared/games/binchi/logic";

export function BinchiPlayView({ view }: { view: BinchiState }) {
  const mySeat = useStore((s) => s.session.userId);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [guessVal, setGuessVal] = useState<number | null>(null);
  if (!view) return null;
  const seatOrder = view.seatOrder;
  const mySeatId = seatOrder.find((s) => s === mySeat) ?? seatOrder[0];
  const myTurn = seatOrder[view.currentSeatIdx] === mySeatId;

  const myTiles = view.tiles.filter((t) => t.owner === mySeatId);
  const otherTiles = view.tiles.filter((t) => t.owner !== mySeatId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 14px", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "var(--accent-3)", fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 12 }}>
          모빈치코드 · 더미 {view.deck.length}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openRules("binchi")}
            style={{ padding: "5px 10px", borderRadius: 999, background: "var(--glass-2)", border: "1px solid var(--glass-border-1)", color: "var(--text-4)", fontSize: 11 }}
          >
            규칙 ⓘ
          </button>
          <Pill tone={myTurn ? "accent" : "muted"}>{myTurn ? "내 차례" : "상대 차례"}</Pill>
        </div>
      </div>

      <div>
        <div style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
          상대 타일 (탭해서 지목)
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {otherTiles.map((t) => (
            <button
              key={t.id}
              disabled={!myTurn || t.revealed}
              onClick={() => setTargetId(t.id)}
              style={{
                width: 32,
                height: 46,
                borderRadius: 7,
                background: t.color === "joker" ? "var(--surface-3)" : t.color === "black" ? "#12101f" : "#f4f2ff",
                color: t.color === "black" || t.color === "joker" ? "#e9e4ff" : "#1a1140",
                border: targetId === t.id ? "2px solid var(--accent-1)" : "1px solid var(--glass-border-2)",
                fontFamily: "var(--font-brand)",
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {t.revealed ? (t.color === "joker" ? "★" : t.value) : "?"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ color: "var(--text-5)", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
          내 타일
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {myTiles.map((t) => (
            <div
              key={t.id}
              style={{
                width: 32,
                height: 46,
                borderRadius: 7,
                background: t.color === "joker" ? "var(--surface-3)" : t.color === "black" ? "#12101f" : "#f4f2ff",
                color: t.color === "black" || t.color === "joker" ? "#e9e4ff" : "#1a1140",
                border: "1px solid var(--glass-border-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-brand)",
                fontWeight: 800,
                fontSize: 15,
                opacity: t.revealed ? 0.5 : 1,
              }}
            >
              {t.color === "joker" ? "★" : t.value}
            </div>
          ))}
        </div>
      </div>

      {targetId ? (
        <Card>
          <div style={{ color: "var(--text-2)", fontSize: 12, marginBottom: 8 }}>
            숫자 선언 (0~11 or 조커)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
            {Array.from({ length: 12 }, (_, v) => v).map((v) => (
              <button
                key={v}
                onClick={() => setGuessVal(v)}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  background: guessVal === v ? "var(--accent-soft)" : "var(--glass-3)",
                  border: `1px solid ${guessVal === v ? "var(--accent-border)" : "var(--glass-border-2)"}`,
                  color: guessVal === v ? "var(--accent-3)" : "var(--text-2)",
                  fontFamily: "var(--font-brand)",
                  fontWeight: 700,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
        <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "draw" } })}>
          뽑기
        </Button>
        <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "stop" } })}>
          멈춤
        </Button>
        <Button
          full
          variant="primary"
          disabled={!myTurn || !targetId || guessVal == null}
          onClick={() => {
            send({ t: "action", action: { t: "guess", targetTileId: targetId, value: guessVal } });
            setTargetId(null);
            setGuessVal(null);
          }}
        >
          선언
        </Button>
      </div>
    </div>
  );
}
