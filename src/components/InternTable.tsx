import { useMemo, useState } from "react";
import { countBy, type Intern, type Status } from "../lib/pkl-core";

export interface Filters {
  query: string;
  status: Status | "";
  year: string;
  unit: string;
}

export const emptyFilters: Filters = { query: "", status: "", year: "", unit: "" };

const PAGE_SIZE = 25;

const badge: Record<Status, string> = {
  Aktif: "bg-emerald-50 text-emerald-700",
  "Sudah Selesai": "bg-sky-50 text-sky-700",
  "Belum Mulai": "bg-amber-50 text-amber-700",
  Cancel: "bg-rose-50 text-rose-700",
};

const fmt = (d: Date) => d.toLocaleDateString("en-GB"); // DD/MM/YYYY, same as the sheet
const unitOf = (i: Intern) => (i.unit || "(blank)").toLowerCase();

function downloadCsv(rows: Intern[]) {
  const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const data = [
    ["Name", "School / campus", "Major", "Unit", "Start", "End", "Months", "Status"],
    ...rows.map((i) => [i.name, i.school, i.major, i.unit, fmt(i.startDate), fmt(i.endDate), i.durationMonths, i.status]),
  ];
  const csv = data.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "interns.csv";
  link.click();
  // Let the browser begin the download before releasing the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface Props {
  interns: Intern[];
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function InternTable({ interns, filters, onChange }: Props) {
  const [page, setPage] = useState(0);

  const years = useMemo(() => [...new Set(interns.map((i) => String(i.year)))].sort().reverse(), [interns]);
  const units = useMemo(() => countBy(interns, (i) => i.unit).map((u) => u.label), [interns]);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return interns
      .filter((i) => !q || `${i.name} ${i.school} ${i.major}`.toLowerCase().includes(q))
      .filter((i) => !filters.status || i.status === filters.status)
      .filter((i) => !filters.year || String(i.year) === filters.year)
      .filter((i) => !filters.unit || unitOf(i) === filters.unit.toLowerCase())
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime()); // newest first
  }, [interns, filters]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  const update = (patch: Partial<Filters>) => {
    setPage(0);
    onChange({ ...filters, ...patch });
  };

  const field = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900";
  const isFiltered = filters.query || filters.status || filters.year || filters.unit;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          placeholder="Search name, school or major"
          aria-label="Search"
          className={`${field} min-w-64 flex-1`}
        />
        <select value={filters.status} onChange={(e) => update({ status: e.target.value as Status | "" })} aria-label="Status" className={field}>
          <option value="">All statuses</option>
          {(["Aktif", "Sudah Selesai", "Belum Mulai", "Cancel"] as Status[]).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={filters.year} onChange={(e) => update({ year: e.target.value })} aria-label="Year joined" className={field}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select value={filters.unit} onChange={(e) => update({ unit: e.target.value })} aria-label="Unit" className={field}>
          <option value="">All units</option>
          {units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        {isFiltered && (
          <button type="button" onClick={() => update(emptyFilters)} className="px-2 text-sm text-slate-600 underline">
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              {["Name", "School / campus", "Major", "Unit", "Start", "End", "Months", "Status"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((i) => (
              <tr key={i.row} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{i.name}</td>
                <td className="px-3 py-2">{i.school}</td>
                <td className="px-3 py-2">{i.major}</td>
                <td className="whitespace-nowrap px-3 py-2">{i.unit || "-"}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fmt(i.startDate)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fmt(i.endDate)}</td>
                <td className="px-3 py-2 tabular-nums">{i.durationMonths}</td>
                <td className="px-3 py-2">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${badge[i.status]}`}>{i.status}</span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No interns match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span className="flex items-center gap-3">
          {rows.length} of {interns.length} interns
          <button type="button" onClick={() => downloadCsv(rows)} disabled={rows.length === 0} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">
            Download CSV
          </button>
        </span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span className="tabular-nums">
            Page {current + 1} of {pageCount}
          </span>
          <button type="button" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}