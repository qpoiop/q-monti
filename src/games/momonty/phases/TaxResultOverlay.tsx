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

  const uploads = open.filter((t) => t.direction === "upload");
  const returns = open.filter((t) => t.direction === "return");

  return (
    <div className="tax-result-scrim" role="dialog" aria-live="polite">
      <div className="tax-result-card">
        <div className="tax-result-eyebrow">과세 완료</div>
        <div className="tax-result-title">세금 이동 요약</div>
        <div className="tax-result-body">
          {uploads.length > 0 ? (
            <div className="tax-result-section">
              <div className="tax-result-section-label">평민 → 모몬티 상납</div>
              <div className="tax-transfer-list">
                {uploads.map((t, i) => (
                  <TransferRow key={`u-${i}`} t={t} nameOf={nameOf} ranks={ranks} />
                ))}
              </div>
            </div>
          ) : null}
          {returns.length > 0 ? (
            <div className="tax-result-section">
              <div className="tax-result-section-label">모몬티 → 평민 하사</div>
              <div className="tax-transfer-list">
                {returns.map((t, i) => (
                  <TransferRow key={`r-${i}`} t={t} nameOf={nameOf} ranks={ranks} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="tax-result-cta"
          onClick={() => setOpen(null)}
        >
          플레이 시작 ▶
        </button>
      </div>
    </div>
  );
}

function TransferRow({
  t,
  nameOf,
  ranks,
}: {
  t: TaxTransfer;
  nameOf: (id: string) => string;
  ranks?: Record<string, string>;
}) {
  return (
    <div className="tax-transfer-row">
      <span className="tax-side">
        <span className="tax-name">{nameOf(t.fromSeatId)}</span>
        {ranks?.[t.fromSeatId] ? (
          <span className="tax-rank">{roleShort(ranks[t.fromSeatId])}</span>
        ) : null}
      </span>
      <span className="tax-arrow">→</span>
      <span className="tax-side">
        <span className="tax-name">{nameOf(t.toSeatId)}</span>
        {ranks?.[t.toSeatId] ? (
          <span className="tax-rank">{roleShort(ranks[t.toSeatId])}</span>
        ) : null}
      </span>
      <span className="tax-cards">
        {t.cards.map((c, i) => (
          <span key={i} className={`tax-mini-card${c.value === null ? " wild" : ""}`}>
            {c.value === null ? "★" : c.value}
          </span>
        ))}
      </span>
    </div>
  );
}

function roleShort(rank: string): string {
  switch (rank) {
    case "GRAND_MOMONTY":
      return "대모몬티";
    case "MOMONTY":
      return "모몬티";
    case "PEON":
      return "평민";
    case "GRAND_PEON":
      return "대평민";
    default:
      return "상인";
  }
}
