import { PhoneFrame } from "@web/design/PhoneFrame";
import { GAME_META } from "@shared/games/registry";
import { navigate } from "@web/nav/router";
import { DesktopStage } from "./DesktopStage";
import { ScreenHeader } from "@web/design/primitives";

/**
 * Game library — one card per registered game. Selecting a game routes to
 * its Create screen. Adding a new game = registering it in
 * shared/games/registry.ts and it appears here automatically.
 */
export function LibraryScreen() {
  return (
    <DesktopStage>
      <PhoneFrame>
        <ScreenHeader title="게임 라이브러리" onBack={() => navigate({ name: "home" })} />
        <div
          style={{
            padding: "8px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
          }}
        >
          {GAME_META.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => navigate({ name: "create", gameId: g.id })}
              data-accent={g.accent}
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 16,
                border: "1px solid var(--accent-border)",
                background: "var(--accent-soft)",
                color: "var(--text-1)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-brand)",
                  fontWeight: 900,
                  fontSize: 20,
                  color: "#fff",
                }}
              >
                {g.koreanName}
              </div>
              <div style={{ color: "var(--accent-3)", fontSize: 12 }}>{g.tagline}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                <MiniPill>
                  {g.minPlayers === g.maxPlayers
                    ? `${g.minPlayers}인`
                    : `${g.minPlayers}~${g.maxPlayers}인`}
                </MiniPill>
                <MiniPill>{g.displayName}</MiniPill>
              </div>
            </button>
          ))}
        </div>
      </PhoneFrame>
    </DesktopStage>
  );
}

function MiniPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        background: "rgba(255,255,255,.07)",
        border: "1px solid rgba(255,255,255,.14)",
        color: "var(--text-3)",
      }}
    >
      {children}
    </span>
  );
}
