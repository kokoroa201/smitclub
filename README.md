This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 동아리 한/영 공개 콘텐츠 배포

- 새 동아리 코드를 배포하기 전에 `supabase/migrations/0018_club_public_content_i18n.sql`을 적용합니다. 이 SQL은 공개 콘텐츠의 영문 컬럼만 추가하며 기존 회원가입/로그인·신청조건·회칙·권한·RLS는 변경하지 않습니다. 이미 적용된 0017은 다시 실행하지 않습니다.
- 기존 `name/name_en`, `description/description_en`을 재사용합니다. 각 locale의 값이 없으면 다른 언어 값을 표시합니다. 번역 API나 별도 KO/EN 페이지·DB는 사용하지 않습니다.
- 개설 신청의 선택 영문 목적·활동 목표·모임 요일·장소는 승인 시 동아리 공개 콘텐츠로 전달됩니다. 기존 필수 항목과 회원 구성 요건은 그대로입니다. 개인정보·학번·연락처·지도교수 정보의 번역 컬럼은 추가하지 않습니다.
- SUDA 회장은 `/my/club`에서 기존 한국어 소개를 유지하면서 영문 소개만 입력할 수 있습니다. 소개·활동·모집글·요일·장소를 한/영으로 관리하며, 동아리명 등 기존 관리자 전용 항목의 변경 제한은 유지합니다.
- 로컬 확인: `npm run lint`, `npm run build`, `node --test scripts/test-clubs.mjs scripts/test-news.mjs`. 동아리 테스트는 실제 컴포넌트 렌더링과 서버 액션을 mock DB로 검증하므로 Production 신청이나 데이터 변경이 발생하지 않습니다.
- SQL 적용 후 코드 배포 → KO/EN 목록·상세·Join 확인 → 동아리 안내·개설 신청 확인 → SUDA 영문 소개 입력 순서로 점검합니다. 실제 가입/개설 제출은 운영자 테스트 계정으로 확인합니다.

## News 운영 및 배포 순서

News는 `공지사항 | 학교소식 | 학사일정` / `Notices | School News | Academic Calendar`로 구성합니다.
공지사항의 전체/원우회/학사 필터는 학교소식을 포함하지 않습니다. 홈의 최근 공지도 같은 구분을 유지합니다.

