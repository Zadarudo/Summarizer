import type { Status, summarize } from "../lib/pkl-core";

type Summary = ReturnType<typeof summarize>;

interface Props {
  summary: Summary;
  selected: Status | "";
  onSelect: (status: Status | "") => void;
}

// Clicking a card filters the table below to that status. Clicking it again clears the filter.
export default function SummaryCards({ summary, selected, onSelect }: Props) {
  const cards: { label: string; value: number; status: Status | ""; dot: string }[] = [
    { label: "Total interns", value: summary.total, status: "", dot: "bg-slate-400" },
    { label: "Aktif", value: summary.byStatus.Aktif, status: "Aktif", dot: "bg-emerald-500" },
    { label: "Sudah Selesai", value: summary.byStatus["Sudah Selesai"], status: "Sudah Selesai", dot: "bg-sky-500" },
    { label: "Belum Mulai", value: summary.byStatus["Belum Mulai"], status: "Belum Mulai", dot: "bg-amber-500" },
    { label: "Cancel", value: summary.byStatus.Cancel, status: "Cancel", dot: "bg-rose-500" },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const isOn = c.status !== "" && selected === c.status;
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => onSelect(isOn ? "" : c.status)}
            className={`rounded-lg border bg-white p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
              isOn ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`h-2 w-2 rounded-full ${c.dot}`} />
              {c.label}
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{c.value}</div>
          </button>
        );
      })}
    </section>
  );
}