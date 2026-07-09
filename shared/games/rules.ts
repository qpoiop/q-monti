/**
 * Rulebook content — plain data, per game id. Rendered by `RulesSheet`.
 *
 * Structure: a list of chapters, each with a title, one-liner summary, and
 * bullet points. Keep entries short — the UI is a mobile bottom sheet.
 */

export interface RuleChapter {
  key: string;
  title: string;
  summary?: string;
  bullets: string[];
}

export interface Rulebook {
  gameId: string;
  koreanName: string;
  headline: string;
  tags: string[];
  chapters: RuleChapter[];
}

export const RULEBOOKS: Record<string, Rulebook> = {
  momonty: {
    gameId: "momonty",
    koreanName: "모몬티",
    headline: "낮은 숫자가 왕이 되는 서열 셰딩 대전",
    tags: ["서열", "4~8인", "과세", "혁명"],
    chapters: [
      {
        key: "goal",
        title: "목표",
        summary: "가장 먼저 손패를 다 내면 그 라운드의 왕",
        bullets: [
          "먼저 손패를 다 내는 순서대로 그레이터 모몬티 → 모몬티 → 상인 → 페온 → 그레이터 페온",
          "목표 라운드 도달 시 누적 점수 1위가 매치 승리",
        ],
      },
      {
        key: "cards",
        title: "카드와 서열",
        summary: "숫자가 낮을수록 강함",
        bullets: [
          "숫자 1~12, 각 6장 (총 72장) + 광대 2장 (와일드)",
          "1이 최강, 12가 최약. 낮은 숫자가 왕",
          "광대는 어떤 값으로든 사용 가능 (선언 필수)",
        ],
      },
      {
        key: "turn",
        title: "한 턴에 하는 일",
        summary: "리드하거나 따라내거나 패스",
        bullets: [
          "리드: 단·페어·트리플·쿼드·스트레이트(3장 이상) 중 하나로 시작",
          "따라내기: 같은 형태 + 더 낮은 값으로 넘긴다",
          "패스: 넘길 수 없거나 원할 때 패스 (리드는 패스 불가)",
          "리더까지 한 바퀴 돌면 파일이 정리되고 마지막 낸 사람이 다음 리드",
        ],
      },
      {
        key: "tax",
        title: "과세와 반환",
        summary: "라운드 시작 시 서열대로 카드 이동",
        bullets: [
          "그레이터 페온: 최고패 2장 상납",
          "레서 페온: 최고패 1장 상납",
          "그레이터 모몬티: 임의의 카드 2장 반환",
          "레서 모몬티: 임의의 카드 1장 반환",
        ],
      },
      {
        key: "revolution",
        title: "혁명 & 대혁명",
        summary: "광대 2장 보유 시 과세 무효",
        bullets: [
          "광대 2장을 모두 가지고 있으면 과세 취소 선언 가능",
          "대혁명 옵션이 켜져 있으면 서열이 완전히 뒤집힘 (라운드 한정)",
          "상납한 카드는 원래 소유자에게 반환됨",
        ],
      },
      {
        key: "extras",
        title: "고급 룰",
        bullets: [
          "쿼드 락: 같은 숫자 4장을 한 번에 내면 즉시 파일 정리",
          "광대 잔류 페널티: 라운드 끝까지 광대 보유 시 −2점",
          "낼 수 없으면 자동 패스: 캐주얼 옵션",
        ],
      },
    ],
  },
  querymo: {
    gameId: "querymo",
    koreanName: "쿼리모",
    headline: "벽을 세워 길을 막는 완전정보 수읽기",
    tags: ["전략", "2인", "완전정보"],
    chapters: [
      {
        key: "goal",
        title: "목표",
        bullets: ["내 고양이를 반대편 끝줄에 먼저 도달"],
      },
      {
        key: "turn",
        title: "한 턴에 하는 일",
        bullets: [
          "이동: 상하좌우 한 칸",
          "벽 세우기: 2칸 길이 벽으로 상대 길을 우회시키기 (재고 소모)",
          "상대와 마주치면 뛰어넘거나 대각선 이동",
        ],
      },
      {
        key: "walls",
        title: "벽 규칙",
        bullets: [
          "벽끼리 겹치거나 교차 금지",
          "상대의 모든 경로를 완전 봉쇄하는 벽은 금지 (시스템 자동 검증)",
          "기본 벽 개수 10 / 빠른 판은 7",
        ],
      },
    ],
  },
  binchi: {
    gameId: "binchi",
    koreanName: "모빈치코드",
    headline: "정렬 제약 추리 · 오답 리스크",
    tags: ["추리", "2~4인", "리스크"],
    chapters: [
      {
        key: "goal",
        title: "목표",
        bullets: ["상대의 타일을 모두 공개시키면 승리 · 마지막까지 숨은 타일이 남은 사람 승"],
      },
      {
        key: "turn",
        title: "한 턴 흐름",
        bullets: [
          "가운데 더미에서 타일 1장 뽑기 (나만 확인)",
          "상대 타일 하나 지목 + 숫자 선언",
          "맞으면 상대 것 공개 → 계속하거나 멈춤",
          "틀리면 방금 뽑은 내 타일이 공개 (정보 손실)",
        ],
      },
      {
        key: "tiles",
        title: "타일 규칙",
        bullets: [
          "검정 0~11, 흰색 0~11 + 조커 2",
          "오름차순 정렬, 동수는 검정 < 흰색",
          "조커는 원하는 위치에 숨길 수 있음",
        ],
      },
    ],
  },
  indient: {
    gameId: "indient",
    koreanName: "모디언트릭",
    headline: "심리 · 확률 · 베팅 · 선언",
    tags: ["심리", "2인", "베팅"],
    chapters: [
      {
        key: "goal",
        title: "목표",
        bullets: ["상대의 칩을 다 뺏거나 판수 종료 시 칩 우세로 승리"],
      },
      {
        key: "turn",
        title: "한 판 흐름",
        bullets: [
          "앤티 → 카드 1장 배분 (내 것은 못 봄, 상대 것은 보임)",
          "체크 / 콜 / 레이즈 / 폴드로 베팅",
          "쇼다운 시 높은 숫자가 승 · 팟 획득",
        ],
      },
      {
        key: "declare",
        title: "선언 & 의심",
        bullets: [
          "레이즈 대신 [선언]: 내 카드에 대한 주장 (예: '내 카드는 7 이상')",
          "상대는 [믿다] 또는 [의심]으로 응수",
          "의심 시 즉시 쇼다운. 참이면 선언자 승, 거짓이면 의심한 상대 승",
        ],
      },
      {
        key: "counting",
        title: "카운팅",
        bullets: [
          "결판난 카드는 공개 버림패로 쌓임",
          "덱 구성이 정해져 있어 남은 카드를 세면 승률을 정확히 계산 가능",
          "랭크전은 자동 카운터 off (순수 기억)",
        ],
      },
    ],
  },
  moorumon: {
    gameId: "moorumon",
    koreanName: "모루먼쇼",
    headline: "카드 관리 · 트릭테이킹",
    tags: ["카드", "2인"],
    chapters: [
      {
        key: "goal",
        title: "목표",
        bullets: ["트릭 획득으로 점수를 모아 61점 선도달"],
      },
      {
        key: "cards",
        title: "카드와 점수",
        bullets: [
          "40장 덱 (4무늬 × 10종)",
          "A=11, 10=10, K=4, Q=3, J=2, 나머지=0 (총 120점)",
          "매 판 하나의 무늬가 으뜸 (트럼프) — 다른 무늬 전부를 이김",
        ],
      },
      {
        key: "turn",
        title: "한 트릭",
        bullets: [
          "선이 1장, 후가 1장 낸다",
          "승자 = 으뜸 우선, 같은 무늬면 높은 값, 다른 무늬면 선 승",
          "승자가 두 장 획득 후 각자 더미에서 1장씩 보충",
          "더미 소진 후에는 무늬 따르기 강제",
        ],
      },
    ],
  },
};
