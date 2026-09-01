-- SMIT Club Portal — seed the first real club, 수다(Suda).
--
-- This is a pure data seed: no schema, RLS, or trigger changes. Every column
-- below is populated only from what the user confirmed from the existing
-- (pre-migration) SUDA screens — nothing invented. Facts that don't have a
-- home in the current `clubs` schema (member count, nationality breakdown,
-- 회장/부회장 names) are intentionally left out rather than forcing new
-- columns — they belong in club_memberships/profiles once that data is
-- actually entered through the app, not hardcoded here.
--
-- status: schema only allows preparing/recruiting/active/closed. SUDA is
-- shown as actively taking new members on the old site's public listing, so
-- 'recruiting' is the closest accurate value (not 'active', which would
-- read as "no longer open to new members").
--
-- meeting_day is a free-text column, not literally a weekday — used here to
-- hold the "주요 활동" line as given, since that's the closest existing
-- column for schedule/activity info and there's no separate weekday/time
-- given in the source material (so meeting_time/meeting_location stay NULL).
--
-- on conflict (slug) do nothing: safe to re-run this file without creating
-- a duplicate row.

insert into public.clubs (
  name,
  name_en,
  slug,
  category,
  status,
  description,
  cover_image_url,
  meeting_day
) values (
  '수다',
  'Suda',
  'suda',
  '문화교류',
  'recruiting',
  '한국인 원우들과 함께하는 한국어 말하기 동아리. 일상 대화부터 발표 연습까지 자연스럽게 한국어 실력을 키워요.',
  '/clubs/suda.png',
  '주 1회 정기 모임 · 주제 토론 · 한국 문화 체험'
)
on conflict (slug) do nothing;
