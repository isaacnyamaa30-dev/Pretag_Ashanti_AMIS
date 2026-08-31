/**
 * Text normalisation for R20 import - the TypeScript port of analyzer/mapping.py
 * and the cleaning rules in analyzer/parser.py. Keep the two in step.
 */

const NOISE = /\b(municipal|metropolitan|metro|assembly|district|municipality)\b/g;

/** Unicode-normalise then collapse whitespace runs (JS \s covers NBSP and other
 *  unicode spaces), trim. */
export function normText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** Aggressive lookup key: lowercase, punctuation to spaces. Used to match aliases. */
export function normKey(value: unknown): string {
  return normText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** normKey with the "municipal / assembly / district ..." noise words removed. */
export function stripNoise(key: string): string {
  return key.replace(NOISE, " ").replace(/\s+/g, " ").trim();
}

/** Collapse repeated internal spaces in a member name. */
export function cleanName(value: unknown): string {
  return normText(value);
}

/** Employee number always stored as text, leading zeros preserved, no internal spaces. */
export function employeeNoToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  let v: string;
  if (typeof value === "number") {
    v = Number.isInteger(value) ? value.toFixed(0) : String(value);
  } else {
    v = String(value);
  }
  return v.replace(/\s+/g, "").trim();
}
