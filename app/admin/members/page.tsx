import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { updateMemberRole } from "@/lib/actions/admin-members";

const ROLE_LABEL: Record<string, string> = {
  student: "학생",
  club_admin: "동아리장",
  super_admin: "관리자",
  council_president: "원우회장",
  council_vice_president: "원우회 부회장",
  academic_staff: "교학처 담당자",
};

const ROLE_BADGE: Record<string, string> = {
  student: "bg-muted text-muted-foreground",
  club_admin: "bg-blue-soft text-blue-dark",
  super_admin: "bg-coral-soft text-coral-dark",
  council_president: "bg-purple-soft text-purple-dark",
  council_vice_president: "bg-purple-soft text-purple-dark",
  academic_staff: "bg-yellow-soft text-yellow-dark",
};

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABEL);

type ProfileRow = {
  id: string;
  name: string;
  role: string;
  created_at: string;
};

export default async function AdminMembersPage() {
  const currentProfile = await getCurrentProfile();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("profiles")
    .select("id, name, role, created_at")
    .order("created_at", { ascending: false });

  const members = (data ?? []) as ProfileRow[];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">회원 관리</h1>
        <p className="text-sm text-muted-foreground">전체 {members.length}명</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        원우회장·부회장·교학처 담당자 역할을 지정하면 개설 신청 검토 요청 알림을 받을 수 있습니다.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {members.length === 0 && <p className="text-sm text-muted-foreground">회원이 없습니다.</p>}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-2 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{member.name}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_BADGE[member.role] ?? "bg-muted text-muted-foreground"}`}>
                {ROLE_LABEL[member.role] ?? member.role}
              </span>
            </div>

            {currentProfile?.id !== member.id && (
              <form action={updateMemberRole.bind(null, member.id)} className="flex items-center gap-2">
                <select
                  name="role"
                  defaultValue={member.role}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
                >
                  변경
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
