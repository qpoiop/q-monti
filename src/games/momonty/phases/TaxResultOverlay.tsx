import { useEffect, useState } from "react";
import { useStore } from "@web/state/store";
import type { MomontyView, TaxTransfer } from "@shared/games/momonty/logic";
import "./tax-result-overlay.css";

/**
 * Taxation result — mocks § 2-3 tax summary. Mounted globally; opens when
 * the engine fires `taxationComplete`. Gated by `config.taxResultVisible`;
 * when disabled the overlay stays hidden and play continues silently.
 * A tap on the CTA (or backdrop) dismisses.
 */
export function TaxResultOverlay() {
  const events = useStore((s) => s.gameView?.lastEvents);
  const version = useStore((s) => s.gameView?.version ?? 0);
  const view = useStore((s) => s.gameView?.view) as MomontyView | undefined;
  const seatNames = view?.seatNames;
  const mySeatId = view?.mySeatId;
  const ranks = view?.ranks;
  const visible = view?.config?.taxResultVisible ?? true;
  const [open, setOpen] = useState<TaxTransfer[] | null>(null);

  useEffect(() => {
    if (!Array.isArray(events)) return;
    if (!visible) return;
    for (const e of events as any[]) {
      if (e?.type === "taxationComplete") {
        const list = Array.isArray(e.payload?.transfers) ? e.payload.transfers : [];
        if (list.length === 0) return;
        setOpen(list);
        return;
      }
    }
  }, [version, events, visible]);

  if (!open) return null;

  const nameOf = (seatId: string) =>
    seatId === mySeatId
      ? seatNames?.[seatId]
        ? `${seatNames[seatId]} (나)`
        : "나"
      : seatNames?.[seatId] ?? seatId.slice(-4);

  // Group each upload with its return counterpart so the reader sees
  // one row per momonty↔peon pair — matches mockup § 2-4 which reads
  // "지훈 ↔ 지아 · 받음 1,2 · 돌려줌 12,12" as a single card.
  const pairs = groupTransfers(open);

  return (
    <div className="tax-result-scrim" role="dialog" aria-live="polite">
      <div className="tax-result-card">
        <div className="tax-result-eyebrow">✓ 과세 완료 · 라운드 시작</div>
        <div className="tax-result-title">세금이 정산됐습니다</div>
        <div className="tax-result-body">
          {pairs.map((p, i) => (
            <PairRow key={i} pair={p} nameOf={nameOf} />
          ))}
        </div>
        <button
          type="button"
          className="tax-result-cta"
          onClick={() => setOpen(null)}
        >
          라운드 시작 ▶
        </button>
      </div>
    </div>
  );
}

interface Pair {
  momontySeatId: string;
  peonSeatId: string;
  received: TaxTransfer["cards"]; // peon → momonty
  returned: TaxTransfer["cards"]; // momonty → peon
  tier: "grand" | "lesser";
}

function groupTransfers(transfers: TaxTransfer[]): Pair[] {
  const byKey = new Map<string, Pair>();
  const keyFor = (mo: string, pe: string) => `${mo}::${pe}`;
  for (const t of transfers) {
    const mo = t.direction === "upload" ? t.toSeatId : t.fromSeatId;
    const pe = t.direction === "upload" ? t.fromSeatId : t.toSeatId;
    const k = keyFor(mo, pe);
    const cur =
      byKey.get(k) ??
      ({
        momontySeatId: mo,
        peonSeatId: pe,
        received: [],
        returned: [],
        // Rough tier hint by card count — grand pair moves 2 cards.
        tier: "lesser",
      } as Pair);
    if (t.direction === "upload") cur.received = [...cur.received, ...t.cards];
    else cur.returned = [...cur.returned, ...t.cards];
    if (cur.received.length >= 2 || cur.returned.length >= 2) cur.tier = "grand";
    byKey.set(k, cur);
  }
  return [...byKey.values()];
}

function PairRow({
  pair,
  nameOf,
}: {
  pair: Pair;
  nameOf: (id: string) => string;
}) {
  const isGrand = pair.tier === "grand";
  return (
    <div className={`tax-pair-row ${isGrand ? "grand" : "lesser"}`}>
      <div className="tax-pair-head">
        <span className="tax-pair-title">
          {isGrand ? "👑" : "♛"} {nameOf(pair.momontySeatId)}
          <span className="tax-pair-swap">↔</span>
          {isGrand ? "⛏" : "🧰"} {nameOf(pair.peonSeatId)}
        </span>
        <span className="tax-pair-note">
          {isGrand ? "2·2 교환" : "1·1 교환"}
        </span>
      </div>
      <div className="tax-pair-body">
        <span className="tax-pair-inbound">
          받음{" "}
          {pair.received.map((c, i) => (
            <span key={i} className={`tax-mini-card${c.value === null ? " wild" : ""}`}>
              {c.value === null ? "★" : c.value}
            </span>
          ))}
        </span>
        <span className="tax-pair-outbound">
          돌려줌{" "}
          {pair.returned.map((c, i) => (
            <span key={i} className={`tax-mini-card${c.value === null ? " wild" : ""}`}>
              {c.value === null ? "★" : c.value}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
