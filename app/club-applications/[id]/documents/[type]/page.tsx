import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PrintButton } from "@/components/admin/print-button";
import {
  DOCUMENT_TYPES,
  APPOINTMENT_METHOD_LABEL,
  LANGUAGE_LABEL,
  formatKDate,
  type DocumentType,
} from "@/lib/application-documents";
import { APPLICATION_MONTHS } from "@/lib/constants/club-application-rules";

type ApplicationRow = {
  id: string;
  applicant_id: string;
  club_name: string;
  club_name_en: string | null;
  registration_category: string;
  language: string | null;
  established_at: string | null;
  purpose: string;
  activity_plan: string;
  monthly_activities: Record<string, string> | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_location: string | null;
  meeting_frequency: string | null;
  president_department: string | null;
  president_student_id: string | null;
  president_contact: string | null;
  treasurer_name: string | null;
  treasurer_name_en: string | null;
  treasurer_department: string | null;
  treasurer_student_id: string | null;
  treasurer_contact: string | null;
  vice_president_name: string | null;
  vice_president_name_en: string | null;
  vice_president_department: string | null;
  vice_president_student_id: string | null;
  vice_president_contact: string | null;
  membership_approval_days: number | null;
  has_membership_fee: boolean;
  membership_fee_amount: number | null;
  membership_fee_cycle: string | null;
  advisor_name: string | null;
  advisor_department: string | null;
  advisor_contact: string | null;
  advisor_email: string | null;
  advisor_appointment_method: string | null;
  advisor_note: string | null;
  created_at: string;
};

type Founder = {
  id: string;
  name: string;
  student_id: string | null;
  contact: string | null;
  department: string | null;
};

export default async function ApplicationDocumentPage(
  props: PageProps<"/club-applications/[id]/documents/[type]">,
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { id, type } = await props.params;
  const docType = type as DocumentType;
  if (!DOCUMENT_TYPES.some((d) => d.type === docType)) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: application } = await supabase
    .from("club_applications")
    .select(
      "id, applicant_id, club_name, club_name_en, registration_category, language, established_at, purpose, activity_plan, monthly_activities, meeting_day, meeting_time, meeting_location, meeting_frequency, president_department, president_student_id, president_contact, treasurer_name, treasurer_name_en, treasurer_department, treasurer_student_id, treasurer_contact, vice_president_name, vice_president_name_en, vice_president_department, vice_president_student_id, vice_president_contact, membership_approval_days, has_membership_fee, membership_fee_amount, membership_fee_cycle, advisor_name, advisor_department, advisor_contact, advisor_email, advisor_appointment_method, advisor_note, created_at",
    )
    .eq("id", id)
    .single<ApplicationRow>();

  if (!application) {
    notFound();
  }

  const canView = profile.role === "super_admin" || profile.id === application.applicant_id;
  if (!canView) {
    redirect("/");
  }

  const { data: president } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", application.applicant_id)
    .single();

  const { data: foundersData } = await supabase
    .from("club_application_founders")
    .select("id, name, student_id, contact, department")
    .eq("application_id", id)
    .returns<Founder[]>();
  const founders = foundersData ?? [];

  const docMeta = DOCUMENT_TYPES.find((d) => d.type === docType)!;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/club-applications/${id}`}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          ← 신청 상세로
        </Link>
        <div className="flex flex-wrap gap-1.5">
          {DOCUMENT_TYPES.map((d) => (
            <Link
              key={d.type}
              href={`/club-applications/${id}/documents/${d.type}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                d.type === docType
                  ? "border-coral bg-coral text-white"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>
        <PrintButton />
      </div>

      <div className="certificate-print-page rounded-card border border-foreground/60 bg-card p-8 sm:p-12">
        {docType === "registration" && (
          <RegistrationDoc application={application} presidentName={president?.name ?? "-"} founders={founders} />
        )}
        {docType === "members" && (
          <MembersDoc application={application} presidentName={president?.name ?? "-"} founders={founders} />
        )}
        {docType === "activity-plan" && <ActivityPlanDoc application={application} />}
        {docType === "constitution" && (
          <ConstitutionDoc application={application} presidentName={president?.name ?? "-"} />
        )}
        {docType === "advisor" && (
          <AdvisorDoc application={application} presidentName={president?.name ?? "-"} />
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground print:hidden">{docMeta.label}</p>
    </main>
  );
}

function DocHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground">서울미디어대학원대학교 원우회</p>
      <h1 className="mt-2 text-2xl font-extrabold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-40 shrink-0 text-xs font-bold text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap text-sm text-foreground">{value}</span>
    </div>
  );
}

