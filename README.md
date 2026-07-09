# 모몬티 · Momonti

낮은 숫자가 왕이 되는 서열 셰딩 대전. 5종 보드게임 라인업의 첫 릴리스이자, 앞으로 붙일 게임 모듈들의 기준 구현입니다.

- **Frontend** — Vite + React + TypeScript. Cloudflare Pages 배포.
- **Backend** — Cloudflare Worker + Durable Objects (룸 상태 오너십, WebSocket 팬아웃).
- **전송** — 단일 WebSocket, 자동 재연결, 세션 ID로 자리 복원.

## 프로젝트 구조

```
shared/          web + worker 공용 (게임 엔진, 프로토콜)
  engine.ts          GameModule 인터페이스, 결정적 RNG
  protocol.ts        C2S / S2C 메시지 타입
  games/
    registry.ts        게임 모듈 등록 (여기에만 추가하면 라이브러리·라우팅 자동)
    momonty/logic.ts   모몬티 규칙(과세·혁명·리드·따라내기·아웃)
    querymo|binchi|indient|moorumon/logic.ts  최소 엔진 스켈레톤

src/             웹 프론트엔드
  design/          토큰(tokens.css) + 프리미티브(Button, Card, PhoneFrame, PlayingCard…)
  net/             WebSocket transport (재연결·백오프·세션 지속)
  state/store.ts   useSyncExternalStore 기반 앱 스토어
  screens/         Home · Library · Create · Join · Lobby · Play · Result · Overlay · Toast
  games/momonty/PlayView.tsx   모몬티 인게임 뷰

worker/          Cloudflare Worker + DO
  index.ts         WS 엔트리, 룸 코드 발급, 룸 DO 팬아웃
  room.ts          Room Durable Object (자리·설정·엔진 상태·브로드캐스트)
```

## 데이터 기반 확장성

새 게임을 추가하려면:

1. `shared/games/<id>/logic.ts` 에 `GameModule` 하나 만들기.
2. `shared/games/registry.ts` 에 한 줄 등록.
3. (선택) `src/games/<id>/PlayView.tsx` 로 인게임 뷰 컴포넌트 추가하고 `src/screens/Play.tsx` 의 switch에 케이스 추가.
4. (선택) `src/design/tokens.css` 에 `[data-accent="<id>"]` 규칙 추가하면 라이브러리/룸 UI가 게임 색으로 자동 리스킨.

이걸 하면 라이브러리·룸 생성·설정·매칭·재연결 흐름은 **자동으로** 새 게임에도 붙습니다. 클라이언트 UI는 화면별로 하드코딩 없이 `GameModule.defaultConfig()`, `view()` 산출물, `accent` 토큰만 소비합니다.

## 로컬 개발

```bash
npm install
# 터미널 A — Worker (DO 포함)
npm run worker:dev
# 터미널 B — 웹
npm run dev
```

- Web은 5173, Worker는 8787. Vite dev server 가 `/ws`, `/api` 를 프록시합니다.
- 브라우저 두 탭(또는 시크릿 창)에서 접속 → 방 만들기 → 코드 공유 → 코드로 입장.

## 배포

```bash
# 1) Worker + DO 배포
npm run worker:deploy

# 2) 웹 정적 배포 (Cloudflare Pages)
npm run deploy
# = vite build && wrangler pages deploy dist --project-name=momonti
```

Pages는 정적 자산만 제공합니다. 실제 트래픽은:

- `/ws` 는 워커 라우트로 매핑 (`wrangler.toml` 의 `routes` 혹은 대시보드 `momonti-worker` 에 도메인 라우트 등록).
- 프론트에서 `location.host` 로 WS 를 여니, 같은 도메인이면 Pages ↔ Worker Route 조합으로 알아서 라우팅됩니다. 서브도메인 분리 시(`api.momonti…`) 는 `src/net/transport.ts:buildWsUrl` 에 상수만 바꿔주면 됩니다.

## WebSocket 프로토콜 개요

전송 계층은 얇습니다. 서버는 **엔진 리듀서 + 결정적 RNG** 로 상태를 굴리고, 그 결과를 매 tick 마다 자리별로 프로젝션해서 브로드캐스트합니다.

