-- Additive News-only migration. Existing Council policies and other tables are untouched.
begin;
alter table public.notices drop constraint notices_source_check;
alter table public.notices add constraint notices_source_check
  check (source in ('student_council', 'school_academic', 'school_news'));
alter table public.notices
  add column title_en text,
  add column title_en_source text,
  add column attachment_names text[] not null default '{}',
  add column has_en_attachment boolean not null default false;
alter table public.news_sync_runs drop constraint news_sync_runs_target_check;
alter table public.news_sync_runs add constraint news_sync_runs_target_check
  check (target in ('school_academic_notice', 'school_news', 'academic_calendar'));
create table public.news_sync_state (
  target text primary key check (target in ('school_academic_notice', 'school_news')),
  next_page integer not null default 2 check (next_page >= 2)
);
alter table public.news_sync_state enable row level security;
create policy "news_sync_state_select_admin" on public.news_sync_state
  for select using (public.is_super_admin());
-- Only the server service role can mutate crawl state.
commit;
