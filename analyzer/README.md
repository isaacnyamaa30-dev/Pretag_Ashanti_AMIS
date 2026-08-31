# PRETAG AMIS - analysis prototype

A standalone, runnable reference implementation of three pieces of the
[build plan](../docs/build-plan.html):

| Module | Role | Plan phase |
|---|---|---|
| `mapping.py` | District string -> canonical district -> PRETAG zone, using the seed in [`../seed`](../seed) | Phase 1 |
| `parser.py` | Read an R20 workbook (flat Regional **or** multi-sheet zone book), clean, validate | Phase 2 |
| `compare.py` | Two-period membership comparison: regional, per-zone, per-district, internal transfers | Phase 4 |
| `report.py` | Write a comparison to `.xlsx` | Phase 6 |

The Phase 2 TypeScript importer is a direct port of `parser.py` + `mapping.py`.

## Setup

```
pip install -r requirements.txt
```

Python 3.11+. The seed files in `../seed` are generated from the reviewed
July 2025 workbooks; regenerate them only when the zone/district structure changes.

## Use

```
# show the district -> zone map
python -m analyzer map

# validation report for one R20 (the Phase 2 "validation dashboard")
python -m analyzer validate "../R20_Ashanti-6 July.xlsx"

# compare two months -> console tables + optional workbook / JSON
python -m analyzer compare "../R20_Ashanti-6 July.xlsx" "../Ashanti-4 August.xlsx" \
    -o report.xlsx --json result.json
```

## What it enforces

- **Employee Number is the identity key.** Names are never used to match members
  between months.
- A member in both months who changed zone is a **transfer** (retained
  regionally, out of one zone, into another) - never a regional gain or loss.
- Growth % is `null` ("n/a") when the previous period is zero.
- Status bands: Growing `> +0.5%`, Declining `< -0.5%`, Stable in between
  (`STABLE_BAND` in `compare.py`).

## Known input quirks it absorbs

Dirty sheet names (leading/trailing spaces, non-breaking spaces, the
`MUNNICIPAL` typo), unused `Sheet2`/`Sheet3`, header-only and ghost-row sheets,
fully blank rows, a trailing empty 6th column, numeric employee-number cells,
double spaces in names, and the district spelling variants captured in
`../seed/district_aliases.json`.
