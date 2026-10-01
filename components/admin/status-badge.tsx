import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";

// 상태 코드값(키)과 색은 여기서, 표시 라벨은 i18n 사전(status.*)에서 가져온다.
// locale을 넘기지 않으면 한국어 — 관리자·공식 서식 화면은 한국어로 유지한다.
const APPLICATION_STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-yellow-soft text-yellow-dark",
  needs_revision: "bg-purple-soft text-purple-dark",
  recommended: "bg-blue-soft text-blue-dark",
  approved: "bg-blue-soft text-blue-dark",
  rejected: "bg-coral-soft text-coral-dark",
};

const CLUB_STATUS_CLASS: Record<string, string> = {
  preparing: "bg-muted text-muted-foreground",
  recruiting: "bg-blue-soft text-blue-dark",
  active: "bg-purple-soft text-purple-dark",
  closed: "bg-coral-soft text-coral-dark",
};

const MEMBERSHIP_STATUS_CLASS: Record<string, string> = {
  applied: "bg-yellow-soft text-yellow-dark",
  approved: "bg-blue-soft text-blue-dark",
  rejected: "bg-coral-soft text-coral-dark",
  left: "bg-muted text-muted-foreground",
};

const FALLBACK_CLASS = "bg-muted text-muted-foreground";

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

export function ApplicationStatusBadge({ status, locale = DEFAULT_LOCALE }: { status: string; locale?: Locale }) {
  const labels: Record<string, string> = getDictionary(locale).status.application;
  return <Badge label={labels[status] ?? status} className={APPLICATION_STATUS_CLASS[status] ?? FALLBACK_CLASS} />;
}

export function ClubStatusBadge({ status, locale = DEFAULT_LOCALE }: { status: string; locale?: Locale }) {
  const labels: Record<string, string> = getDictionary(locale).status.club;
  return <Badge label={labels[status] ?? status} className={CLUB_STATUS_CLASS[status] ?? FALLBACK_CLASS} />;
}

export function MembershipStatusBadge({ status, locale = DEFAULT_LOCALE }: { status: string; locale?: Locale }) {
  const labels: Record<string, string> = getDictionary(locale).status.membership;
  return <Badge label={labels[status] ?? status} className={MEMBERSHIP_STATUS_CLASS[status] ?? FALLBACK_CLASS} />;
}

// 관리자 필터·/my 신청 내역에서 쓰는 한국어 라벨 맵(기존 export 유지).
export const APPLICATION_STATUS_LABEL: Record<string, string> = getDictionary("ko").status.application;

export const CLUB_STATUS_LABEL: Record<string, string> = getDictionary("ko").status.club;
