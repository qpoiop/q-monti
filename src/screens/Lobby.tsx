import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, Card, Pill, ScreenHeader } from "@web/design/primitives";
import { leaveRoom, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import type { SeatPublic } from "@shared/protocol";
import { FooterBar, Hint, HeaderActions, Row, RulesButton, ScreenBody, Stack } from "@web/design/layout";
import { openRules } from "./RulesSheet";
import { send } from "@web/state/store";

/**
 * Lobby derives readiness + host controls from `room.seats`. Nothing in the
 * template branches on inline styling — all visual states come from either
 * layout primitives or dedicated CSS classes.
 */
export function LobbyScreen() {
  const room = useStore((s) => s.room);
  const userId = useStore((s) => s.session.userId);
  if (!room) {
    return (
      <DesktopStage>
        <PhoneFrame>
          <ScreenHeader title="대기실 로딩" onBack={() => navigate({ name: "home" })} />
          <ScreenBody>
            <Hint>방 상태 동기화 중…</Hint>
          </ScreenBody>
        </PhoneFrame>
      </DesktopStage>
    );
  }

  const mine = room.seats.find((s) => s.userId === userId);
  const isHost = mine?.isHost ?? false;
  const readyCount = room.seats.filter((s) => s.ready || s.isHost).length;
  const canStart = readyCount === room.seats.length && room.seats.length >= 2;
  const emptySlots = Math.max(0, room.maxPlayers - room.seats.length);

  const primary = isHost
    ? {
        label: canStart
          ? "전원 준비 완료 · 시작"
          : `전원 준비 대기 (${readyCount}/${room.seats.length})`,
        disabled: !canStart,
        onClick: () => send({ t: "startMatch" }),
      }
    : {
        label: mine?.ready ? "준비 취소" : "준비 완료",
        disabled: false,
        onClick: () => send({ t: "setReady", ready: !mine?.ready }),
      };

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title={room.roomName || "새 방"}
          onBack={() => {
            leaveRoom();
            navigate({ name: "home" });
          }}
          right={
            <HeaderActions>
              <RulesButton onClick={() => openRules(room.gameId)} />
              <span className="small" style={{ color: "var(--text-5)" }}>
                {room.seats.length}/{room.maxPlayers}
              </span>
            </HeaderActions>
          }
        />
        <ScreenBody>
          <Card tone="accent">
            <Row>
              <Stack gap={4}>
                <span className="tiny" style={{ color: "var(--text-5)", fontWeight: 700 }}>
                  방 코드
                </span>
                <span className="room-code">{room.code}</span>
              </Stack>
              <Row gap={6} className="push-right">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => navigator.clipboard.writeText(room.code)}
                >
                  복사
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    navigator.share
                      ? navigator.share({ text: `모몬티 방 코드: ${room.code}` })
                      : navigator.clipboard.writeText(`${location.origin} 코드: ${room.code}`)
                  }
                >
                  공유
                </button>
              </Row>
            </Row>
          </Card>
          <Stack gap={6}>
            {room.seats.map((s) => (
              <SeatRow key={s.seatId} s={s} />
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty${i}`} className="seat-row" style={{ borderStyle: "dashed" }}>
                <span className="seat-avatar" style={{ background: "var(--glass-2)" }}>＋</span>
                <span className="small" style={{ color: "var(--text-6)" }}>빈 자리 · 초대 대기</span>
              </div>
            ))}
          </Stack>
        </ScreenBody>
        <FooterBar>
          <Button full variant="primary" disabled={primary.disabled} onClick={primary.onClick}>
            {primary.label}
          </Button>
        </FooterBar>
      </PhoneFrame>
    </DesktopStage>
  );
}

function SeatRow({ s }: { s: SeatPublic }) {
  const statusTone: "pos" | "idle" | "danger" = !s.online ? "danger" : s.ready || s.isHost ? "pos" : "idle";
  const statusLabel = !s.online
    ? "연결 끊김"
    : s.ready || s.isHost
    ? "준비완료"
    : "대기중…";

  return (
    <div className="seat-row">
      <span className="seat-avatar">{(s.displayName[0] || "?").toUpperCase()}</span>
      <div className="grow">
        <div className="body" style={{ color: "#fff", fontWeight: 700 }}>
          {s.displayName}
          {s.isHost ? (
            <Pill tone="accent" style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px" }}>
              👑 방장
            </Pill>
          ) : null}
        </div>
      </div>
      <span className={`small seat-status seat-status-${statusTone}`}>{statusLabel}</span>
    </div>
  );
}
