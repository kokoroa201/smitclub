import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MOCK_NOTICES, type Notice } from "@/lib/mock/notices";

const SCOPE_STYLES: Record<Notice["scope"], string> = {
  학교: "bg-blue-soft text-blue-dark",
  원우회: "bg-purple-soft text-purple-dark",
};

export function SchoolNews({ notices = MOCK_NOTICES }: { notices?: Notice[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-foreground sm:text-xl">학교 &amp; 원우회 소식</h2>
        <Link href="/news" className="text-xs font-bold text-muted-foreground hover:text-foreground sm:text-sm">
          전체보기
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {notices.map((notice) => (
          <Link
            key={notice.id}
            href="/news"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm transition-colors hover:bg-muted"
          >
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${SCOPE_STYLES[notice.scope]}`}
            >
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
        ))}
      </div>
    </section>
  );
}
