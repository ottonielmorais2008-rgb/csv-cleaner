import { detectDateFormat, isDateCell } from './dates';
import { isNumericCell } from './numbers';
import type { Analysis, CellIssue, ColumnReport, ColumnType, CsvTable, DuplicateGroup } from './types';

const TYPE_THRESHOLD = 0.6;

export function isEmptyCell(value: string): boolean {
  return value.trim() === '';
}

export function hasWhitespace(value: string): boolean {
  return value !== value.trim();
}

export function inferColumnType(values: string[]): ColumnType {
  const filled = values.filter((value) => !isEmptyCell(value));
  if (filled.length === 0) return 'empty';

  const dateCount = filled.filter((value) => isDateCell(value)).length;
  const numberCount = filled.filter((value) => isNumericCell(value) && !isDateCell(value)).length;

  if (dateCount / filled.length >= TYPE_THRESHOLD) return 'date';
  if (numberCount / filled.length >= TYPE_THRESHOLD) return 'number';
  return 'text';
}

function rowKey(row: string[]): string {
  return row.join('\u0000');
}

export function findDuplicateGroups(rows: string[][]): DuplicateGroup[] {
  const firstIndex = new Map<string, number>();
  const groups = new Map<number, number[]>();

  rows.forEach((row, index) => {
    const key = rowKey(row);
    const existing = firstIndex.get(key);
    if (existing === undefined) {
      firstIndex.set(key, index);
      return;
    }
    const list = groups.get(existing);
    if (list) list.push(index);
    else groups.set(existing, [index]);
  });

  return [...groups.entries()].map(([keep, duplicates]) => ({ keep, duplicates }));
}

export function analyze(table: CsvTable): Analysis {
  const columns: ColumnReport[] = table.headers.map((name, index) => {
    const values = table.rows.map((row) => row[index] ?? '');
    const inferredType = inferColumnType(values);
    const dateFormats = [
      ...new Set(values.map((value) => detectDateFormat(value)).filter((name): name is string => name !== null)),
    ];

    return {
      index,
      name: name || `Column ${index + 1}`,
      inferredType,
      emptyCount: values.filter(isEmptyCell).length,
      whitespaceCount: values.filter(hasWhitespace).length,
      mismatchCount: 0,
      dateFormats,
    };
  });

  const cellIssues: CellIssue[] = [];

  table.rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const column = columns[columnIndex];
      if (!column) return;

      if (isEmptyCell(value)) {
        cellIssues.push({
          kind: 'empty',
          row: rowIndex,
          column: columnIndex,
          message: 'Empty cell',
        });
      }

      if (hasWhitespace(value)) {
        cellIssues.push({
          kind: 'whitespace',
          row: rowIndex,
          column: columnIndex,
          message: 'Leading or trailing whitespace',
        });
      }

      if (!isEmptyCell(value) && column.inferredType === 'number' && !isNumericCell(value)) {
        cellIssues.push({
          kind: 'type-mismatch',
          row: rowIndex,
          column: columnIndex,
          message: `Value does not match inferred type (${column.inferredType})`,
        });
        column.mismatchCount += 1;
      }

      if (!isEmptyCell(value) && column.inferredType === 'date') {
        if (!isDateCell(value)) {
          cellIssues.push({
            kind: 'type-mismatch',
            row: rowIndex,
            column: columnIndex,
            message: `Value does not match inferred type (${column.inferredType})`,
          });
          column.mismatchCount += 1;
        } else if (column.dateFormats.length > 1) {
          cellIssues.push({
            kind: 'inconsistent-date',
            row: rowIndex,
            column: columnIndex,
            message: `Date format differs from others in this column (${column.dateFormats.join(', ')})`,
          });
        }
      }
    });
  });

  const duplicateGroups = findDuplicateGroups(table.rows);
  const duplicateRowCount = duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0);
  const totalIssues = cellIssues.length + duplicateRowCount;

  return { columns, cellIssues, duplicateGroups, duplicateRowCount, totalIssues };
}
