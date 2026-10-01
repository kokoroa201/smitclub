import type { Dictionary } from "./ko";

// Dictionary(ko 기준) 타입을 명시해서 키가 빠지거나 남으면 tsc가 잡는다.
// 직역보다 외국인 원우가 학교 사이트에서 바로 이해할 짧은 표현을 쓴다.
export const en: Dictionary = {
  accessibility: {
    korean: "한국어",
    english: "EN",
    largeText: "Large text",
    baseText: "Default text",
  },
  nav: {
    home: "Home",
    clubs: "Clubs",
    clubGuide: "Club Guide",
    news: "News",
    my: "MY",
    mainMenu: "Main menu",
    bottomNav: "Bottom navigation",
    makeClub: "Start a club",
    notifications: "Notifications",
    admin: "Admin",
    userName: "{name}",
    logIn: "Log in",
    signUp: "Sign up",
    logOut: "Log out",
  },
  footer: {
    copyright: "© 2026 SMIT CLUB · SMIT Graduate Student Council",
    clubRules: "Club Regulations · Standard Club Constitution",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
  },
  status: {
    application: {
      draft: "Draft",
      submitted: "Under Review",
      needs_revision: "Needs Revision",
      recommended: "Awaiting School Approval",
      approved: "Approved",
      rejected: "Rejected",
    },
    club: {
      preparing: "Preparing",
      recruiting: "Recruiting",
      active: "Active",
      closed: "Closed",
    },
    membership: {
      applied: "Pending",
      approved: "Approved",
      rejected: "Declined",
      left: "Withdrawn",
    },
  },
  category: {
    운동: "Sports",
    밴드: "Band",
    사진: "Photography",
    게임: "Gaming",
    문화교류: "Culture & Exchange",
    개발: "Tech",
    스터디: "Study",
    창업: "Startup",
  },
  clubCard: {
    explore: "Explore",
    exploreClub: "Explore {name}",
    join: "Join",
    comingSoon: "Coming Soon",
    activities: "Activities",
    waitingNext: "More clubs are on the way",
    createClub: "Start a Club",
  },
  nextClubCard: {
    eyebrow: "Coming next",
    title: "Who's next?",
    bodyLine1: "Start the next club!",
    bodyLine2: "",
    miniTitle: "Who's next?",
  },
  newsPreview: {
    title: "News",
    viewAll: "View all",
    recentNotices: "Recent Notices",
    noNotices: "No notices yet.",
    thisMonthCalendar: "Academic Calendar This Month",
    noCalendar: "No academic events yet.",
    source: {
      student_council: "Council",
      school_academic: "Academic",
    },
  },
};
