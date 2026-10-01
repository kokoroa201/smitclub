// 한국어 사전이 기준이다 — Dictionary 타입이 이 객체 모양에서 나오므로,
// 여기 키를 추가하면 en.ts에도 같은 키를 넣기 전까지 tsc가 실패한다.
// 페이지 문구는 단계적으로 옮긴다(현재는 상단 접근성 영역만).
export const ko = {
  accessibility: {
    korean: "한국어",
    english: "EN",
    largeText: "큰 글씨",
    baseText: "기본 글씨",
  },
};

export type Dictionary = typeof ko;
