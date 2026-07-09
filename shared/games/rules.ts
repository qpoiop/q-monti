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
        summary: "먼저 손패를 다 내면 왕",
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
          "1이 최강, 12가 최약",
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
          "패스: 넘길 수 없거나 원할 때 (리드는 패스 불가)",
          "리더까지 한 바퀴 돌면 파일 정리 · 마지막 낸 사람이 다음 리드",
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
          "광대 2장을 모두 가지면 과세 취소 선언 가능",
          "대혁명 옵션 ON → 서열 완전 역전 (라운드 한정)",
          "상납한 카드는 원 소유자에게 반환",
        ],
      },
      {
        key: "extras",
        title: "고급 룰",
        bullets: [
          "쿼드 락: 같은 숫자 4장을 한 번에 → 즉시 파일 정리",
          "광대 잔류 페널티: 라운드 끝까지 광대 보유 시 −2점",
          "낼 수 없으면 자동 패스: 캐주얼 옵션",
        ],
      },
    ],
  },
};
