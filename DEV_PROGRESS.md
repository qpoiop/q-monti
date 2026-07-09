# Momonti — Dev Progress

Snapshot of what's shipped, what's live, and what's left. Written for context restore across sessions — trim aggressively when a section stops being useful.

## Environment

- Cloudflare Pages (frontend) · Worker + Durable Object (room) · D1 (persistence).
- Deploy: `npm run build && wrangler pages deploy dist --project-name=momonti --branch=production`.
- Primary URL: <https://momonti.pages.dev>.

## Architecture

- `shared/games/momonty/logic.ts` — game engine (`GameModule<Cfg, State, Action, View>`), pure reducer, deterministic RNG.
- `shared/games/rules.ts` — data-driven rulebook (typed blocks: text, callout, cards, ladder, flow, combos, tags, kv).
- `src/games/momonty/phases/*` — per-phase React views (`DrawRank`, `Taxation`, `PlayTrick`, `RoundEnd`, `MatchEnd`).
- Global overlays mounted in `src/App.tsx`: `EventFx`, `RevolutionOverlay`, `TaxResultOverlay`, `HistorySheet`, `InstallLayer`, `ConnectionOverlay`, `ExitConfirm`, `RulesSheet`, `Toast`.
- `src/state/store.ts` — WebSocket-backed store. `src/state/testStore.ts` — local reducer for `/test`.
- `src/nav/router.ts` — history-based, `installBackGuard()` for per-route intercept.

## Data model highlights

- Deck: triangular. `value V` appears V copies per set, plus `jestersPerSet` jesters. Standard 1 set = 12·13/2 + 2 = **80 cards**. 4-seat tables default to 1 set; larger tables should bump `cardSets`.
- Taxation transfers are recorded to `state.taxation.completedTransfers` and emitted via `taxationComplete` event when the phase flips to PLAYING. `TaxResultOverlay` reads that event.
- Round end → `endRound()` advances round and calls `beginRound()`. Match end fires when `completedRounds >= targetRounds`.

## Shipped (in reverse-chron)

- **Sel-preview refactor**: shape (`N×M` / `스트레이트 N장`), wild badge, status text as separate spans.
- **Rules book cleanup**: chapter tabs = inline pill chips, flow steps 2-col grid, combos/kv converted to explicit grids with `keep-all`.
- **Join keypad**: removed `prompt()` alpha input; added inline abc/123 toggle. Code cells flex to full row width with aspect-ratio 3:4.
- **Room settings relocated**: rules removed from Create screen. Lobby has collapsible `⚙ 게임 규칙` panel; host edits via `setConfig` (server broadcasts). Non-hosts see read-only.
- **Deck triangular semantics** + rules text update.
- **Test-mode auto-bots**: every dispatch drains autonomous turns for seats that aren't the human viewer. `runBotForHuman()` chip in test picker hands the current seat off to the bot policy for the rest of the round.
- **testStore ↔ global gameView bridge**: `patchState({ gameView })` mirrors so shared overlays fire during `/test`.
- **Wild card recommendation §3-3**: purple hint block above the pile with up-to-three tappable chips.
- **Tax result overlay §2-3**: full-frame summary of every transfer with actual cards, gated by `taxResultVisible`.
- **Rank reveal §1-2**: flex row with emoji + name + inline role suffix + 1위 chip.
- **Play surface polish**: opp strip 4-col grid, history chip inside pile, bigger timer ring, `hand-card`/`pile-card` on `clamp()`.
- **PWA name**: `title` shortened to "모몬티"; `apple-mobile-web-app-title` matches.
- **Labels**: `고급 효과` → `고급 룰`.

## Known TODO

- Hand-card selected highlight — spot-check colour vs. mockup §3-3.
- `runBotForHuman` isn't driving multi-round transitions all the way to MATCH_END in every case; debug why (likely a null `botAction` return in a specific state I haven't traced).
- Connection screens §6-x — copy verified; needs visual pass in a throttled/offline browser.
- Long-nickname handling on seat rows — already ellipsised in test picker but check `SeatRow` in Lobby and OpponentStrip.
- Responsive sweep is partial — `hand-card`, `pile-card`, `code-cell` are on clamp; remaining phase views still use fixed px in several places.

## Verification recipe (test mode)

1. `/test` → 테스트 시작.
2. 카드 뽑기 (single click — auto-bots draw for other seats).
3. 과세 단계로 (bots auto-upload; human returns; overlay renders when the last return settles).
4. 플레이 시작 → lead with a card; bots follow with the naive policy.
5. `▶ 봇에게 넘기기` chip: bots take over the human seat until the round changes.

## Cadence

- Commit per feature slice; deploy every commit (small bundle, fast CI).
- Screenshot-verify each cycle via Claude-in-Chrome before moving on.