| 방향 | 타입          | 페이로드 요약                              |
| ---- | ------------- | ------------------------------------------ |
| C→S  | `hello`       | `sessionId, displayName` (세션 지속)       |
| C→S  | `createRoom`  | `gameId, roomName?, isPrivate?, maxPlayers`|
| C→S  | `joinRoom`    | `code`                                     |
| C→S  | `setConfig`   | 게임별 config JSON (호스트만)              |
| C→S  | `setReady`    | `ready: boolean`                           |
| C→S  | `startMatch`  | (호스트만)                                 |
| C→S  | `action`      | `action` — 게임 모듈의 Action 유니온       |
| C→S  | `leaveRoom`   |                                            |
| S→C  | `welcome`     | `sessionId, userId`                        |
| S→C  | `roomCreated` | `code`                                     |
| S→C  | `roomState`   | 자리·설정·페이즈 (모두에게)                 |
| S→C  | `gameView`    | 나에게 보이는 view + last events + version |
| S→C  | `error`       | `message, code?`                           |

## 재연결

- 브라우저는 `localStorage.momonti.sessionId` 를 유지합니다.
- 워커 재시작 · 네트워크 재연결 시 `/ws?session=…` 로 다시 붙으면 DO 가 `sessionMap[sessionId]` 로 원래 자리에 재할당합니다.
- Disconnect 는 seat 를 지우지 않고 `online: false` 로 마크만 합니다 — 재접속 시 그대로 복귀.

## 추가로 필요한 인프라 (지금 스택 밖)

지금 저장소는 **Cloudflare Workers + DO + Pages** 로 끝냅니다. 실제 서비스로 갈 때 추가로 붙이면 좋은 것들:

1. **KV — 방 코드 → DO 이름 매핑**
   지금은 `index` DO 가 in-DO 저장소에 매핑을 들고 있어요. 워커가 매 lookup 마다 DO 를 깨우므로 트래픽↑ 시 비용이 커집니다. `env.CODES` 로 KV 바인딩을 만들고 `newRoom` 때 KV 에 쓰고 lookup 은 KV 에서 읽게 바꾸세요.
2. **D1 — 매치 히스토리 / 랭킹**
   진행 기록·랭크전은 DO 밖 저장소로 뽑아야 합니다. 라운드 종료 시 DO 가 D1 로 write.
3. **R2 — 리플레이 로그**
   시드 + 액션 로그만 저장하면 전체 매치를 재생할 수 있어요 (엔진이 결정적). 관전·심사·버그 리포트에 유용.
4. **Analytics Engine — 세션 텔레메트리**
   DAU / 매치 길이 분포 / 재연결율 관측. `wrangler.toml` 바인딩 한 줄.
5. **Turnstile — 진입 봇 필터**
   무 로그인 세션 발급 시.
6. **Web Push — 초대 알림**
   비동기 초대 링크 클릭 → PWA 알림. `worker/push.ts` + VAPID.
7. **소셜 로그인**
   현재는 sessionId == userId (기기 기반). Google/Apple sign-in 붙일 때 `hello` 페이로드에 토큰 첨부하고 DO 가 검증 → userId 재할당.
8. **DO Hibernating WebSockets**
   지금은 워커가 SSE-like NDJSON 스트림으로 fan-out 합니다 (단순함 우선). 트래픽↑ 시 각 클라이언트 WS 를 DO 로 직접 이관하고 hibernating WS API 로 붙여야 요금·리소스가 절감됩니다. 프로토콜은 그대로 사용 가능.

## 남은 작업 (우선순위)

1. **모몬티 인게임 QoL** — 마지막 낸 카드 마커, 히스토리 사이드 시트, 손패 카운팅 오버레이.
2. **다른 4종 인게임 뷰** — `src/games/<id>/PlayView.tsx` 4 개 (엔진은 이미 리듀서 형태로 준비됨).
3. **재접속 UX 상세** — 오버레이에서 "재접속 중 · 남은 시간" 카운터, 서버 측 `disconnectGraceMs`.
4. **관전 모드** — DO 가 관전 좌석을 별도 리스트로 관리, view 는 hidden info 없는 버전으로 프로젝션.
5. **결과 화면** — 시안 대로 라운드별 로그 · 개인 스탯 카드.
