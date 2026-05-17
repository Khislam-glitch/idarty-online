# إدارتي أونلاين — Production Setup Guide

## Project structure
```
project/
├── src/                   # Source files (commit these)
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── script.js          # Contains %%PLACEHOLDER%% tokens
│   └── style.css
├── dist/                  # Build output (auto-generated, git-ignored)
├── build.sh               # Injects env vars src/ → dist/
├── netlify.toml           # Netlify config: build command, headers, redirects
├── .env                   # LOCAL secrets (git-ignored — never commit!)
├── .gitignore
└── README.md
```

---

## 1 · Supabase setup

Run this SQL in your Supabase project → SQL Editor:

```sql
-- Profiles table (one row per user)
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  username  text,
  email     text,
  role      text not null default 'user',   -- 'user' | 'admin'
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Requests table
create table if not exists public.requests (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  user_name   text,
  type        text not null,
  details     text,
  status      text not null default 'pending',  -- pending | approved | rejected
  created_at  timestamptz default now()
);

-- Enable RLS
alter table public.requests enable row level security;
create policy "Users insert own requests"
  on public.requests for insert with check (auth.uid() = user_id);
create policy "Users read own requests"
  on public.requests for select using (auth.uid() = user_id);

-- Admins read and update all requests
create policy "Admins manage all requests"
  on public.requests for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- To make a user an admin, run:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## 2 · Local development

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd project

# 2. Fill in your Supabase credentials
cp .env .env          # already exists — just open and edit
#   SUPABASE_URL=https://xxxx.supabase.co
#   SUPABASE_ANON_KEY=eyJ...

# 3. Build
source .env && bash build.sh

# 4. Serve locally (needs Node)
npx serve dist
# OR just open dist/login.html in your browser
```

---

## 3 · Deploy to Netlify

### Option A — Netlify UI (drag & drop)
1. Build locally: `source .env && bash build.sh`
2. Drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Done — but you'll need to re-drag on every change.

### Option B — Git-connected deploy (recommended)
1. Push your repo to GitHub/GitLab (the `.gitignore` keeps secrets out)
2. In Netlify UI: **Add new site → Import from Git**
3. Set **Build command**: `bash build.sh`  
   Set **Publish directory**: `dist`
4. Go to **Site configuration → Environment variables** and add:
   - `SUPABASE_URL` = `https://xxxx.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJ...`
5. Trigger a deploy — Netlify will run `build.sh`, inject the vars, and publish `dist/`

Every `git push` to main now auto-deploys.

---

## 4 · Promote a user to admin

In Supabase → SQL Editor:
```sql
update public.profiles
set role = 'admin'
where email = 'admin@univ-ouargla.dz';
```

---

## Security notes
- The Supabase **anon key** is safe to expose in the browser — it is intentionally public.  
  Row Level Security (RLS) policies in step 1 enforce what each user can actually read/write.
- Never put your Supabase **service_role** key in the frontend.
- The `Content-Security-Policy` header in `netlify.toml` locks down which scripts and domains the browser trusts.
