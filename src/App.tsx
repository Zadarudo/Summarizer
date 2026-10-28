// App.tsx — page layout. The data rules live in src/lib/pkl-core.ts.

import { useMemo, useState, type ChangeEvent } from "react";
import { readPklFile } from "./lib/pkl-parse";
import { summarize, type Dataset } from "./lib/pkl-core";
import SummaryCards from "./components/SummaryCards";
import { YearChart, TopLists } from "./components/Insights";
import EndingSoon from "./components/EndingSoon";
import InternTable, { emptyFilters, type Filters } from "./components/InternTable";

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      setData(await readPklFile(file));
      setFilters(emptyFilters);
      setFileInfo(`${file.name}, file last saved ${new Date(file.lastModified).toLocaleDateString("en-GB")}`);
    } catch (err) {
      setError((err as Error).message);
    }
    e.target.value = ""; // lets the same file be chosen again after it changes
  }

  const summary = useMemo(() => (data ? summarize(data.interns) : null), [data]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-black">PKL interns</h1>
            <p className="text-sm text-slate-500">{data ? fileInfo : "Upload the master Excel file to begin."}</p>
          </div>
          <label className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 hover:bg-slate-700">
            {data ? "Upload a newer file" : "Choose Excel file"}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="sr-only" />
          </label>
        </header>

        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {data && summary && (
          <>
            <SummaryCards
              summary={summary}
              selected={filters.status}
              onSelect={(status) => setFilters({ ...filters, status })}
            />

            <EndingSoon interns={data.interns} />

            <YearChart
              items={summary.byYear}
              selected={filters.year}
              onSelect={(year) => setFilters({ ...filters, year })}
            />
            <TopLists summary={summary} filters={filters} onChange={setFilters} />

            <InternTable interns={data.interns} filters={filters} onChange={setFilters} />

            <details className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <summary className="cursor-pointer font-medium">Data check</summary>
              <div className="mt-3 space-y-1 text-slate-600">
                <p>Rows read: {data.interns.length}. Rows skipped: {data.skipped.length}.</p>
                <p>Compared with values saved in the file: duration differs in {data.check.durationDiffers}, year differs in {data.check.yearDiffers} (both should be 0).</p>
                <p>Status differs in {data.check.statusDiffers}. That is normal when the file was last calculated on an earlier day; this page uses today's date.</p>
                {data.skipped.slice(0, 20).map((r) => (
                  <p key={r.row}>Row {r.row}: {r.reason}</p>
                ))}
              </div>
            </details>
          </>
        )}
      </main>
    </div>
  );
}