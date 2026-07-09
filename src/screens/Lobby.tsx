import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import {
  Button,
  Card,
  Pill,
  ScreenHeader,
  SettingRow,
  Stepper,
  Toggle,
} from "@web/design/primitives";
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
  const config = (room.config ?? {}) as Record<string, unknown>;

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
          <RoomSettingsPanel
            config={config}
            isHost={isHost}
            onUpdate={(patch) =>
              send({
                t: "setConfig",
                config: { ...config, ...patch },
              })
            }
          />
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

/**
 * Room settings — collapsible host-editable panel. Non-hosts see the
 * same rows in a read-only style so they know what rules they're
 * agreeing to. Server broadcasts config diffs; every seat reacts.
 */
function RoomSettingsPanel({
  config,
  isHost,
  onUpdate,
}: {
  config: Record<string, unknown>;
  isHost: boolean;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const taxOn = (config.taxationEnabled as boolean) ?? true;
  const revOn = (config.revolutionEnabled as boolean) ?? true;
  const greatOn = (config.greatRevolutionEnabled as boolean) ?? false;
  const jesterOn = (config.jesterPenalty as boolean) ?? true;
  const quadOn = (config.quadLock as boolean) ?? true;
  const rounds = (config.targetRounds as number) ?? 7;
  const turnSec = (config.turnLimitSec as number) ?? 20;
  const sets = (config.cardSets as number) ?? 1;
  const taxResult = (config.taxResultVisible as boolean) ?? true;

  return (
    <div className="room-settings">
      <button
        type="button"
        className="room-settings-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="room-settings-title">⚙ 게임 규칙</span>
        <span className="room-settings-summary">
          R{rounds} · {turnSec}초 · {sets}세트
          {taxOn ? " · 과세" : ""}
          {revOn ? " · 혁명" : ""}
        </span>
        <span className="room-settings-caret">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className={`room-settings-body ${isHost ? "" : "readonly"}`}>
          {!isHost ? (
            <Hint>방장이 게임 규칙을 조정합니다.</Hint>
          ) : null}
          <SettingRow
            label="카드 세트 수"
            hint="4인 이하 1세트 · 5인 이상 2세트 권장"
            right={
              <Stepper
                value={sets}
                min={1}
                max={3}
                onChange={(v) => onUpdate({ cardSets: v })}
              />
            }
          />
          <SettingRow
            label="목표 라운드"
            right={
              <Stepper
                value={rounds}
                min={3}
                max={12}
                onChange={(v) => onUpdate({ targetRounds: v })}
              />
            }
          />
          <SettingRow
            label="턴당 제한 시간"
            hint="초 단위"
            right={
              <Stepper
                value={turnSec}
                min={5}
                max={60}
                onChange={(v) => onUpdate({ turnLimitSec: v })}
              />
            }
          />
          <SettingRow
            label="과세 (세금)"
            hint="페온 상납 · 모몬티 반환"
            right={
              <Toggle
                value={taxOn}
                onChange={(v) =>
                  onUpdate({
                    taxationEnabled: v,
                    revolutionEnabled: v ? revOn : false,
                    greatRevolutionEnabled: v && revOn ? greatOn : false,
                  })
                }
              />
            }
          />
          <SettingRow
            label="혁명"
            hint={taxOn ? "광대 2장 보유 시 과세 취소" : "과세를 켜야 사용 가능"}
            right={
              <Toggle
                value={revOn && taxOn}
                onChange={(v) =>
                  onUpdate({
                    revolutionEnabled: v,
                    greatRevolutionEnabled: v ? greatOn : false,
                  })
                }
              />
            }
          />
          <SettingRow
            label="대혁명"
            hint={
              taxOn && revOn
                ? "서열 완전 역전 (혁명 시)"
                : "혁명을 켜야 사용 가능"
            }
            right={
              <Toggle
                value={greatOn && revOn && taxOn}
                onChange={(v) => onUpdate({ greatRevolutionEnabled: v })}
              />
            }
          />
          <SettingRow
            label="세금 결과 공개"
            hint="과세 후 이동 내역 요약 표시"
            right={
              <Toggle
                value={taxResult}
                onChange={(v) => onUpdate({ taxResultVisible: v })}
              />
            }
          />
          <SettingRow
            label="광대 잔류 페널티"
            hint="라운드 끝까지 보유 시 −2"
            right={
              <Toggle
                value={jesterOn}
                onChange={(v) => onUpdate({ jesterPenalty: v })}
              />
            }
          />
          <SettingRow
            label="쿼드 락"
            hint="같은 숫자 4장 다 내면 즉시 클리어"
            right={
              <Toggle
                value={quadOn}
                onChange={(v) => onUpdate({ quadLock: v })}
              />
            }
          />
        </div>
      ) : null}
    </div>
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
      <div className="grow seat-row-name">
        <span className="seat-row-name-text">{s.displayName}</span>
        {s.isHost ? (
          <Pill tone="accent" style={{ fontSize: 9, padding: "1px 6px" }}>
            👑 방장
          </Pill>
        ) : null}
      </div>
      <span className={`small seat-status seat-status-${statusTone}`}>{statusLabel}</span>
    </div>
  );
}
