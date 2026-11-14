import Papa from 'papaparse';
import type { CsvTable } from './types';

function isDelimiterGuessError(message: string): boolean {
  return /auto-detect delimiting character/i.test(message);
}

export function parseCsv(text: string): CsvTable {
  const withoutBom = text.replace(/^\uFEFF/, '');
  const parsed = Papa.parse<string[]>(withoutBom, {
    header: false,
    skipEmptyLines: 'greedy',
    transform: (value) => value,
  });

  const fatalErrors = parsed.errors.filter((error) => !isDelimiterGuessError(error.message));
  if (fatalErrors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    const first = fatalErrors[0];
    throw new Error(first.message || 'Could not parse this CSV file.');
  }

  const rows = (parsed.data ?? [])
    .map((row) => row.map((cell) => (cell ?? '')))
    .filter((row) => row.some((cell) => cell.trim() !== ''));

  if (rows.length === 0) {
    throw new Error('The file does not contain any CSV rows.');
  }

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  const width = headers.length;
  const body = rows.slice(1).map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push('');
    return padded;
  });

  return { headers, rows: body };
}

export function serializeCsv(table: CsvTable): string {
  return Papa.unparse([table.headers, ...table.rows], {
    quotes: false,
    skipEmptyLines: false,
    newline: '\n',
  });
}
