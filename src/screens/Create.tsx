import { useState } from "react";
import { PhoneFrame } from "@web/design/PhoneFrame";
import {
  BottomBar,
  Button,
  Card,
  ScreenHeader,
  SettingRow,
  Segmented,
  Stepper,
  Toggle,
} from "@web/design/primitives";
import { getGame } from "@shared/games/registry";
import { send, setName, useStore } from "@web/state/store";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";

/**
 * A single Create screen powered by the game's `defaultConfig()`. Individual
 * games may register a `configEditor` view in the future — here we render a
 * hand-crafted UI for Momonty and a JSON-preview stub for the others.
 */
export function CreateScreen({ gameId }: { gameId: string }) {
  const game = getGame(gameId);
  const [config, setConfig] = useState<any>(game.defaultConfig());
  const [roomName, setRoomName] = useState("모몬티 왕좌");
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(
    Math.min(6, game.maxPlayers)
  );
  const displayName = useStore((s) => s.session.displayName);
  const [name, setDN] = useState(displayName);

  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader
          title={`${game.koreanName} · 방 만들기`}
          onBack={() => navigate({ name: "library" })}
        />
        <div
          style={{
            padding: "8px 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
            paddingBottom: 16,
          }}
        >
          <NameField>
            <div style={{ color: "var(--text-5)", fontSize: 10.5, fontWeight: 700, marginBottom: 6 }}>
              내 이름
            </div>
            <input
              value={name}
              onChange={(e) => setDN(e.target.value.slice(0, 12))}
              onBlur={() => setName(name || "게스트")}
              placeholder="닉네임"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 11,
                background: "var(--glass-3)",
                border: "1px solid var(--glass-border-2)",
                color: "var(--text-1)",
                fontSize: 13,
              }}
            />
          </NameField>
          <NameField>
            <div style={{ color: "var(--text-5)", fontSize: 10.5, fontWeight: 700, marginBottom: 6 }}>
              방 이름
            </div>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value.slice(0, 20))}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 11,
                background: "var(--glass-3)",
                border: "1px solid var(--glass-border-2)",
                color: "var(--text-1)",
                fontSize: 13,
              }}
            />
          </NameField>

          <div>
            <div
              style={{
                color: "var(--text-5)",
                fontSize: 10.5,
                fontWeight: 700,
                margin: "0 2px 6px",
              }}
            >
              공개 설정
            </div>
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

          <div
            style={{
              color: "var(--text-5)",
              fontSize: 10.5,
              fontWeight: 700,
              margin: "8px 2px 0",
            }}
          >
            게임 규칙
          </div>
          <GameConfigEditor gameId={gameId} config={config} onChange={setConfig} />
        </div>
        <BottomBar>
          <Button
            full
            variant="primary"
            onClick={() => {
              send({
                t: "createRoom",
                gameId,
                roomName,
                isPrivate,
                maxPlayers,
              });
              // Send the config through as a follow-up setConfig after the room lands.
              setTimeout(() => send({ t: "setConfig", config }), 200);
            }}
          >
            방 만들고 초대 ▶
          </Button>
        </BottomBar>
      </PhoneFrame>
    </DesktopStage>
  );
}

function NameField({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

/**
 * Config UI. Wired for Momonty; other games get a JSON summary + toggle
 * defaults. Real editors can be added incrementally.
 */
function GameConfigEditor({
  gameId,
  config,
  onChange,
}: {
  gameId: string;
  config: any;
  onChange: (c: any) => void;
}) {
  const set = (patch: any) => onChange({ ...config, ...patch });

  if (gameId === "momonty") {
    return (
      <>
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
          right={
            <Stepper
              value={config.targetRounds}
              min={3}
              max={12}
              onChange={(v) => set({ targetRounds: v })}
            />
          }
        />
      </>
    );
  }
  return (
    <Card>
      <div style={{ color: "var(--text-4)", fontSize: 12 }}>
        기본 설정으로 시작합니다. 세부 옵션 편집기는 곧 추가돼요.
      </div>
    </Card>
  );
}
