import Papa from 'papaparse';
import type { ZodSchema } from 'zod';

export interface ParseResult<T> {
  rows: T[];
  errors: { row: number; field: string; message: string }[];
}

export function parseCSV<T>(
  csvText: string,
  schema: ZodSchema<T>
): ParseResult<T> {
  const { data: rawRows } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  const rows: T[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2; // 1-based with header
    const result = schema.safeParse(raw);
    if (result.success) {
      rows.push(result.data);
    } else {
      for (const [field, msgs] of Object.entries(
        result.error.flatten().fieldErrors as Record<string, string[]>
      )) {
        errors.push({ row: rowNum, field, message: msgs.join(', ') });
      }
      // If form errors exist (root-level)
      for (const msg of result.error.flatten().formErrors) {
        errors.push({ row: rowNum, field: '_row', message: msg });
      }
    }
  });

  return { rows, errors };
}
