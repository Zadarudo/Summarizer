// pkl-session.ts
// Keeps the loaded data while the tab stays open, so a refresh doesn't lose it.
// Uses sessionStorage: it survives a refresh (F5) but is erased when the tab is closed.
//
// Only the cleaned fields we already read are stored (no ID numbers, bank details, etc.).
// Status is recalculated every time the data is restored, so it is never stale.

import { getStatus, type Dataset, type Intern } from "./pkl-core";

const KEY = "pkl-dashboard-session-v1";

type StoredIntern = Omit<Intern, "startDate" | "endDate" | "status"> & { startDate: string; endDate: string };

interface Stored {
  fileInfo: string;
  interns: StoredIntern[];
  skipped: Dataset["skipped"];
  check: Dataset["check"];
}

// Dates are stored as plain "YYYY-MM-DD" (local calendar date) so no timezone can shift them.
const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function saveSession(data: Dataset, fileInfo: string): void {
  try {
    const stored: Stored = {
      fileInfo,
      interns: data.interns.map(({ status: _status, startDate, endDate, ...rest }) => ({
        ...rest,
        startDate: toKey(startDate),
        endDate: toKey(endDate),
      })),
      skipped: data.skipped,
      check: data.check,
    };
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Storage can be full or blocked (private windows, strict settings). The dashboard still works, it just won't survive a refresh.
  }
}

export function loadSession(today: Date = new Date()): { data: Dataset; fileInfo: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (!Array.isArray(stored.interns) || typeof stored.fileInfo !== "string") return null;

    const interns: Intern[] = stored.interns.map((i) => {
      const startDate = fromKey(i.startDate);
      const endDate = fromKey(i.endDate);
      return { ...i, startDate, endDate, status: getStatus(startDate, endDate, i.cancelled, today) };
    });
    return { data: { interns, skipped: stored.skipped ?? [], check: stored.check }, fileInfo: stored.fileInfo };
  } catch {
    return null; // unreadable or old format: behave as if nothing was saved
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}