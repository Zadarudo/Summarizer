// pkl-export.ts — downloads the rows currently shown in the table as a CSV file.
// Only the same safe columns the dashboard already uses are exported.

import type { Intern } from "./pkl-core";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

// Quotes a cell. A leading = + - @ would be run as a formula when the CSV is opened in Excel, so it is defused.
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsv(interns: Intern[], filename = "pkl-interns.csv") {
  const header = ["Name", "School/Campus", "Major", "Gender", "Sub Bidang", "Unit", "Mentor", "Start", "End", "Months", "Status"];
  const lines = interns.map((i) =>
    [i.name, i.school, i.major, i.gender, i.subBidang, i.unit, i.mentor, fmt(i.startDate), fmt(i.endDate), i.durationMonths, i.status].map(cell).join(",")
  );
  // BOM so Excel reads accents and symbols correctly
  const blob = new Blob(["﻿" + [header.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}