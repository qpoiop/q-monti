import { useEffect, useState } from "react";
import { useStore, send } from "@web/state/store";
import { SettingRow, Stepper, Toggle } from "@web/design/primitives";
import { Hint } from "@web/design/layout";
import "./settings-sheet.css";

/**
 * Room settings sheet — mockup §1-3.
 *
 * Standalone layer instead of an inline lobby collapsible. Host edits
 * via setConfig broadcasts; non-hosts see the same rows read-only so
 * they know what rules the room is enforcing. Two tabs: 기본 / 고급.
 */

let openHandler: (() => void) | null = null;

export function openSettings(): void {
  openHandler?.();
}

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"basic" | "advanced">("basic");
  const room = useStore((s) => s.room);
  const userId = useStore((s) => s.session.userId);

  useEffect(() => {
    openHandler = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      openHandler = null;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!open || !room) return null;
  const config = (room.config ?? {}) as Record<string, unknown>;
  const mine = room.seats.find((s) => s.userId === userId);
  const isHost = mine?.isHost ?? false;
  const taxOn = (config.taxationEnabled as boolean) ?? true;
  const revOn = (config.revolutionEnabled as boolean) ?? true;
  const greatOn = (config.greatRevolutionEnabled as boolean) ?? false;
  const jesterOn = (config.jesterPenalty as boolean) ?? true;
  const quadOn = (config.quadLock as boolean) ?? true;
  const rounds = (config.targetRounds as number) ?? 7;
  const turnSec = (config.turnLimitSec as number) ?? 20;
  const sets = (config.cardSets as number) ?? 1;
  const taxResult = (config.taxResultVisible as boolean) ?? true;
  const onUpdate = (patch: Record<string, unknown>) =>
    send({ t: "setConfig", config: { ...config, ...patch } });

  return (
    <div className="settings-scrim" onClick={() => setOpen(false)}>
      <div
        className="settings-sheet"
        onClick={(e) => e.stopPropagation()}
        data-accent="momonty"
      >
        <div className="settings-grabber" />
        <div className="settings-head">
          <div className="settings-head-title-row">
            <span className="settings-head-eyebrow">모몬티 · 방 설정</span>
            <button
              type="button"
              className="settings-close"
              onClick={() => setOpen(false)}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <div className="settings-tabs">
            <button
              type="button"
              className={`settings-tab ${tab === "basic" ? "active" : ""}`}
              onClick={() => setTab("basic")}
            >
              기본 룰
            </button>
            <button
              type="button"
              className={`settings-tab ${tab === "advanced" ? "active" : ""}`}
              onClick={() => setTab("advanced")}
            >
              고급 룰
            </button>
          </div>
        </div>
        <div className={`settings-body ${isHost ? "" : "readonly"}`}>
          {!isHost ? <Hint>방장이 게임 규칙을 조정합니다.</Hint> : null}
          {tab === "basic" ? (
            <>
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
                hint={
                  taxOn ? "광대 2장 보유 시 과세 취소" : "과세를 켜야 사용 가능"
                }
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
