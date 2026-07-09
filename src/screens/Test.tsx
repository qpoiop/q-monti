import { useEffect } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { ScreenHeader } from "@web/design/primitives";
import { DesktopStage } from "./DesktopStage";
import {
  initTest,
  setActingSeat,
  useTest,
  viewForSeat,
} from "@web/state/testStore";
import { navigate } from "@web/nav/router";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "@web/games/momonty/phases";
import { Hint, ScreenBody, StatusBadge } from "@web/design/layout";
import "./test.css";

/**
 * Solo test surface.
 *
 * 4-seat local Momonty match. Header shows the current phase + a
 * seat-picker so the host jumps between all seats and takes every
 * turn. Below is the standard PhaseView — same as live rooms.
 */
export function TestScreen() {
  const has = useTest((s) => s.state != null);
  useEffect(() => {
    if (!has) initTest();
  }, [has]);

  const acting = useTest((s) => s.actingSeatId);
  const seatNames = useTest((s) => s.seatNames);
  const version = useTest((s) => s.version);
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
            <StatusBadge tone={guardReason == null ? "active" : "idle"} pulse={guardReason == null}>
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
              <span className="test-seat-name">{seatNames[seatId] ?? seatId}</span>
              <span className="test-seat-hand">{view.handCounts[seatId] ?? 0}장</span>
            </button>
          ))}
        </div>
        <ScreenBody>
          <PhaseView view={view} key={`${version}-${acting}-${spec.id}`} />
          {rawState.phase === "MATCH_END" ? (
            <div className="test-end">🏆 매치 종료 · 홈으로 돌아가주세요</div>
          ) : null}
        </ScreenBody>
      </PhoneFrame>
    </DesktopStage>
  );
}
