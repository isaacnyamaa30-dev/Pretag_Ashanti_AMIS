"""Command line entry point.

  python -m analyzer map                         check the district -> zone seed
  python -m analyzer validate <file.xlsx>        validation report for one R20
  python -m analyzer compare <prev.xlsx> <cur.xlsx> [-o report.xlsx]
"""
from __future__ import annotations
import argparse, json, sys

from .mapping import Mapping
from .parser import parse
from .compare import compare
from . import report as report_mod


def _fmt_pct(v):
    return "  n/a" if v is None else f"{v:+.2f}%"


def cmd_map(_args):
    m = Mapping()
    print(f"{len(m.districts)} districts across {len(m.zones)} zones, {len(m._exact)} alias keys\n")
    by_zone: dict[str, list[str]] = {}
    for d in m.districts.values():
        by_zone.setdefault(d.zone, []).append(d.name)
    for z in sorted(by_zone):
        print(f"  {z:26} {', '.join(sorted(by_zone[z]))}")


def cmd_validate(args):
    r = parse(args.file)
    s = r.summary()
    print(json.dumps(s, indent=2, ensure_ascii=False))
    if r.duplicates:
        print("\nDuplicate employee numbers:")
        for emp, rows in list(r.duplicates.items())[:20]:
            print(f"  {emp}: rows {[x.excel_row for x in rows]}  ({rows[0].name})")


def cmd_compare(args):
    prev, cur = parse(args.prev), parse(args.cur)
    for label, r in (("PREVIOUS", prev), ("CURRENT", cur)):
        s = r.summary()
        print(f"{label:9} {s['file']:32} rows={s['total_member_rows']:6} "
              f"valid={s['valid_rows']:6} dup={s['duplicate_employee_nos']} "
              f"missing_emp={s['missing_employee_no']} unmapped={s['unmapped_districts']} "
              f"[{s['status']}]")

    result = compare(prev, cur)
    reg = result["regional"]
    print("\n=== REGIONAL " + reg["name"] + " ===")
    print(f"  opening {reg['previous']:>6}     closing {reg['current']:>6}")
    print(f"  added   {reg['added']:>6}     missing {reg['missing']:>6}")
    print(f"  net {reg['net']:+d}     growth {_fmt_pct(reg['growth_pct'])}     "
          f"retention {reg['retention_pct']}%     status {reg['status']}")
    print(f"  zone status: {result['zone_status_counts']}")
    print(f"  internal movers (changed zone or district): {len(result['internal_movers'])}")

    print(f"\n{'Zone':26}{'Prev':>6}{'Curr':>6}{'Add':>5}{'Miss':>6}{'In':>4}{'Out':>4}"
          f"{'Net':>6}{'Growth':>9}  Status")
    for z in result["zones"]:
        print(f"{z['name']:26}{z['previous']:6}{z['current']:6}{z['added']:5}{z['missing']:6}"
              f"{z['transfers_in']:4}{z['transfers_out']:4}{z['net']:+6}"
              f"{_fmt_pct(z['growth_pct']):>9}  {z['status']}")

    if args.out:
        path = report_mod.write(result, args.out)
        print(f"\nwrote {path}")
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(result, fh, indent=2, ensure_ascii=False)
        print(f"wrote {args.json}")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="analyzer", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("map").set_defaults(func=cmd_map)
    pv = sub.add_parser("validate"); pv.add_argument("file"); pv.set_defaults(func=cmd_validate)
    pc = sub.add_parser("compare")
    pc.add_argument("prev"); pc.add_argument("cur")
    pc.add_argument("-o", "--out", help="write .xlsx report")
    pc.add_argument("--json", help="write raw result as JSON")
    pc.set_defaults(func=cmd_compare)
    args = ap.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    sys.exit(main())
