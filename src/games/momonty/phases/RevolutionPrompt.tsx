import { useState } from "react";
import "./revolution-prompt.css";

/**
 * Revolution declaration — mockup § 2-3.
 *
 * Shown as a full-frame overlay when a taxation seat holds ≥2 jesters
 * and the option is on. They choose 보류 (proceed with tax) or 혁명 선언
 * (cancel taxation this round). Once dismissed it stays dismissed for
 * the round — the player still sees the small "✊ 혁명 선언" button
 * inside the taxation view if they change their mind.
 */
export function RevolutionPrompt({
  onDeclare,
  onDismiss,
  greatEnabled,
}: {
  onDeclare: () => void;
  onDismiss: () => void;
  greatEnabled: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const dismiss = () => {
    setClosing(true);
    setTimeout(onDismiss, 200);
  };
  const declare = () => {
    setClosing(true);
    setTimeout(onDeclare, 200);
  };
  return (
    <div
      className={`revolt-prompt-scrim ${closing ? "closing" : ""}`}
      role="dialog"
      aria-live="assertive"
    >
      <div className="revolt-prompt-body">
        <div className="revolt-prompt-emoji">✊</div>
        <div className="revolt-prompt-title">혁명!</div>
        <div className="revolt-prompt-sub">
          광대 <b>2장</b>을 모두 가졌습니다.
          <br />
          이번 라운드 <b className="highlight">과세를 취소</b>할 수 있어요.
        </div>
        <div className="revolt-prompt-jesters">
          <div className="revolt-prompt-card left">
            <span className="star">★</span>
            <span className="label">광대</span>
          </div>
          <div className="revolt-prompt-card right">
            <span className="star">★</span>
            <span className="label">광대</span>
          </div>
        </div>
        <div className="revolt-prompt-effect">
          <div className="revolt-prompt-effect-head">
            <span>혁명 효과</span>
            <span className="tag">전원 적용</span>
          </div>
          <div className="revolt-prompt-effect-row">
            <span className="check">✓</span> 페온 상납 / 모몬티 반환{" "}
            <b>모두 취소</b>
          </div>
          {greatEnabled ? (
            <div className="revolt-prompt-effect-row">
              <span className="check">✓</span> 대혁명 룰 ON 시{" "}
              <b className="gold">서열 완전 역전</b>
            </div>
          ) : null}
          <div className="revolt-prompt-effect-row muted">
            <span>·</span> 리드는 그대로 모몬티부터
          </div>
        </div>
        <div className="revolt-prompt-actions">
          <button type="button" className="revolt-prompt-hold" onClick={dismiss}>
            보류
          </button>
          <button
            type="button"
            className="revolt-prompt-declare"
            onClick={declare}
          >
            ✊ 혁명 선언
          </button>
        </div>
      </div>
    </div>
  );
}
