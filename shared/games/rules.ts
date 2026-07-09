/**
 * Rulebook — data-driven guidebook content.
 *
 * The rulebook is authored as a list of typed content blocks per
 * chapter. The client's `RulesSheet` matches each block to a renderer
 * so authors can produce a rich guide (illustrated card demos, rank
 * ladders, turn flow diagrams) without touching UI code.
 *
 * Add a new game by exporting an entry keyed by game id.
 */

/* -------------------------- Block types -------------------------- */

export interface CardSpec {
  value?: number;
  jester?: boolean;
  hidden?: boolean;
  crown?: boolean;
  selected?: boolean;
}

export type Block =
  /** Body paragraph — short prose. */
  | { type: "text"; body: string }
  /** Emphasised callout with a leading icon. */
  | { type: "callout"; icon: string; title: string; body: string; tone?: "accent" | "danger" | "info" }
  /** Row of playing cards for illustrating a concept. */
  | { type: "cards"; caption?: string; cards: CardSpec[] }
  /** Rank ladder — vertical list of tiered roles. */
  | { type: "ladder"; entries: LadderEntry[] }
  /** Numbered step flow with icons. */
  | { type: "flow"; steps: FlowStep[] }
  /** Combo formations (single/pair/triple/quad/straight) */
  | { type: "combos"; items: ComboItem[] }
  /** Tag chips explaining terms. */
  | { type: "tags"; items: { label: string; hint?: string }[] }
  /** Two-column key/value grid. */
  | { type: "kv"; rows: { key: string; value: string }[] };

export interface LadderEntry {
  tier: "top-1" | "top-2" | "mid" | "bottom-2" | "bottom-1";
  role: string;
  effect: string;
  icon: string;
}

export interface FlowStep {
  icon: string;
  label: string;
  detail?: string;
  branch?: string;
}

export interface ComboItem {
  name: string;
  cards: CardSpec[];
  hint: string;
}

/* -------------------------- Chapter -------------------------- */

export interface RuleChapter {
  key: string;
  title: string;
  icon: string;
  intro: string;
  blocks: Block[];
}

export interface Rulebook {
  gameId: string;
  koreanName: string;
  headline: string;
  tags: string[];
  chapters: RuleChapter[];
}

/* -------------------------- Momonty content -------------------------- */

