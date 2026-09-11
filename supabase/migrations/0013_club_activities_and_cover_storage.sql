-- SMIT Club Portal — split "주요 활동" out of meeting_day, and let club
-- presidents upload a cover photo file instead of pasting a URL.
--
-- Context: 0003_seed_suda_club.sql intentionally stuffed the "주요 활동" text
-- into meeting_day because there was no dedicated column yet (see that
-- file's own comment). That surfaced as a real bug in the president
-- self-service UI at /my/club — the "요일" field showed a full sentence
-- instead of an actual weekday. This migration adds the missing `activities`
-- column and moves any club's meeting_day that reads as an activities blurb
-- (contains a middle-dot separator, or is unusually long for a weekday) over
-- to it. No data is dropped; meeting_day/meeting_time/meeting_location stay
-- available for clubs that have a real recurring-meeting day/time/place.
--
-- It also adds Storage support for uploaded cover photos: a public bucket
-- plus RLS so only a club's own president (or super_admin/service_role) can
-- write files under that club's folder — reusing the existing
-- is_club_president() helper from 0001, the same helper the rest of the
-- schema already uses for this exact check.

begin;

alter table public.clubs
  add column activities text;

update public.clubs
set activities = meeting_day,
    meeting_day = null
where meeting_day is not null
  and (meeting_day like '%·%' or length(meeting_day) > 20);

insert into storage.buckets (id, name, public)
values ('club-covers', 'club-covers', true)
on conflict (id) do nothing;

-- Path convention: club-covers/<club_id>/<filename>. storage.foldername(name)
-- splits the object path into an array of folder segments, so element 1 is
-- the club id the file belongs to.
create policy "club_covers_public_read" on storage.objects
  for select
  using (bucket_id = 'club-covers');

create policy "club_covers_president_write" on storage.objects
  for insert
  with check (
    bucket_id = 'club-covers'
    and (
      public.is_super_admin()
      or public.is_club_president((storage.foldername(name))[1]::uuid)
    )
  );

create policy "club_covers_president_update" on storage.objects
  for update
  using (
    bucket_id = 'club-covers'
    and (
      public.is_super_admin()
      or public.is_club_president((storage.foldername(name))[1]::uuid)
    )
  )
  with check (
    bucket_id = 'club-covers'
    and (
      public.is_super_admin()
      or public.is_club_president((storage.foldername(name))[1]::uuid)
    )
  );

create policy "club_covers_president_delete" on storage.objects
  for delete
  using (
    bucket_id = 'club-covers'
    and (
      public.is_super_admin()
      or public.is_club_president((storage.foldername(name))[1]::uuid)
    )
  );

commit;
