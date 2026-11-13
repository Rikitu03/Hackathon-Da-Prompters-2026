import type { Classification, FieldValues, Flag, ProfileId, Severity } from "./contract";
import {
  currentSchoolYear, dateReadings, parseDate, parseSchoolYear, parseStudentNo, parseYearLevel, parseYears,
  type DateReading, type ParsedDate,
} from "./parse";
import { config, getProfile } from "./profiles";

type Input = { profileId: ProfileId; values: FieldValues; detected: Classification; now: Date };

const rule = (id: string, severity: Severity, title: string, detail: string, fieldKeys: string[] = []): Flag => ({
  id, severity, title, detail, fieldKeys, origin: "rule",
});
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function isFuture(r: DateReading, now: Date): boolean {
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  if (r.year !== y) return r.year > y;
  if (r.month === null) return false;
  if (r.month !== m) return r.month > m;
  return r.day !== null && r.day > d;
}
const startOf = (r: DateReading) => new Date(r.year, (r.month ?? 1) - 1, r.day ?? 1);

/** Single-document checks. Every flag asks the student to compare something; none is a verdict. */
export function checkDocument({ profileId, values, detected, now }: Input): Flag[] {
  const profile = getProfile(profileId);
  const flags: Flag[] = [];
  const get = (key: string) => (values[key] ?? "").trim();
  const governmentId = profileId === "school_id" && detected.variant === "government_id";

  // Which document is this?
  if (detected.otherTitle) {
    flags.push(rule("document-type-mismatch", "alert", `This looks like a ${detected.otherTitle}`,
      `The title on this page reads "${detected.evidence}". Check that you chose the right file for your ${profile.title}.`));
  } else if (detected.detected && detected.detected !== profileId) {
    flags.push(rule("document-type-mismatch", "alert", `This looks like a ${getProfile(detected.detected).title}`,
      `The title on this page reads "${detected.evidence}". Check that you chose the right file for your ${profile.title}.`));
  } else if (!detected.detected) {
    flags.push(rule("document-type-unknown", "warning", "We couldn't tell which document this is",
      `No title for a ${profile.title} was found. Check that you chose the right file.`));
  }
  if (governmentId) {
    flags.push(rule("government-id", "info", "This is a government-issued ID",
      "Student number checks are skipped for this ID. Confirm with the scholarship office that this ID type is accepted for your cycle."));
  }

  // Key details that were not found.
  const required = profile.fields.filter((f) => f.priority === "P0" && !(governmentId && f.key === "student_no"));
  const missing = required.filter((f) => !get(f.key));
  if (missing.length) {
    flags.push(rule("missing-key-details", "warning", "Some key details weren't found",
      `Not found: ${missing.map((f) => f.label).join(", ")}. Fill them in if they are printed on your document.`,
      missing.map((f) => f.key)));
  }

  /** Read a date field; flags unreadable and future dates. Returns the parsed date when readable. */
  function readDate(key: string, idPrefix: string, label: string): ParsedDate | null {
    const text = get(key);
    if (!text) return null;
    const parsed = parseDate(text);
    if (!parsed) {
      flags.push(rule(`${idPrefix}-unreadable`, "warning", `We couldn't read the ${label.toLowerCase()}`,
        `"${text}" doesn't look like a date. Check it against your original, and write it as year-month-day, for example 2026-08-04.`, [key]));
      return null;
    }
    if (dateReadings(parsed).every((r) => isFuture(r, now))) {
      flags.push(rule(`${idPrefix}-future`, "alert", `${label} is in the future`,
        `"${text}" is after today (${isoDay(now)}). Check the date against your original.`, [key]));
    }
    return parsed;
  }

  if (profileId === "certificate_of_registration") {
    const current = currentSchoolYear(now, config.rules.schoolYearStartMonth);
    const enrolled = readDate("enrollment_date", "enrollment-date", "Enrollment date");
    const schoolYearText = get("school_year");
    const schoolYear = schoolYearText ? parseSchoolYear(schoolYearText) : null;
    if (schoolYearText && !schoolYear) {
      flags.push(rule("school-year-unreadable", "warning", "We couldn't read the school year",
        `"${schoolYearText}" doesn't look like a school year. Check it against your original, for example 2026-2027.`, ["school_year"]));
    }
    if (schoolYear) {
      if (schoolYear.end - schoolYear.start !== 1) {
        flags.push(rule("school-year-span", "warning", "School year doesn't span one year",
          `${schoolYear.start}–${schoolYear.end} covers ${plural(schoolYear.end - schoolYear.start, "year")}. School years usually run from one year to the next, so check it against your original.`,
          ["school_year"]));
      }
      if (schoolYear.start < current.start) {
        flags.push(rule("school-year-not-current", "warning", `School year ${schoolYear.start}–${schoolYear.end} is not the current one`,
          `The current school year is ${current.start}–${current.end}. Check that this is your latest Certificate of Registration.`, ["school_year"]));
      }
    }
    if (enrolled) {
      const yearsBehind = now.getFullYear() - enrolled.year;
      const yearStart = new Date(current.start, config.rules.schoolYearStartMonth - 1, 1);
      if (yearsBehind >= config.rules.enrollmentRecency.warnYearsBehind && dateReadings(enrolled).every((r) => startOf(r) < yearStart)) {
        const severity: Severity = yearsBehind >= config.rules.enrollmentRecency.alertYearsBehind ? "alert" : "warning";
        flags.push(rule("enrollment-date-outdated", severity, `Enrollment date is from ${enrolled.year}`,
          `That is ${plural(yearsBehind, "year")} before ${now.getFullYear()}. Check that this is your latest Certificate of Registration.`,
          ["enrollment_date"]));
      }
      if (schoolYear && enrolled.year !== schoolYear.start && enrolled.year !== schoolYear.end) {
        flags.push(rule("school-year-enrollment-mismatch", "alert",
          `Enrollment date is outside school year ${schoolYear.start}–${schoolYear.end}`,
          `The enrollment date is in ${enrolled.year}, but the school year is ${schoolYear.start}–${schoolYear.end}. Check both against your original.`,
          ["enrollment_date", "school_year"]));
      }
    }
    const levelText = get("year_level");
    const level = levelText ? parseYearLevel(levelText) : null;
    const entryYear = get("student_no") ? parseStudentNo(get("student_no"), config.rules.studentNoPattern).entryYear : null;
    if (entryYear !== null && level !== null && entryYear <= now.getFullYear()) {
      const reference = schoolYear ?? current;
      const expected = reference.start - entryYear + 1;
      if (expected >= 1 && expected <= 6 && level !== expected) {
        flags.push(rule("year-level-student-no", "info", "Year level may not match your student number",
          `Student numbers starting with ${String(entryYear).slice(-2)} often mean the student started in ${entryYear}. For school year ${reference.start}–${reference.end} that would be year ${expected}, but this says year ${level}. Irregular, shifting, or transferring students can differ, so check your original.`,
          ["year_level", "student_no"]));
      }
    }
  }

  if (profileId === "certificate_of_residency") {
    readDate("date_issued", "date-issued", "Date issued");
    const yearsText = get("years_stayed");
    if (yearsText && parseYears(yearsText, now) === null) {
      flags.push(rule("years-stayed-unreadable", "warning", "We couldn't read the years stayed",
        `"${yearsText}" isn't a number of years. Check it against your original.`, ["years_stayed"]));
    }
  }

  const studentNo = get("student_no");
  if (!governmentId && studentNo && !parseStudentNo(studentNo, config.rules.studentNoPattern).matchesPattern) {
    flags.push(rule("student-no-format", "info", "Student number looks different from usual",
      `Student numbers here usually look like ${config.rules.studentNoExample}. Check each digit against your original.`, ["student_no"]));
  }
  return flags;
}
