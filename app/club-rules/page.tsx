import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { CLUB_RULE_DOCS, clubRuleFileHref, type ClubRuleDocKey } from "@/lib/constants/club-rules-documents";
import { APPLICATION_STEPS, ELIGIBILITY_ITEMS, PROCESSING_TIMELINE } from "@/lib/constants/club-application-rules";

// 절차 카드 배경 — 번호·아이콘 없이 카드 배경색만으로 5단계를 구분한다.
// 전부 이미 프로젝트에 있는 -soft 파스텔 토큰(app/globals.css)을 그대로
// 재사용한다: 크림(yellow-soft) · 하늘색(blue-soft) · 라벤더(purple-soft) ·
// 민트(mint-soft) · 피치·블러시(coral-soft).
const PROCEDURE_CARD_TONES = ["bg-yellow-soft", "bg-blue-soft", "bg-purple-soft", "bg-mint-soft", "bg-coral-soft"];

// 로그인 여부와 무관하게 누구나 열람할 수 있는 공개 페이지 — RootLayout이
// profile이 없어도 헤더/푸터를 그대로 렌더링하므로 여기서 별도 인증 검사를
// 하지 않는다(다른 공개 페이지인 /clubs, /news와 동일한 방식).
export default async function ClubRulesPage(props: PageProps<"/club-rules">) {
  const searchParams = await props.searchParams;
  const docParam = typeof searchParams.doc === "string" ? searchParams.doc : "";
  const activeKey: ClubRuleDocKey = CLUB_RULE_DOCS.some((doc) => doc.key === docParam)
    ? (docParam as ClubRuleDocKey)
    : CLUB_RULE_DOCS[0].key;
  const activeDoc = CLUB_RULE_DOCS.find((doc) => doc.key === activeKey)!;

  const pdfHref = clubRuleFileHref(activeDoc.baseName, "pdf");
  const hwpHref = clubRuleFileHref(activeDoc.baseName, "hwp");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      {/* Hero — /news, /clubs가 실제로 쓰는 컨테이너를 그대로 재사용한다
          (components/common/page-hero.tsx). 높이·라운드·좌우 여백·텍스트
          크기를 이 페이지에서 따로 정의하지 않음으로써, 세 페이지의 hero가
          다시 벌어지지 않게 한다. 이미지가 가로로 매우 넓은 편(2103×748)
          이라 object-position을 살짝 오른쪽으로 당겨서, 모바일처럼 좁게
          잘릴 때도 왼쪽 텍스트 여백과 오른쪽 바인더가 함께 보이게 한다. */}
      <PageHero
        src="/img/club_rules.png"
        title="동아리 안내 및 규정"
        description="동아리 개설 절차와 운영에 필요한 규정·표준 회칙을 확인하세요."
        objectPosition="60% 48%"
      />

      {/* 동아리 개설 절차 — 번호 배지·아이콘·세로 타임라인 없이, 카드
          배경색만으로 5단계를 구분한다. 넓은 데스크톱(xl)에서만 5개를
          한 줄로 두고, 그 아래로는 2~3열로 줄여 글자가 지나치게 좁은
          칸에서 여러 줄로 쪼개지지 않게 한다. hero 아래 여백은 /news,
          /clubs의 hero 바로 아래 첫 줄과 동일하게 mt-5 sm:mt-6을 쓴다. */}
      <section className="mt-5 sm:mt-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">동아리 개설 절차</h2>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          아이디어 구상부터 공식 활동 시작까지, 5단계로 진행됩니다.
        </p>

        {/* 모바일 카드 패딩만 좁힌다(세로 16px·가로 20px) — 태블릿(sm)부터는
            기존 설계 그대로 p-5(20px 균등)를 유지한다. */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {APPLICATION_STEPS.map((step, index) => (
            <div key={step.title} className={`rounded-xl px-5 py-4 sm:p-5 ${PROCEDURE_CARD_TONES[index]}`}>
              <p className="font-bold text-navy">{step.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-navy/70">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 신청 자격 · 처리 일정 · CTA · 문서 열람 — 위 절차 그리드보다 읽기
          좋은 폭으로 좁혀서(max-w-3xl) 본문처럼 차분하게 보이게 한다. */}
      <div className="mx-auto mt-8 w-full max-w-3xl sm:mt-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-xl border border-purple-soft bg-white p-4 sm:p-5">
            <h3 className="text-sm font-bold text-foreground">신청 자격</h3>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              {ELIGIBILITY_ITEMS.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span aria-hidden>·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-purple-soft bg-white p-4 sm:p-5">
            <h3 className="text-sm font-bold text-foreground">처리 일정</h3>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
              {PROCESSING_TIMELINE.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          href="/clubs/new"
          className="mt-5 inline-flex w-fit items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
        >
          온라인으로 동아리 개설 신청하기
        </Link>

        {/* 문서 열람 영역 — 구분선으로 위 절차/CTA와 분리하고, 제목 톤을
            한 단계 낮춰(muted-foreground) 절차 섹션보다 차분하게 둔다.
            PDF 뷰어·HWP/PDF 다운로드·탭 기능은 기존 그대로 유지. */}
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-bold text-muted-foreground">동아리 운영규정 · 표준 동아리 회칙</h2>

          <div className="mt-4 flex gap-2">
            {CLUB_RULE_DOCS.map((doc) => (
              <Link
                key={doc.key}
                href={`/club-rules?doc=${doc.key}`}
                scroll={false}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  activeKey === doc.key
                    ? "bg-coral text-white"
                    : "border border-border bg-white text-muted-foreground hover:bg-muted"
                }`}
              >
                {doc.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-6">
            <h3 className="text-lg font-bold text-foreground">{activeDoc.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{activeDoc.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={pdfHref}
                download={`${activeDoc.baseName}.pdf`}
                className="rounded-full bg-coral px-3.5 py-1.5 text-sm font-bold text-white transition-colors hover:bg-coral-dark"
              >
                PDF 다운로드
              </a>
              <a
                href={hwpHref}
                download={`${activeDoc.baseName}.hwp`}
                className="rounded-full border border-border px-3.5 py-1.5 text-sm font-bold text-foreground hover:bg-muted"
              >
                HWP 다운로드
              </a>
            </div>

            <div className="mt-5 overflow-hidden rounded-md border border-border bg-muted/40">
              {/* 대부분의 데스크톱 브라우저는 iframe 안에서 PDF를 바로 렌더링한다.
                  내장 뷰어가 없는 환경(일부 모바일 브라우저 등)을 위해 위 다운로드
                  버튼과 아래 안내 문구를 함께 둔다. */}
              <iframe key={activeKey} src={pdfHref} title={`${activeDoc.label} PDF`} className="h-[75vh] w-full" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              PDF가 화면에 보이지 않으면 위 &ldquo;PDF 다운로드&rdquo; 버튼으로 내려받아 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
