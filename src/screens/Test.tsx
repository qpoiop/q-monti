import { useEffect, useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader, SettingRow, Segmented, Stepper, Toggle } from "@web/design/primitives";
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
 * Test mode surface — two stages:
 *   1. Setup: config form (seat count, taxation/revolution/quadLock etc.)
 *      → user hits 테스트 시작 → local match boots.
 *   2. Play: standard phase view with seat picker + menu (leave → home).
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
            right={
              <Toggle
                value={config.greatRevolutionEnabled}
                onChange={(v) => set({ greatRevolutionEnabled: v })}
              />
            }
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
            label="목표 라운드"
            right={<Stepper value={config.targetRounds} min={1} max={12} onChange={(v) => set({ targetRounds: v })} />}
          />
        </ScreenBody>
        <FooterBar>
          <Button
            full
            variant="primary"
            onClick={() => initTest({ seatCount: seats, config })}
          >
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!rawState) return null;

  const view = viewForSeat(acting)!;
  const spec = currentPhase(view);
  const guardReason = spec.guard(view, acting);
  const PhaseView = PHASE_VIEWS[spec.viewKey];

  const leave = () => {
    resetTest();
    navigate({ name: "home" });
  };

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
              <button
                type="button"
                className="menu-btn"
                onClick={() => setMenuOpen(true)}
                aria-label="menu"
              >
                ⋮
              </button>
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
              onClick={() => setActingSeat(seatId)}
            >
              <span className="test-seat-name">{seatNames[seatId] ?? seatId}</span>
              <span className="test-seat-hand">{view.handCounts[seatId] ?? 0}장</span>
            </button>
          ))}
        </div>
        <ScreenBody>
          <PhaseView view={view} key={`${version}-${acting}-${spec.id}`} />
        </ScreenBody>
      </PhoneFrame>
      {menuOpen ? (
        <div className="menu-scrim" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="menu-title">테스트 메뉴</div>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                openRules("momonty");
              }}
            >
              📖 규칙 다시 보기
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setMenuOpen(false);
                resetTest();
              }}
            >
              🔄 처음부터 다시
            </button>
            <button
              type="button"
              className="menu-item danger"
              onClick={() => {
                setMenuOpen(false);
                setConfirmLeave(true);
              }}
            >
              🚪 방 나가기
            </button>
          </div>
        </div>
      ) : null}
      {confirmLeave ? (
        <div className="menu-scrim" onClick={() => setConfirmLeave(false)}>
          <div className="menu-sheet center" onClick={(e) => e.stopPropagation()}>
            <div className="menu-title">테스트를 종료할까요?</div>
            <div className="menu-sub">현재 진행 상황은 저장되지 않아요</div>
            <div className="menu-row">
              <Button full variant="ghost" onClick={() => setConfirmLeave(false)}>
                계속 진행
              </Button>
              <Button full variant="primary" onClick={leave}>
                종료
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DesktopStage>
  );
}
