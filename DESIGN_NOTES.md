# DESIGN_NOTES.md

Per-screen pixel spec extracted from `모몬티 시안.dc.html`. Reference this
when styling — do not guess at values.

Frame reference: 280 × 600 (bezel) → 260 × 600 (screen). Design uses fixed
pixels. All values below are absolute px from the mockup.

---

## Play trick (§ 3-1) — 내 리드 차례 (세트 선택)

### Frame padding
- `padding: 12px 14px`
- gradient bg: `radial-gradient(85% 42% at 50% 42%, rgba(242,193,78,.16), transparent 60%), linear-gradient(165deg,#150d2c,#1c1533)`

### Header row (`display:flex, align-items:center, justify-content:space-between`)
Turn pill (left):
- Font: Outfit 700 12px
- Padding: 6px 12px
- Radius: 999px
- BG: `linear-gradient(135deg,#f2c14e,#f8d98a)`
- Color: `#3a2600`
- Animation: `mturn 1.6s infinite`
- Pulse dot: 7×7px, bg `#3a2600`, `mblink 1s infinite`

Timer ring (right):
- 40 × 40 px
- BG: `conic-gradient(#f2c14e 75%, rgba(255,255,255,.12) 0)`
- Inner disc: 32 × 32 px, bg `#1c1533`, centered
- Number: Outfit 800 12px `#fff` · unit "s" size 7 opacity 0.6

### Opponent strip (marginTop: 10)
- `display:flex, gap:5px`
- Cell:
  - `flex:1` · text-align center · padding `6px 0` · radius 9px
  - BG `rgba(255,255,255,.05)` · border 1px `rgba(255,255,255,.08)`
  - Name: 9.5px `#c9c2e0`
  - Back+count: Outfit 700 11px `#f2c14e` · format `🂠9`

### Empty pile (marginTop: 12, flex:1)
- Radius 16px · `background:rgba(255,255,255,.03)`
- Border `1.5px dashed rgba(242,193,78,.3)`
- Flex column · center · gap 6px
- Icon 🂠 26px opacity 0.5
- Title: Outfit 700 12px `#f2c14e`
- Hint: 10.5px `#9a92c0`

### Selection preview (marginTop: 10)
- Radius 11px · padding `8px 12px`
- BG `rgba(242,193,78,.12)` · border 1px `rgba(242,193,78,.32)` (gold for leading)
- Left label: 11px 700 `#f8d98a` — "선택: 10 ×3"
- Right mini cards: 18×24, radius 4, `#fff`, Outfit 800 10px `#8a8298`
- Green variant (following+valid): BG `rgba(52,211,153,.12)` border `.3` color `#a5f3c4`
- Purple wild variant: BG `rgba(200,85,240,.12)` border `.3` color `#e0b6ff`

### Hand label (marginTop: 9)
- 10px 700 `#9a92c0`
- Format: `내 손패 13장 · 같은 숫자끼리 묶임`

### Hand strip (marginTop: 6)
- `display:flex, flex-wrap:wrap, gap:4px`
- **NO negative margin** — grouping is visual by sort order, not overlap
- Card: 25 × 35 px, radius 6, Outfit 800 12px
  - White cards: bg `#fff` color `#2a2350`
  - Gold-valued (1): color `#c8912a`
  - Selected: bg `linear-gradient(160deg,#fff7e6,#fdecc4)` · `boxShadow: 0 0 0 2px #f2c14e, 0 5px 10px -3px rgba(242,193,78,.5)` · translateY(-4px)
  - Wild: bg `linear-gradient(160deg,#2a2350,#1a1636)` · border 1px `#c855f0` · color `#e0b6ff`
  - Dim (invalid for form): bg `#8f8aa8` color `#4b4670` opacity 0.45

### Action bar (marginTop: 10)
- flex gap 8
- Left sort/pass button:
  - Padding 12px 15px · radius 12
  - BG `rgba(255,255,255,.06)` border 1px `rgba(255,255,255,.14)`
  - Font 700 12.5px · leading label "정렬", following "패스" `#fda4af`
- CTA (flex:1):
  - Padding 12 · radius 12 · Outfit 700 13.5px
  - Gold (leading): `linear-gradient(135deg,#f2c14e,#e0a52b)` color `#3a2600` · shadow `0 12px 22px -10px rgba(242,193,78,.6)`
  - Green (valid follow): `linear-gradient(135deg,#34d399,#10b981)` color `#04241a`
  - Purple (wild): `linear-gradient(135deg,#c855f0,#7c6cf0)` color `#fff`

---

## Play trick (§ 3-2) — 따라내기

Differs from 3-1 only in:
- Empty pile → active pile box
  - Radius 16 · padding 12 · bg `rgba(255,255,255,.04)` · border 1px `rgba(255,255,255,.1)`
  - Header row: label 9.5px `#9a92c0` "공유더미 · 현재 최고" · actor 9.5px `#f2c14e` "서연이 냄"
  - Cards row: 46×64 · radius 9 · Outfit 800 22px · `linear-gradient(160deg,#fdfcff,#e7e2f5)`
- Requirement pill (marginTop: 10, self-center):
  - Padding 6px 12 · radius 999 · bg `rgba(242,193,78,.12)` border 1px `rgba(242,193,78,.3)`
  - 10.5px 700 `#f8d98a` — "현재 세트 3장 · 10보다 낮은 3장만 가능"

