import { describe, expect, it } from 'vitest';
import { applyFixes } from '../src/clean';
import { parseCsv, serializeCsv } from '../src/csv';
import type { CleanOptions, CsvTable } from '../src/types';

const none: CleanOptions = {
  trimWhitespace: false,
  removeDuplicates: false,
  emptyCells: 'keep',
  fillValue: '',
  normalizeNumbers: false,
};

function table(headers: string[], rows: string[][]): CsvTable {
  return { headers, rows };
}

describe('applyFixes', () => {
  it('trims leading and trailing whitespace', () => {
    const result = applyFixes(table(['Name'], [['  Alice  '], [' Bob']]), {
      ...none,
      trimWhitespace: true,
    });
    expect(result.rows).toEqual([['Alice'], ['Bob']]);
  });

  it('removes duplicate rows and keeps the first copy', () => {
    const result = applyFixes(
      table(
        ['Name', 'Age'],
        [
          ['Alice', '29'],
          ['Bob', '30'],
          ['Alice', '29'],
        ],
      ),
      { ...none, removeDuplicates: true },
    );
    expect(result.rows).toEqual([
      ['Alice', '29'],
      ['Bob', '30'],
    ]);
  });

  it('fills empty cells with the chosen value', () => {
    const result = applyFixes(table(['Name', 'Dept'], [['Carol', ''], ['Dave', '   ']]), {
      ...none,
      emptyCells: 'fill',
      fillValue: 'N/A',
    });
    expect(result.rows).toEqual([
      ['Carol', 'N/A'],
      ['Dave', 'N/A'],
    ]);
  });

  it('drops rows that contain empty cells', () => {
    const result = applyFixes(
      table(
        ['Name', 'Dept'],
        [
          ['Eve', 'Engineering'],
          ['Carol', ''],
        ],
      ),
      { ...none, emptyCells: 'drop-rows' },
    );
    expect(result.rows).toEqual([['Eve', 'Engineering']]);
  });

  it('normalizes numbers with thousands separators and decimal commas', () => {
    const result = applyFixes(table(['Amount'], [['1,200.50'], ['1.200,50'], ['800']]), {
      ...none,
      normalizeNumbers: true,
    });
    expect(result.rows).toEqual([['1200.50'], ['1200.50'], ['800']]);
  });

  it('trims first so padded duplicates can be removed afterwards', () => {
    const result = applyFixes(
      table(
        ['Name'],
        [
          ['  Alice  '],
          ['Alice'],
        ],
      ),
      { ...none, trimWhitespace: true, removeDuplicates: true },
    );
    expect(result.rows).toEqual([['Alice']]);
  });
});

describe('csv parse and serialize', () => {
  it('parses quoted commas, pads short rows, and drops a BOM', () => {
    const parsed = parseCsv('\uFEFFName,Amount\n"Alice, A.","1,200.50"\nBob');
    expect(parsed.headers).toEqual(['Name', 'Amount']);
    expect(parsed.rows).toEqual([
      ['Alice, A.', '1,200.50'],
      ['Bob', ''],
    ]);
  });

  it('round-trips headers and rows, quoting cells that need it', () => {
    const original = table(['Name', 'Note'], [['Alice', 'hello, world'], ['Bob', 'plain']]);
    const parsed = parseCsv(serializeCsv(original));
    expect(parsed).toEqual(original);
  });

  it('rejects an empty file', () => {
    expect(() => parseCsv('\n\n')).toThrow(/does not contain any CSV rows/i);
  });
});
