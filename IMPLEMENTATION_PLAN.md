# IMPLEMENTATION_PLAN.md

Phased build order derived from `SCREEN_INVENTORY.md` + `COMPONENT_MAP.md`.

Each phase produces a shippable milestone. No phase invents styling — all values sourced from mockup.

---

## Phase A — Design system baseline (blocking everything else)

1. Token audit — `tokens.css` must contain every colour + type + spacing from `COMPONENT_MAP.md`.
2. Atom primitives review — `Button`, `Card`, `Pill`, `Toggle`, `Segmented`, `Stepper`, `SettingRow`, `ScreenHeader`, `PhoneFrame` — align with mockup dimensions exactly.
3. Introduce missing atoms:
   - `PileCard` primitive (three sizes: 40, 46, 50)
   - `MiniCardChip` (18-22)
   - `StatusPill` (unified turn / status pill)
   - `BannerFlash` overlay
   - `BottomSheet` reusable shell

**Deliverable**: primitives + tokens matching mockup pixel spec verified with a Storybook-style demo route `/dev/atoms`.

---

## Phase B — Static screens (non-interactive rendering)

Build every screen as a pure render of a mocked `MomontyView` snapshot. No interaction wiring yet.

1. **Home** (§⓪-1)
2. **Create room** (§⓪-2) — basic + advanced tabs
3. **Code entry** (§⓪-3) — keypad + validation preview
4. **Lobby** (§⓪-4)
5. **Draw rank** (§1-1)
6. **Rank reveal** (§1-2)
7. **Seat ring** (§1-3)
8. **Tax upload** (§2-1)
9. **Tax return** (§2-2)
10. **Revolution** (§2-3)
11. **Play trick — lead** (§3-1)
12. **Play trick — follow** (§3-2)
13. **Play trick — wild** (§3-3)
14. **Turn rail + pass banner** (§3-4)
15. **Trick clear** (§4-1)
16. **History bottom sheet** (§4-2)
17. **In-game pile** (§4-3)
18. **Out** (§5-1)
19. **Round result** (§5-2)
20. **Match end** (§5-3)
21. **Connection overlays** (§6-1..4)

Each screen: side-by-side diff with mockup image before merging.

---

## Phase C — Interactions

Wire actions once static rendering matches.

- Draw → number-roll animation → progress update
- Rank reveal → confirm CTA
- Tax → auto-pick / return selection
- Play trick → classification / selection preview / CTA
- Pass → pass banner + turn rail update
- Trick clear → banner flash → new lead

---

## Phase D — Cross-cutting UX

- Round banner overlay
- Toast on every meaningful action
- Rules sheet integration
- Confirm dialog (shared) for exits
- Connection overlay with retry / leave

---

## Phase E — Test mode

- Setup screen ➞ initTest(config)
- Play surface reuses live views + adds seat picker + role labels
- Round banner works in test mode
- Auto-advance actor between phases

---

## Phase F — Engine hardening

- Fair round-robin deal (done)
- Auto-pass unplayable (done)
- QuadClear no-double-advance (done)
- Rank reveal pause (done)
- Additional balance passes based on playtests

---

## Definition of Done (per screen)

- Element list matches `SCREEN_INVENTORY.md` (nothing missing)
- Pixel values from mockup used verbatim (no invented sizes)
- Uses primitives from `COMPONENT_MAP.md` where a pattern matches
- Screenshot verified against mockup in CLI browser drive
- Accessibility: hit targets ≥ 32×32, contrast passes on dark bg

---

## Current status snapshot (2026-07-10)

| Phase | Status |
|-------|--------|
| A     | Partial — atoms exist but pile/mini/status not extracted |
| B     | ~40% — Home/Join/Lobby/Create rough · Play/Draw partial · Tax/Rev/History/Out missing |
| C     | Play + Draw only |
| D     | Toast + Confirm shipped · Round banner shipped |
| E     | Basic version live · needs polish |
| F     | Engine fixes shipped |

## Next 3 actionable items

1. Finish Phase A atoms: `PileCard`, `MiniCardChip`, `StatusPill`, `BottomSheet` promoted to shared primitives with strict tokens.
2. Rebuild Play trick using new atoms — one-to-one mapping against §3-1..3-4.
3. Ship §2 (Tax) + §3-4 (Pass banner + turn rail) + §4 (History bottom sheet + in-game pile).