---

## Draw rank (§ 1-1)

### Heading (text-align:center)
- Eyebrow: Outfit 700 11px `#f2c14e` — "라운드 1 · 서열 결정"
- Title: 17px Outfit 800 `#f4f2ff` marginTop 4
- Sub: 11px `#9a92c0` marginTop 4 — "낮은 숫자일수록 높은 서열 · 동률은 무늬 순"

### Fan (marginTop: 22, gap:9)
- Outer cards: 52×74, radius 11, bg `linear-gradient(160deg,#3a2f60,#241d44)` border `1px rgba(255,255,255,.12)` · "?"
- Centre card: 52×74 · radius 11 · bg `linear-gradient(160deg,#fdfcff,#e7e2f5)` · shadow `0 0 0 2px #f2c14e, 0 10px 20px -6px rgba(242,193,78,.55)` · translateY(-8)
  - Crown emoji 12px above · number Outfit 800 26px `#c8912a`

### Result pill (marginTop: 14, self-center)
- Padding 6 16 · radius 999 · bg `rgba(242,193,78,.16)` border 1px `rgba(242,193,78,.4)`
- 12px 700 `#f8d98a` — "내 카드 2 · 예상 2위"

### Progress (marginTop: 18)
- BG `rgba(255,255,255,.05)` border 1px `rgba(255,255,255,.1)` radius 14 · padding 12
- Head: 10px 700 `#9a92c0` — "뽑기 현황 · 4/6"
- Rows: 12px space-between
  - Name: `#e9e4ff` (normal) / `#f8d98a` 700 (me)
  - Value: Outfit 800 · `#e9e4ff` / `#f2c14e` for winner (with 👑)

### CTA (marginTop:auto)
- Padding 15 · radius 14 · Outfit 800 15px `#fff`
- `linear-gradient(135deg,#7c6cf0,#c855f0)` · shadow `0 14px 26px -10px rgba(160,80,230,.65)`

---

## Rank reveal (§ 1-2)

- Eyebrow: 11px 700 `#f2c14e` letter-spacing .06em — "라운드 1 · 서열 확정"
- List (marginTop: 10, gap: 8):
  - Row: display flex gap 11, padding 12px 13, radius 13
  - Top-1: bg `linear-gradient(135deg,rgba(242,193,78,.28),rgba(242,193,78,.1))` border `1px rgba(242,193,78,.5)`
    - Emoji 👑 20px · name 13px 700 · role 10.5px 700 `#f8d98a` · pos "1위" chip
  - Top-2: bg `rgba(214,179,255,.12)` · role `#d6b3ff` 레서 모몬티
  - Mid: bg `rgba(255,255,255,.05)`
  - Bottom-2: bg `rgba(127,176,232,.1)` · role `#7fb0e8` 레서 페온
  - Bottom-1: bg `rgba(138,130,152,.12)` · role `#a49cb8` 그레이터페온
- CTA "과세 단계로 ▶" (marginTop:auto): same purple gradient as elsewhere

---

## Taxation (§ 2-1 페온 상납)

### Header
- Emoji ⛏ 16px · title 14px 700 · sub 10.5px `#a49cb8`
  - "과세 · 상납" / "나는 그레이터 페온 · 최고패 2장 상납"

### Recipient pill (marginTop: 12)
- Padding 11 · radius 13 · bg `rgba(242,193,78,.1)` border `rgba(242,193,78,.3)`
- 11.5px `#f8d98a` — "받는 사람: 지훈 (그레이터 모몬티)"

### Auto-picked (marginTop: 14)
- Label 10.5px 700 `#9a92c0` — "자동 선택된 최고패 2장 · 변경 불가"
- Cards row (marginTop: 8, center, gap:8): 54×76, radius 11
  - Card `linear-gradient(160deg,#fdfcff,#e7e2f5)` · shadow gold
  - Bottom hint 7.5px `#8a82ad` — "1장뿐" / "×2 중 1"

### Hand strip
- Label + count · cards 26×36 radius 6

### CTA
- Purple gradient 14px 800 `#fff` — "1·2 상납하기 ▶"

---

## Rules

- Frame padding: 12 14
- Header: back arrow `#b8b0d8` 16 · title `#f4f2ff` 700 15
- Rule button on right side of header: `padding: 5 10 · radius 999 · glass 2 border · #d6ccff 11`

---

## Colours quick ref

| Token           | Value                     |
|-----------------|---------------------------|
| brand gold      | `#f2c14e`                 |
| brand gold light| `#f8d98a`                 |
| brand gold text | `#3a2600`                 |
| purple 1        | `#7c6cf0`                 |
| purple 2        | `#c855f0`                 |
| green pos       | `#34d399`                 |
| red neg         | `#fda4af`                 |
| lilac 2위       | `#d6b3ff`                 |
| blue 5위        | `#7fb0e8`                 |
| grey 6위        | `#a49cb8`                 |
| text 1          | `#f4f2ff` / `#e9e4ff`     |
| text 2          | `#c9c2e0` / `#d6ccff`     |
| text 3          | `#9a92c0` / `#8a82ad`     |
| text 4          | `#6b6490`                 |
