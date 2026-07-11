import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button } from "@web/design/primitives";
import { setName, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { Aurora } from "@web/design/effects/Aurora";
import { Particles } from "@web/design/effects/Particles";
import { openRules } from "./RulesSheet";
import { openPolicies } from "./PoliciesSheet";
import { Stack } from "@web/design/layout";
import "./home.css";

export function HomeScreen() {
  const displayName = useStore((s) => s.session.displayName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const commit = () => {
    const trimmed = draft.trim().slice(0, 12);
    if (trimmed) setName(trimmed);
    setEditing(false);
  };
  return (
    <DesktopStage>
      <PhoneFrame gradient="radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)">
        <Aurora tone="gold" />
        <Particles variant="gold-shimmer" density={0.9} />
        <button
          type="button"
          className="home-profile"
          onClick={() => {
            setDraft(displayName);
            setEditing(true);
          }}
        >
          <span className="seat-avatar avatar-brand">
            {(displayName[0] || "?").toUpperCase()}
          </span>
          <span className="home-name">{displayName}</span>
          <span className="home-name-edit" aria-label="닉네임 변경" title="닉네임 변경">✎</span>
        </button>
        <div className="home-body">
          <div className="home-hero">
            <div className="home-logo" aria-label="모몬티">
              <span className="card card-l" />
              <span className="card card-r" />
              <span className="card card-c">
                <span className="crown">👑</span>
                <span className="rank">1</span>
              </span>
            </div>
            <h1 className="home-title">모몬티</h1>
            <p className="home-subtitle">낮은 숫자가 왕이 되는 서열 대전</p>
            <button
              type="button"
              className="home-rules-chip"
              onClick={() => openRules("momonty")}
            >
              규칙 ⓘ
            </button>
          </div>
          <Stack gap={10} className="home-ctas">
            <Button full variant="primary" onClick={() => navigate({ name: "create" })}>
              방 만들기
            </Button>
            <Button full variant="ghost" onClick={() => navigate({ name: "join" })}>
              코드로 입장
            </Button>
            <Button full variant="accent-soft" onClick={() => navigate({ name: "test" })}>
              테스트 모드 (호스트 단독)
            </Button>
          </Stack>
          <button
            type="button"
            className="home-policies-link"
            onClick={() => openPolicies()}
          >
            🔒 개인정보는 서버에 저장되지 않아요 · 이용 안내
          </button>
        </div>
      </PhoneFrame>
      {editing ? (
        <div
          className="home-name-scrim"
          onClick={() => setEditing(false)}
          role="dialog"
        >
          <div className="home-name-card" onClick={(e) => e.stopPropagation()}>
            <div className="home-name-title">닉네임 변경</div>
            <div className="home-name-sub">최대 12자 · 다른 참가자에게 이렇게 보여요</div>
            <input
              className="home-name-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 12))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              maxLength={12}
              placeholder="닉네임"
            />
            <div className="home-name-actions">
              <button
                type="button"
                className="home-name-btn ghost"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="home-name-btn primary"
                onClick={commit}
                disabled={!draft.trim()}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DesktopStage>
  );
}
