export type Notice = {
  id: string;
  scope: "학교" | "원우회";
  title: string;
  date: string;
  isNew?: boolean;
};

// TODO: site_notices 테이블 연동 시 이 mock 배열을 실제 조회 결과로 교체.
export const MOCK_NOTICES: Notice[] = [
  { id: "1", scope: "학교", title: "2026년도 2학기 개강일 안내", date: "09.01", isNew: true },
  { id: "2", scope: "학교", title: "장학금 신청 안내", date: "08.31", isNew: true },
  { id: "3", scope: "원우회", title: "신규 동아리 모집 안내", date: "08.29" },
  { id: "4", scope: "원우회", title: "동아리 지원 프로그램 안내", date: "08.25" },
];
