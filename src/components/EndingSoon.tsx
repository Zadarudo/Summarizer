import { useMemo, useState } from "react";
import { endingSoon, type Intern } from "../lib/pkl-core";

const fmt = (d: Date) => d.toLocaleDateString("en-GB");

// Active interns whose internship ends soon. The window is a dropdown so he can change it.
export default function EndingSoon({ interns }: { interns: Intern[] }) {
  const [days, setDays] = useState(30);
  const list = useMemo(() => endingSoon(interns, days), [interns, days]);
  const shown = list.slice(0, 8);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-600">
          Ending soon <span className="tabular-nums text-slate-400">({list.length})</span>
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Ending within"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          {[14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Within {d} days
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No active internships end within {days} days.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {shown.map((i) => (
            <li key={i.row} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{i.name}</div>
                <div className="truncate text-slate-500">{i.school}</div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <div>{fmt(i.endDate)}</div>
                <div className="text-slate-500">{i.daysLeft === 0 ? "today" : i.daysLeft === 1 ? "tomorrow" : `in ${i.daysLeft} days`}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.length > shown.length && <p className="mt-2 text-xs text-slate-400">Showing the first {shown.length} of {list.length}</p>}
    </section>
  );
}