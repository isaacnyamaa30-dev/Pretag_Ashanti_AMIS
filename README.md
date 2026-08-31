# PRETAG Ashanti Membership Intelligence System (AMIS)

Turns the monthly Ashanti Regional R20 into a permanent membership database with
zone/district classification, month-on-month analytics, and automated R20 exports.

**Live:** https://pretag-ashanti-amis.vercel.app (Vercel · Supabase project `glhbpfsqrfvfnioimaep`)
Update with `npx vercel deploy --prod` from this folder.

## Repository layout

| Path | What |
|---|---|
| [`docs/build-plan.html`](docs/build-plan.html) | The implementation plan. [Published](https://claude.ai/code/artifact/2b6693e5-a094-4d42-901f-1ca867592181). |
| [`docs/SETUP.md`](docs/SETUP.md) | How to run the web app locally + provision Supabase. |
| `app/`, `components/`, `lib/`, `middleware.ts` | The Next.js app (App Router, TypeScript). |
| `database/migrations/` | Postgres schema + row-level security. |
| `database/seed/` | Seed loader (`npm run db:seed`). |
| [`seed/`](seed/) | Generated master data: 18 zones, 44 districts, aliases. |
| [`analyzer/`](analyzer/) | Python prototype of the R20 importer, mapping engine and comparison engine. |
| [`design/`](design/) | Brand tokens (`tokens.css`) + `brand.md`, derived from the PRETAG logo. |
| `docs/comparison_jul_aug_2025.xlsx` | First real July&rarr;August comparison. |
| `R20_Ashanti-6 July.xlsx`, `Ashanti-4 August.xlsx`, `R20 JULY/` | R20 source files. |

## Status

| Phase | State |
|---|---|
| 0 - Project & environment | **done** |
| 1 - Data foundation | **done** - live DB (schema, RLS, storage, seed), login + password reset, admin for zones / districts / aliases / users / settings, audit logging |
| 2 - R20 importer | **done** - upload -> validation (§53) -> unmapped resolver -> live zone/district classification |
| 3 - Approve & snapshot | **done** - transactional import to `members` + immutable `membership_snapshots`; period locking |
| 4 - Analytics engine | **done** - region + zone comparison, transfer logic, status bands; Regional / Zone / Compare pages; live dashboard |
| 5 - Executive dashboard | **done** - KPIs, trend + zone charts, movement lists, drill-downs |
| 6 - Exports | **done** - Regional / per-zone / all-zones ZIP / comparison workbook; archive browser |
| 7 - Reporting & summaries (v2) | **done** - executive-summary text, printable Regional Report, comparison export, projection |
| 8 - Member intelligence & PWA (v2) | **done** - member search + history, movement reasons, PWA install, data-quality score, zone scorecard, notifications |
| V3 | **mostly done** - AI assistant (needs key), membership targets, school drill-down, monthly reminder; email + multi-region pending |

**Go-live tooling:** Settings has a Super-Admin "Reset membership data" action
that wipes all history and stored files but keeps the structure.

The dev database has **January (6,932)** and **February (6,373)** imported.
Reset before real use.

Run locally: `npm run dev` (needs `.env.local` - see `docs/SETUP.md`).

## Quick start

Web app - see [`docs/SETUP.md`](docs/SETUP.md).

Analyzer prototype:

```
pip install -r analyzer/requirements.txt
python -m analyzer compare "R20_Ashanti-6 July.xlsx" "Ashanti-4 August.xlsx" -o report.xlsx
```

## Copyright

Copyright &copy; 2026 **Isaac Nyamaa Boadi**. All rights reserved.
Developed by Isaac Nyamaa Boadi for PRETAG Ashanti. See [`LICENSE`](LICENSE) -
the developer retains ownership and the right to license the system to other
PRETAG regions and to PRETAG national.

## Key rulings

- Employee Number is the identity key for matching members between months.
- The Regional R20 is the single source of truth for membership; zone workbooks
  feed structure only.
- **Sekyere East belongs to Ejisu Zone.**
- **Bekwai Zone** = Bekwai Municipal + Amansie Central. **Amansie Zone** =
  Amansie West + Amansie South.
