-- Krama — Supabase schema.
-- Run this once in your Supabase project's SQL Editor.

-- ---------------------------------------------------------------------------
-- STAGE 1 — shared sync between your own devices (what the prototype uses today)
-- ---------------------------------------------------------------------------
-- The whole plan is stored as a single JSON row. Simple, and it means the app
-- never has to migrate a schema when the plan shape changes.

create table if not exists plan (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table plan enable row level security;

-- WARNING: this policy lets ANYONE holding the anon key read and write the plan.
-- That is acceptable while the URL and key live only on your and your father's
-- devices. It is NOT acceptable once the app sits on a public subdomain.
create policy "anon full access (prototype only)"
  on plan for all
  using (true)
  with check (true);

create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists plan_touch on plan;
create trigger plan_touch before update on plan
  for each row execute function touch_updated_at();


-- ---------------------------------------------------------------------------
-- STAGE 2 — before this goes on a public subdomain
-- ---------------------------------------------------------------------------
-- Turn on Supabase Auth (email magic link), invite exactly two accounts, then
-- REPLACE the policy above with the two below and drop the anon one:
--
--   drop policy "anon full access (prototype only)" on plan;
--
--   create policy "signed-in users can read the plan"
--     on plan for select to authenticated using (true);
--
--   create policy "signed-in users can write the plan"
--     on plan for all to authenticated using (true) with check (true);
--
-- With those in place an anon key on its own can do nothing — a caller has to
-- present a valid session belonging to one of the two invited accounts.
--
-- The app change that goes with it: swap the raw fetch() calls in app.js for
-- supabase-js, add a magic-link sign-in screen, and send the session token as
-- the Authorization header instead of the anon key.
