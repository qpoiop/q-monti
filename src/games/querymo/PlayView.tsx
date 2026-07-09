import { Pill, Button } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { openRules } from "@web/screens/RulesSheet";
import type { QuerymoState } from "@shared/games/querymo/logic";
import { useState } from "react";

/**
 * Querymo — minimal touch UI.
 *
 * Renders the grid, shows both cats, wall segments, and offers up/down/
 * left/right move buttons plus a wall-placement mode. Full input polish
 * (drag to place wall, tap-to-move) belongs in a later pass.
 */
export function QuerymoPlayView({ view }: { view: QuerymoState }) {
  const mySeat = useStore((s) => s.session.userId);
  const [mode, setMode] = useState<"move" | "wall">("move");
  if (!view) return null;
  const seatOrder = view.seatOrder;
  const mySeatId = seatOrder.find((s) => s === mySeat) ?? seatOrder[0];
  const myTurn = seatOrder[view.currentSeatIdx] === mySeatId;
  const size = view.config.boardSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 14px" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ color: "var(--accent-3)", fontFamily: "var(--font-brand)", fontWeight: 700, fontSize: 12 }}>
          쿼리모 · 벽 남음 {view.wallsLeft[mySeatId] ?? 0}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openRules("querymo")}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              background: "var(--glass-2)",
              border: "1px solid var(--glass-border-1)",
              color: "var(--text-4)",
              fontSize: 11,
            }}
          >
            규칙 ⓘ
          </button>
          <Pill tone={myTurn ? "accent" : "muted"}>{myTurn ? "내 차례" : "상대 차례"}</Pill>
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          marginTop: 10,
          padding: 7,
          borderRadius: 14,
          background: "var(--glass-1)",
          border: "1px solid var(--glass-border-2)",
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gap: 5,
          aspectRatio: "1 / 1",
        }}
      >
        {Array.from({ length: size * size }).map((_, i) => {
          const x = i % size;
          const y = Math.floor(i / size);
          const occupier = Object.entries(view.positions).find(
            ([, p]) => p.x === x && p.y === y
          );
          return (
            <div
              key={i}
              style={{
                background: occupier
                  ? occupier[0] === mySeatId
                    ? "rgba(34,211,238,.28)"
                    : "rgba(200,85,240,.24)"
                  : "var(--glass-2)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {occupier ? (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background:
                      occupier[0] === mySeatId ? "var(--accent-1)" : "var(--brand-purple-2)",
                    boxShadow: `0 0 10px ${
                      occupier[0] === mySeatId ? "var(--accent-glow)" : "rgba(200,85,240,.6)"
                    }`,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Mode toggle */}
      <div style={{ marginTop: 12, display: "flex", padding: 3, borderRadius: 12, background: "var(--glass-3)", border: "1px solid var(--glass-border-2)", gap: 3 }}>
        {(["move", "wall"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 9,
              background: mode === m ? "linear-gradient(135deg,var(--accent-1),var(--accent-2))" : "transparent",
              color: mode === m ? "var(--accent-text-on)" : "var(--text-5)",
              fontFamily: "var(--font-brand)",
              fontWeight: 700,
              fontSize: 12.5,
            }}
          >
            {m === "move" ? "이동" : "벽 세우기"}
          </button>
        ))}
      </div>

      {/* Move D-pad */}
      {mode === "move" ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 6,
            width: 220,
            alignSelf: "center",
          }}
        >
          <div />
          <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "move", dx: 0, dy: -1 } })}>▲</Button>
          <div />
          <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "move", dx: -1, dy: 0 } })}>◀</Button>
          <div />
          <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "move", dx: 1, dy: 0 } })}>▶</Button>
          <div />
          <Button variant="ghost" disabled={!myTurn} onClick={() => send({ t: "action", action: { t: "move", dx: 0, dy: 1 } })}>▼</Button>
          <div />
        </div>
      ) : (
        <div style={{ marginTop: 12, color: "var(--text-4)", fontSize: 12, textAlign: "center" }}>
          벽 배치 UI는 곧 추가돼요 — 격자 사이 홈 탭 예정
        </div>
      )}
    </div>
  );
}
