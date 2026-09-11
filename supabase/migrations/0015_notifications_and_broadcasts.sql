-- SMIT Club Portal — extend the existing notifications table (0005) with the
-- new event types this task adds, and add an audit table for super_admin's
-- manually targeted "알림 보내기" broadcasts.
--
-- The notifications table itself, its RLS (own row select/update only), and
-- the /notifications UI already existed and are reused as-is — this
-- migration only widens the `type` check constraint (Postgres auto-named it
-- notifications_type_check since it was declared inline in 0005) and adds a
-- new table.
--
-- notification_broadcasts is deliberately separate from notifications: it is
-- the sender-side audit record (who sent it, when, to what scope) for a
-- super_admin's manually targeted notification, distinct from the public
-- "공지" (announcements) feature, which stays mock/unimplemented and
-- untouched. Each broadcast still fans out into one row per recipient in
-- notifications (type='admin_broadcast') via the app's existing per-user
-- select/read RLS — this table is not itself readable by recipients.

begin;

alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'application_review_requested',
    'application_approved',
    'application_rejected',
    'application_needs_revision',
    'application_submitted',
    'membership_applied',
    'membership_approved',
    'membership_rejected',
    'admin_broadcast'
  )
);

create table public.notification_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id),
  title text not null,
  body text,
  link text,
  target_scope text not null check (
    target_scope in ('all_students', 'all_presidents', 'club_president', 'single_student')
  ),
  target_club_id uuid references public.clubs (id),
  target_user_id uuid references public.profiles (id),
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.notification_broadcasts enable row level security;

create policy "notification_broadcasts_select_admin" on public.notification_broadcasts
  for select using (public.is_super_admin());

create policy "notification_broadcasts_insert_admin" on public.notification_broadcasts
  for insert with check (public.is_super_admin() and sender_id = auth.uid());

commit;
