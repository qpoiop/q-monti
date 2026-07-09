import type { MomontyView } from "@shared/games/momonty/logic";
import { currentPhase } from "@shared/games/momonty/phases";
import { PHASE_VIEWS } from "./phases";
import { PhaseHeader, RulesButton, ScreenBody, StatusBadge } from "@web/design/layout";
import { openRules } from "@web/screens/RulesSheet";

/**
 * Momonty root play surface.
 *
 * The runtime steps are entirely driven by `view.phase` + the shared phase
 * spec — this file no longer contains rendering logic per phase, just the
 * chrome (header + scroll body) and dispatch to the phase component.
 */
export function MomontyPlayView({ view }: { view: MomontyView }) {
  const spec = currentPhase(view);
  const guardReason = spec.guard(view, view.mySeatId ?? null);
  const PhaseView = PHASE_VIEWS[spec.viewKey];

  return (
    <>
      <PhaseHeader
        title={`R${view.round} · ${spec.label}`}
        sub={spec.sub}
        right={
          <>
            <RulesButton onClick={() => openRules("momonty")} />
            <StatusBadge tone={guardReason == null ? "active" : "idle"} pulse={guardReason == null}>
              {guardReason == null ? "내 차례" : guardReason}
            </StatusBadge>
          </>
        }
      />
      <ScreenBody>
        <PhaseView view={view} />
      </ScreenBody>
    </>
  );
}
