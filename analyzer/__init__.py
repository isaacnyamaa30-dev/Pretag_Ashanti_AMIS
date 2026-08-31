"""PRETAG Ashanti Membership Intelligence System - analysis prototype.

A standalone, runnable reference implementation of the R20 importer, the
district/zone mapping engine, and the two-period comparison. Built against the
real July and August 2025 Regional R20 files. The Phase 2 TypeScript importer is
a direct port of this logic.
"""
from .mapping import Mapping
from .parser import parse, ParseResult
from .compare import compare

__all__ = ["Mapping", "parse", "ParseResult", "compare"]
