# COMPONENT_MAP.md

Common patterns extracted from `SCREEN_INVENTORY.md` → design-system primitives. Reuse these to avoid drift.

---

## Atoms

| Primitive        | Sizes / variants                                 | Screens |
|------------------|--------------------------------------------------|---------|
| PhoneFrame       | Full-viewport shell · gradient overlay slot      | All |
| ScreenHeader     | Back arrow · title · right actions               | ⓪-2/3/4, ②-*, ④-*, ⑤-1, RulesSheet |
| StatusPill       | tone: gold/gold-soft/green/purple/muted/red      | Turn indicators, chips |
| CtaButton        | tone: primary(purple)/gold/green/purple-wild/muted | All main CTAs |
| Segmented        | 2-N option group                                 | ⓪-2, ⓪-4, m0 옵션 |
| Toggle 38×22     | Gold on / grey off                               | Settings |
| Stepper          | −N+ 28-height                                    | Settings |
| Toast            | Bottom-fixed pill                                | Global |

## Cards & rows

| Component        | Spec                                              |
|------------------|---------------------------------------------------|
| PlayingCard      | sizes xs/sm/md/lg · tones white/royal/wild/back  |
| PileCard         | 40-50 wide · gold shadow · optional gold-outline |
| MiniCardChip     | 18-22 wide · Outfit 800 10 · used in previews    |
| SeatRow          | Avatar + name + status right                     |
| RankRow          | Tier-tinted background · icon + name + pos + role|
| SettingRow       | Label + hint + right control                     |
| FieldInput       | Text input · dark glass                           |

## Overlays

| Overlay          | Screens                                           |
|------------------|---------------------------------------------------|
| BottomSheet      | Rules, History, Menu                              |
| CenteredDialog   | ConfirmDialog, ExitConfirm                        |
| BannerFlash      | Round transition, Pass banner                     |
| ConnectionOverlay| §6-1..4                                           |

## Game-specific

| Component             | Screens                                          |
|-----------------------|--------------------------------------------------|
| SeatRing (원탁)       | §1-3 (seating) · §4-3 (compact opponents)        |
| DrawFan (3 cards)     | §1-1 · Home logo                                 |
| RankLadderList        | §1-2 · §5-1(preview) · §5-2                      |
| Podium 2-1-3          | §5-3                                             |
| TurnRail              | §3-4                                             |
| PassBanner            | §3-4                                             |
| WildBuildBox          | §3-3                                             |
| HistoryList           | §4-2                                             |
| PileStack             | §4-1                                             |
| WinnerPill            | §4-1                                             |
| RoundBanner overlay   | Round change                                     |

---

## Colour tokens

| Token          | Value       | Usage                       |
|----------------|-------------|-----------------------------|
| gold-1         | #f2c14e     | Momonty accent primary      |
| gold-2         | #d99a2b     | Gold gradient stop          |
| gold-3         | #f8d98a     | Gold light text             |
| gold-4         | #c8912a     | Numbered card 1-2 text      |
| purple-1       | #7c6cf0     | Brand CTA start             |
| purple-2       | #c855f0     | Brand CTA end / wild        |
| green pos      | #34d399     | Following valid CTA         |
| green pos hint | #6ee7b7     | Success text                |
| red neg        | #fda4af     | Pass / danger text          |
| red neg light  | #fecdd3     | Pass banner text            |
| lilac 2위      | #d6b3ff     | Momonty tier                |
| blue 5위       | #7fb0e8     | Lesser Peon                 |
| grey 6위       | #a49cb8     | Grand Peon                  |

## Typography scale

| Token      | Value              | Where                        |
|------------|--------------------|------------------------------|
| heading-2xl| Outfit 900 30      | Home title                   |
| heading-xl | Outfit 900 26      | Aut/champion                 |
| heading-l  | Outfit 800 22      | Cheer / winner name          |
| heading-m  | Outfit 800 17-20   | Section titles               |
| heading-s  | Outfit 800 15-16   | CTA · phase header title     |
| body-l     | 15 700             | Player name                  |
| body-m     | 13 700 / 12.5 600  | Row text                     |
| body-s     | 12 / 11.5          | Hints                        |
| caption    | 10-11 700          | Eyebrows                     |
| micro      | 9-9.5              | Sub-labels                   |
