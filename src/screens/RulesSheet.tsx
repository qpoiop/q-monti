import { useEffect, useState } from "react";
import type {
  Block,
  CardSpec,
  ComboItem,
  FlowStep,
  LadderEntry,
  RuleChapter,
} from "@shared/games/rules";
import { RULEBOOKS } from "@shared/games/rules";
import { PlayingCard } from "@web/design/PlayingCard";
import { installBackGuard } from "@web/nav/router";
import "./rules.css";

/**
 * Rulebook bottom sheet.
 *
 * Renders the game's Rulebook as a scrollable guide. Chapter tabs at
 * the top; each chapter is a stack of typed blocks — each block has a
 * dedicated renderer so the content authors can produce a rich guide
 * without touching JSX.
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

  // Back gesture closes the sheet instead of falling through to the router.
  useEffect(() => {
    if (!openedGameId) return;
    return installBackGuard(() => {
      setOpenedGameId(null);
      return true;
    });
  }, [openedGameId]);

  if (!openedGameId) return null;
  const rb = RULEBOOKS[openedGameId];
  if (!rb) return null;
  const chapter = rb.chapters.find((c) => c.key === chapterKey) ?? rb.chapters[0];

  return (
    <div className="rules-scrim" onClick={() => setOpenedGameId(null)}>
      <div className="rules-sheet" onClick={(e) => e.stopPropagation()} data-accent="momonty">
        <div className="rules-grabber" />
        <RulesHeader rb={rb} onClose={() => setOpenedGameId(null)} />
        <ChapterTabs
          chapters={rb.chapters}
          active={chapter.key}
          onSelect={setChapterKey}
        />
        <ChapterBody key={chapter.key} chapter={chapter} />
      </div>
    </div>
  );
}

/* -------------------------- Header + tabs -------------------------- */

function RulesHeader({
  rb,
  onClose,
}: {
  rb: (typeof RULEBOOKS)[string];
  onClose: () => void;
}) {
  return (
    <div className="rules-header">
      <div className="rules-title-block">
        <div className="rules-eyebrow">모몬티 가이드북</div>
        <div className="rules-title">{rb.koreanName}</div>
        <div className="rules-headline">{rb.headline}</div>
        <div className="rules-tags">
          {rb.tags.map((t) => (
            <span className="rules-tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <button type="button" className="rules-close" onClick={onClose} aria-label="닫기">
        ✕
      </button>
    </div>
  );
}

function ChapterTabs({
  chapters,
  active,
  onSelect,
}: {
  chapters: RuleChapter[];
  active: string;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="rules-tabs-scroll">
      <div className="rules-tabs">
        {chapters.map((c, i) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(c.key)}
            className="rules-tab"
            data-active={c.key === active ? "true" : "false"}
          >
            <span className="rules-tab-icon">{c.icon}</span>
            <span className="rules-tab-num">CH {String(i + 1).padStart(2, "0")}</span>
            <span className="rules-tab-title">{c.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- Chapter body -------------------------- */

function ChapterBody({ chapter }: { chapter: RuleChapter }) {
  return (
    <div className="rules-body">
      <div className="chapter-intro">
        <div className="chapter-intro-icon">{chapter.icon}</div>
        <div className="chapter-intro-text">
          <div className="chapter-intro-title">{chapter.title}</div>
          <div className="chapter-intro-line">{chapter.intro}</div>
        </div>
      </div>
      <div className="chapter-blocks">
        {chapter.blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------- Block renderers -------------------------- */

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <p className="block-text">{block.body}</p>;
    case "callout":
      return <CalloutBlock block={block} />;
    case "cards":
      return <CardsBlock caption={block.caption} cards={block.cards} />;
    case "ladder":
      return <LadderBlock entries={block.entries} />;
    case "flow":
      return <FlowBlock steps={block.steps} />;
    case "combos":
      return <CombosBlock items={block.items} />;
    case "tags":
      return <TagsBlock items={block.items} />;
    case "kv":
      return <KvBlock rows={block.rows} />;
  }
}

function CalloutBlock({ block }: { block: Extract<Block, { type: "callout" }> }) {
  const tone = block.tone ?? "info";
  return (
    <div className="block-callout" data-tone={tone}>
      <div className="block-callout-icon">{block.icon}</div>
      <div>
        <div className="block-callout-title">{block.title}</div>
        <div className="block-callout-body">{block.body}</div>
      </div>
    </div>
  );
}

function CardsBlock({ caption, cards }: { caption?: string; cards: CardSpec[] }) {
  return (
    <div className="block-cards">
      <div className="block-cards-row">
        {cards.map((c, i) => (
          <RuleCard key={i} spec={c} />
        ))}
      </div>
      {caption ? <div className="block-caption">{caption}</div> : null}
    </div>
  );
}

function RuleCard({ spec }: { spec: CardSpec }) {
  if (spec.jester) {
    return (
      <PlayingCard
        size="md"
        label="★"
        tone="jester"
        selected={spec.selected}
      />
    );
  }
  if (spec.hidden) {
    return <PlayingCard size="md" label="?" tone="back" />;
  }
  return (
    <PlayingCard
      size="md"
      value={spec.value}
      tone={spec.crown ? "royal" : spec.value != null && spec.value <= 2 ? "royal" : "white"}
      crown={spec.crown}
      selected={spec.selected}
    />
  );
}

function LadderBlock({ entries }: { entries: LadderEntry[] }) {
  return (
    <div className="block-ladder">
      {entries.map((e, i) => (
        <div key={i} className="ladder-row" data-tier={e.tier}>
          <div className="ladder-icon">{e.icon}</div>
          <div className="ladder-text">
            <div className="ladder-role">{e.role}</div>
            <div className="ladder-effect">{e.effect}</div>
          </div>
          <div className="ladder-pos">{i + 1}위</div>
        </div>
      ))}
    </div>
  );
}

function FlowBlock({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="block-flow">
      {steps.map((s, i) => (
        <div key={i} className="flow-step">
          <div className="flow-step-num">{String(i + 1).padStart(2, "0")}</div>
          <div className="flow-step-icon">{s.icon}</div>
          <div className="flow-step-label">{s.label}</div>
          {s.detail ? <div className="flow-step-detail">{s.detail}</div> : null}
          {s.branch ? <div className="flow-step-branch">{s.branch}</div> : null}
        </div>
      ))}
    </div>
  );
}

function CombosBlock({ items }: { items: ComboItem[] }) {
  return (
    <div className="block-combos">
      {items.map((c, i) => (
        <div key={i} className="combo-item">
          <div className="combo-name">{c.name}</div>
          <div className="combo-cards">
            {c.cards.map((card, j) => (
              <RuleCard key={j} spec={card} />
            ))}
          </div>
          <div className="combo-hint">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}

function TagsBlock({ items }: { items: { label: string; hint?: string }[] }) {
  return (
    <div className="block-tags">
      {items.map((t, i) => (
        <div key={i} className="tag-item">
          <span className="tag-label">{t.label}</span>
          {t.hint ? <span className="tag-hint">{t.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

function KvBlock({ rows }: { rows: { key: string; value: string }[] }) {
  return (
    <div className="block-kv">
      {rows.map((r, i) => (
        <div key={i} className="kv-row">
          <span className="kv-k">{r.key}</span>
          <span className="kv-v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
