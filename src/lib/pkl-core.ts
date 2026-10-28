// pkl-core.ts
// All the data rules live here, in one place. No UI, no file reading.
// To change which Excel columns are used, edit FIELDS below.

export type Status = "Aktif" | "Belum Mulai" | "Sudah Selesai" | "Cancel";

export interface Intern {
  row: number; // row number in the Excel sheet (useful for error messages)
  name: string;
  school: string;
  major: string;
  gender: string;
  subBidang: string;
  unit: string;
  mentor: string;
  startDate: Date;
  endDate: Date;
  cancelled: boolean;
  status: Status; // recalculated here, not read from the sheet
  durationMonths: number; // (end - start) / 30 days, 1 decimal (same as the sheet)
  year: number; // year of the start date
  saved: { status: string; duration: number | null; year: number | null }; // values saved in the file, for the data check
}

export interface Skipped {
  row: number;
  reason: string;
}

export interface DataCheck {
  compared: number;
  statusDiffers: number; // normal if the file was last calculated on an earlier day
  durationDiffers: number; // should be 0
  yearDiffers: number; // should be 0
}

export interface Dataset {
  interns: Intern[];
  skipped: Skipped[];
  check: DataCheck;
}

// ---------------------------------------------------------------------------
// Which Excel columns we read. Only these. Everything else (ID numbers, bank
// details, addresses, passwords...) is never copied out of the file.
// `header` is matched after cleaning (lowercase, no line breaks, no "*auto").
// ---------------------------------------------------------------------------
const FIELDS = {
  name: { header: "nama lengkap", required: true },
  school: { header: "sekolah/kampus", required: true },
  major: { header: "jurusan", required: true },
  gender: { header: "jenis kelamin", required: true },
  startDate: { header: "tanggal mulai pkl", required: true },
  endDate: { header: "tanggal selesai pkl", required: true },
  cancel: { header: "cancel", required: true },
  subBidang: { header: "sub bidang", required: false },
  unit: { header: "unit", required: false },
  mentor: { header: "mentor", required: false },
  // Saved results of the sheet's own formulas. Only used by the data check.
  savedStatus: { header: "status pkl", required: false },
  savedDuration: { header: "durasi (bulan)", required: false },
  savedYear: { header: "tahun masuk", required: false },
} as const;

type FieldKey = keyof typeof FIELDS;

export const normHeader = (h: unknown): string =>
  String(h ?? "")
    .toLowerCase()
    .replace(/\*auto/g, "")
    .replace(/\s+/g, " ")
    .trim();

const text = (v: unknown): string => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

/** Turns a cell into a plain calendar date (no time). Accepts real dates and "DD/MM/YYYY" text. */
export function toDateOnly(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    // +12h so tiny timezone/rounding shifts from the Excel reader can't flip the day
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // day first, like the sheet
    if (m) {
      const day = +m[1];
      const month = +m[2];
      const d = new Date(+m[3], month - 1, day);
      if (d.getMonth() === month - 1 && d.getDate() === day) return d;
    }
  }
  return null;
}

/** Same rules as the sheet's "Status PKL" formula. The end date itself still counts as Aktif. */
export function getStatus(start: Date, end: Date, cancelled: boolean, today: Date = new Date()): Status {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (cancelled) return "Cancel";
  if (t < start) return "Belum Mulai";
  if (t > end) return "Sudah Selesai";
  return "Aktif";
}

/** Same rule as the sheet's "Durasi (Bulan)": days / 30, rounded to 1 decimal. */
export function getDurationMonths(start: Date, end: Date): number {
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.round((days / 30) * 10) / 10;
}

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isNaN(n) ? null : n;
};

/**
 * rows = the sheet as an array of rows (array of cells), header row included.
 * Throws an Error with a plain-language message if the file isn't the expected shape.
 */
