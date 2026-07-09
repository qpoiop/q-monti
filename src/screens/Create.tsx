import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, Card, ScreenHeader, SettingRow, Segmented, Stepper, Toggle } from "@web/design/primitives";
import { getGame } from "@shared/games/registry";
import { createRoomAndJoin, setName, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { FooterBar, SectionLabel, ScreenBody } from "@web/design/layout";

/**
 * Momonty-only Create screen. Reads defaultConfig() from the game module
 * and renders a stable form. Everything is data-driven — swapping the
 * game just means pointing at a different module.
 */
export function CreateScreen() {
  const game = getGame("momonty");
  const [config, setConfig] = useState<any>(game.defaultConfig());
  const [roomName, setRoomName] = useState("모몬티 왕좌");
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(Math.min(6, game.maxPlayers));
  const displayName = useStore((s) => s.session.displayName);
  const [name, setDN] = useState(displayName);
  const set = (patch: any) => setConfig({ ...config, ...patch });

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title="방 만들기"
          onBack={() => navigate({ name: "home" })}
        />
        <ScreenBody>
          <div>
            <SectionLabel>내 이름</SectionLabel>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setDN(e.target.value.slice(0, 12))}
              onBlur={() => setName(name || "게스트")}
              placeholder="닉네임"
            />
          </div>
          <div>
            <SectionLabel>방 이름</SectionLabel>
            <input
              className="field-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value.slice(0, 20))}
            />
          </div>
          <div>
            <SectionLabel>공개 설정</SectionLabel>
            <Segmented
              value={isPrivate ? "private" : "public"}
              onChange={(v) => setIsPrivate(v === "private")}
              options={[
                { value: "private", label: "🔒 비공개" },
                { value: "public", label: "🌐 공개" },
              ]}
            />
          </div>
          <SettingRow
            label="최대 인원"
            right={<Stepper value={maxPlayers} min={game.minPlayers} max={game.maxPlayers} onChange={setMaxPlayers} />}
          />
          <SectionLabel>게임 규칙</SectionLabel>
          <SettingRow
            label="과세 (세금)"
            hint="페온 2·2 / 레서 1·1 교환"
            right={<Toggle value={config.taxationEnabled} onChange={(v) => set({ taxationEnabled: v })} />}
          />
          <SettingRow
            label="혁명"
            hint="광대 2장 보유 시 과세 취소"
            right={<Toggle value={config.revolutionEnabled} onChange={(v) => set({ revolutionEnabled: v })} />}
          />
          <SettingRow
            label="대혁명"
            hint="모몬티↔페온 서열 완전 역전"
            right={<Toggle value={config.greatRevolutionEnabled} onChange={(v) => set({ greatRevolutionEnabled: v })} />}
          />
          <SettingRow
            label="광대 잔류 페널티"
            hint="라운드 끝까지 보유 시 −2"
            right={<Toggle value={config.jesterPenalty} onChange={(v) => set({ jesterPenalty: v })} />}
          />
          <SettingRow
            label="같은 숫자 락 (Quad Lock)"
            hint="같은 숫자 4장 다 내면 즉시 클리어"
            right={<Toggle value={config.quadLock} onChange={(v) => set({ quadLock: v })} />}
          />
          <SettingRow
            label="목표 라운드"
            right={<Stepper value={config.targetRounds} min={3} max={12} onChange={(v) => set({ targetRounds: v })} />}
          />
        </ScreenBody>
        <FooterBar>
          <Button
            full
            variant="primary"
            onClick={() =>
              createRoomAndJoin({
                roomName,
                isPrivate,
                maxPlayers,
                config,
              })
            }
          >
            방 만들고 초대 ▶
          </Button>
        </FooterBar>
      </PhoneFrame>
    </DesktopStage>
  );
}
