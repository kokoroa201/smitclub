import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border/60 px-4 py-3 text-center sm:mt-12 sm:py-6 print:hidden">
      <p className="text-[11px] text-muted-foreground/70">
        © 2026 SMIT CLUB · 서울미디어대학원대학교 원우회
      </p>
      <p className="mt-1 hidden text-[11px] text-muted-foreground/60 sm:block">
        <Link href="/terms" className="hover:text-muted-foreground">
          이용약관
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/privacy" className="hover:text-muted-foreground">
          개인정보처리방침
        </Link>
      </p>
    </footer>
  );
}
