import { useMemo, useState } from "react";
import { PlayingCard } from "@web/design/PlayingCard";
import { Button, Card, Pill } from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { openRules } from "@web/screens/RulesSheet";
import type {
  Card as MCard,
  MomontyView,
  Rank,
} from "@shared/games/momonty/logic";
import { RANK_LABEL_KO } from "@shared/games/momonty/logic";

/**
 * Momonty play surface. Renders three phases:
 *   - DRAWING_RANK  — everyone taps the deck to draw their tier card.
 *   - TAXATION      — peons upload their top N cards / momontys pick which to return.
 *   - PLAYING       — main trick-taking loop with sets / straights / jesters.
 * The view is fully derived from the server-projected `MomontyView`;
 * no local game state lives outside `selectedIds` (transient card picks).
 */
export function MomontyPlayView({ view }: { view: MomontyView }) {
  const room = useStore((s) => s.room);
  if (!room) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 14px" }}>
      <Header view={view} />
      {view.phase === "DRAWING_RANK" ? (
        <DrawRankView view={view} />
      ) : view.phase === "TAXATION" ? (
        <TaxationView view={view} />
      ) : view.phase === "PLAYING" || view.phase === "ROUND_END" ? (
        <PlayView view={view} />
      ) : view.phase === "MATCH_END" ? (
        <div style={{ padding: 20, color: "var(--text-3)" }}>매치가 종료됐어요.</div>
      ) : null}
    </div>
  );
}

/* -------------------------- Header -------------------------- */

function Header({ view }: { view: MomontyView }) {
  const mine = view.mySeatId ? view.ranks[view.mySeatId] : undefined;
  const myTurn = view.currentSeatId === view.mySeatId;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontFamily: "var(--font-brand)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent-3)",
          }}
        >
          R {view.round} · {view.phase}
        </div>
        {mine ? (
          <div style={{ color: "var(--text-3)", fontSize: 11 }}>
            내 서열 · <b>{RANK_LABEL_KO[mine]}</b>
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => openRules("momonty")}
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
        <Pill tone={myTurn ? "accent" : "muted"}>
          {myTurn ? "내 차례" : view.currentSeatId ? "상대 차례" : "—"}
        </Pill>
      </div>
    </div>
  );
}

/* -------------------------- Draw rank -------------------------- */

function DrawRankView({ view }: { view: MomontyView }) {
  const already = view.drawRank?.picks?.[view.mySeatId ?? ""] != null;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--text-1)", fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: 17 }}>
        카드를 뽑아 자리를 정합니다
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        <PlayingCard tone="back" label="?" size="lg" />
        <PlayingCard
          tone="royal"
          value={already ? view.drawRank!.picks![view.mySeatId!] : undefined}
          label={already ? undefined : "?"}
          size="lg"
          crown={already && view.drawRank!.picks![view.mySeatId!] === 1}
          selected={already}
        />
        <PlayingCard tone="back" label="?" size="lg" />
      </div>
      <div style={{ color: "var(--text-4)", fontSize: 11 }}>
        낮은 숫자일수록 높은 서열
      </div>
      <Button variant="primary" onClick={() => send({ t: "action", action: { t: "drawRank" } })} disabled={already}>
        {already ? `내 카드 ${view.drawRank!.picks![view.mySeatId!]}` : "카드 뽑기"}
      </Button>
      <Card tone="highlight" style={{ width: "100%" }}>
        <div style={{ color: "var(--text-5)", fontSize: 10.5, marginBottom: 6 }}>
          뽑기 현황
        </div>
        {view.seatOrder.map((seatId) => {
          const pick = view.drawRank?.picks?.[seatId];
          return (
            <div key={seatId} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text-2)" }}>{seatId}</span>
              <span style={{ fontFamily: "var(--font-brand)", fontWeight: 800, color: pick != null ? "var(--accent-1)" : "var(--text-6)" }}>
                {pick ?? "뽑는 중…"}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* -------------------------- Taxation -------------------------- */

function TaxationView({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const hand = view.myHand ?? [];
  const upload = view.taxation.myPendingUpload ?? 0;
  const ret = view.taxation.myPendingReturn ?? 0;
  const requiredCount = upload || ret;
  const label = upload ? `${upload}장 상납` : ret ? `${ret}장 반환` : "대기중";

  const autoPicked = useMemo(() => {
    if (upload) {
      // Top values (lowest is strongest → lowest N).
      return [...hand]
        .sort((a, b) => (a.value ?? 99) - (b.value ?? 99))
        .slice(0, upload)
        .map((c) => c.id);
    }
    return [];
  }, [hand, upload]);

  const effective = upload ? autoPicked : selected;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 16 }}>{upload ? "⛏" : "👑"}</span>
        <div>
          <div style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 700 }}>
            과세 · {upload ? "상납" : "반환"}
          </div>
          <div style={{ color: "var(--text-5)", fontSize: 10.5 }}>{label}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
        {hand.map((c) => {
          const isSel = effective.includes(c.id);
          return (
            <PlayingCard
              key={c.id}
              value={c.value ?? undefined}
              label={c.value == null ? "★" : undefined}
              size="sm"
              tone={c.value == null ? "jester" : c.value <= 2 ? "royal" : "white"}
              selected={isSel}
              crown={c.value === 1}
              onClick={
                upload
                  ? undefined
                  : () =>
                      setSelected((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((x) => x !== c.id)
                          : prev.length < ret
                          ? [...prev, c.id]
                          : prev
                      )
              }
            />
          );
        })}
      </div>
      <Button
        variant="primary"
        disabled={effective.length !== requiredCount}
        onClick={() =>
          send({
            t: "action",
            action: upload
              ? { t: "uploadCards", cardIds: effective }
              : { t: "returnCards", cardIds: effective },
          })
        }
      >
        {upload ? "상납" : "반환"} {effective.length}/{requiredCount}
      </Button>
    </div>
  );
}

