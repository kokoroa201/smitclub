import { MOCK_NOTICES } from "@/lib/mock/notices";

export default function AdminNoticesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">공지·소식 관리</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        아직 공지 DB 테이블이 없어 임시 데이터로 화면 구조만 보여줍니다. 실제 등록/수정 기능은 이후 연동됩니다.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {MOCK_NOTICES.map((notice) => (
          <div
            key={notice.id}
            className="flex items-center justify-between rounded-card border border-border bg-card p-4"
          >
            <div>
              <p className="font-medium text-foreground">
                {notice.title}
                {notice.isNew && (
                  <span className="ml-2 rounded-full bg-coral-soft px-2 py-0.5 text-xs font-bold text-coral-dark">
                    NEW
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {notice.scope} · {notice.date}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-full border border-border px-4 py-3 font-bold text-muted-foreground"
      >
        새 공지 작성 (준비중)
      </button>
    </main>
  );
}