function SignatureLine({ role, name }: { role: string; name?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-foreground/40 pb-1 text-sm">
      <span className="font-bold text-foreground">
        {role} {name ? `: ${name}` : ""}
      </span>
      <span className="text-muted-foreground">(서명)</span>
    </div>
  );
}

function RegistrationDoc({
  application,
  presidentName,
  founders,
}: {
  application: ApplicationRow;
  presidentName: string;
  founders: Founder[];
}) {
  return (
    <div>
      <DocHeader title="동아리 등록 신청서" subtitle="Club Registration Application Form (서식1)" />

      <section className="flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">1. 동아리 기본사항 Club Information</h2>
        <Row label="동아리명 (Club Name)" value={`국문: ${application.club_name} / 영문: ${application.club_name_en ?? "-"}`} />
        <Row label="동아리 구분 (Category)" value={application.registration_category} />
        <Row label="사용언어 (Language)" value={LANGUAGE_LABEL[application.language ?? ""] ?? "-"} />
        <Row label="설립일 (Date of Establishment)" value={formatKDate(application.established_at)} />
        <Row label="설립 목적 (Purpose)" value={application.purpose} />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">2. 임원 현황 Executive Members</h2>
        <Row
          label="회장 President"
          value={`${presidentName} / ${application.president_department ?? "-"} / ${application.president_student_id ?? "-"} / ${application.president_contact ?? "-"}`}
        />
        <Row
          label="부회장 Vice President"
          value={
            application.vice_president_name
              ? `${application.vice_president_name} / ${application.vice_president_department ?? "-"} / ${application.vice_president_student_id ?? "-"} / ${application.vice_president_contact ?? "-"}`
              : "해당 없음"
          }
        />
        <Row
          label="총무 Treasurer"
          value={`${application.treasurer_name ?? "-"} / ${application.treasurer_department ?? "-"} / ${application.treasurer_student_id ?? "-"} / ${application.treasurer_contact ?? "-"}`}
        />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">3. 회원 현황 Membership Information</h2>
        <Row label="총 회원 수 Total Members" value={`${founders.length}명`} />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">4. 첨부 서류 Required Documents</h2>
        <p className="text-sm text-foreground">
          동아리 회칙, 회원 명단, 활동 계획서, 지도교수 확인서는 본 시스템에서 함께 자동 생성됩니다.
        </p>
      </section>

      <p className="mt-8 text-sm text-foreground">
        위와 같이 서울미디어대학원대학교 동아리 등록을 신청합니다.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">신청일: {formatKDate(application.created_at)}</p>

      <div className="mt-8">
        <SignatureLine role="동아리대표자 Representative" name={presidentName} />
      </div>
    </div>
  );
}

