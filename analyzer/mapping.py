"""District / zone mapping engine for PRETAG AMIS.

Loads the seed data in ../seed and resolves any raw DISTRICT string from an R20
to a canonical district and its PRETAG zone. This mirrors what the production
`district_aliases` table + resolver will do; the normalisation rules here are the
reference implementation for the Phase 2 TypeScript port.
"""
from __future__ import annotations
import json, os, re, unicodedata
from dataclasses import dataclass
from functools import lru_cache

SEED_DIR = os.path.join(os.path.dirname(__file__), os.pardir, "seed")

NOISE = re.compile(r"\b(municipal|metropolitan|metro|assembly|district|municipality)\b")


def norm_text(s) -> str:
    """Unicode-normalise, fold non-breaking spaces, collapse runs of whitespace."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", str(s)).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def norm_key(s) -> str:
    """Aggressive key: lowercase, punctuation to spaces. Used to match aliases."""
    return re.sub(r"[^a-z0-9]+", " ", norm_text(s).lower()).strip()


def _strip_noise(key: str) -> str:
    return re.sub(r"\s+", " ", NOISE.sub(" ", key)).strip()


@dataclass(frozen=True)
class District:
    id: int
    name: str
    code: str
    zone: str
    zone_id: int


class Mapping:
    def __init__(self, seed_dir: str = SEED_DIR):
        with open(os.path.join(seed_dir, "districts.json"), encoding="utf-8") as fh:
            rows = json.load(fh)
        self.districts = {
            r["district_name"]: District(
                r["id"], r["district_name"], r["district_code"], r["zone"], r["zone_id"]
            )
            for r in rows
        }
        with open(os.path.join(seed_dir, "district_aliases.json"), encoding="utf-8") as fh:
            aliases = json.load(fh)
        self._exact: dict[str, str] = {}
        for a in aliases:
            self._exact[a["normalized_alias"]] = a["district"]
        for name in self.districts:
            self._exact.setdefault(norm_key(name), name)
        # a looser index, noise words removed, for near-miss resolution
        self._loose: dict[str, str] = {}
        for k, dname in self._exact.items():
            self._loose.setdefault(_strip_noise(k), dname)
        self.zones = sorted({d.zone for d in self.districts.values()})

    @lru_cache(maxsize=4096)
    def resolve(self, raw: str) -> District | None:
        key = norm_key(raw)
        if not key:
            return None
        dname = self._exact.get(key) or self._loose.get(_strip_noise(key))
        return self.districts.get(dname) if dname else None


if __name__ == "__main__":
    m = Mapping()
    print(f"{len(m.districts)} districts, {len(m.zones)} zones, {len(m._exact)} alias keys")
    for probe in ["Kumasi Metropolitan Assembly", "OBUASI MUNICIPAL",
                  "Kwabere East Municipal Assembly", "Sekyere East", "Nowhere District"]:
        d = m.resolve(probe)
        print(f"  {probe!r:42} -> {d.name + ' / ' + d.zone if d else 'UNMAPPED'}")
