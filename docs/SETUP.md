# Setup - PRETAG AMIS web app (Phase 0/1)

## 1. Prerequisites

- Node.js 18.18+ (20 LTS recommended)
- A Supabase project - free tier is fine to start
  (<https://supabase.com/dashboard> -> New project)

## 2. Install

```
npm install
cp .env.example .env.local
```

Fill `.env.local` from **Supabase -> Project Settings -> API**:

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (server only - never commit) |

## 3. Database

In the Supabase **SQL editor**, paste and run `database/SETUP_ALL.sql` (it bundles,
in order: `0001_init` schema, `0002_rls` + `0004_rls_fix` row-level security,
`0003_storage` bucket policy, and `roles_and_settings`).

Then load the zone / district / alias data:

```
npm run db:seed
```

This upserts 1 region, 7 roles, 18 zones, 44 districts and ~79 aliases. Re-runnable.

> The dev project (`glhbpfsqrfvfnioimaep`, EU Central) already has all of this
> applied and a Super Administrator user. These steps are for a fresh project.

## 4. Storage

Supabase -> **Storage** -> New bucket named `r20`, **not public**. Original
uploaded R20 files are kept there forever under `r20/<year>/<month>/`.

## 5. First user

Supabase -> **Authentication** -> Add user (email + password). Then in the SQL
editor link them to a role:

```sql
insert into users (auth_id, full_name, email, role_id, scope)
select u.id, 'Your Name', u.email,
       (select id from roles where role_name = 'Super Administrator'), 'region'
from auth.users u where u.email = 'you@example.com';
```

## 6. Run

```
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

Sign in at `/login`. `/dashboard`, `/admin/zones`, `/admin/districts`,
`/admin/aliases` are live; the rest of the navigation lands in Phases 2-6.

## Deploy (later)

Vercel project -> set the three env vars -> deploy. Point it at this repo;
`npm run build` is the build command.
