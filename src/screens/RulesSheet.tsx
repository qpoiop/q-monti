import { useEffect, useState } from "react";
import { RULEBOOKS } from "@shared/games/rules";
import { Pill } from "@web/design/primitives";

/**
 * Rulebook bottom sheet.
 *
 * - Slides up from the bottom, taking up most of the viewport but respecting
 *   safe-area insets.
 * - Chapter tabs across the top; content scrolls under them.
 * - Uses game's `[data-accent]` (via props) so each rulebook picks up its
 *   own colour tokens.
 * - Opened via `openRules(gameId)`; closed via backdrop tap, close button,
 *   or Escape.
 */

let openHandler: ((gameId: string) => void) | null = null;

export function openRules(gameId: string): void {
  openHandler?.(gameId);
}

export function RulesSheet() {
  const [openedGameId, setOpenedGameId] = useState<string | null>(null);
  const [chapterKey, setChapterKey] = useState<string | null>(null);

  useEffect(() => {
    openHandler = (id: string) => {
      setOpenedGameId(id);
      const rb = RULEBOOKS[id];
      setChapterKey(rb?.chapters[0]?.key ?? null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedGameId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      openHandler = null;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!openedGameId) return null;
  const rb = RULEBOOKS[openedGameId];
  if (!rb) return null;
  const chapter = rb.chapters.find((c) => c.key === chapterKey) ?? rb.chapters[0];

  const accent =
    rb.gameId === "momonty"
      ? "momonty"
      : rb.gameId === "querymo"
      ? "querymo"
      : rb.gameId === "binchi"
      ? "binchi"
      : rb.gameId === "indient"
      ? "indient"
      : rb.gameId === "moorumon"
      ? "moorumon"
      : "momonty";

  return (
    <div
      onClick={() => setOpenedGameId(null)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,4,15,.72)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 310,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-accent={accent}
        style={{
          background: "linear-gradient(165deg, var(--surface-2), var(--surface-1))",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          width: "100%",
          maxWidth: 480,
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -18px 60px rgba(0,0,0,.6)",
          animation: "m-pop var(--dur-med) var(--easing)",
          border: "1px solid var(--glass-border-3)",
          borderBottom: "none",
          overflow: "hidden",
        }}
      >
        {/* Grabber */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <span
            style={{
              width: 42,
              height: 4,
              borderRadius: 4,
              background: "var(--glass-border-3)",
            }}
          />
        </div>
        {/* Header */}
        <div
          style={{
            padding: "6px 22px 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-brand)",
                fontWeight: 900,
                fontSize: 22,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              {rb.koreanName} · 규칙북
            </div>
            <div style={{ color: "var(--accent-3)", fontSize: 12, marginTop: 4 }}>
              {rb.headline}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {rb.tags.map((tag) => (
                <Pill key={tag} tone="accent" style={{ fontSize: 10, padding: "3px 9px" }}>
                  {tag}
                </Pill>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenedGameId(null)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: "var(--glass-3)",
              border: "1px solid var(--glass-border-2)",
              color: "var(--text-2)",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        {/* Chapter tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "4px 22px 8px",
            overflowX: "auto",
          }}
        >
          {rb.chapters.map((c) => {
            const active = c.key === chapter.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setChapterKey(c.key)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  background: active ? "var(--accent-soft)" : "var(--glass-2)",
                  border: `1px solid ${active ? "var(--accent-border)" : "var(--glass-border-2)"}`,
                  color: active ? "var(--accent-3)" : "var(--text-4)",
                  fontFamily: "var(--font-brand)",
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {c.title}
              </button>
            );
          })}
        </div>
        {/* Chapter body */}
        <div
          style={{
            padding: "6px 22px calc(28px + env(safe-area-inset-bottom))",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {chapter.summary ? (
            <div
              style={{
                color: "var(--text-2)",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 12,
                padding: "10px 14px",
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-border)",
                borderRadius: 14,
              }}
            >
              {chapter.summary}
            </div>
          ) : null}
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {chapter.bullets.map((b, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  background: "var(--glass-3)",
                  border: "1px solid var(--glass-border-2)",
                  borderRadius: 14,
                  color: "var(--text-2)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <span
                  style={{
                    marginTop: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent-1)",
                    flex: "none",
                    boxShadow: "0 0 6px var(--accent-glow)",
                  }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