const MOMONTY: Rulebook = {
  gameId: "momonty",
  koreanName: "모몬티",
  headline: "낮은 숫자가 왕이 되는 서열 셰딩 대전",
  tags: ["서열", "4~8인", "과세", "혁명"],
  chapters: [
    {
      key: "goal",
      title: "여정의 목표",
      icon: "👑",
      intro: "먼저 손패를 다 낸 자가 왕좌를 차지합니다.",
      blocks: [
        {
          type: "text",
          body:
            "매 라운드마다 손패를 먼저 비운 순서대로 서열이 결정돼요. 첫 아웃이 그레이터 모몬티, 마지막까지 남은 자가 그레이터 페온.",
        },
        {
          type: "cards",
          caption: "낮은 숫자일수록 강함 — 1이 최강, 12가 최약",
          cards: [
            { value: 1, crown: true },
            { value: 2 },
            { value: 6 },
            { value: 10 },
            { value: 12 },
            { jester: true },
          ],
        },
        {
          type: "callout",
          icon: "🏁",
          title: "매치 승리 조건",
          body: "목표 라운드(기본 7R)에 도달하면 누적 점수 1위가 최종 왕좌를 얻어요.",
          tone: "accent",
        },
      ],
    },
    {
      key: "cards",
      title: "카드와 광대",
      icon: "🎴",
      intro: "1은 1장, 2는 2장, … 12는 12장 + 광대 2장 = 총 80장이 1세트.",
      blocks: [
        {
          type: "kv",
          rows: [
            { key: "숫자 카드", value: "값과 같은 장수 · 1×1, 2×2, … 12×12" },
            { key: "광대 (와일드)", value: "1세트당 2장" },
            { key: "총 매수 (1세트)", value: "80장" },
            { key: "권장 세트 수", value: "4인 이하 1세트 · 5인 이상 2세트" },
            { key: "서열", value: "1 > 2 > … > 12" },
          ],
        },
        {
          type: "cards",
          caption: "숫자 카드 · 값이 낮을수록 강함",
          cards: [{ value: 1, crown: true }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }],
        },
        {
          type: "cards",
          caption: "광대 · 어떤 값으로도 사용 가능 (선언 필수)",
          cards: [{ jester: true }, { jester: true }],
        },
        {
          type: "callout",
          icon: "✨",
          title: "광대의 이중성",
          body:
            "광대는 부족한 값을 채우는 만능 조커지만, 라운드 끝까지 남으면 벌점 −2. 언제 낼지가 실력.",
          tone: "info",
        },
      ],
    },
    {
      key: "turn",
      title: "한 턴에 하는 일",
      icon: "🎯",
      intro: "리드하거나, 따라내거나, 패스. 셋 중 하나.",
      blocks: [
        {
          type: "flow",
          steps: [
            {
              icon: "🚩",
              label: "리드",
              detail: "빈 덱에 원하는 조합을 선언",
              branch: "리더는 패스 불가",
            },
            {
              icon: "🃏",
              label: "따라내기",
              detail: "같은 형태 · 더 낮은 값",
              branch: "광대로 값 보정 가능",
            },
            {
              icon: "🚫",
              label: "패스",
              detail: "넘길 수 없거나, 아껴둘 때",
            },
          ],
        },
        {
          type: "text",
          body:
            "리더까지 한 바퀴 돌아 모두 패스하면 덱이 정리되고, 마지막으로 낸 사람이 다음 트릭의 리더가 됩니다.",
        },
      ],
    },
    {
      key: "combos",
      title: "낼 수 있는 조합",
      icon: "🎼",
      intro: "단·페어·트리플·쿼드·스트레이트 — 리더가 정한 형태를 따라야 함.",
      blocks: [
        {
          type: "combos",
          items: [
            {
              name: "싱글",
              cards: [{ value: 5 }],
              hint: "한 장. 같은 값 이하로만 눌러짐.",
            },
            {
              name: "페어",
              cards: [{ value: 4 }, { value: 4 }],
              hint: "동일 값 2장. 페어끼리만 대결.",
            },
            {
              name: "트리플",
              cards: [{ value: 7 }, { value: 7 }, { value: 7 }],
              hint: "동일 값 3장. 광대로 채워도 됨.",
            },
            {
              name: "쿼드",
              cards: [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }],
              hint: "동일 값 4장. Quad Lock 옵션 시 즉시 클리어.",
            },
            {
              name: "스트레이트",
              cards: [{ value: 4 }, { value: 5 }, { value: 6 }],
              hint: "연속 3장 이상. 길이 반드시 일치.",
            },
          ],
        },
      ],
    },
    {
      key: "ranks",
      title: "다섯 서열",
      icon: "🏛",
      intro: "라운드가 끝나면 아웃 순서대로 다섯 계급이 배정됩니다.",
      blocks: [
        {
          type: "ladder",
          entries: [
            {
              tier: "top-1",
              icon: "👑",
              role: "그레이터 모몬티",
              effect: "임의의 카드 2장 반환",
            },
            {
              tier: "top-2",
              icon: "♛",
              role: "레서 모몬티",
              effect: "임의의 카드 1장 반환",
            },
            { tier: "mid", icon: "🛒", role: "상인", effect: "과세 없음 · 중립" },
            { tier: "bottom-2", icon: "🧰", role: "레서 페온", effect: "최고패 1장 상납" },
            {
              tier: "bottom-1",
              icon: "⛏",
              role: "그레이터 페온",
              effect: "최고패 2장 상납",
            },
          ],
        },
      ],
    },
    {
      key: "tax",
      title: "과세와 반환",
      icon: "💰",
      intro: "라운드 시작 순간, 서열에 따라 카드가 오고 갑니다.",
      blocks: [
        {
          type: "text",
          body:
            "페온은 자신의 손패 중 가장 강한 카드를 서열이 높은 왕에게 바쳐야 합니다. 왕은 대신 원치 않는 카드 몇 장을 돌려주죠.",
        },
        {
          type: "flow",
          steps: [
            { icon: "⛏", label: "페온 상납", detail: "최고패 자동 선택" },
            { icon: "🎁", label: "모몬티 반환", detail: "원하는 카드 선택" },
            { icon: "▶", label: "리드 시작", detail: "그레이터 모몬티부터" },
          ],
        },
        {
          type: "callout",
          icon: "⚠️",
          title: "왜 과세가 있나요?",
          body:
            "이전 라운드 승자가 유리해지지 않도록 서열을 유지 · 이완시키는 장치. 하지만 광대 2장을 쥔 자에게는 반란의 기회가 있죠.",
          tone: "info",
        },
      ],
    },
    {
      key: "revolution",
      title: "혁명의 순간",
      icon: "✊",
      intro: "광대 2장을 손에 쥐면 세상을 뒤집을 수 있습니다.",
      blocks: [
        {
          type: "cards",
          caption: "광대 2장 · 혁명 선언 조건",
          cards: [{ jester: true }, { jester: true }],
        },
        {
          type: "text",
          body:
            "혁명을 선언하면 이번 라운드의 과세가 완전 취소됩니다. 상납된 카드는 원 소유자에게 돌아가고, 왕과 페온이 같은 출발선에 서요.",
        },
        {
          type: "callout",
          icon: "🔥",
          title: "대혁명 (옵션)",
          body:
            "대혁명 룰 ON 상태에서 혁명이 일어나면 서열이 완전 역전 — 페온이 왕이 되고 왕이 페온이 됩니다. 라운드 한정.",
          tone: "danger",
        },
      ],
    },
    {
      key: "advanced",
      title: "고급 룰 · 하우스 옵션",
      icon: "⚙️",
      intro: "취향대로 켜고 끌 수 있는 선택지들.",
      blocks: [
        {
          type: "tags",
          items: [
            { label: "Quad Lock", hint: "같은 숫자 4장 즉시 덱 정리" },
            { label: "광대 잔류 페널티", hint: "라운드 끝까지 광대 보유 시 −2점" },
            { label: "자동 패스", hint: "낼 수 없으면 자동으로 패스" },
            { label: "대혁명", hint: "혁명 시 서열 완전 역전" },
            { label: "히스토리 공개", hint: "지난 트릭 열람 옵션" },
          ],
        },
        {
          type: "callout",
          icon: "🎨",
          title: "옵션은 방장이 결정합니다",
          body: "방 만들 때 세팅한 규칙이 매치 내내 유지됩니다. 신중히 조합하세요.",
          tone: "accent",
        },
      ],
    },
  ],
};

export const RULEBOOKS: Record<string, Rulebook> = {
  momonty: MOMONTY,
};