export function buildDataset(rows: unknown[][], today: Date = new Date()): Dataset {
  const headerIdx = rows.slice(0, 15).findIndex((r) => r?.some((c) => normHeader(c) === FIELDS.name.header));
  if (headerIdx === -1) {
    throw new Error('Could not find the header row. Expected a column named "Nama Lengkap" near the top of the sheet.');
  }

  const headers = rows[headerIdx].map(normHeader);
  const col = {} as Record<FieldKey, number>;
  (Object.keys(FIELDS) as FieldKey[]).forEach((k) => (col[k] = headers.indexOf(FIELDS[k].header)));

  const missing = (Object.keys(FIELDS) as FieldKey[]).filter((k) => FIELDS[k].required && col[k] === -1);
  if (missing.length) {
    throw new Error(`Missing required column(s): ${missing.map((k) => FIELDS[k].header).join(", ")}`);
  }

  const interns: Intern[] = [];
  const skipped: Skipped[] = [];
  const check: DataCheck = { compared: 0, statusDiffers: 0, durationDiffers: 0, yearDiffers: 0 };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const get = (k: FieldKey) => (col[k] === -1 ? null : r[col[k]]);

    const name = text(get("name"));
    if (!name) continue; // the sheet has hundreds of pre-formatted empty rows

    const start = toDateOnly(get("startDate"));
    const end = toDateOnly(get("endDate"));
    if (!start || !end) {
      skipped.push({ row: i + 1, reason: "Start or end date is missing or not a valid date" });
      continue;
    }
    if (end < start) {
      skipped.push({ row: i + 1, reason: "End date is before start date" });
      continue;
    }

    const cancelled = text(get("cancel")).toLowerCase() === "yes";
    const status = getStatus(start, end, cancelled, today);
    const durationMonths = getDurationMonths(start, end);
    const year = start.getFullYear();

    const saved = {
      status: text(get("savedStatus")),
      duration: numOrNull(get("savedDuration")),
      year: numOrNull(get("savedYear")),
    };
    if (col.savedStatus !== -1) {
      check.compared++;
      if (saved.status !== status) check.statusDiffers++;
      if (saved.duration !== durationMonths) check.durationDiffers++;
      if (saved.year !== year) check.yearDiffers++;
    }

    interns.push({
      row: i + 1,
      name,
      school: text(get("school")),
      major: text(get("major")),
      gender: text(get("gender")),
      subBidang: text(get("subBidang")),
      unit: text(get("unit")),
      mentor: text(get("mentor")),
      startDate: start,
      endDate: end,
      cancelled,
      status,
      durationMonths,
      year,
      saved,
    });
  }

  return { interns, skipped, check };
}

// ---------------------------------------------------------------------------
// Summaries for cards and charts
// ---------------------------------------------------------------------------

export interface CountItem {
  label: string;
  count: number;
}

/**
 * Counts items by a label. "Ritel" and "RITEL" are counted together; the most
 * common spelling is shown. Empty labels are grouped as "(blank)".
 */
export function countBy<T>(items: T[], pick: (item: T) => string): CountItem[] {
  const groups = new Map<string, Map<string, number>>();
  for (const item of items) {
    const label = pick(item) || "(blank)";
    const key = label.toLowerCase();
    const spellings = groups.get(key) ?? new Map<string, number>();
    spellings.set(label, (spellings.get(label) ?? 0) + 1);
    groups.set(key, spellings);
  }
  return [...groups.values()]
    .map((spellings) => {
      const sorted = [...spellings.entries()].sort((a, b) => b[1] - a[1]);
      return { label: sorted[0][0], count: sorted.reduce((sum, [, n]) => sum + n, 0) };
    })
    .sort((a, b) => b.count - a.count);
}

export function summarize(interns: Intern[]) {
  const byStatus: Record<Status, number> = { Aktif: 0, "Belum Mulai": 0, "Sudah Selesai": 0, Cancel: 0 };
  interns.forEach((i) => byStatus[i.status]++);

  const counted = interns.filter((i) => !i.cancelled);
  const avgDurationMonths = counted.length
    ? Math.round((counted.reduce((s, i) => s + i.durationMonths, 0) / counted.length) * 10) / 10
    : 0;

  return {
    total: interns.length,
    byStatus,
    avgDurationMonths, // average over non-cancelled interns, in approximate months
    byYear: countBy(interns, (i) => String(i.year)).sort((a, b) => a.label.localeCompare(b.label)),
    bySchool: countBy(interns, (i) => i.school),
    byMajor: countBy(interns, (i) => i.major),
    byUnit: countBy(interns, (i) => i.unit),
    bySubBidang: countBy(interns, (i) => i.subBidang),
    byGender: countBy(interns, (i) => i.gender),
  };
}

/**
 * Internships that are still running (Aktif) and end within the next `days` days,
 * soonest first. Cancelled and already-finished internships are never included.
 */
export function endingSoon(interns: Intern[], days: number, today: Date = new Date()): (Intern & { daysLeft: number })[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return interns
    .filter((i) => i.status === "Aktif")
    .map((i) => ({ ...i, daysLeft: Math.round((i.endDate.getTime() - t.getTime()) / 86400000) }))
    .filter((i) => i.daysLeft >= 0 && i.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}