# Seed data

Generated from the reviewed July 2025 zone workbooks (`../R20 JULY/`) and the two
Regional R20 files. Regenerate with:

```
python seed/generate.py
```

| File | Rows | Notes |
|---|---|---|
| `zones.json` | 18 | The PRETAG Ashanti zones. |
| `districts.json` | 44 | Each district assigned to exactly one zone. |
| `district_aliases.json` | ~79 | Every `DISTRICT` spelling seen in the source files, mapped to its canonical district. Grows as new unmapped names are resolved in the app. |
| `seed.sql` | - | `insert` statements for `regions`, `zones`, `districts`, `district_aliases`. |

## Rulings applied (Regional Executives)

- **Sekyere East belongs to Ejisu Zone.** It appears in both the Ejisu and the
  Sekyere South & Central workbooks with an identical member list; it is assigned
  to **Ejisu** and removed from Sekyere South & Central.

## Structure notes

- **Amansie** districts are split across two zones by design: Amansie West and
  Amansie South under *Amansie Zone*, Amansie Central under *Bekwai Zone*.
- The Regional R20 is the single source of truth for membership. These workbooks
  are used only to derive this structure and to seed the alias list; the app
  never sums zone files to get a regional total.
