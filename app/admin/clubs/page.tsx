import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ClubStatusBadge, CLUB_STATUS_LABEL } from "@/components/admin/status-badge";
import { updateClubStatus, updateClubPresident } from "@/lib/actions/admin-clubs";
import { ROLE_LABEL } from "@/lib/constants/roles";
import type { Role } from "@/lib/auth";

const CLUB_STATUSES = ["preparing", "recruiting", "active", "closed"] as const;

type ClubRow = {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  status: string;
  president_id: string | null;
  created_at: string;
};

type MemberRow = {
  id: string;
  name: string;
  role: Role;
};

export default async function AdminClubsPage(props: PageProps<"/admin/clubs">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const success = searchParams.success === "president";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("clubs")
    .select("id, name, name_en, category, status, president_id, created_at")
    .order("created_at", { ascending: false });

  const clubs = (data ?? []) as ClubRow[];

  // 회장 지정 드롭다운은 가입한 전체 회원 중에서 고른다 — 아직 해당
  // 동아리에 가입 신청을 하지 않은 회원도 회장으로 지정할 수 있어야 한다.
  const { data: membersData } = await supabase.from("profiles").select("id, name, role").order("name");
  const members = (membersData ?? []) as MemberRow[];
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">동아리 관리</h1>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-4 rounded-md bg-blue-soft px-3 py-2 text-sm text-blue-dark">회장이 지정되었습니다.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {clubs.length === 0 && <p className="text-sm text-muted-foreground">등록된 동아리가 없습니다.</p>}
        {clubs.map((club) => {
          const currentPresident = club.president_id ? memberById.get(club.president_id) : undefined;

          return (
            <div key={club.id} className="rounded-card border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-bold text-foreground">
                    {club.name}
                    {club.name_en && <span className="font-medium text-muted-foreground">({club.name_en})</span>}
                    {!club.name_en && (
                      <span className="rounded-full bg-yellow-soft px-2 py-0.5 text-[11px] font-bold text-yellow-dark">
                        영문명 필요
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {club.category} · {club.president_id ? currentPresident?.name ?? "알 수 없음" : "대표자 미지정"}
                  </p>
                </div>
                <ClubStatusBadge status={club.status} />
              </div>

              <form action={updateClubStatus.bind(null, club.id)} className="mt-3 flex items-center gap-2">
                <select
                  name="status"
                  defaultValue={club.status}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {CLUB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CLUB_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
                >
                  상태 변경
                </button>
              </form>

              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-bold text-muted-foreground">동아리 회장 · 페이지 관리 권한</p>
                <form
                  action={updateClubPresident.bind(null, club.id)}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  <select
                    name="president_id"
                    defaultValue={club.president_id ?? ""}
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="">회장 미지정</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} · {ROLE_LABEL[member.role] ?? member.role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-coral px-3 py-1.5 text-sm font-bold text-white hover:opacity-90"
                  >
                    회장 저장
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
