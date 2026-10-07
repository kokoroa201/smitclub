-- Add bilingual public club content only. Existing RLS, guards, roles and
-- application requirements remain unchanged. Korean content is not updated.
begin;

-- name/name_en and description/description_en already exist on clubs.
alter table public.clubs
  add column if not exists activities_en text,
  add column if not exists recruiting_post_en text,
  add column if not exists meeting_day_en text,
  add column if not exists meeting_location_en text;

-- Existing required purpose/activity_plan fields remain the base language.
-- English public content is optional; existing applications remain valid.
alter table public.club_applications
  add column if not exists purpose_en text,
  add column if not exists activity_plan_en text,
  add column if not exists meeting_day_en text,
  add column if not exists meeting_location_en text;

-- SUDA public-content snapshot verified by read-only GET on 2026-10-07.
-- Fill English values only; preserve all Korean content and existing English edits.
-- Blank meeting/recruitment fields remain blank rather than inventing content.
update public.clubs
set description_en = case when nullif(btrim(description_en), '') is null
      then 'Practice Korean with Korean students through casual conversations, group discussions, and presentation activities.'
      else description_en end,
    activities_en = case when nullif(btrim(activities_en), '') is null
      then 'Weekly meetings · Group discussions · Korean cultural experiences'
      else activities_en end
where slug = 'suda'
  and description = '한국인 원우들과 함께하는 한국어 말하기 동아리. 일상 대화부터 발표 연습까지 자연스럽게 한국어 실력을 키워요.'
  and activities = '주 1회 정기 모임 · 주제 토론 · 한국 문화 체험';

commit;
