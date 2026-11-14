import { formatNumber, parseNumber } from './numbers';
import { isEmptyCell } from './detect';
import type { CleanOptions, CsvTable } from './types';

function cloneTable(table: CsvTable): CsvTable {
  return {
    headers: [...table.headers],
    rows: table.rows.map((row) => [...row]),
  };
}

export function applyFixes(table: CsvTable, options: CleanOptions): CsvTable {
  const next = cloneTable(table);

  if (options.trimWhitespace) {
    for (const row of next.rows) {
      for (let i = 0; i < row.length; i += 1) row[i] = row[i].trim();
    }
  }

  if (options.normalizeNumbers) {
    const numericColumns = next.headers.map((_, index) => {
      const values = next.rows.map((row) => row[index] ?? '');
      const filled = values.filter((value) => !isEmptyCell(value));
      if (filled.length === 0) return false;
      const hits = filled.filter((value) => parseNumber(value) !== null).length;
      return hits / filled.length >= 0.6;
    });

    for (const row of next.rows) {
      row.forEach((value, index) => {
        if (!numericColumns[index] || isEmptyCell(value)) return;
        const parsed = parseNumber(value);
        if (parsed === null) return;
        row[index] = formatNumber(parsed, value);
      });
    }
  }

  if (options.removeDuplicates) {
    const seen = new Set<string>();
    next.rows = next.rows.filter((row) => {
      const key = row.join('\u0000');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (options.emptyCells === 'drop-rows') {
    next.rows = next.rows.filter((row) => row.every((value) => !isEmptyCell(value)));
  } else if (options.emptyCells === 'fill') {
    for (const row of next.rows) {
      for (let i = 0; i < row.length; i += 1) {
        if (isEmptyCell(row[i])) row[i] = options.fillValue;
      }
    }
  }

  return next;
}
