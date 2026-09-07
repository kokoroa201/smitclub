import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getApprovalNumber } from "@/lib/certificate";
import { PrintButton } from "@/components/admin/print-button";

type ApplicationDetail = {
  id: string;
  applicant_id: string;
  club_name: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default async function ClubApplicationCertificatePage(
  props: PageProps<"/club-applications/[id]/certificate">,
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { id } = await props.params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select("id, applicant_id, club_name, status, admin_note, created_at, reviewed_at")
    .eq("id", id)
    .single<ApplicationDetail>();

  if (!application) {
    notFound();
  }

  const canView = profile.role === "super_admin" || profile.id === application.applicant_id;
  if (!canView) {
    redirect("/");
  }

  if (application.status !== "approved" || !application.reviewed_at) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">아직 승인이 완료되지 않은 신청입니다.</p>
      </main>
    );
  }

  const { data: applicant } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", application.applicant_id)
    .single();

  const approvalNumber = getApprovalNumber(application.id, application.reviewed_at);
  const submittedDate = new Date(application.created_at).toLocaleDateString("ko-KR");
  const approvedDate = new Date(application.reviewed_at).toLocaleDateString("ko-KR");
  const issuedDate = new Date().toLocaleDateString("ko-KR");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← 홈으로
        </Link>
        <PrintButton />
      </div>

      <div className="certificate-print-page rounded-card border-2 border-foreground/80 bg-card p-10 sm:p-14">
        <p className="text-center text-sm font-bold tracking-[0.3em] text-muted-foreground">
          SMIT 원우회
        </p>
        <h1 className="mt-3 text-center text-3xl font-extrabold text-foreground">
          SMIT 원우회 동아리 승인서
        </h1>

        <div className="mt-10 flex flex-col gap-4 text-sm">
          <Row label="동아리명" value={application.club_name} />
          <Row label="대표자" value={applicant?.name ?? "알 수 없음"} />
          <Row label="신청일" value={submittedDate} />
          <Row label="승인일" value={approvedDate} />
          <Row label="승인번호" value={approvalNumber} mono />
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold text-muted-foreground">승인 내용</p>
          <p className="mt-2 rounded-md border border-border p-4 text-sm leading-relaxed text-foreground">
            위 동아리는 SMIT 원우회 동아리 등록 요건을 충족하여 개설을 승인합니다.
            {application.admin_note ? `\n\n${application.admin_note}` : ""}
          </p>
        </div>

        <div className="mt-14 flex items-end justify-between">
          <div className="text-xs text-muted-foreground">
            <p>발급기관: SMIT 원우회</p>
            <p className="mt-1">발급일: {issuedDate}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-bold text-foreground">SMIT 원우회</p>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-[10px] text-muted-foreground">
              (직인)
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="font-bold text-muted-foreground">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
