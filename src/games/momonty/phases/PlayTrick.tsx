import { useState } from "react";
import { PlayingCard } from "@web/design/PlayingCard";
import { Button } from "@web/design/primitives";
import { Row, Stack } from "@web/design/layout";
import { send } from "@web/state/store";
import type {
  Card as MCard,
  MomontyView,
  Rank,
} from "@shared/games/momonty/logic";

/**
 * Phase — PLAYING. Trick loop with the seat ring + hand strip + play/pass
 * controls. Selection state is local; submit derives form from selection.
 */
export function PlayTrick({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const hand = view.myHand ?? [];
  const myTurn = view.currentSeatId === view.mySeatId;
  const canPass = view.currentTrick.form.kind !== "none";

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submit = () => {
    if (!myTurn || selected.length === 0) return;
    const cards = selected
      .map((id) => hand.find((c) => c.id === id))
      .filter(Boolean) as MCard[];
    const numbered = cards.filter((c) => c.value != null);
    const wildAsValue = numbered.length > 0 ? numbered[0].value! : undefined;
    send({
      t: "action",
      action: {
        t: "playCards",
        cardIds: selected,
        wildAsValue,
        straightLength: cards.length >= 3 ? cards.length : undefined,
      },
    });
    setSelected([]);
  };

  return (
    <Stack gap={10}>
      <SeatRing view={view} />

      <div className="hand-strip">
        {hand.map((c) => (
          <PlayingCard
            key={c.id}
            size="sm"
            value={c.value ?? undefined}
            label={c.value == null ? "★" : undefined}
            tone={c.value == null ? "jester" : c.value <= 2 ? "royal" : "white"}
            selected={selected.includes(c.id)}
            crown={c.value === 1}
            onClick={() => toggle(c.id)}
          />
        ))}
      </div>

      <Row gap={8}>
        <Button
          variant="ghost"
          disabled={!myTurn || !canPass}
          onClick={() => send({ t: "action", action: { t: "pass" } })}
        >
          패스
        </Button>
        <Button full variant="primary" disabled={!myTurn || selected.length === 0} onClick={submit}>
          내기 ({selected.length})
        </Button>
      </Row>
    </Stack>
  );
}

/* -------------------------- Seat ring -------------------------- */

const RANK_COLOR: Record<Rank, string> = {
  GRAND_MOMONTY: "var(--rank-momonty)",
  MOMONTY: "var(--rank-lesser-momonty)",
  MERCHANT: "var(--rank-merchant)",
  PEON: "var(--rank-lesser-peon)",
  GRAND_PEON: "var(--rank-peon)",
};

function SeatRing({ view }: { view: MomontyView }) {
  const seats = view.seatOrder;
  return (
    <div className="seat-ring">
      <div className="seat-ring-pile">
        <div className="seat-ring-pile-label">공유더미</div>
        {view.currentTrick.topPlay ? (
          <div className="hand-strip" style={{ marginTop: 4 }}>
            {view.currentTrick.topPlay.cards.map((c) => (
              <PlayingCard
                key={c.id}
                size="xs"
                value={c.value ?? undefined}
                label={c.value == null ? "★" : undefined}
                tone={c.value == null ? "jester" : "royal"}
              />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 22 }}>🂠</div>
        )}
        <div className="seat-ring-pile-form">
          {view.currentTrick.form.kind === "none" ? "리드 대기" : view.currentTrick.form.kind}
        </div>
      </div>
      {seats.map((seatId, i) => {
        const angle = (i / seats.length) * Math.PI * 2 - Math.PI / 2;
        const r = 96;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const rank = view.ranks[seatId];
        const isMine = seatId === view.mySeatId;
        const isTurn = seatId === view.currentSeatId;
        const passed = view.currentTrick.passSeatIds.includes(seatId);
        return (
          <div
            key={seatId}
            className={`seat-ring-slot ${isTurn ? "pulse-turn" : ""}`}
            style={
              {
                "--slot-x": `${x}px`,
                "--slot-y": `${y}px`,
                "--slot-color": RANK_COLOR[rank],
              } as React.CSSProperties
            }
          >
            <div className="seat-ring-avatar" data-passed={passed ? "true" : "false"}>
              {isMine ? "나" : seatId.slice(-2)}
            </div>
            <div className="seat-ring-count">{view.handCounts[seatId] ?? 0}장</div>
          </div>
        );
      })}
    </div>
  );
}
