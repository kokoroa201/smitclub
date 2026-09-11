-- SMIT Club Portal — turn on the join-request flow for club_memberships.
--
-- The table, indexes, and row-level RLS policies for club_memberships
-- already exist from 0001 (a student applies for themself; the club's
-- president or a super admin reviews) — this project just never shipped the
-- UI that uses them. Two gaps remain before that table is safe to write to
-- from the new /clubs/[slug]/join and /my/club review screens:
--
--   1) club_memberships_insert_own (0001) only checks user_id = auth.uid().
--      Nothing stops a student's own insert from setting status='approved'
--      straight away, or from applying to a club that is 'preparing'/
--      'closed'. Mirrors enforce_application_admin_fields_guard's pattern
--      for club_applications.
--   2) club_memberships_update_review (0001) lets any club president update
--      any column on any membership row in their club — including
--      user_id/club_id/motivation, or flipping status back and forth. This
--      adds the same column-guard-trigger pattern 0012 used for clubs: a
--      president may only move a row from 'applied' to 'approved'/
--      'rejected' and must stamp their own reviewed_by/reviewed_at.
--
-- super_admin/service_role are exempt, same as every other guard trigger in
-- this schema.

begin;

create or replace function public.enforce_club_membership_review_guard()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'applied' or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'insufficient privilege to set review fields on insert';
    end if;

    if not exists (select 1 from public.clubs where id = new.club_id and status = 'recruiting') then
      raise exception 'club is not currently recruiting';
    end if;

    return new;
  end if;

  if new.club_id is distinct from old.club_id
    or new.user_id is distinct from old.user_id
    or new.motivation is distinct from old.motivation
    or new.applied_at is distinct from old.applied_at then
    raise exception 'insufficient privilege to modify application fields';
  end if;

  if old.status <> 'applied' or new.status not in ('approved', 'rejected') then
    raise exception 'membership can only be reviewed from applied to approved or rejected';
  end if;

  if new.reviewed_by is distinct from auth.uid() or new.reviewed_at is null then
    raise exception 'reviewed_by must be the reviewing president and reviewed_at must be set';
  end if;

  return new;
end;
$$;

create trigger club_memberships_review_guard
before insert or update on public.club_memberships
for each row execute function public.enforce_club_membership_review_guard();

commit;
