import { useEffect, useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader, SettingRow, Stepper, Toggle } from "@web/design/primitives";
import { DesktopStage } from "./DesktopStage";
import {
  initTest,
  resetTest,
  setActingSeat,
  useTest,
  viewForSeat,
} from "@web/state/testStore";
import { navigate } from "@web/nav/router";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "@web/games/momonty/phases";
import { FooterBar, HeaderActions, ScreenBody, StatusBadge, RulesButton } from "@web/design/layout";
import { openRules } from "./RulesSheet";
import { momontyGame } from "@shared/games/momonty/logic";
import "./test.css";

/**
 * Test mode — two stages:
 *   1. Setup: config form → 테스트 시작.
 *   2. Play: standard phase views + seat picker.
 *
 * Back arrow opens a simple exit confirm. No hamburger menu — rules
 * already have a dedicated chip, and "다시 하기" belongs in the setup
 * step (user returns to setup by exiting).
 */
export function TestScreen() {
  const started = useTest((s) => s.state != null);
  return started ? <TestPlay /> : <TestSetup />;
}

/* -------------------------- Setup -------------------------- */

function TestSetup() {
  const [seats, setSeats] = useState<number>(4);
  const [config, setConfig] = useState<any>(momontyGame.defaultConfig());
  const set = (patch: any) => setConfig({ ...config, ...patch });

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title="테스트 모드 · 방 설정"
          onBack={() => navigate({ name: "home" })}
        />
        <ScreenBody>
          <div className="test-setup-eyebrow">호스트 혼자 진행 · 통신 없이 로컬 엔진 실행</div>
          <SettingRow
            label="플레이어 수"
            right={<Stepper value={seats} min={3} max={8} onChange={setSeats} />}
          />
          <SettingRow
            label="과세 (세금)"
            hint="페온 상납 / 모몬티 반환"
            right={<Toggle value={config.taxationEnabled} onChange={(v) => set({ taxationEnabled: v })} />}
          />
          <SettingRow
            label="혁명"
            hint="광대 2장 보유 시 과세 취소"
            right={<Toggle value={config.revolutionEnabled} onChange={(v) => set({ revolutionEnabled: v })} />}
          />
          <SettingRow
            label="대혁명"
            hint="서열 완전 역전"
            right={<Toggle value={config.greatRevolutionEnabled} onChange={(v) => set({ greatRevolutionEnabled: v })} />}
          />
          <SettingRow
            label="광대 잔류 페널티"
            hint="라운드 끝까지 광대 보유 시 −2"
            right={<Toggle value={config.jesterPenalty} onChange={(v) => set({ jesterPenalty: v })} />}
          />
          <SettingRow
            label="같은 숫자 락 (Quad Lock)"
            hint="쿼드 즉시 파일 정리 · 리더 유지"
            right={<Toggle value={config.quadLock} onChange={(v) => set({ quadLock: v })} />}
          />
          <SettingRow
            label="낼 수 없으면 자동 패스"
            hint="이길 카드 없는 좌석은 자동 패스"
            right={<Toggle value={config.autoPassOnUnplayable} onChange={(v) => set({ autoPassOnUnplayable: v })} />}
          />
          <SettingRow
            label="목표 라운드"
            right={<Stepper value={config.targetRounds} min={1} max={12} onChange={(v) => set({ targetRounds: v })} />}
          />
        </ScreenBody>
        <FooterBar>
          <Button full variant="primary" onClick={() => initTest({ seatCount: seats, config })}>
            🧪 테스트 시작 ▶
          </Button>
        </FooterBar>
      </PhoneFrame>
    </DesktopStage>
  );
}

/* -------------------------- Play -------------------------- */

function TestPlay() {
  const acting = useTest((s) => s.actingSeatId);
  const seatNames = useTest((s) => s.seatNames);
  const version = useTest((s) => s.version);
  const rawState = useTest((s) => s.state);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmLeave(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!rawState) return null;

  const view = viewForSeat(acting)!;
  const spec = currentPhase(view);
  const guardReason = spec.guard(view, acting);
  const PhaseView = PHASE_VIEWS[spec.viewKey];
  const leaderSeatId = rawState.currentTrick?.leaderSeatId;

  return (
    <DesktopStage>
      <PhoneFrame gradient="radial-gradient(90% 40% at 50% 0%, rgba(242,193,78,.16), transparent 60%)">
        <ScreenHeader
          title={`R${view.round} · ${spec.label}`}
          onBack={() => setConfirmLeave(true)}
          right={
            <HeaderActions>
              <RulesButton onClick={() => openRules("momonty")} />
              <StatusBadge tone={guardReason == null ? "active" : "idle"} pulse={guardReason == null}>
                {guardReason == null ? "행동 가능" : guardReason}
              </StatusBadge>
            </HeaderActions>
          }
        />
        <div className="test-seat-picker">
          {rawState.seatOrder.map((seatId) => (
            <button
              key={seatId}
              type="button"
              className="test-seat-btn"
              data-active={seatId === acting ? "true" : "false"}
              data-turn={seatId === view.currentSeatId ? "true" : "false"}
              data-out={(view.handCounts[seatId] ?? 0) === 0 ? "true" : "false"}
              data-lead={seatId === leaderSeatId ? "true" : "false"}
              onClick={() => setActingSeat(seatId)}
            >
              <span className="test-seat-name">
                {seatNames[seatId] ?? seatId}
                {seatId === leaderSeatId ? <span className="lead-badge">선</span> : null}
              </span>
              <span className="test-seat-hand">{view.handCounts[seatId] ?? 0}장</span>
            </button>
          ))}
        </div>
        <ScreenBody>
          <PhaseView view={view} key={`${version}-${acting}-${spec.id}`} />
        </ScreenBody>
      </PhoneFrame>
      {confirmLeave ? (
        <div className="menu-scrim" onClick={() => setConfirmLeave(false)}>
          <div className="menu-sheet center" onClick={(e) => e.stopPropagation()}>
            <div className="menu-title">테스트에서 나갈까요?</div>
            <div className="menu-sub">방 설정 화면으로 돌아갑니다</div>
            <div className="menu-row">
              <Button full variant="ghost" onClick={() => setConfirmLeave(false)}>
                계속 진행
              </Button>
              <Button
                full
                variant="primary"
                onClick={() => {
                  setConfirmLeave(false);
                  resetTest();
                }}
              >
                나가기
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DesktopStage>
  );
}