1. Production Supabase에는 `supabase/migrations/0017_school_news_and_english_titles.sql`이 이미 적용되어 있습니다. 재실행하거나 되돌리지 않습니다. 별도 환경에서는 새 코드 배포 전에 migration 적용 여부를 확인합니다.
2. 이 migration은 News 테이블의 출처·동기화 대상 제약을 확장하고 영문 제목·첨부 메타데이터·수집 위치를 추가합니다. 기존 데이터를 지우지 않으며, Council RLS와 가입/로그인/회원/동아리 테이블·정책은 변경하지 않습니다. 기존 앱은 이 확장된 DB에서도 동작합니다.
3. Vercel Production 환경의 기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` 설정을 확인합니다. 개인 OpenAI 계정이나 유료 외부 번역 API는 필요하지 않습니다. 서버 비밀 키에는 `NEXT_PUBLIC_`를 붙이지 않습니다.
4. 코드를 배포합니다. 새 화면은 신규 DB 컬럼을 조회하므로 **migration보다 코드를 먼저 배포하지 마세요.** Vercel 함수의 300초 실행시간 설정이 적용되는지 확인합니다. 학교 접근은 기존 서울 리전(`icn1`)을 유지합니다.
5. super_admin으로 `/admin/notices`의 **지금 동기화**를 실행합니다. 학사공지/학교소식/학사일정 세 대상의 실행 시각·건수·오류를 확인합니다.
6. Vercel Production Cron이 활성화되어 있고 `/api/cron/sync-news`를 하루 2회(한국 시간 09:00, 13:00) 호출하는지 확인합니다. Vercel은 `CRON_SECRET`을 Authorization Bearer 헤더로 전달합니다. 일반 브라우저 요청은 401이어야 합니다. 실제 실행은 배포 후 Vercel 로그와 관리자 실행 기록으로 확인해야 합니다.

### 자동 운영 방식

- Academic: `https://smit.ac.kr/bbs/board.php?bo_table=notice`를 계속 수집합니다.
- School News: `https://smit.ac.kr/eng/bbs/board.php?bo_table=news`를 별도 `school_news` 출처로 수집합니다. 제목·날짜·게시물 ID·원문 URL을 수집하며, 한/영 화면 모두 수집한 원제목을 표시합니다. 공식 영문 경로에 한국어 제목이 있더라도 그대로 유지합니다.
- 매 회차 첫 페이지와 과거 페이지 최대 2개를 가져옵니다. `news_sync_state.next_page`에서 이어가며 마지막 페이지에 도달하면 다시 2페이지부터 순회합니다. 초기에는 최근 3페이지가 들어오고 이후 과거 자료가 자동으로 채워집니다. 장기 중단 후 누락이나 과거 글 변경도 순회하면서 반영됩니다.
- `(source, external_id)` upsert로 중복을 방지합니다. 목록·상세·저장 실패 시 기존 데이터는 삭제하지 않습니다. 상세 실패 시 기존 요약·첨부 판별을 유지하고 과거 페이지 위치를 진행하지 않습니다.
- 학사공지는 한국어 화면에서 원제목과 요약을 표시합니다. 영어 화면은 저장된 `title_en`이 유효하면 사용하고, 없으면 원제목을 표시합니다. 제목 변경 시 기존 번역을 무효화합니다. DB의 영문 제목 컬럼은 향후 운영을 위해 유지하지만, 수집과 화면 요청에서 번역 API를 호출하지 않습니다.
- 영어 학교 게시글은 제목·날짜·원문 링크 중심으로 보여줍니다. Academic의 View Original은 `/eng/`가 아닌 공식 한국어 학사공지 URL입니다.
- 첨부 다운로드 링크의 파일명에 `[Kor Eng]`, `English`, `ENG`, `EN-KR`, `영문`, `한·영` 같은 명확한 표식이 있으면 배지를 표시합니다. 파일을 내려받거나 내용을 판독하지 않습니다. 영어 단어가 포함됐다는 이유만으로 판별하지 않으며, 표식 없는 영문 자료는 놓칠 수 있습니다.
- 세 대상은 독립적으로 수집하며 기록은 `news_sync_runs`에 남깁니다. 저장·수집 오류가 있으면 cron은 HTTP 500, 상세 경고만 있으면 200과 warning을 반환합니다. 경고는 관리자 화면에서 확인합니다. 별도 자동 이메일 경보는 없습니다.
- 오픈 후 되돌릴 경우 이전 앱 버전으로 배포를 되돌리고 추가 DB 컬럼은 그대로 둡니다. DB를 역방향으로 삭제할 필요가 없습니다.

### 로컬 검증 및 오픈 전 확인

```bash
npm run lint
npm run build
node --test scripts/test-news.mjs
# 외부 학교 사이트 읽기만 수행하는 선택 검사(DB 쓰기·번역 API 호출 없음)
node scripts/test-news.mjs --live
```

Windows PowerShell 실행 정책으로 `npm.ps1`이 막히면 `npm.cmd`를 사용합니다.

- 한국어/영어의 세 탭, All/Council/Academic 필터와 학교소식 분리.
- 영어 Academic 제목, 한국어 요약 숨김, View Original의 공식 한국어 공지 연결.
- `[Kor Eng]` 졸업트랙 변경 신청 공지(`wr_id=1541`) 등에서 첨부 배지.
- 학사일정 이전/다음 달 이동, 기존 Council 작성/수정/삭제와 상세 보기.
- 모바일/큰 글씨 모드에서 탭·제목·배지·원문 링크 표시.
- 로그인/로그아웃, 회원 화면, 동아리 목록/상세/신청의 기존 흐름.
- 관리자 수동 동기화 두 번 후 중복 글이 없는지, 실제 다음 cron 기록이 생기는지.

Production의 `0017`은 적용 완료 상태이므로 다시 실행하거나 되돌리지 않습니다. 운영 환경 설정, 운영 cron 실행 및 브라우저 동작은 정적 빌드나 mock 테스트만으로 확인되지 않습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