/* -------------------------- Play (trick-taking) -------------------------- */

function PlayView({ view }: { view: MomontyView }) {
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
    const wildAsValue =
      numbered.length > 0 ? numbered[0].value! : undefined;
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
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8, marginTop: 8 }}>
      {/* Ring of seats + pile in center */}
      <div style={{ position: "relative", flex: 1, minHeight: 200 }}>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-soft), rgba(255,255,255,.03))",
            border: "1.5px solid var(--accent-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "var(--text-5)", fontSize: 9 }}>공유더미</span>
          {view.currentTrick.topPlay ? (
            <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
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
          <span style={{ color: "var(--accent-1)", fontFamily: "var(--font-brand)", fontSize: 9 }}>
            {view.currentTrick.form.kind === "none" ? "리드 대기" : view.currentTrick.form.kind}
          </span>
        </div>
        {view.seatOrder.map((seatId, i) => (
          <SeatCircle
            key={seatId}
            seatId={seatId}
            rank={view.ranks[seatId]}
            index={i}
            total={view.seatOrder.length}
            handCount={view.handCounts[seatId] ?? 0}
            isTurn={seatId === view.currentSeatId}
            isMine={seatId === view.mySeatId}
            passed={view.currentTrick.passSeatIds.includes(seatId)}
          />
        ))}
      </div>

      {/* Hand + controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
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
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="ghost"
          disabled={!myTurn || !canPass}
          onClick={() => send({ t: "action", action: { t: "pass" } })}
        >
          패스
        </Button>
        <Button
          full
          variant="primary"
          disabled={!myTurn || selected.length === 0}
          onClick={submit}
        >
          내기 ({selected.length})
        </Button>
      </div>
    </div>
  );
}

function SeatCircle({
  seatId,
  rank,
  index,
  total,
  handCount,
  isTurn,
  isMine,
  passed,
}: {
  seatId: string;
  rank: Rank;
  index: number;
  total: number;
  handCount: number;
  isTurn: boolean;
  isMine: boolean;
  passed: boolean;
}) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const r = 96;
  const x = Math.cos(angle) * r;
  const y = Math.sin(angle) * r;
  const color =
    rank === "GRAND_MOMONTY"
      ? "var(--rank-momonty)"
      : rank === "MOMONTY"
      ? "var(--rank-lesser-momonty)"
      : rank === "GRAND_PEON"
      ? "var(--rank-peon)"
      : rank === "PEON"
      ? "var(--rank-lesser-peon)"
      : "var(--rank-merchant)";
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        textAlign: "center",
        animation: isTurn ? "m-turn 1.4s infinite" : undefined,
        borderRadius: 999,
        padding: 4,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: `${color}22`,
          border: `1.5px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color,
          margin: "0 auto",
          fontWeight: 700,
          opacity: passed ? 0.4 : 1,
        }}
      >
        {isMine ? "나" : seatId.slice(-2)}
      </div>
      <div style={{ fontSize: 9, color: "var(--text-5)", marginTop: 2 }}>{handCount}장</div>
    </div>
  );
}
