import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader, SettingRow, Segmented, Stepper, Toggle } from "@web/design/primitives";
import { DesktopStage } from "./DesktopStage";
import {
  initTest,
  resetTest,
  runBotForHuman,
  setActingSeat,
  useTest,
  viewForSeat,
} from "@web/state/testStore";
import { installBackGuard, navigate } from "@web/nav/router";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "@web/games/momonty/phases";
import { FooterBar, HeaderActions, ScreenBody, SectionLabel, StatusBadge, RulesButton } from "@web/design/layout";
import { openRules } from "./RulesSheet";
import { momontyGame } from "@shared/games/momonty/logic";
import { ConfirmDialog } from "@web/design/ConfirmDialog";
import "./test.css";

/**
 * Test mode — two stages:
 *   1. Setup: config form (tabs: 기본 룰 / 고급 룰) → 테스트 시작.
 *   2. Play: standard phase views + seat picker.
 */

function perSetTotal(cfg: {
  cardMax: number;
  jestersPerSet: number;
}): number {
  return (cfg.cardMax * (cfg.cardMax + 1)) / 2 + cfg.jestersPerSet;
}
export function TestScreen() {
  const started = useTest((s) => s.state != null);
  return started ? <TestPlay /> : <TestSetup />;
}

/* -------------------------- Setup -------------------------- */

function TestSetup() {
  const [tab, setTab] = useState<"basic" | "advanced">("basic");
  const [seats, setSeats] = useState<number>(4);
  const [config, setConfig] = useState<any>(momontyGame.defaultConfig());
  const set = (patch: any) => {
    const next = { ...config, ...patch };
    // Revolution depends on taxation — auto-disable when tax is off.
    if (patch.taxationEnabled === false) {
      next.revolutionEnabled = false;
      next.greatRevolutionEnabled = false;
      next.taxResultVisible = false;
    }
    setConfig(next);
  };

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title="테스트 · 방 설정"
          onBack={() => navigate({ name: "home" })}
          right={
            <span
              style={{
                color: "var(--accent-1)",
                fontFamily: "var(--font-brand)",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              {tab === "basic" ? "기본" : "고급"}
            </span>
          }
        />
        <div className="setup-tabs">
          <button
            type="button"
            className={`setup-tab ${tab === "basic" ? "active" : ""}`}
            onClick={() => setTab("basic")}
          >
            기본 룰
          </button>
          <button
            type="button"
            className={`setup-tab ${tab === "advanced" ? "active" : ""}`}
            onClick={() => setTab("advanced")}
          >
            고급 룰 →
          </button>
        </div>
        <ScreenBody>
          {tab === "basic" ? (
            <>
              <SectionLabel>인원</SectionLabel>
              <div className="seat-count-row">
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`seat-count-cell ${n === seats ? "active" : ""}`}
                    onClick={() => setSeats(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <SettingRow
                label="덱 구성"
                hint={`1은 1장 · 2는 2장 · … · ${config.cardMax}은 ${config.cardMax}장 + 광대 ${config.jestersPerSet} (1세트)`}
                right={
                  <span
                    style={{
                      fontFamily: "var(--font-brand)",
                      fontWeight: 800,
                      color: "var(--accent-1)",
                      fontSize: 14,
                    }}
                  >
                    {perSetTotal(config) * Math.max(1, config.cardSets)}장
                  </span>
                }
              />
              <SettingRow
                label="카드 세트 수"
                hint="4인 이하는 1세트가 기본 · 인원 많으면 2세트"
                right={
                  <Stepper
                    value={config.cardSets}
                    min={1}
                    max={3}
                    onChange={(v) => set({ cardSets: v })}
                  />
                }
              />
              <SettingRow
                label="과세 (세금)"
                hint="페온 상납 · 모몬티 반환 · 혁명 옵션 활성화"
                right={
                  <Toggle
                    value={config.taxationEnabled}
                    onChange={(v) => set({ taxationEnabled: v })}
                  />
                }
              />
              <SettingRow
                label="혁명"
                hint={
                  config.taxationEnabled
                    ? "광대 2장 보유 시 과세 취소"
                    : "과세를 켜야 사용 가능"
                }
                right={
                  <Toggle
                    value={config.revolutionEnabled && config.taxationEnabled}
                    onChange={(v) => set({ revolutionEnabled: v })}
                  />
                }
              />
              <SettingRow
                label="대혁명"
                hint={
                  config.revolutionEnabled
                    ? "서열 완전 역전 (혁명 시)"
                    : "혁명을 켜야 사용 가능"
                }
                right={
                  <Toggle
                    value={config.greatRevolutionEnabled && config.revolutionEnabled}
                    onChange={(v) => set({ greatRevolutionEnabled: v })}
                  />
                }
              />
              <div className="two-col-settings">
                <SettingRow
                  label="턴 제한"
                  right={
                    <span
                      style={{
                        fontFamily: "var(--font-brand)",
                        fontWeight: 800,
                        color: "var(--accent-1)",
                        fontSize: 14,
                      }}
                    >
                      {config.turnLimitSec}초
                    </span>
                  }
                />
                <SettingRow
                  label="목표"
                  right={
                    <Stepper
                      value={config.targetRounds}
                      min={1}
                      max={12}
                      onChange={(v) => set({ targetRounds: v })}
                    />
                  }
                />
              </div>
              <SettingRow
                label="턴당 제한 시간"
                right={
                  <Stepper
                    value={config.turnLimitSec}
                    min={5}
                    max={60}
                    onChange={(v) => set({ turnLimitSec: v })}
                  />
                }
              />
            </>
          ) : (
            <>
              <SectionLabel>더미 히스토리 공개</SectionLabel>
              <Segmented
                value={config.historyMode}
                onChange={(v) => set({ historyMode: v })}
                options={[
                  { value: "all", label: "전체 공개" },
                  { value: "last", label: "직전 1수" },
                  { value: "none", label: "비공개" },
                ]}
              />
              <SettingRow
                label="세금 결과 공개"
                hint="상납/반환 마무리 후 요약 카드 노출"
                right={
                  <Toggle
                    value={config.taxResultVisible && config.taxationEnabled}
                    onChange={(v) => set({ taxResultVisible: v })}
                  />
                }
              />
              <SettingRow
                label="광대 잔류 페널티"
                hint="라운드 끝까지 보유 시 −2"
                right={
                  <Toggle
                    value={config.jesterPenalty}
                    onChange={(v) => set({ jesterPenalty: v })}
                  />
                }
              />
              <SettingRow
                label="같은 숫자 락 (Quad Lock)"
                hint="쿼드 즉시 파일 정리 · 리더 유지"
                right={
                  <Toggle
                    value={config.quadLock}
                    onChange={(v) => set({ quadLock: v })}
                  />
                }
              />
              <SettingRow
                label="낼 수 없으면 자동 패스"
                hint="1같은 강카드 리드 시 즉시 다음 파일"
                right={
                  <Toggle
                    value={config.autoPassOnUnplayable}
                    onChange={(v) => set({ autoPassOnUnplayable: v })}
                  />
                }
              />
            </>
          )}
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
            <button
              type="button"
              className="test-run-bot"
              onClick={() => runBotForHuman()}
              title="현재 좌석의 이번 라운드 전체를 봇에게 넘김"
            >
              ▶ 봇에게 넘기기
            </button>
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
                  <span className="test-seat-name-text">{seatNames[seatId] ?? seatId}</span>
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