function MembersDoc({
  application,
  presidentName,
  founders,
}: {
  application: ApplicationRow;
  presidentName: string;
  founders: Founder[];
}) {
  return (
    <div>
      <DocHeader title="동아리 회원 명단" subtitle="Club Member List (서식2)" />
      <Row label="동아리명 (Club Name)" value={`${application.club_name} (${application.club_name_en ?? "-"})`} />
      <Row label="동아리 대표자 (Representative)" value={presidentName} />

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/40 text-left">
            <th className="w-10 py-2 text-xs font-bold text-muted-foreground">No.</th>
            <th className="py-2 text-xs font-bold text-muted-foreground">성명 Name</th>
            <th className="py-2 text-xs font-bold text-muted-foreground">학과·전공 Department</th>
            <th className="py-2 text-xs font-bold text-muted-foreground">학번 Student ID</th>
            <th className="py-2 text-xs font-bold text-muted-foreground">연락처 Contact</th>
          </tr>
        </thead>
        <tbody>
          {founders.map((f, i) => (
            <tr key={f.id} className="border-b border-border">
              <td className="py-1.5 text-foreground">{i + 1}</td>
              <td className="py-1.5 text-foreground">{f.name}</td>
              <td className="py-1.5 text-foreground">{f.department ?? "-"}</td>
              <td className="py-1.5 text-foreground">{f.student_id ?? "-"}</td>
              <td className="py-1.5 text-foreground">{f.contact ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-6 text-sm text-foreground">
        위 명단은 서울미디어대학원대학교 동아리 등록을 위한 회원 명단임을 확인합니다.
      </p>
      <div className="mt-8">
        <SignatureLine role="동아리대표자 Representative" name={presidentName} />
      </div>
    </div>
  );
}

function ActivityPlanDoc({ application }: { application: ApplicationRow }) {
  const meetingInfo = [application.meeting_day, application.meeting_time, application.meeting_location]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <DocHeader title="활동 계획서" subtitle="Activity Plan (서식3)" />
      <Row label="동아리명 (Club Name)" value={`${application.club_name} (${application.club_name_en ?? "-"})`} />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-foreground">주요 활동 목표 Main Goals</h2>
        <p className="whitespace-pre-wrap rounded-md border border-border p-3 text-sm text-foreground">
          {application.activity_plan}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-foreground">월별 활동 계획 Monthly Activity Schedule</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {APPLICATION_MONTHS.map((month) => (
              <tr key={month} className="border-b border-border">
                <td className="w-16 py-1.5 font-bold text-muted-foreground">{month}월</td>
                <td className="py-1.5 text-foreground">{application.monthly_activities?.[month] || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">정기 모임 Regular Meeting</h2>
        <Row label="빈도 (Frequency)" value={application.meeting_frequency ?? "미기재"} />
        <Row label="요일/시간/장소" value={meetingInfo || "미기재"} />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">예산 계획 Budget Plan (해당하는 경우)</h2>
        <Row
          label="회비 수입 (예상)"
          value={
            application.has_membership_fee
              ? `${application.membership_fee_amount?.toLocaleString() ?? "-"}원 / ${application.membership_fee_cycle ?? "-"}`
              : "회비 없음"
          }
        />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">공간 필요 여부</h2>
        <Row label="정기 모임 공간" value={application.meeting_location ? `필요 (${application.meeting_location})` : "필요 없음"} />
      </section>
    </div>
  );
}

function ConstitutionDoc({ application, presidentName }: { application: ApplicationRow; presidentName: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <DocHeader title={`${application.club_name} 회칙`} subtitle={`${application.club_name_en ?? "Club"} Constitution (표준 동아리 회칙 기준)`} />

      <h2 className="text-center text-base font-bold">제 1 장 총칙</h2>
      <p className="mt-3">
        제1조(명칭) 본 동아리의 국문명은 「{application.club_name}」, 영문명은 「{application.club_name_en ?? "-"}」(이하 &quot;본 동아리&quot;)이라 칭한다.
      </p>
      <p className="mt-3">제2조(목적) 본 동아리는 서울미디어대학원대학교 재학생을 중심으로 {application.purpose}을(를) 목적으로 한다.</p>
      <p className="mt-3">제3조(소재) 본 동아리는 서울미디어대학원대학교 내에 둔다.</p>

      <h2 className="mt-6 text-center text-base font-bold">제 2 장 회원</h2>
      <p className="mt-3">
        제4조(회원자격) 1. 정회원: 본교 재학생 2. 준회원: 휴학생 또는 졸업생으로 동아리가 인정한 자. 국적, 언어, 전공에 관계없이 누구나 가입할 수 있다.
      </p>
      <p className="mt-3">
        제5조(가입절차) 회원으로 가입하고자 하는 자는 가입 신청서를 제출하고 임원회의 승인을 받아야 한다. 가입 승인은 특별한 사유가 없는 한{" "}
        {application.membership_approval_days ?? "[ ]"}일 이내에 처리한다.
      </p>
      <p className="mt-3">제6조(회원의 권리) 동아리 활동 참여, 임원 선출·피선출(정회원), 운영 의견 제출의 권리를 가진다.</p>
      <p className="mt-3">제7조(회원의 의무) 회칙 및 학교 규정 준수, 성실한 활동 참여, 회비 납부(정한 경우), 명예 훼손 행위 금지.</p>
      <p className="mt-3">제8조(탈퇴) 회원은 언제든지 탈퇴 의사를 회장에게 통보하여 탈퇴할 수 있다.</p>
      <p className="mt-3">제9조(제명) 명예 훼손, 규정의 중대한 위반, 기타 임원회 인정 사유 시 제명하며, 사전 통지·소명 기회를 부여한다.</p>

      <h2 className="mt-6 text-center text-base font-bold">제 3 장 조직</h2>
      <p className="mt-3">
        제10조(임원구성) 회장 1인(필수), 총무 1인(필수){application.vice_president_name ? ", 부회장 1인(선택)" : ""}을 둔다.
      </p>
      <p className="mt-3">제11조(회장) 회장은 동아리를 대표하며 운영 전반을 총괄한다. 임기는 1년으로 하며, 유고 시 부회장이 직무를 대행한다.</p>
      <p className="mt-3">제12조(총무) 총무는 동아리의 회계 및 행정 업무를 담당한다.</p>
      <p className="mt-3">제13조(임원선출) 임원 선출 방법은 동아리가 자율적으로 정한다.</p>

      <h2 className="mt-6 text-center text-base font-bold">제 4 장 활동</h2>
      <p className="mt-3">제14조(활동원칙) 정치적·종교적 강요, 특정 국적·인종·성별 차별, 학교 명예 훼손, 영리 목적 활동을 금지한다.</p>
      <p className="mt-3">제15조(회의) 정기 모임은 {application.meeting_frequency ?? "[ ]"}로 한다. 필요 시 임시 모임을 열 수 있다.</p>

      <h2 className="mt-6 text-center text-base font-bold">제 5 장 재정</h2>
      <p className="mt-3">제16조(재정) 동아리의 재정은 회비, 지원금 및 기타 수입으로 한다.</p>
      <p className="mt-3">
        제17조(회비){" "}
        {application.has_membership_fee
          ? `회비 있음 — 금액: ${application.membership_fee_amount?.toLocaleString() ?? "-"}원 / ${application.membership_fee_cycle ?? "-"}`
          : "회비 없음"}
      </p>
      <p className="mt-3">제18조(회계관리) 총무는 수입·지출 내역을 기록하고 증빙자료를 보관하며, 회계 내역은 회원에게 공개한다.</p>

      <h2 className="mt-6 text-center text-base font-bold">부칙</h2>
      <p className="mt-3">제1조(시행일) 본 회칙은 {formatKDate(application.established_at)}부터 시행한다.</p>
      <p className="mt-3">제2조(회칙 변경) 회칙을 변경할 경우 회원 과반수 동의 후 원우회에 보고한다.</p>
      <p className="mt-3">제3조(준용) 본 회칙에 규정되지 않은 사항은 서울미디어대학원대학교 동아리 운영규정에 따른다.</p>

      <div className="mt-10 flex flex-col gap-3">
        <SignatureLine role="회장" name={presidentName} />
        <SignatureLine role="총무" name={application.treasurer_name ?? undefined} />
      </div>
    </div>
  );
}

function AdvisorDoc({ application, presidentName }: { application: ApplicationRow; presidentName: string }) {
  return (
    <div>
      <DocHeader title="지도교수 확인서" subtitle="Faculty Advisor Confirmation (서식5)" />

      <section className="flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">1. 동아리 기본사항</h2>
        <Row label="동아리명" value={`${application.club_name} (${application.club_name_en ?? "-"})`} />
        <Row label="동아리 구분" value={application.registration_category} />
        <Row label="작성일" value={formatKDate(application.created_at)} />
        <Row label="회장 성명 / 연락처" value={`${presidentName} / ${application.president_contact ?? "-"}`} />
      </section>

      <section className="mt-6 flex flex-col">
        <h2 className="mb-2 text-sm font-bold text-foreground">2. 지도교수 정보</h2>
        <Row label="성명" value={application.advisor_name ?? "-"} />
        <Row label="소속학과 / 전공" value={application.advisor_department ?? "-"} />
        <Row label="연락처" value={application.advisor_contact ?? "-"} />
        <Row label="이메일" value={application.advisor_email ?? "-"} />
        <Row
          label="선임경위"
          value={APPOINTMENT_METHOD_LABEL[application.advisor_appointment_method ?? ""] ?? "-"}
        />
      </section>

      <section className="mt-6 flex flex-col gap-2">
        <h2 className="mb-1 text-sm font-bold text-foreground">3. 확인 사항</h2>
        <p className="text-xs text-muted-foreground">
          아래 항목은 지도교수 본인이 직접 확인 후 서명해야 하는 항목으로, 인쇄 후 오프라인으로 확인·서명을 받아 원우회에 제출합니다.
        </p>
        <label className="flex items-center gap-2 text-sm">☐ 해당 동아리의 활동 목적과 분야를 확인하였습니다.</label>
        <label className="flex items-center gap-2 text-sm">☐ 동아리 활동에 대한 지도·자문을 담당할 것을 동의합니다.</label>
        <label className="flex items-center gap-2 text-sm">☐ 학교 예산 지원 신청 시 확인 절차에 참여할 것을 동의합니다.</label>
      </section>

      {application.advisor_note && (
        <section className="mt-6">
          <h2 className="mb-1 text-sm font-bold text-foreground">4. 특기사항</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground">{application.advisor_note}</p>
        </section>
      )}

      <p className="mt-8 text-sm text-foreground">위와 같이 지도교수 확인서를 제출합니다.</p>
      <div className="mt-8">
        <SignatureLine role="지도교수" name={application.advisor_name ?? undefined} />
      </div>
      <p className="mt-6 text-sm font-bold text-foreground">서울미디어대학원대학교 원우회 귀중</p>
    </div>
  );
}
