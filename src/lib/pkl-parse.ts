// pkl-parse.ts
// The ONLY file that touches the Excel reader. Everything happens in the browser:
// the file is never uploaded anywhere.
//
// Install the reader from SheetJS's own server (the npm copy is outdated):
//   npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
// (check docs.sheetjs.com for the current version if that link ever stops working)
//
// If the data source changes later (Google Sheets, an API...), only this file changes.

import * as XLSX from "xlsx";
import { buildDataset, type Dataset } from "./pkl-core";

const PREFERRED_SHEET = "Raw Data Master";

export async function readPklFile(file: File): Promise<Dataset> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // 1) the sheet we expect, 2) otherwise the first sheet that has the right columns
  const names = [PREFERRED_SHEET, ...workbook.SheetNames.filter((n) => n !== PREFERRED_SHEET)];
  let lastError: Error | null = null;

  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
    try {
      return buildDataset(rows);
    } catch (e) {
      if (name === PREFERRED_SHEET) lastError = e as Error; // report problems with the expected sheet first
      else lastError = lastError ?? (e as Error);
    }
  }

  throw lastError ?? new Error("This file has no readable sheets.");
}