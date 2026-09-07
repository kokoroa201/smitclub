import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/club-applications", label: "개설 신청" },
  { href: "/admin/clubs", label: "동아리" },
  { href: "/admin/members", label: "회원" },
  { href: "/admin/notices", label: "공지" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireSuperAdmin();

  return (
    <div>
      <div className="border-b border-border bg-muted/40">
        <nav
          className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2"
          aria-label="관리자 메뉴"
        >
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
