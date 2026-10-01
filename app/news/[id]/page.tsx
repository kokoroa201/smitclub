import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";

type NoticeDetail = {
  id: string;
  source: "student_council" | "school_academic";
  title: string;
  body: string | null;
  summary: string | null;
  source_url: string | null;
  published_at: string;
};

export default async function NoticeDetailPage(props: PageProps<"/news/[id]">) {
  const { id } = await props.params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: notice } = await supabase
    .from("notices")
    .select("id, source, title, body, summary, source_url, published_at")
    .eq("id", id)
    .single<NoticeDetail>();

  if (!notice) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
      <Link href="/news" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
        {t.newsPage.back}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <span className="rounded-full bg-purple-soft px-2 py-0.5 text-[11px] font-bold text-purple-dark">
          {t.newsPreview.source[notice.source] ?? notice.source}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(notice.published_at, locale, { year: "numeric", month: locale === "en" ? "short" : "long", day: "numeric" })}
        </span>
      </div>

      <h1 className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">{notice.title}</h1>

      {notice.body ? (
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">{notice.body}</p>
      ) : notice.summary ? (
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-base">{notice.summary}</p>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t.newsPage.noBody}</p>
      )}

      {notice.source_url && (
        <a
          href={notice.source_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-6 inline-block text-sm font-semibold text-coral-dark hover:underline"
        >
          {t.newsPage.viewOriginal}
        </a>
      )}
    </main>
  );
}
