import { useEffect, useRef, useState } from "react";
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
import { installBackGuard, navigate } from "@web/nav/router";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "@web/games/momonty/phases";
import { FooterBar, HeaderActions, ScreenBody, StatusBadge, RulesButton } from "@web/design/layout";
import { openRules } from "./RulesSheet";
import { momontyGame } from "@shared/games/momonty/logic";
import { ConfirmDialog } from "@web/design/ConfirmDialog";
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

/* -------------------------- Round banner -------------------------- */

/**
 * Big centred "라운드 N 시작" overlay that fades in when the round
 * counter increments. Lets the player feel the transition instead of
 * silently landing on the next round.
 */
function RoundBanner({ phase, round }: { phase: string; round: number }) {
  const [visible, setVisible] = useState(false);
  const lastRoundRef = useRef(round);
  useEffect(() => {
    if (lastRoundRef.current !== round) {
      lastRoundRef.current = round;
      setVisible(true);
      const id = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(id);
    }
  }, [round]);
  if (!visible) return null;
  return (
    <div className="round-banner">
      <div className="round-banner-card">
        <div className="round-banner-eyebrow">ROUND</div>
        <div className="round-banner-number">{round}</div>
        <div className="round-banner-sub">
          {phase === "DRAWING_RANK"
            ? "서열 결정"
            : phase === "TAXATION"
            ? "과세 단계"
            : "플레이 시작"}
        </div>
      </div>
    </div>
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
    // Intercept browser back — surface the same exit confirm the user
    // sees when tapping the on-screen back arrow so the test session
    // doesn't silently vanish.
    const cleanup = installBackGuard(() => {
      setConfirmLeave(true);
      return true;
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      cleanup();
    };
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
        <div className="test-seat-picker-wrap">
          <div className="test-seat-picker-label">
            🧪 테스트 · 좌석 전환
          </div>
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
        </div>
        <RoundBanner phase={rawState.phase} round={view.round} />
        <ScreenBody>
          <PhaseView view={view} key={`${version}-${acting}-${spec.id}`} />
        </ScreenBody>
      </PhoneFrame>
      <ConfirmDialog
        open={confirmLeave}
        icon="🚪"
        title="게임에서 나갈까요?"
        message="진행 중인 판은 저장되지 않아요"
        cancelLabel="계속 진행"
        confirmLabel="나가기"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          resetTest();
        }}
      />
    </DesktopStage>
  );
}
