import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import { Button, ScreenHeader, SettingRow, Segmented, Stepper } from "@web/design/primitives";
import { getGame } from "@shared/games/registry";
import { createRoomAndJoin, setName, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { FooterBar, Hint, SectionLabel, ScreenBody } from "@web/design/layout";

/**
 * Momonty-only Create screen. Reads defaultConfig() from the game module
 * and renders a stable form. Everything is data-driven — swapping the
 * game just means pointing at a different module.
 */
/**
 * Create screen — room shell only. Game rules live in the lobby
 * (host-editable), matching the mockup flow where the host tunes rules
 * with everyone watching. Create screen answers "who are you, what's
 * this room called, who can see it, how many seats"; nothing else.
 */
export function CreateScreen() {
  const game = getGame("momonty");
  const defaults = game.defaultConfig();
  const [roomName, setRoomName] = useState("모몬티 왕좌");
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(Math.min(6, game.maxPlayers));
  const displayName = useStore((s) => s.session.displayName);
  const [name, setDN] = useState(displayName);

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
            right={
              <Stepper
                value={maxPlayers}
                min={game.minPlayers}
                max={game.maxPlayers}
                onChange={setMaxPlayers}
              />
            }
          />
          <Hint>세금·혁명·목표 라운드 같은 게임 규칙은 방 만든 뒤 대기실에서 조정할 수 있어요.</Hint>
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
                config: defaults,
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
