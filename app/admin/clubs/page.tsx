import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ClubStatusBadge, CLUB_STATUS_LABEL } from "@/components/admin/status-badge";
import { updateClubStatus } from "@/lib/actions/admin-clubs";

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

export default async function AdminClubsPage(props: PageProps<"/admin/clubs">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from("clubs")
    .select("id, name, name_en, category, status, president_id, created_at")
    .order("created_at", { ascending: false });

  const clubs = (data ?? []) as ClubRow[];

  const presidentIds = [...new Set(clubs.map((c) => c.president_id).filter((id): id is string => Boolean(id)))];
  const { data: presidents } = presidentIds.length
    ? await supabase.from("profiles").select("id, name").in("id", presidentIds)
    : { data: [] as { id: string; name: string }[] };
  const presidentNameById = new Map((presidents ?? []).map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">동아리 관리</h1>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {clubs.length === 0 && <p className="text-sm text-muted-foreground">등록된 동아리가 없습니다.</p>}
        {clubs.map((club) => (
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
                  {club.category} · {club.president_id ? presidentNameById.get(club.president_id) ?? "알 수 없음" : "대표자 미지정"}
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
          </div>
        ))}
      </div>
    </main>
  );
}
