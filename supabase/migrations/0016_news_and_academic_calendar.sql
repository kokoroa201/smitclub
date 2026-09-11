-- SMIT Club Portal — 소식(공지/학사일정) 기능.
--
-- 기존 "notices" 개념은 lib/mock/notices.ts의 순수 mock 배열뿐이었고 실제
-- 테이블은 없었다(app/admin/notices/page.tsx도 그 mock을 보여주기만 하는
-- 자리표시자였음). 그래서 이 마이그레이션이 처음으로 실제 테이블을 만든다 —
-- "기존 구조 재사용"은 mock의 필드 아이디어(출처 구분, 제목, 날짜)를 이어받되
-- 이번 기능이 요구하는 필드(본문/요약/원문링크/외부 ID/작성자)로 확장한
-- 것이다.
--
-- 세 테이블:
--   1) notices — 원우회 공지(student_council, 관리자 화면에서 직접 작성) +
--      학교 학사공지(school_academic, 매일 서버 배치로만 채워짐)를 한 테이블에
--      source 컬럼으로 구분해 담는다. 학사공지는 브라우저에서 절대 수정·삭제
--      할 수 없다 — RLS의 update/delete 정책이 source='student_council'
--      행에만 걸려 있고, service_role(배치 작업)은 RLS 자체를 우회하므로
--      두 경로가 서로 침범하지 않는다.
--   2) academic_calendar_events — 학사일정. 브라우저(anon/authenticated)용
--      insert/update/delete 정책을 아예 두지 않아 RLS 기본값(거부)에 따라
--      service_role만 쓸 수 있다.
--   3) news_sync_runs — 관리자 화면에 "최근 동기화 시각/가져온 건수/오류
--      상태"를 보여주기 위한 배치 실행 로그. super_admin만 조회 가능.
--
-- 기존 notifications 테이블/RLS/트리거는 전혀 건드리지 않는다.

begin;

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('student_council', 'school_academic')),
  title text not null,
  body text,
  summary text,
  source_url text,
  published_at timestamptz not null default now(),
  external_id text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

alter table public.notices enable row level security;

create index notices_published_at_idx on public.notices (published_at desc);

create policy "notices_select_public" on public.notices
  for select using (true);

-- 원우회 공지만 관리자 화면(super_admin, 일반 로그인 세션)에서 쓸 수 있다.
-- 학사공지(source='school_academic')는 이 정책들이 걸리지 않으므로 일반
-- 세션으로는 절대 insert/update/delete가 불가능하고, 오직 서비스 롤(배치
-- 작업)만 넣을 수 있다.
create policy "notices_insert_council" on public.notices
  for insert with check (public.is_super_admin() and source = 'student_council');

create policy "notices_update_council" on public.notices
  for update
  using (public.is_super_admin() and source = 'student_council')
  with check (public.is_super_admin() and source = 'student_council');

create policy "notices_delete_council" on public.notices
  for delete using (public.is_super_admin() and source = 'student_council');

create table public.academic_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_on date not null,
  ends_on date,
  source_url text,
  external_id text unique,
  created_at timestamptz not null default now()
);

alter table public.academic_calendar_events enable row level security;

create index academic_calendar_events_starts_on_idx on public.academic_calendar_events (starts_on);

create policy "academic_calendar_events_select_public" on public.academic_calendar_events
  for select using (true);

-- insert/update/delete 정책 없음 = RLS 기본 거부. anon/authenticated는 절대
-- 쓸 수 없고, 서비스 롤(배치 작업)만 채운다.

create table public.news_sync_runs (
  id uuid primary key default gen_random_uuid(),
  target text not null check (target in ('school_academic_notice', 'academic_calendar')),
  status text not null check (status in ('success', 'error')),
  fetched_count int not null default 0,
  error_message text,
  ran_at timestamptz not null default now()
);

alter table public.news_sync_runs enable row level security;

create index news_sync_runs_target_ran_at_idx on public.news_sync_runs (target, ran_at desc);

create policy "news_sync_runs_select_admin" on public.news_sync_runs
  for select using (public.is_super_admin());

commit;
