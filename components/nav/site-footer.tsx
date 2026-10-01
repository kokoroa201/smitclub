import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).footer;

  return (
    <footer className="mt-8 border-t border-border/60 px-4 py-3 text-center sm:mt-12 sm:py-6 print:hidden">
      <p className="text-[11px] text-muted-foreground/70">
        {t.copyright}
      </p>
      <p className="mt-1 hidden text-[11px] text-muted-foreground/60 sm:block">
        <Link href="/club-rules" className="hover:text-muted-foreground">
          {t.clubRules}
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/terms" className="hover:text-muted-foreground">
          {t.terms}
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/privacy" className="hover:text-muted-foreground">
          {t.privacy}
        </Link>
      </p>
    </footer>
  );
}
