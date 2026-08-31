"""Two-period membership comparison for PRETAG AMIS.

Employee Number is the identity key. A member present in both periods whose zone
changed is a transfer (retained regionally, out of one zone and into another),
never a regional gain or loss - see docs/build-plan.html sections 77-80.
"""
from __future__ import annotations
from dataclasses import dataclass

from .parser import ParseResult

STABLE_BAND = 0.5  # percent; configurable in production


def classify(prev: int, growth_pct: float | None) -> str:
    if prev == 0 or growth_pct is None:
        return "NEW" if prev == 0 else "STABLE"
    if growth_pct > STABLE_BAND:
        return "GROWING"
    if growth_pct < -STABLE_BAND:
        return "DECLINING"
    return "STABLE"


def _growth(prev: int, cur: int) -> float | None:
    return None if prev == 0 else round((cur - prev) / prev * 100, 2)


@dataclass
class Line:
    name: str
    previous: int
    current: int
    added: int
    missing: int
    transfers_in: int
    transfers_out: int

    @property
    def net(self) -> int:
        return self.current - self.previous

    @property
    def growth_pct(self) -> float | None:
        return _growth(self.previous, self.current)

    @property
    def retention_pct(self) -> float | None:
        if self.previous == 0:
            return None
        retained = self.previous - self.missing - self.transfers_out
        return round(retained / self.previous * 100, 2)

    @property
    def status(self) -> str:
        return classify(self.previous, self.growth_pct)

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "previous": self.previous,
            "current": self.current,
            "added": self.added,
            "missing": self.missing,
            "transfers_in": self.transfers_in,
            "transfers_out": self.transfers_out,
            "net": self.net,
            "growth_pct": self.growth_pct,
            "retention_pct": self.retention_pct,
            "status": self.status,
        }


def _index(result: ParseResult) -> dict[str, "Row"]:
    # last occurrence wins if a file somehow repeats an employee number
    return {r.employee_no: r for r in result.rows if r.employee_no}


def compare(prev: ParseResult, cur: ParseResult) -> dict:
    p, c = _index(prev), _index(cur)
    P, C = set(p), set(c)
    retained = P & C

    def level(key):
        prev_members = {e for e in P if key(p[e])}
        cur_members = {e for e in C if key(c[e])}
        return prev_members, cur_members

    # ---- regional ----
    regional = Line(
        "Ashanti Region", len(P), len(C),
        added=len(C - P), missing=len(P - C),
        transfers_in=0, transfers_out=0,
    )

    # ---- zones ----
    zones = sorted({r.zone for r in list(prev.rows) + list(cur.rows) if r.zone})
    zone_lines = []
    for z in zones:
        pm, cm = level(lambda r, z=z: r.zone == z)
        tin = sum(1 for e in retained if p[e].zone != z and c[e].zone == z)
        tout = sum(1 for e in retained if p[e].zone == z and c[e].zone != z)
        added = len(cm - pm) - tin
        missing = len(pm - cm) - tout
        zone_lines.append(Line(z, len(pm), len(cm), added, missing, tin, tout))

    # ---- districts ----
    districts = sorted({r.district for r in list(prev.rows) + list(cur.rows) if r.district})
    district_lines = []
    for d in districts:
        pm, cm = level(lambda r, d=d: r.district == d)
        tin = sum(1 for e in retained if p[e].district != d and c[e].district == d)
        tout = sum(1 for e in retained if p[e].district == d and c[e].district != d)
        added = len(cm - pm) - tin
        missing = len(pm - cm) - tout
        zone = next((r.zone for r in cur.rows if r.district == d), None) \
            or next((r.zone for r in prev.rows if r.district == d), None)
        line = Line(d, len(pm), len(cm), added, missing, tin, tout)
        district_lines.append((zone, line))

    movers = [
        {"employee_no": e, "name": c[e].name,
         "from_zone": p[e].zone, "to_zone": c[e].zone,
         "from_district": p[e].district, "to_district": c[e].district}
        for e in sorted(retained)
        if p[e].zone != c[e].zone or p[e].district != c[e].district
    ]

    return {
        "previous_file": prev.summary()["file"],
        "current_file": cur.summary()["file"],
        "regional": regional.as_dict(),
        "zones": [z.as_dict() for z in sorted(zone_lines, key=lambda l: -l.net)],
        "districts": [
            {"zone": zn, **ln.as_dict()}
            for zn, ln in sorted(district_lines, key=lambda t: (t[0] or "", -t[1].net))
        ],
        "internal_movers": movers,
        "zone_status_counts": _counts([z.status for z in zone_lines]),
    }


def _counts(statuses) -> dict:
    out = {"GROWING": 0, "STABLE": 0, "DECLINING": 0, "NEW": 0}
    for s in statuses:
        out[s] = out.get(s, 0) + 1
    return {k: v for k, v in out.items() if v or k != "NEW"}
