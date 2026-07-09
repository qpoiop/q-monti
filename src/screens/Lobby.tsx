import { PhoneFrame } from "@web/design/PhoneFrame";
import {
  BottomBar,
  Button,
  Card,
  Pill,
  ScreenHeader,
} from "@web/design/primitives";
import { send, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import type { SeatPublic } from "@shared/protocol";

export function LobbyScreen() {
  const room = useStore((s) => s.room);
  const userId = useStore((s) => s.session.userId);
  if (!room) {
    return (
      <DesktopStage>
        <PhoneFrame>
          <ScreenHeader title="대기실 로딩" onBack={() => navigate({ name: "home" })} />
          <div style={{ padding: 16, color: "var(--text-5)", fontSize: 12 }}>
            방 상태 동기화 중…
          </div>
        </PhoneFrame>
      </DesktopStage>
    );
  }

  const mine = room.seats.find((s) => s.userId === userId);
  const isHost = mine?.isHost ?? false;
  const readyCount = room.seats.filter((s) => s.ready || s.isHost).length;
  const canStart = readyCount === room.seats.length && room.seats.length >= 2;

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title={room.roomName || "새 방"}
          onBack={() => {
            send({ t: "leaveRoom" });
            navigate({ name: "home" });
          }}
          right={
            <span style={{ fontSize: 11, color: "var(--text-5)" }}>
              {room.seats.length}/{room.maxPlayers}
            </span>
          }
        />
        <div style={{ padding: "8px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <Card tone="accent" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ color: "var(--text-5)", fontSize: 9.5, fontWeight: 700 }}>
                방 코드
              </div>
              <div
                style={{
                  color: "#fff",
                  fontFamily: "var(--font-brand)",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: ".14em",
                }}
              >
                {room.code}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <ChipButton
                onClick={() => navigator.clipboard.writeText(room.code)}
              >
                복사
              </ChipButton>
              <ChipButton
                onClick={() =>
                  navigator.share
                    ? navigator.share({ text: `모몬티 방 코드: ${room.code}` })
                    : navigator.clipboard.writeText(
                        `${location.origin} 코드: ${room.code}`
                      )
                }
              >
                공유
              </ChipButton>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {room.seats.map((s) => (
              <SeatRow key={s.seatId} s={s} />
            ))}
            {Array.from({ length: Math.max(0, room.maxPlayers - room.seats.length) }).map(
              (_, i) => (
                <Card tone="dashed" key={`empty${i}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        color: "var(--text-6)",
                      }}
                    >
                      ＋
                    </span>
                    <span style={{ color: "var(--text-6)", fontSize: 12 }}>
                      빈 자리 · 초대 대기
                    </span>
                  </div>
                </Card>
              )
            )}
          </div>
        </div>
        <BottomBar>
          {isHost ? (
            <Button
              full
              variant="primary"
              disabled={!canStart}
              onClick={() => send({ t: "startMatch" })}
            >
              {canStart ? "전원 준비 완료 · 시작" : `전원 준비 대기 (${readyCount}/${room.seats.length})`}
            </Button>
          ) : (
            <Button
              full
              variant="primary"
              onClick={() => send({ t: "setReady", ready: !mine?.ready })}
            >
              {mine?.ready ? "준비 취소" : "준비 완료"}
            </Button>
          )}
        </BottomBar>
      </PhoneFrame>
    </DesktopStage>
  );
}

function ChipButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 11px",
        borderRadius: 10,
        background: "rgba(255,255,255,.1)",
        color: "var(--accent-3)",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </button>
  );
}

function SeatRow({ s }: { s: SeatPublic }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--brand-purple-1), var(--brand-purple-2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#fff",
          }}
        >
          {(s.displayName[0] || "?").toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
            {s.displayName}
            {s.isHost ? (
              <Pill tone="accent" style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px" }}>
                👑 방장
              </Pill>
            ) : null}
          </div>
        </div>
        {!s.online ? (
          <span style={{ color: "var(--neg-1)", fontSize: 11, fontWeight: 700 }}>
            연결 끊김
          </span>
        ) : s.ready || s.isHost ? (
          <span style={{ color: "var(--pos-1)", fontSize: 11, fontWeight: 700 }}>준비완료</span>
        ) : (
          <span style={{ color: "var(--text-5)", fontSize: 11 }}>대기중…</span>
        )}
      </div>
    </Card>
  );
}
