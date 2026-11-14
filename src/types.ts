export type ColumnType = 'number' | 'date' | 'text' | 'empty';

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export type CellIssueKind = 'empty' | 'whitespace' | 'type-mismatch' | 'inconsistent-date';

export interface CellIssue {
  kind: CellIssueKind;
  row: number;
  column: number;
  message: string;
}

export interface DuplicateGroup {
  keep: number;
  duplicates: number[];
}

export interface ColumnReport {
  index: number;
  name: string;
  inferredType: ColumnType;
  emptyCount: number;
  whitespaceCount: number;
  mismatchCount: number;
  dateFormats: string[];
}

export interface Analysis {
  columns: ColumnReport[];
  cellIssues: CellIssue[];
  duplicateGroups: DuplicateGroup[];
  duplicateRowCount: number;
  totalIssues: number;
}

export type EmptyStrategy = 'keep' | 'drop-rows' | 'fill';

export interface CleanOptions {
  trimWhitespace: boolean;
  removeDuplicates: boolean;
  emptyCells: EmptyStrategy;
  fillValue: string;
  normalizeNumbers: boolean;
}
