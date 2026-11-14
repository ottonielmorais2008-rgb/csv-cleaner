import { describe, expect, it } from 'vitest';
import { analyze, findDuplicateGroups, inferColumnType, isEmptyCell } from '../src/detect';
import type { CsvTable } from '../src/types';

function table(headers: string[], rows: string[][]): CsvTable {
  return { headers, rows };
}

describe('isEmptyCell', () => {
  it('treats blank and whitespace-only cells as empty', () => {
    expect(isEmptyCell('')).toBe(true);
    expect(isEmptyCell('   ')).toBe(true);
    expect(isEmptyCell('0')).toBe(false);
  });
});

describe('inferColumnType', () => {
  it('infers a number column when most values are numeric', () => {
    expect(inferColumnType(['10', '20', '30', 'N/A'])).toBe('number');
  });

  it('infers a date column when most values are dates', () => {
    expect(inferColumnType(['2024-01-15', '15/01/2024', '2024-03-02', 'pending'])).toBe('date');
  });

  it('infers text when values are mixed or mostly non-numeric', () => {
    expect(inferColumnType(['Engineering', 'Sales', 'Support'])).toBe('text');
  });
});

describe('findDuplicateGroups', () => {
  it('keeps the first copy and lists later duplicates', () => {
    const groups = findDuplicateGroups([
      ['Alice', '29'],
      ['Bob', '30'],
      ['Alice', '29'],
      ['Alice', '29'],
    ]);
    expect(groups).toEqual([{ keep: 0, duplicates: [2, 3] }]);
  });
});

describe('analyze', () => {
  it('reports empty cells and whitespace', () => {
    const result = analyze(table(['Name', 'Age'], [['  Alice  ', '29'], ['Bob', '']]));
    expect(result.columns[0].whitespaceCount).toBe(1);
    expect(result.columns[1].emptyCount).toBe(1);
    expect(result.cellIssues.some((issue) => issue.kind === 'empty' && issue.row === 1 && issue.column === 1)).toBe(true);
    expect(result.cellIssues.some((issue) => issue.kind === 'whitespace' && issue.row === 0 && issue.column === 0)).toBe(true);
  });

  it('flags non-numeric values in a numeric column', () => {
    const result = analyze(table(['Age'], [['29'], ['thirty'], ['41']]));
    expect(result.columns[0].inferredType).toBe('number');
    expect(result.columns[0].mismatchCount).toBe(1);
    expect(result.cellIssues.some((issue) => issue.kind === 'type-mismatch' && issue.row === 1)).toBe(true);
  });

  it('flags inconsistent date formats in a date column', () => {
    const result = analyze(
      table(['Signup'], [['2024-01-15'], ['15/01/2024'], ['2024-03-02'], ['01-03-2024']]),
    );
    expect(result.columns[0].inferredType).toBe('date');
    expect(result.columns[0].dateFormats.length).toBeGreaterThan(1);
    expect(result.cellIssues.filter((issue) => issue.kind === 'inconsistent-date')).toHaveLength(4);
  });

  it('does not flag dates when a column uses a single format', () => {
    const result = analyze(table(['Signup'], [['2024-01-15'], ['2024-03-02'], ['2024-02-20']]));
    expect(result.cellIssues.filter((issue) => issue.kind === 'inconsistent-date')).toHaveLength(0);
    expect(result.columns[0].mismatchCount).toBe(0);
  });

  it('counts duplicate rows in the issue total', () => {
    const result = analyze(
      table(
        ['Name', 'Age'],
        [
          ['Alice', '29'],
          ['Bob', '30'],
          ['Alice', '29'],
        ],
      ),
    );
    expect(result.duplicateRowCount).toBe(1);
    expect(result.totalIssues).toBe(1);
  });
});
