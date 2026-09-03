import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MOCK_NOTICES, type Notice } from "@/lib/mock/notices";

const SCOPE_STYLES: Record<Notice["scope"], string> = {
  학교: "bg-blue-soft text-blue-dark",
  원우회: "bg-purple-soft text-purple-dark",
};

function NoticeRow({ notice }: { notice: Notice }) {
  return (
    <Link
      href="/news"
      className="flex items-center gap-3 rounded-lg border border-border bg-white px-3.5 py-3 transition-colors hover:bg-muted/50 sm:px-4 sm:py-3.5"
    >
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${SCOPE_STYLES[notice.scope]}`}>
        {notice.scope}
      </span>
      {notice.isNew && (
        <span className="shrink-0 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-extrabold text-white">
          NEW
        </span>
      )}
      <span className="flex-1 truncate text-sm font-medium text-foreground">{notice.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{notice.date}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SchoolNews({ notices = MOCK_NOTICES }: { notices?: Notice[] }) {
  const mobileNotices = notices.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">학교 &amp; 원우회 소식</h2>
        <Link href="/news" className="text-xs font-semibold text-muted-foreground hover:text-foreground sm:text-sm">
          전체보기
        </Link>
      </div>

      {/* 모바일 — 처음 3개만, 나머지는 "전체보기"로 */}
      <div className="mt-3 flex flex-col gap-2 sm:hidden">
        {mobileNotices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} />
        ))}
      </div>

      {/* 태블릿/데스크톱 — 전체 목록 */}
      <div className="mt-5 hidden gap-2.5 sm:grid sm:grid-cols-2">
        {notices.map((notice) => (
          <NoticeRow key={notice.id} notice={notice} />
        ))}
      </div>
    </section>
  );
}
