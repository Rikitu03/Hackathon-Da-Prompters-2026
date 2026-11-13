import type { FieldValues, Flag, ProfileId } from "./contract";
import { config, getProfile } from "./profiles";

export type MatchStatus = "match" | "partial" | "mismatch";
type Side = { profile: ProfileId; field: string; value: string };
export type Comparison = {
  id: string;
  label: string;
  kind: "name" | "id" | "address";
  status: MatchStatus;
  left: Side;
  right: Side;
};

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv"]);
function nameTokens(value: string) {
  const tokens = value
    .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ")
    .filter((t) => t && !SUFFIXES.has(t));
  const full = tokens.filter((t) => t.length > 1);
  return { full, initials: tokens.filter((t) => t.length === 1), key: [...full].sort().join(" ") };
}

/** Same person, written differently: order, middle initials, suffixes and accents don't matter; a one-letter misread is a partial match. */
export function compareNames(a: string, b: string): MatchStatus {
  const x = nameTokens(a), y = nameTokens(b);
  const swap = x.full.length > y.full.length || (x.full.length === y.full.length && x.key > y.key);
  const [small, large] = swap ? [y, x] : [x, y];
  if (small.full.length === 0) return "partial";
  const unused = [...large.full];
  const unmatched: string[] = [];
  let fuzzy = false;
  for (const token of small.full) {
    const at = unused.indexOf(token);
    if (at === -1) unmatched.push(token);
    else unused.splice(at, 1);
  }
  for (const token of unmatched) {
    const at = unused.findIndex((u) => u.length >= 4 && token.length >= 4 && levenshtein(u, token) <= 1);
    if (at === -1) return "mismatch";
    unused.splice(at, 1);
    fuzzy = true;
  }
  const initials = [...small.initials];
  let uncovered = 0;
  for (const extra of unused) {
    const at = initials.indexOf(extra[0]);
    if (at === -1) uncovered++;
    else initials.splice(at, 1);
  }
  return fuzzy || uncovered > 0 ? "partial" : "match";
}

/** Identifiers: punctuation and case don't matter; one or two wrong characters look like a misread. */
export function compareIds(a: string, b: string): MatchStatus {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const x = clean(a), y = clean(b);
  if (x === y) return "match";
  return levenshtein(x, y) <= 2 ? "partial" : "mismatch";
}

const ADDRESS_STOPWORDS = new Set(["barangay", "brgy", "city", "st", "street", "ave", "avenue", "rd", "road", "of", "the", "metro", "manila", "ncr", "philippines"]);
export function compareAddresses(a: string, b: string): MatchStatus {
  const tokens = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((t) => !ADDRESS_STOPWORDS.has(t)) ?? []);
  const x = tokens(a), y = tokens(b);
  const smaller = Math.min(x.size, y.size), larger = Math.max(x.size, y.size);
  if (smaller === 0) return "partial";
  const shared = [...x].filter((t) => y.has(t)).length;
  const containment = shared / smaller;
  if (containment >= 0.8 && smaller / larger >= 0.6) return "match";
  return containment >= 0.5 ? "partial" : "mismatch";
}

const COMPARERS = { name: compareNames, id: compareIds, address: compareAddresses } as const;

/** Compare the pairs named in the keyword file. A pair is skipped when either document or value is missing. */
export function crossCheck(values: Partial<Record<ProfileId, FieldValues>>): Comparison[] {
  const result: Comparison[] = [];
  for (const def of config.crossChecks) {
    const leftValue = values[def.left.profile]?.[def.left.field]?.trim() ?? "";
    const rightValue = values[def.right.profile]?.[def.right.field]?.trim() ?? "";
    if (!leftValue || !rightValue) continue;
    result.push({
      id: def.id,
      label: def.label,
      kind: def.kind,
      status: COMPARERS[def.kind](leftValue, rightValue),
      left: { ...def.left, value: leftValue },
      right: { ...def.right, value: rightValue },
    });
  }
  return result;
}

/** Flags for the document being viewed: one per comparison involving it that isn't a full match. */
export function flagsFromComparisons(comparisons: Comparison[], viewing: ProfileId): Flag[] {
  const flags: Flag[] = [];
  for (const c of comparisons) {
    if (c.status === "match") continue;
    const mine = c.left.profile === viewing ? c.left : c.right.profile === viewing ? c.right : null;
    if (!mine) continue;
    const other = mine === c.left ? c.right : c.left;
    const otherTitle = getProfile(other.profile).title;
    flags.push({
      id: `cross-${c.id}`,
      severity: c.status === "mismatch" ? "alert" : "warning",
      title: c.status === "mismatch" ? `${c.label} differs from your ${otherTitle}` : `${c.label} doesn't fully match your ${otherTitle}`,
      detail: `Your ${getProfile(mine.profile).title} reads "${mine.value}". Your ${otherTitle} reads "${other.value}". Check both against your originals and correct anything that was misread.`,
      fieldKeys: [mine.field],
      origin: "cross-check",
    });
  }
  return flags;
}
