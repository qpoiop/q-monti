import { useEffect, useMemo, useState } from "react";
import { send } from "@web/state/store";
import type { Card as MCard, MomontyView, Rank } from "@shared/games/momonty/logic";
import { RevolutionPrompt } from "./RevolutionPrompt";
import "./taxation.css";

/**
 * Phase — TAXATION.
 *
 * Two sub-modes derived from the pending obligation:
 *   Peon side (upload > 0)  → auto-picked cards, "N장 상납" CTA.
 *   Momonty side (ret > 0)  → user picks N cards to hand back down.
 * A revolution declaration button is offered when the seat holds
 * ≥2 jesters and the option is on.
 *
 * Both sub-modes share the same visual chrome:
 *   Header row: role emoji + title + sub
 *   Recipient / summary pill
 *   Card canvas: auto-picked stack (peon) or interactive hand (momonty)
 *   Optional selection preview
 *   CTA anchored bottom
 *
 * Values from § 2-1 / § 2-2 of the mockup.
 */
export function Taxation({ view }: { view: MomontyView }) {
  const [selected, setSelected] = useState<string[]>([]);
  const hand = view.myHand ?? [];
  const upload = view.taxation.myPendingUpload ?? 0;
  const ret = view.taxation.myPendingReturn ?? 0;
  const seatNames = view.seatNames ?? {};
  const myRank = view.mySeatId ? view.ranks[view.mySeatId] : undefined;
  const jesterCount = hand.filter((c) => c.value === null).length;
  const canRevolt =
    view.config.revolutionEnabled &&
    !view.taxation.revolutionUsed &&
    jesterCount >= 2;
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  useEffect(() => {
    // Auto-open the prompt once per taxation phase — dismissing it drops
    // back to the standard taxation view where the smaller 혁명 선언
    // button still lives, so the player can change their mind.
    if (canRevolt && !promptDismissed) setPromptOpen(true);
  }, [canRevolt, promptDismissed]);

  // Auto-pick lowest N (strongest) for peon uploads. Momonty selection
  // is user-driven and validated against `ret` size.
  const autoPicked = useMemo(() => {
    if (!upload) return [] as string[];
    return [...hand]
      .sort((a, b) => (a.value ?? 99) - (b.value ?? 99))
      .slice(0, upload)
      .map((c) => c.id);
  }, [hand, upload]);

  const effective = upload ? autoPicked : selected;
  const needed = upload || ret;
  const submitOk = effective.length === needed && needed > 0;

  const submit = () => {
    if (!submitOk) return;
    if (upload) {
      send({ t: "action", action: { t: "uploadCards", cardIds: effective } });
      window.dispatchEvent(
        new CustomEvent("momonti:toast", { detail: `${upload}장 상납 완료` })
      );
    } else {
      send({ t: "action", action: { t: "returnCards", cardIds: effective } });
      window.dispatchEvent(
        new CustomEvent("momonti:toast", { detail: `${ret}장 반환 완료` })
      );
      setSelected([]);
    }
  };

  const declareRevolt = () => {
    send({ t: "action", action: { t: "declareRevolution" } });
    window.dispatchEvent(
      new CustomEvent("momonti:toast", { detail: "✊ 혁명! 이번 라운드 과세 취소" })
    );
  };

  const recipientId = findRecipient(view, upload > 0 ? "up" : "ret");
  const recipient = recipientId
    ? {
        id: recipientId,
        name: seatNames[recipientId] ?? recipientId,
        rank: view.ranks[recipientId] as Rank | undefined,
      }
    : null;

  // Momonty side may have already received uploads from peons — show a
  // pill telling them what landed in their hand before they pick returns.
  const receivedCards: MCard[] = ret > 0
    ? Object.values(view.taxation.uploadedCards ?? {}).flat()
    : [];

  if (upload === 0 && ret === 0) {
    // No obligation — either a merchant or nothing to do.
    return (
      <div className="taxation waiting">
        <div className="tax-header">
          <span className="tax-header-emoji">🛒</span>
          <div className="tax-header-text">
            <div className="tax-title">과세 대기 중</div>
            <div className="tax-sub">
              내 서열({rankLabel(myRank)}) 은 과세 대상이 아닙니다.
            </div>
          </div>
        </div>
        <div className="tax-waiting-note">
          다른 플레이어의 상납/반환이 끝나면 자동으로 진행돼요.
        </div>
      </div>
    );
  }

  return (
    <div className="taxation">
      <div className="tax-header">
        <span className="tax-header-emoji">{upload ? "⛏" : "👑"}</span>
        <div className="tax-header-text">
          <div className="tax-title">과세 · {upload ? "상납" : "반환"}</div>
          <div className="tax-sub">
            {upload
              ? `나는 ${rankLabel(myRank)} · 최고패 ${upload}장 상납`
              : `나는 ${rankLabel(myRank)} · 임의 ${ret}장 돌려주기`}
          </div>
        </div>
      </div>

      {receivedCards.length > 0 ? (
        <div className="tax-received">
          <span className="tax-received-label">
            받은 상납: {receivedCards
              .map((c) => (c.value == null ? "★" : c.value))
              .join(", ")}{" "}
            — 손패에 추가됨 ✓
          </span>
        </div>
      ) : null}

      {recipient ? (
        <div
          className={`tax-recipient ${upload ? "up" : "ret"}`}
          data-tier={tierKey(recipient.rank)}
        >
          <span className="tax-recipient-icon">
            {upload ? "👑" : "⛏"}
          </span>
          <span className="tax-recipient-text">
            {upload ? "받는 사람" : "돌려주는 대상"}:{" "}
            <b>{recipient.name}</b>{" "}
            <span className="tax-recipient-role">({rankLabel(recipient.rank)})</span>
          </span>
        </div>
      ) : null}

      {upload ? (
        <>
          <div className="tax-label">
            자동 선택된 최고패 <b>{upload}장</b> · 변경 불가
          </div>
          <div className="tax-auto-cards">
            {effective.map((id) => {
              const c = hand.find((x) => x.id === id);
              if (!c) return null;
              return (
                <div key={id} className="tax-picked-card">
                  {c.value === 1 ? <span className="mini-crown">👑</span> : null}
                  <span className="tax-picked-value">{c.value ?? "★"}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="tax-label">
            돌려줄 카드 <b>{ret}장</b> 선택 · 필요 없는 높은 수 추천
          </div>
          <div className="tax-hand-label">
            내 손패 <b>{hand.length}장</b> · 탭하여 선택
          </div>
        </>
      )}

      <div className="tax-hand-strip">
        {[...hand]
          .sort((a, b) => (a.value ?? 99) - (b.value ?? 99))
          .map((c) => {
            const inAutoPick = upload ? autoPicked.includes(c.id) : false;
            const isSel = ret > 0 && selected.includes(c.id);
            const wild = c.value == null;
            const tone = wild ? "wild" : c.value! === 1 ? "royal" : "white";
            const disabled = upload > 0; // peon can't edit auto pick
            return (
              <button
                key={c.id}
                type="button"
                className="tax-card"
                data-tone={tone}
                data-picked={inAutoPick ? "true" : "false"}
                data-selected={isSel ? "true" : "false"}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setSelected((prev) =>
                    prev.includes(c.id)
                      ? prev.filter((x) => x !== c.id)
                      : prev.length < ret
                      ? [...prev, c.id]
                      : prev
                  );
                }}
              >
                {c.value === 1 ? <span className="mini-crown">👑</span> : null}
                {c.value ?? "★"}
              </button>
            );
          })}
      </div>

      {ret > 0 && selected.length > 0 ? (
        <div className="tax-selected-preview">
          <span>선택됨</span>
          <span className="tax-selected-mini">
            {selected.map((id) => {
              const c = hand.find((x) => x.id === id);
              return (
                <span
                  key={id}
                  className={`tax-mini-card ${c?.value == null ? "wild" : ""}`}
                >
                  {c?.value ?? "★"}
                </span>
              );
            })}
          </span>
        </div>
      ) : null}

      {promptOpen ? (
        <RevolutionPrompt
          greatEnabled={view.config.greatRevolutionEnabled}
          onDismiss={() => {
            setPromptOpen(false);
            setPromptDismissed(true);
          }}
          onDeclare={() => {
            setPromptOpen(false);
            setPromptDismissed(true);
            declareRevolt();
          }}
        />
      ) : null}

      <div className="tax-actions">
        {canRevolt ? (
          <button type="button" className="tax-revolt" onClick={declareRevolt}>
            ✊ 혁명 선언
          </button>
        ) : null}
        <button
          type="button"
          className="tax-submit"
          disabled={!submitOk}
          onClick={submit}
        >
          {upload
            ? `${effective.length}/${upload}장 상납하기 ▶`
            : `${effective.length}/${ret}장 반환하기 ▶`}
        </button>
      </div>
    </div>
  );
}

function findRecipient(view: MomontyView, dir: "up" | "ret"): string | null {
  // Pair by rank so the UI matches the engine's delivery: grand peon ↔
  // grand momonty, peon ↔ momonty. Falls back to the top/bottom seat if
  // the paired rank is somehow missing (shouldn't happen in a normal
  // 4+ seat game).
  const myRank = view.mySeatId ? view.ranks[view.mySeatId] : undefined;
  const targetRank: Rank | null =
    dir === "up"
      ? myRank === "GRAND_PEON"
        ? "GRAND_MOMONTY"
        : myRank === "PEON"
        ? "MOMONTY"
        : null
      : myRank === "GRAND_MOMONTY"
      ? "GRAND_PEON"
      : myRank === "MOMONTY"
      ? "PEON"
      : null;
  if (targetRank) {
    for (const [s, r] of Object.entries(view.ranks)) if (r === targetRank) return s;
  }
  const fallback: Rank[] =
    dir === "up" ? ["GRAND_MOMONTY", "MOMONTY"] : ["GRAND_PEON", "PEON"];
  for (const wanted of fallback) {
    for (const [s, r] of Object.entries(view.ranks)) if (r === wanted) return s;
  }
  return null;
}

function tierKey(rank?: Rank): string {
  switch (rank) {
    case "GRAND_MOMONTY":
      return "top-1";
    case "MOMONTY":
      return "top-2";
    case "PEON":
      return "bottom-2";
    case "GRAND_PEON":
      return "bottom-1";
    default:
      return "mid";
  }
}

function rankLabel(rank?: Rank): string {
  switch (rank) {
    case "GRAND_MOMONTY":
      return "그레이터 모몬티";
    case "MOMONTY":
      return "레서 모몬티";
    case "MERCHANT":
      return "상인";
    case "PEON":
      return "레서 페온";
    case "GRAND_PEON":
      return "그레이터 페온";
    default:
      return "";
  }
}
