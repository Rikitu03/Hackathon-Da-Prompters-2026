// Pure value parsers for OCR text. Nothing here reads the clock: callers pass `now`.

export type ParsedDate = { year: number; month: number | null; day: number | null; ambiguous: boolean };
export type DateReading = { year: number; month: number | null; day: number | null };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function monthNumber(token: string): number | null {
  const t = token.toLowerCase();
  const index = MONTHS.findIndex((m) => m === t || m.slice(0, 3) === t || (t === "sept" && m === "september"));
  return index === -1 ? null : index + 1;
}
function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
function valid(year: number, month: number, day: number | null): boolean {
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return false;
  return day === null || (day >= 1 && day <= daysIn(year, month));
}
function make(year: number, month: number, day: number | null, ambiguous = false): ParsedDate | null {
  return valid(year, month, day) ? { year, month, day, ambiguous } : null;
}

/** Reads ISO, MM/DD/YYYY (flagged ambiguous when DD/MM is also possible), "Aug. 4, 2026", "4 August 2026" and "June 2026". */
export function parseDate(value: string): ParsedDate | null {
  const text = value.trim();
  if (!text) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return make(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (m) {
    const a = +m[1], b = +m[2], year = +m[3];
    if (a > 12 && b <= 12) return make(year, b, a); // DD/MM/YYYY
    if (b > 12 && a <= 12) return make(year, a, b); // MM/DD/YYYY
    if (a > 12 && b > 12) return null;
    return make(year, a, b, a !== b); // both readings possible: month first, flagged ambiguous
  }
  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(text);
  if (m) {
    const month = monthNumber(m[1]);
    return month ? make(+m[3], month, +m[2]) : null;
  }
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(text);
  if (m) {
    const month = monthNumber(m[2]);
    return month ? make(+m[3], month, +m[1]) : null;
  }
  m = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(text);
  if (m) {
    const month = monthNumber(m[1]);
    return month ? make(+m[2], month, null) : null;
  }
  return null;
}

/** Every way the text can be read: one, or two when month and day could be swapped. */
export function dateReadings(date: ParsedDate): DateReading[] {
  const primary = { year: date.year, month: date.month, day: date.day };
  if (date.ambiguous && date.month !== null && date.day !== null)
    return [primary, { year: date.year, month: date.day, day: date.month }];
  return [primary];
}

export function parseSchoolYear(value: string): { start: number; end: number } | null {
  const m = /^\s*(?:(?:s\.?\s?y\.?|a\.?\s?y\.?|school\s+year|academic\s+year)\s*[:.]?\s*)?(\d{4})\s*[-–—/]\s*(\d{4}|\d{2})(?!\d)/i.exec(value);
  if (!m) return null;
  const start = +m[1];
  let end = +m[2];
  if (m[2].length === 2) {
    end += Math.floor(start / 100) * 100;
    if (end < start) end += 100;
  }
  return { start, end };
}

const WORD_LEVELS: Record<string, number> = {
  first: 1, "1st": 1, i: 1, second: 2, "2nd": 2, ii: 2, third: 3, "3rd": 3, iii: 3,
  fourth: 4, "4th": 4, iv: 4, fifth: 5, "5th": 5, v: 5, sixth: 6, "6th": 6, vi: 6,
};
export function parseYearLevel(value: string): number | null {
  const text = value.trim().toLowerCase().replace(/\./g, "");
  let m = /^(?:grade|year|yr|level)?\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:year|yr|level|grade))?$/.exec(text);
  if (m) {
    const n = +m[1];
    return n >= 1 && n <= 12 ? n : null;
  }
  m = /^([a-z0-9]+)(?:\s+(?:year|yr))?$/.exec(text);
  return m && m[1] in WORD_LEVELS ? WORD_LEVELS[m[1]] : null;
}

export function parseStudentNo(value: string, pattern: string): { normalized: string; entryYear: number | null; matchesPattern: boolean } {
  const normalized = value.trim().replace(/\s+/g, " ");
  let entryYear: number | null = null;
  const long = /^((?:19|20)\d{2})-/.exec(normalized);
  const short = /^(\d{2})[-\s]/.exec(normalized);
  if (long) entryYear = +long[1];
  else if (short) entryYear = 2000 + +short[1];
  return { normalized, entryYear, matchesPattern: new RegExp(pattern).test(normalized) };
}

export function parseYears(value: string, now: Date): number | null {
  const since = /\bsince\s+((?:19|20)\d{2})\b/i.exec(value) ?? /^\s*((?:19|20)\d{2})\s*$/.exec(value);
  if (since) {
    const years = now.getFullYear() - +since[1];
    return years >= 0 ? years : null;
  }
  const counted = /\b(\d{1,2})\s*(?:years?|yrs?)\b/i.exec(value) ?? /^\s*(\d{1,2})\s*$/.exec(value);
  return counted ? +counted[1] : null;
}

/** School years run from `startMonth` (1-based) to the month before it. */
export function currentSchoolYear(now: Date, startMonth: number): { start: number; end: number } {
  const year = now.getFullYear();
  return now.getMonth() + 1 >= startMonth ? { start: year, end: year + 1 } : { start: year - 1, end: year };
}
