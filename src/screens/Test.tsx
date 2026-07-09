import { useEffect } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { DesktopStage } from "./DesktopStage";
import {
  initTest,
  setActingSeat,
  testDispatch,
  useTest,
  viewForSeat,
} from "@web/state/testStore";
import { navigate } from "@web/nav/router";
import type { MomontyAction } from "@shared/games/momonty/logic";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "@web/games/momonty/phases";
import {
  Hint,
  Row,
  ScreenBody,
  Stack,
  StatusBadge,
} from "@web/design/layout";
import "./test.css";

/**
 * Solo test screen.
 *
 * Boots a local Momonty match with 4 seats, all controlled by the host.
 * The seat selector at the top lets the host jump between players and
 * take each turn — useful for validating the whole flow end-to-end
 * without any network layer.
 */
export function TestScreen() {
  const has = useTest((s) => s.state != null);
  useEffect(() => {
    if (!has) initTest();
  }, [has]);
  const acting = useTest((s) => s.actingSeatId);
  const seatNames = useTest((s) => s.seatNames);
  const rawState = useTest((s) => s.state);

  if (!rawState) {
    return (
      <DesktopStage>
        <PhoneFrame>
          <ScreenHeader title="테스트 모드 준비 중" onBack={() => navigate({ name: "home" })} />
          <ScreenBody>
            <Hint>로컬 엔진 부팅 중…</Hint>
          </ScreenBody>
        </PhoneFrame>
      </DesktopStage>
    );
  }

  const view = viewForSeat(acting)!;
  const spec = currentPhase(view);
  const guardReason = spec.guard(view, acting);
  const PhaseView = PHASE_VIEWS[spec.viewKey];

  return (
    <DesktopStage>
      <PhoneFrame gradient="radial-gradient(90% 40% at 50% 0%, rgba(242,193,78,.16), transparent 60%)">
        <ScreenHeader
          title={`테스트 · ${spec.label}`}
          onBack={() => navigate({ name: "home" })}
          right={
            <StatusBadge tone={guardReason == null ? "active" : "idle"} pulse>
              {guardReason == null ? "행동 가능" : guardReason}
            </StatusBadge>
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
              <span className="test-seat-name">{seatNames[seatId]}</span>
              <span className="test-seat-hand">{view.handCounts[seatId] ?? 0}장</span>
            </button>
          ))}
        </div>
        <ScreenBody>
          <PhaseView view={view} />
          <div className="test-log">
            <div className="test-log-title">최근 이벤트</div>
            <ul>
              {(view.historyTail ?? []).slice(-6).map((e, i) => (
                <li key={i}>
                  <b>{e.type}</b>
                  {e.seatId ? ` · ${seatNames[e.seatId] ?? e.seatId}` : ""}
                </li>
              ))}
            </ul>
          </div>
          {rawState.phase === "MATCH_END" ? (
            <div className="test-end">🏆 매치 종료 · 최종 순위 확인 후 홈으로 이동하세요</div>
          ) : null}
        </ScreenBody>
      </PhoneFrame>
    </DesktopStage>
  );
}

/* Expose dispatcher through the same `send()` interface the phase
 * views call, only when we're on the /test route. See store.send. */
export function testExecute(action: MomontyAction) {
  return testDispatch(action);
}
