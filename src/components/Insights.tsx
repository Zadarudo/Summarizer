import type { CountItem, summarize } from "../lib/pkl-core";
import type { Filters } from "./InternTable";

type Summary = ReturnType<typeof summarize>;

const panel = "rounded-lg border border-slate-200 bg-white p-4";
const BAR_MAX_PX = 120;

// Vertical bars, one per year. Click a bar to filter the table to that year.
export function YearChart({ items, selected, onSelect }: { items: CountItem[]; selected: string; onSelect: (year: string) => void }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className={panel}>
      <h2 className="mb-4 text-sm font-medium text-slate-600">Interns by year joined</h2>
      <div className="flex items-end gap-3">
        {items.map((i) => {
          const on = selected === i.label;
          return (
            <button
              key={i.label}
              type="button"
              onClick={() => onSelect(on ? "" : i.label)}
              aria-label={`${i.label}: ${i.count} interns`}
              className="group flex flex-1 flex-col items-center justify-end gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <span className="text-sm tabular-nums text-slate-700">{i.count}</span>
              <span
                className={`w-full rounded-t transition-colors ${on ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-500"}`}
                style={{ height: Math.max(4, Math.round((i.count / max) * BAR_MAX_PX)) }}
              />
              <span className="text-xs text-slate-500">{i.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BarList({ title, items, onPick }: { title: string; items: CountItem[]; onPick: (label: string) => void }) {
  const top = items.slice(0, 6);
  const max = Math.max(1, top[0]?.count ?? 1);
  return (
    <div className={panel}>
      <h2 className="mb-3 text-sm font-medium text-slate-600">{title}</h2>
      <ul className="space-y-3">
        {top.map((i) => (
          <li key={i.label}>
            <button type="button" onClick={() => onPick(i.label)} className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">{i.label}</span>
                <span className="tabular-nums text-slate-500">{i.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-slate-100">
                <div className="h-1.5 rounded bg-slate-700" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      {items.length > top.length && <p className="mt-3 text-xs text-slate-400">Top {top.length} of {items.length}</p>}
    </div>
  );
}

// Top schools, majors and units. Clicking a row filters the table below.
export function TopLists({ summary, filters, onChange }: { summary: Summary; filters: Filters; onChange: (f: Filters) => void }) {
  const search = (label: string) => onChange({ ...filters, query: label === "(blank)" ? "" : label });
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <BarList title="Top schools / campuses" items={summary.bySchool} onPick={search} />
      <BarList title="Top majors" items={summary.byMajor} onPick={search} />
      <BarList title="Interns by unit" items={summary.byUnit} onPick={(label) => onChange({ ...filters, unit: label })} />
    </div>
  );
}