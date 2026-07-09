# SCREEN_INVENTORY.md

Full mockup element inventory. Every screen · every element · every value read from `모몬티 시안.dc.html`. Reference this before styling.

Global frame: 280 × 620 (bezel) · inner 260 × 600 · dark purple gradient
Fonts: `Outfit` (brand), `Noto Sans KR` (body)

Screens indexed by mockup section id → 서브 시나리오

---

## ⓪ 진입 · 방 (§ men)

### ⓪-1 · 홈 (진입)

**Frame gradient**
`radial-gradient(85% 46% at 50% 8%, rgba(242,193,78,.3), transparent 60%)` + linear 165deg #1c1533→#150d2c

**Layout** — content padding 20px 18px · flex column align center

Elements
- **Logo group** (`.home-logo` 96×80) marginTop 22
  - Two side cards 44×62 · `#e7e2f5` · rotate ±14° · shadow `0 6px 12px -4px #000`
  - Center card 44×62 · linear-gradient(160deg,#fff,#e7e2f5) · shadow `0 0 0 2px #f2c14e, 0 10px 20px -6px rgba(242,193,78,.6)` · crown 13px + "1" Outfit 800 26px #c8912a
- **Brand title** marginTop 16 · Outfit 900 30px #fff · letter-spacing -.01em
- **Sub** marginTop 4 · 12px #f8d98a
- **CTA cluster** marginTop 28 · gap 10 · width 100%
  - Primary 방 만들기 — padding 16 · radius 14 · linear #7c6cf0→#c855f0 · 15px 800 #fff · shadow purple-glow
  - Ghost 코드로 입장 — padding 16 · radius 14 · rgba(255,255,255,.06) · border rgba(255,255,255,.16) · #f0edff 15 700
  - Accent-soft 빠른 매칭 — rgba(242,193,78,.14) · border rgba(242,193,78,.34) · #f8d98a 15 700
- **Profile pill** marginTop auto · padding 10 14 · radius 999 · rgba(255,255,255,.05) · border rgba(255,255,255,.1)
  - Avatar 26 · linear purple gradient
  - Name #e9e4ff 12 600 · "Lv.12" #9a92c0 11
  - 규칙 ⓘ push-right #9a92c0 12

### ⓪-2 · 방 만들기 (공개/비공개)

- Frame gradient radial gold top + linear
- Back arrow ← #b8b0d8 16 + title 15 700
- Form column padding 14 16 gap 11
  - **방 이름** field
    - Label #9a92c0 10.5 700 marginBottom 6
    - Input padding 12 14 · radius 12 · rgba(255,255,255,.06) · border rgba(255,255,255,.12) · 13 · placeholder cursor
  - **공개 설정** segmented
    - Two 50/50 buttons · height 33 · radius 11
    - Active: gold gradient · #3a2600 12.5 800
    - Inactive: rgba(255,255,255,.05) · border · #9a92c0 12.5 700
  - **최대 인원** SettingRow
    - Row padding 12 14 · radius 13 · rgba(255,255,255,.06) border
    - Label #e9e4ff 12.5 600
    - Stepper: −/+ 28 buttons · radius 9 · center number Outfit 800 16
  - **관전 허용** SettingRow with Toggle 38×22 gold
  - **세부 룰** cue — dashed border · "방 설정에서 →" #f8d98a 11.5 700
- **CTA** marginTop auto · purple gradient 15 800

### ⓪-3 · 코드로 입장

- Back + title
- Hint text #9a92c0 11.5 marginTop 8
- **Code cells** 6 boxes · gap 8 · marginTop 20
  - Each 38×52 · radius 11 · rgba(255,255,255,.06) · border rgba(255,255,255,.16)
  - Active cell: rgba(242,193,78,.14) · border 2px #f2c14e · shadow 0 0 12px rgba(242,193,78,.4) · cursor blink 1s
- **Valid indicator** marginTop 14 center · #6ee7b7 11.5 · "✓ 유효한 방 · 민준의 왕좌 (4/6)"
- **Keypad** marginTop auto · 3-col grid · gap 8
  - Digit cell padding 14 0 · radius 12 · rgba(255,255,255,.06) · Outfit 700 18 #f0edff
  - ABC/⌫ secondary size 16 #9a92c0 rgba(255,255,255,.03)

### ⓪-4 · 대기실 (방장 · 준비)

- Back + title (방 이름) + right "4/6" 11 #9a92c0
- **Room code card** marginTop 10 · padding 12 14 · radius 13 · linear gold soft border 1px gold-40
  - Label 9.5 700 #9a92c0
  - Code Outfit 800 22 #fff letter-spacing .14em
  - 복사/공유 chips rgba(255,255,255,.1) · #f8d98a 11 700
- **Player rows** marginTop 12 · gap 7
  - Row padding 10 12 · radius 12 · rgba(255,255,255,.05..06) · border rgba(255,255,255,.10..12)
  - Avatar 30 circle
  - Name #fff 12.5 700 + 방장 chip gold soft
  - Status right: "준비완료" #6ee7b7 11 700 / "대기중…" #9a92c0 11
  - Empty slot dashed border · ＋ avatar rgba(255,255,255,.05) · "빈 자리 · 초대 대기" #6b6490
- **Bottom bar** marginTop auto · gap 8
  - 설정 secondary
  - Start button gradient 14 800 · shows waiting/ready state

---

## ① 서열 & 자리 (§ m1)

### 1-1 · 서열 뽑기
- Eyebrow #f2c14e 11 700 letter-spacing .06em center
- Title Outfit 800 17 #f4f2ff marginTop 4 center
- Sub #9a92c0 11 marginTop 4 center — "낮은 숫자일수록 높은 서열 · 동률은 무늬 순"
- **Fan** marginTop 22 · gap 9 · center
  - Outer 52×74 · linear #3a2f60→#241d44 · border 1px rgba(255,255,255,.12) · shadow · Outfit 800 26 #6b6490 "?"
  - Center 52×74 · linear #fdfcff→#e7e2f5 · shadow 0 0 0 2px #f2c14e + 0 10px 20px -6px rgba(242,193,78,.55) · translateY(-8) · crown 12 + "2" Outfit 800 26 #c8912a
- **Result pill** marginTop 14 · self-center · padding 6 16 · radius 999 · rgba(242,193,78,.16) · border rgba(242,193,78,.4) · #f8d98a 12 700 — "내 카드 2 · 예상 2위"
- **Progress** marginTop 18 · rgba(255,255,255,.05) · border · radius 14 · padding 12
  - Head 10 700 #9a92c0 — "뽑기 현황 · 4/6"
  - Rows 12 space-between
- **CTA** purple 15 800

### 1-2 · 서열 공개
- Eyebrow center 11 700 #f2c14e — "라운드 1 · 서열 확정"
- **Rank list** marginTop 10 · gap 8
  - **Row template**: display flex gap 11 · padding 12 13 · radius 13
  - Tier styles:
    - Top-1 (그레이터 모몬티): linear-gradient(135deg, rgba(242,193,78,.28), rgba(242,193,78,.1)) · border rgba(242,193,78,.5)
      - Emoji 👑 20 · name 13 700 #fff + "그레이터 모몬티" 10.5 700 #f8d98a · pos "1위" Outfit 800 12 #f2c14e chip rgba(242,193,78,.2)
    - Top-2: rgba(214,179,255,.12) border rgba(214,179,255,.3) · ♛ badge · "레서 모몬티" 10.5 #d6b3ff
    - Mid: rgba(255,255,255,.05) · avatar blank · "상인" 10.5 #9a92c0
    - Bottom-2 (레서 페온): rgba(127,176,232,.1) border rgba(127,176,232,.28) · role 10.5 #7fb0e8
    - Bottom-1: rgba(138,130,152,.12) border rgba(138,130,152,.3) · ⛏ · "그레이터 페온" 10.5 #a49cb8
- **CTA** marginTop auto · purple 14 800 · "과세 단계로 ▶"

### 1-3 · 원형 자리 배치
- Eyebrow 11 700 #f2c14e — "착석 · 서열 순 시계방향"
- **Circle table** flex:1 marginTop 8 · position relative
  - Center circle 150×150 · radial gradient gold soft · border 1.5px rgba(242,193,78,.25) · "공유더미" label 9 #9a92c0 + 🂠 22 + "리드 대기" 9 Outfit #f2c14e
  - **Seat positions** absolute (5-8인 원형 배치)
    - 상단 모몬티: 40×40 gradient gold · shadow 0 0 14px rgba(242,193,78,.5) · name #f8d98a 10 700 · role 8.5 #9a92c0
    - 상단-좌우 레서 모몬티: 34×34 · rgba(214,179,255,.22) · border 1.5px #d6b3ff · "레서모몬티" 9 #d6b3ff
    - 하단 그레이터 페온: 40×40 rgba(138,130,152,.25) · border 1.5px · ⛏ 16
    - 하단-좌우 레서 페온: 34×34 · rgba(127,176,232,.18) · border 1.5px rgba(127,176,232,.4) · #7fb0e8
    - Merchant: 34×34 · rgba(255,255,255,.08) · #e9e4ff
- **Tip callout** rgba(255,255,255,.05) border radius 12 · padding 10 12 · #c9c2e0 11 line-height 1.5 — "💡 모몬티가 먼저 리드합니다. 페온은 카드를 나눠주고 서빙하는 역할이에요."
- **CTA** marginTop 10 · purple 14 800

---

## ② 과세 · 혁명 (§ m2)

### 2-1 · 페온 상납 (내가 페온)
- Header: ⛏ 16 + title "과세 · 상납" 14 700 + sub "나는 그레이터 페온 · 최고패 2장 상납" 10.5 #a49cb8
- **Recipient pill** marginTop 12 · padding 11 · radius 13 · rgba(242,193,78,.1) border · 11.5 #f8d98a — "👑 받는 사람: 지훈 (그레이터 모몬티)"
- **Auto-picked** marginTop 14
  - Label 10.5 700 #9a92c0 — "자동 선택된 최고패 2장 · 변경 불가"
  - Cards row marginTop 8 · center gap 8
  - Card 54×76 · radius 11 · linear white · shadow gold · crown 11 + number Outfit 800 26 #c8912a
  - Hint 7.5 #8a82ad bottom
- **Hand** marginTop 14
  - Label "내 손패 13장" #9a92c0 10.5 700
  - Cards 26×36 · radius 6 · Outfit 800 13
- **CTA** marginTop auto · purple 14 800 — "1·2 상납하기 ▶"

### 2-2 · 모몬티 반환 (내가 모몬티)
- Header: 👑 16 + title "과세 · 반환" + sub "그레이터 모몬티 · 임의 2장 돌려주기" 10.5 #f8d98a
- **Received notice** marginTop 12 · rgba(52,211,153,.1) · border rgba(52,211,153,.28) · 11 #6ee7b7 — "받은 상납: 1, 2 — 손패에 추가됨 ✓"
- **Instruction** marginTop 12 · #9a92c0 10.5 700 — "돌려줄 카드 2장 선택 · 보통 필요 없는 높은 수"
- **Hand size** 10 700 #9a92c0 — "내 손패 15장 · 탭하여 선택"
- **Cards** wrap gap 5 · 30×42 · radius 7 · Outfit 800 15
  - Selected: linear #fff7e6→#fdecc4 · shadow 0 0 0 2px #f2c14e + 0 5px 10px -3px rgba(242,193,78,.5) · translateY(-5)
- **Selected preview** marginTop 12 · padding 10 12 · rgba(255,255,255,.05) · "선택됨" #c9c2e0 11 + mini 22×30 cards
- **CTA** purple 14 800 — "2장 반환하기 ▶"

### 2-3 · 혁명 선언
- Frame gradient radial purple 80% at 50% 42% + linear #1a0d2c→#2a1140
- Content align center
- ✊ emoji 30
- "혁명!" Outfit 900 24 #fff marginTop 6
- Sub #e0b6ff 12 center marginTop 6 — "광대 2장을 모두 가졌습니다. 이번 라운드 과세를 취소할 수 있어요."
- **Jester cards** marginTop 20 · gap 12
  - 64×90 · radius 12 · linear #2a2350→#1a1636 · border 1.5px #c855f0 · shadow 0 0 18px rgba(200,85,240,.55) · rotate ±7 · ★ 22 + "광대" 9 700 #e0b6ff
- **Effect box** marginTop 20 · rgba(255,255,255,.05) border · radius 13 · padding 12 14
  - Title 12 700 #e9e4ff + "전원 적용" 10 #c8bce0
  - Bulleted lines 11.5 #c9c2e0
- **Bottom row** marginTop auto · gap 8
  - 보류 ghost 14 700 13 #d6ccff
  - **✊ 혁명 선언** purple gradient · animation `mturn 1.6s infinite` · 14 800

### 2-4 · 과세 완료
- Standard summary card layout (need to inspect if not documented separately)

---

## ③ 플레이 (§ m3)

### 3-1 · 내 리드 차례
Refer to `DESIGN_NOTES.md`. Key: header (turn pill + timer ring 40), opp strip cells with 🂠N, empty pile dashed gold, selection preview gold pill, hand strip 25×35, action bar 정렬 + gold CTA "10 ×3 리드 ▶".

### 3-2 · 따라내기
Differs 3-1: empty pile → active pile box (label + actor + cards 46×64) · requirement pill · selection preview green if valid · CTA green gradient.

### 3-3 · 광대 와일드
- Turn pill left (gold, no animation shown) + right chip "★ 와일드 모드" rgba(200,85,240,.14) border · #e0b6ff 10 700
- **Wild build box** marginTop 11 · padding 11 12 · radius 13 · rgba(200,85,240,.1) border rgba(200,85,240,.3)
  - Label 10.5 700 #e0b6ff — "내 세트 만들기 · 4=4 (3장 + 광대 1)"
  - Cards row center + jester with "=4" small notation
- Hand strip with wild cards shown as purple-selected
- **CTA** linear #c855f0→#7c6cf0 · 13 800 #fff — "4 ×4 (★와일드) 내기 ▶"

### 3-4 · 패스 & 턴 전환
- **Next turn indicator** row (top): 
  - Label "다음 차례" #9a92c0 11
  - Right: avatar 22 · name 12.5 700 · blink dot 6 #7fb0e8
- **Turn order rail** marginTop 9 · gap 4 · space-between
  - Each seat: avatar 26 · status text 7.5 (냄/패스/차례/대기)
  - Current turn: 30 · border 2px #7fb0e8 · shadow 0 0 10px
  - Arrows › between seats · #4b4670 9
- **Pass banner** marginTop 14 · padding 14 · radius 14 · linear rgba(253,164,175,.18)→rgba(253,164,175,.05) · border rgba(253,164,175,.35)
  - 🙅 22
  - "패스했습니다" Outfit 800 16 #fecdd3 marginTop 2
  - Sub #c9c2e0 11 line-height 2 marginTop 4 — "낼 수 있는 카드가 없거나 전략적 보류 — 이번 파일에 다시 참여할 수 없어요"
- **Compact pile** marginTop 12 · same active pile box style with "패스 2 · 앞으로 2명 남음" footer
- **Waiting message** marginTop auto · padding 12 · rgba(255,255,255,.05) border · 11 center #c9c2e0 — "준서·하늘·지아를 기다리는 중…"

---

## ④ 공유더미 · 히스토리 (§ m4)

### 4-1 · 파일 정리 → 새 리드 획득
- Frame gradient radial green 80% at 50% 40% + linear #150d2c→#14201d
- Eyebrow #6ee7b7 11 700 letter-spacing .05em — "전원 패스 · 파일 종료"
- Title Outfit 800 17 #fff marginTop 6 — "공유더미가 정리됩니다"
- **Pile stack** marginTop 18 · 120×96 relative
  - Two back cards rotated ±12/6 · 52×72 · #e7e2f5/#eee9fa · shadow
  - Top card 52×72 · linear white · shadow 0 0 0 2px #34d399 + rgba(52,211,153,.5) glow · Outfit 800 24 #2a2350 · "7"
- Meta "이번 파일 14장 · 버림 더미로" 10.5 #9a92c0
- **Winner pill** marginTop 16 · padding 14 · radius 14 · rgba(52,211,153,.2..06) gradient · border rgba(52,211,153,.4)
  - Avatar 38 rgba(52,211,153,.25) · #a5f3c4 15 — "나"
  - Text col: 13 700 #fff "내가 마지막에 냈어요" · sub 11 #6ee7b7 "새 파일을 리드합니다"
  - 🎏 18
- **Remaining hands** marginTop 12 · rgba(255,255,255,.05) border · radius 12 · padding 11 13
  - Head 9.5 700 #9a92c0
  - Rows 11 space-between · 색상: 👑 gold · 나 green · rest #c9c2e0/#a49cb8
- **CTA** marginTop auto · purple 15 800 — "새 리드 시작 ▶"

### 4-2 · 더미 히스토리 시트
- **Bottom sheet** — 상단 96 dim + sheet
  - Sheet bg #1a1330 · radius 24 24 32 32 · border-top 1px rgba(242,193,78,.25)
  - Grabber 38×4 · rgba(255,255,255,.2) center margin 12
  - Header row: title 15 700 · ✕ 16 #9a92c0
  - Sub 10.5 #9a92c0 — "라운드 3 · 이번 라운드에 나온 세트 (최신순)"
  - **Filter chips** marginTop 8 · gap 5
    - 이번 파일 active: rgba(242,193,78,.2) #f8d98a
    - 라운드 전체 / 카운팅: rgba(255,255,255,.06) #9a92c0
  - **History items** marginTop 11 · gap 8
    - Row padding 9 11 · radius 11 · rgba(255,255,255,.04..1) border
    - Green highlight for winning play
    - Index 9 Outfit #9a92c0/#6ee7b7 width 14
    - Mini cards 18×24 · gap 3 · #fff Outfit 800 10 #2a2350/#8a8298
    - Actor label 11 700 accent · optional "이후 전원 패스" 9.5 #fda4af
  - **Counting box** marginTop 2 · dashed border · rgba(255,255,255,.03)
    - Head 9.5 700 #9a92c0 — "남은 강카드 카운팅"
    - Chips gap 5 · padding 2 7 · radius 6 · Outfit — "1×0", "2×1", "★×1"

### 4-3 · 인게임 공유더미 (히스토리 진입점)
- **Header row**: 상대 차례 avatar + name · Right chips: 📜 히스토리 gold-soft + ☰ menu
- **Opponent circles** marginTop 12 space-between
  - Each 34 · role-tinted background
  - Active turn: border 2px gold + shadow glow · label "지금" 8.5 gold
- **Central pile area** marginTop 14 flex:1 · radial gold subtle · border · position relative
  - Top-left label "공유더미" 9.5 700 #9a92c0
  - Top-right "파일 4수째" 9.5 #f2c14e Outfit
  - Cards 50×70 · radius 10 · Outfit 800 24
  - Below: "현재 최고 7 ×2 · 나(민준)" 11 #c9c2e0
  - Sub "더 낮은 2장 or 패스" 9.5 #9a92c0
- **My hand** rgba(255,255,255,.05) row · label "내 손패 6장" 11 · mini backs 16×22
- **Waiting notice** #c9c2e0 11.5 center — "상대 차례 · 내 차례를 기다리는 중…"

---

## ⑤ 아웃 · 결과 (§ m5)

### 5-1 · 아웃!
- Frame gradient radial gold 75% at 50% 40% + linear #1c1533→#2a1f10
- 🎉 40 marginTop 16 center
- "아웃!" Outfit 900 26 #fff marginTop 6
- Sub 12.5 #f8d98a text-align center — "마지막 카드를 냈습니다 · 이번 라운드 2번째 아웃"
- **Final cards** marginTop 16 center gap 8
  - 52×74 · #fdfcff · Outfit 800 26 #c8912a · rotate ±6 · shadow
  - "2 ×2 로 마무리 · 손패 0장" 11 #9a92c0
- **Next rank preview** marginTop 18 · padding 15 · radius 15 · rgba(214,179,255,.24..08) · border rgba(214,179,255,.4)
  - Label 10.5 700 #9a92c0
  - "♛ 레서 모몬티" Outfit 800 20 #fff
  - Sub 11 #d6b3ff — "2위 확정 · 과세 특전 유지"
- **Out order box** marginTop 12 · rgba(255,255,255,.05) border · radius 12
  - Head 9.5 700 #9a92c0 — "아웃 순서"
  - Rows 11.5 space-between with per-rank color labels
- **CTA** purple 14 800 — "관전하기 ▶"

### 5-2 · 라운드 결과 · 자리 이동
- Eyebrow 11 700 #f2c14e — "라운드 3 종료 · 새 서열"
- Title Outfit 800 16 #f4f2ff — "다음 라운드 자리 이동"
- **Rank list** with **movement arrows** — new column
  - Each row: avatar/emoji + name + `▲2/▼1/－` 9.5 (#6ee7b7 / #fda4af / #9a92c0) + role 11 Outfit tinted
- **Callout** marginTop 10 · rgba(200,85,240,.1) border 10.5 #e0b6ff — "💡 광대 잔류 페널티: 지아 −2점 적용됨"
- **CTA** purple — "라운드 4 · 과세로 ▶"

### 5-3 · 매치 종료
- Eyebrow #f2c14e 11 700 letter-spacing .06em — "7라운드 완료 · MATCH END"
- **Champion cluster** center marginTop 12
  - 👑 34
  - Name Outfit 900 22 #fff marginTop 2
  - Sub 11.5 #f8d98a — "최다 모몬티 등극 · 우승"
- **Podium** marginTop 14 flex align-end gap 6 center
  - 2위 col: label 11 700 #d6b3ff · bar 52 tall · linear lilac · Outfit 800 "2"
  - 1위 col: label 11 700 #f8d98a · bar 72 tall · linear gold · Outfit 800 18 "1"
  - 3위 col: label 11 700 #c9c2e0 · bar 40 tall · linear white · Outfit 800 "3"
- **Rest card** marginTop 12 · rgba(255,255,255,.05) border · padding 10 12
  - Rows 11.5 space-between "4위 · 하늘" ← "모몬티 1회"
- **Bottom bar** gap 8
  - 결과 공유 ghost
  - 한 판 더 primary purple 1.4 flex

---

## ⑥ 연결 끊김 (§ m6)

### 6-1 · 내 연결 끊김 (재연결 시도)
- Status bar right span shows "✕ 오프라인" #fda4af
- Blurred game behind (blur 3px opacity .4)
- **Card overlay** — center · dark bg + border
- Icon ⚡ + "재연결 중" title + countdown + "다시 시도" button

### 6-2 · 상대 연결 끊김
- Grey overlay avatar with pulse
- "N님과 연결이 끊겼어요" #9a92c0 12 700
- "자동 패스 · X초 뒤 재개" hint

### 6-3 · 재연결 성공
- Green flash overlay
- ✅ + "다시 접속했어요"
- State sync 노트

### 6-4 · 타임아웃
- ⏳ + "자리 만료" + [홈으로] CTA
