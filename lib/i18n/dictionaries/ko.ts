// 한국어 사전이 기준이다 — Dictionary 타입이 이 객체 모양에서 나오므로,
// 여기 키를 추가하면 en.ts에도 같은 키를 넣기 전까지 tsc가 실패한다.
// 페이지 문구는 단계적으로 옮긴다(공통 UI + 홈·동아리 목록·상세).
// "{name}" 같은 자리표시자는 fill()로 채운다.
import { APPLICATION_STEPS, ELIGIBILITY_ITEMS, PROCESSING_TIMELINE } from "@/lib/constants/club-application-rules";
import { CLUB_RULE_DOCS } from "@/lib/constants/club-rules-documents";

export const ko = {
  newsPage: {
    intro: "학교 학사공지와 원우회 소식을 한곳에서 확인하세요.",
    notices: "공지",
    calendar: "학사일정",
    viewOriginal: "원문 보기 →",
    viewDetails: "자세히 보기 →",
    previousMonth: "← 이전 달",
    nextMonth: "다음 달 →",
    back: "← 소식 목록으로",
    noBody: "등록된 본문이 없습니다.",
  },
  clubRules: {
    title: "동아리 안내 및 규정",
    intro: "동아리 개설 절차와 운영에 필요한 규정·표준 회칙을 확인하세요.",
    procedure: "동아리 개설 절차",
    procedureIntro: "아이디어 구상부터 공식 활동 시작까지, 5단계로 진행됩니다.",
    steps: APPLICATION_STEPS.map((step) => ({
      title: String(step.title),
      description: String(step.description),
      emphasis: [...step.emphasis] as string[],
    })),
    eligibility: "신청 자격",
    eligibilityItems: [...ELIGIBILITY_ITEMS] as string[],
    timeline: "처리 일정",
    timelineItems: PROCESSING_TIMELINE.map((item) => ({ label: String(item.label), value: String(item.value) })),
    apply: "온라인으로 동아리 개설 신청하기",
    documents: {
      operating: { label: String(CLUB_RULE_DOCS[0].label), description: String(CLUB_RULE_DOCS[0].description) },
      charter: { label: String(CLUB_RULE_DOCS[1].label), description: String(CLUB_RULE_DOCS[1].description) },
    },
    downloadPdf: "PDF 다운로드",
    downloadHwp: "HWP 다운로드",
    pdfHelp: "PDF가 화면에 보이지 않으면 위 “PDF 다운로드” 버튼으로 내려받아 확인해주세요.",
    officialDocumentsNote: "공식 문서는 한국어로 제공됩니다.",
  },
  home: {
    season: "2026 동아리 시즌",
    heroStart: "학교생활,",
    heroHighlight: "함께할 때",
    heroEnd: "더 즐거워요",
    intro: "관심사가 맞는 동아리를 찾거나, 새로운 동아리를 직접 시작해보세요.",
    recruiting: "지금 모집 중인 동아리",
    countOne: "{count}개 동아리가 함께할 원우를 찾고 있어요.",
    countMany: "{count}개 동아리가 함께할 원우를 찾고 있어요.",
    emptyTitle: "아직 모집 중인 동아리가 없어요",
    emptyBody: "SMIT CLUB은 이제 막 시작했어요. 첫 동아리의 주인공이 되어보세요.",
    community: "360명의 원우와 함께 시작하는 SMIT CLUB",
    stats: "내국인 101 · 외국인 259 · 2026 동아리 제도 시작",
  },
  clubsPage: {
    title: "나와 맞는 동아리를 찾아보세요",
    intro: "관심사와 활동 목표에 맞는 동아리를 둘러보고, 마음에 드는 곳에 바로 가입 신청해보세요.",
    guideTitle: "동아리를 직접 만들고 싶다면?",
    guideBody: "개설 절차와 운영규정·표준 동아리 회칙을 먼저 확인하세요.",
    guideCta: "동아리 안내 보기",
    tabs: {
      all: "전체",
      recruiting: "모집 중",
      active: "운영 중",
    },
    empty: {
      all: "등록된 동아리가 없습니다.",
      recruiting: "지금 모집 중인 동아리가 없습니다.",
      active: "지금 운영 중인 동아리가 없습니다.",
    },
    missing: "원하는 동아리가 없나요?",
  },
  clubDetail: {
    back: "← 동아리 목록으로",
    meeting: "정기 모임",
    founded: "설립 연도",
    advisor: "지도교수",
    professor: "{name} 교수",
    social: "SNS",
    recruitment: "모집 안내",
  },
  accessibility: {
    korean: "한국어",
    english: "EN",
    largeText: "큰 글씨",
    baseText: "기본 글씨",
  },
  nav: {
    home: "홈",
    clubs: "동아리",
    clubGuide: "동아리 안내",
    news: "소식",
    my: "MY",
    mainMenu: "주요 메뉴",
    bottomNav: "하단 내비게이션",
    makeClub: "동아리 만들기",
    notifications: "알림",
    admin: "관리자",
    userName: "{name}님",
    logIn: "로그인",
    signUp: "회원가입",
    logOut: "로그아웃",
  },
  footer: {
    copyright: "© 2026 SMIT CLUB · 서울미디어대학원대학교 원우회",
    clubRules: "동아리 운영규정 · 표준 동아리 회칙",
    terms: "이용약관",
    privacy: "개인정보처리방침",
  },
  // 키는 DB/코드에 저장되는 상태 코드값 그대로 — 표시 라벨만 언어별로 다르다.
  status: {
    application: {
      draft: "임시저장",
      submitted: "검토 대기",
      needs_revision: "보완 요청",
      recommended: "학교 승인 대기",
      approved: "승인",
      rejected: "반려",
    },
    club: {
      preparing: "준비중",
      recruiting: "모집중",
      active: "활동중",
      closed: "종료",
    },
    membership: {
      applied: "신청 대기",
      approved: "승인",
      rejected: "거절",
      left: "탈퇴",
    },
  },
  // 키는 clubs.category에 저장되는 한국어 값 그대로(lib/constants/categories.ts)
  // — 아이콘·색 조회 키도 이 한국어 값이라 DB 값은 바꾸지 않는다.
  category: {
    운동: "운동",
    밴드: "밴드",
    사진: "사진",
    게임: "게임",
    문화교류: "문화교류",
    개발: "개발",
    스터디: "스터디",
    창업: "창업",
  },
  clubCard: {
    explore: "둘러보기",
    exploreClub: "{name} 둘러보기",
    join: "가입 신청",
    comingSoon: "모집 준비 중",
    activities: "주요 활동",
    waitingNext: "다음 동아리를 기다리고 있어요",
    createClub: "동아리 개설 신청",
  },
  nextClubCard: {
    eyebrow: "개설 대기 중",
    title: "다음 동아리의 주인공은?",
    // bodyLine2가 빈 문자열이면 줄바꿈 없이 한 줄로 표시한다.
    bodyLine1: "하고 싶었던 활동을",
    bodyLine2: "직접 시작해보세요.",
    miniTitle: "다음 주인공은?",
  },
  newsPreview: {
    title: "소식",
    viewAll: "전체보기",
    recentNotices: "최근 공지",
    noNotices: "등록된 공지가 없습니다.",
    thisMonthCalendar: "이번 달 학사일정",
    noCalendar: "등록된 학사일정이 없습니다.",
    source: {
      student_council: "원우회",
      school_academic: "학사공지",
    },
  },
};

export type Dictionary = typeof ko;
