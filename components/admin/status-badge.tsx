const APPLICATION_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "임시저장", className: "bg-muted text-muted-foreground" },
  submitted: { label: "검토 대기", className: "bg-yellow-soft text-yellow-dark" },
  needs_revision: { label: "보완 요청", className: "bg-purple-soft text-purple-dark" },
  recommended: { label: "학교 승인 대기", className: "bg-blue-soft text-blue-dark" },
  approved: { label: "승인", className: "bg-blue-soft text-blue-dark" },
  rejected: { label: "반려", className: "bg-coral-soft text-coral-dark" },
};

const CLUB_STATUS: Record<string, { label: string; className: string }> = {
  preparing: { label: "준비중", className: "bg-muted text-muted-foreground" },
  recruiting: { label: "모집중", className: "bg-blue-soft text-blue-dark" },
  active: { label: "활동중", className: "bg-purple-soft text-purple-dark" },
  closed: { label: "종료", className: "bg-coral-soft text-coral-dark" },
};

const MEMBERSHIP_STATUS: Record<string, { label: string; className: string }> = {
  applied: { label: "신청 대기", className: "bg-yellow-soft text-yellow-dark" },
  approved: { label: "승인", className: "bg-blue-soft text-blue-dark" },
  rejected: { label: "거절", className: "bg-coral-soft text-coral-dark" },
  left: { label: "탈퇴", className: "bg-muted text-muted-foreground" },
};

export function ApplicationStatusBadge({ status }: { status: string }) {
  const entry = APPLICATION_STATUS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.className}`}>{entry.label}</span>
  );
}

export function ClubStatusBadge({ status }: { status: string }) {
  const entry = CLUB_STATUS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.className}`}>{entry.label}</span>
  );
}

export function MembershipStatusBadge({ status }: { status: string }) {
  const entry = MEMBERSHIP_STATUS[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.className}`}>{entry.label}</span>
  );
}

export const APPLICATION_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(APPLICATION_STATUS).map(([key, value]) => [key, value.label]),
);

export const CLUB_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CLUB_STATUS).map(([key, value]) => [key, value.label]),
);
