import { applyFixes } from './clean';
import { serializeCsv, parseCsv } from './csv';
import { analyze } from './detect';
import { SAMPLE_CSV, SAMPLE_FILENAME } from './sample';
import type { Analysis, CleanOptions, CsvTable, EmptyStrategy } from './types';

const MAX_BYTES = 8 * 1024 * 1024;
const PREVIEW_ROWS = 200;

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!;
const dropZone = document.querySelector<HTMLLabelElement>('#drop-zone')!;
const loadSample = document.querySelector<HTMLButtonElement>('#load-sample')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const statusEl = document.querySelector<HTMLParagraphElement>('#status')!;
const summaryEl = document.querySelector<HTMLElement>('#summary')!;
const fixesEl = document.querySelector<HTMLElement>('#fixes')!;
const previewEl = document.querySelector<HTMLElement>('#preview')!;

interface AppState {
  filename: string;
  original: CsvTable;
  current: CsvTable;
  analysis: Analysis;
}

let state: AppState | null = null;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function clearView(): void {
  state = null;
  fileInput.value = '';
  summaryEl.hidden = true;
  fixesEl.hidden = true;
  previewEl.hidden = true;
  summaryEl.replaceChildren();
  fixesEl.replaceChildren();
  previewEl.replaceChildren();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function issueClass(analysis: Analysis, row: number, column: number): string {
  const kinds = analysis.cellIssues
    .filter((issue) => issue.row === row && issue.column === column)
    .map((issue) => `issue-${issue.kind}`);
  const isDuplicate = analysis.duplicateGroups.some((group) => group.duplicates.includes(row));
  if (isDuplicate) kinds.push('duplicate');
  return kinds.join(' ');
}

function readOptions(): CleanOptions {
  const empty = (document.querySelector<HTMLInputElement>('input[name="empty-strategy"]:checked')?.value ??
    'keep') as EmptyStrategy;
  return {
    trimWhitespace: document.querySelector<HTMLInputElement>('#fix-trim')?.checked ?? true,
    removeDuplicates: document.querySelector<HTMLInputElement>('#fix-dups')?.checked ?? true,
    normalizeNumbers: document.querySelector<HTMLInputElement>('#fix-numbers')?.checked ?? true,
    emptyCells: empty,
    fillValue: document.querySelector<HTMLInputElement>('#fill-value')?.value ?? '',
  };
}

function renderSummary(current: CsvTable, analysis: Analysis, filename: string): void {
  const formatNote = analysis.columns
    .filter((column) => column.inferredType === 'date' && column.dateFormats.length > 1)
    .map((column) => `${escapeHtml(column.name)}: ${column.dateFormats.join(', ')}`)
    .join('; ');

  summaryEl.innerHTML = `
    <h2 id="summary-heading">Issues in ${escapeHtml(filename)}</h2>
    <p class="hint">${current.rows.length} data row${current.rows.length === 1 ? '' : 's'}, ${current.headers.length} columns.</p>
    <div class="stat-grid">
      <div class="stat"><b>${analysis.totalIssues}</b><span>Total issues</span></div>
      <div class="stat"><b>${analysis.columns.reduce((sum, column) => sum + column.emptyCount, 0)}</b><span>Empty cells</span></div>
      <div class="stat"><b>${analysis.duplicateRowCount}</b><span>Duplicate rows</span></div>
      <div class="stat"><b>${analysis.columns.reduce((sum, column) => sum + column.mismatchCount, 0)}</b><span>Type mismatches</span></div>
    </div>
    <h3>Per column</h3>
    <ul class="column-list">
      ${analysis.columns
        .map(
          (column) => `
        <li>
          <strong>${escapeHtml(column.name)}</strong>
          <span class="pill type">${escapeHtml(column.inferredType)}</span>
          ${column.emptyCount ? `<span class="pill empty">${column.emptyCount} empty</span>` : ''}
          ${column.whitespaceCount ? `<span class="pill whitespace">${column.whitespaceCount} whitespace</span>` : ''}
          ${column.mismatchCount ? `<span class="pill mismatch">${column.mismatchCount} mismatch</span>` : ''}
          ${
            column.inferredType === 'date' && column.dateFormats.length > 1
              ? `<span class="pill date">mixed dates</span>`
              : ''
          }
        </li>`,
        )
        .join('')}
    </ul>
    ${formatNote ? `<p class="hint">Inconsistent date formats — ${formatNote}.</p>` : ''}
  `;
  summaryEl.hidden = false;
}

function renderFixes(): void {
  fixesEl.innerHTML = `
    <h2 id="fixes-heading">Apply fixes</h2>
    <div class="fix-grid">
      <label><input type="checkbox" id="fix-trim" checked /> Trim whitespace</label>
      <label><input type="checkbox" id="fix-dups" checked /> Remove duplicate rows</label>
      <label><input type="checkbox" id="fix-numbers" checked /> Normalize numbers</label>
    </div>
    <fieldset class="fix-grid">
      <legend>Empty cells</legend>
      <label><input type="radio" name="empty-strategy" value="keep" checked /> Leave as they are</label>
      <label><input type="radio" name="empty-strategy" value="drop-rows" /> Remove rows with empty cells</label>
      <label><input type="radio" name="empty-strategy" value="fill" /> Fill empty cells with</label>
      <input type="text" id="fill-value" value="N/A" aria-label="Fill value for empty cells" />
    </fieldset>
    <div class="fix-actions">
      <button type="button" id="apply-fixes">Apply selected fixes</button>
      <button type="button" id="restore" class="ghost">Restore original</button>
      <button type="button" id="download">Download cleaned CSV</button>
    </div>
    <p class="hint">Fixes run in this order: trim, normalize numbers, remove duplicates, then drop or fill empty cells.</p>
  `;
  fixesEl.hidden = false;

  document.querySelector('#apply-fixes')?.addEventListener('click', () => {
    if (!state) return;
    state.current = applyFixes(state.original, readOptions());
    state.analysis = analyze(state.current);
    renderAll();
    setStatus(
      state.analysis.totalIssues === 0
        ? 'Fixes applied. No remaining issues were detected.'
        : `Fixes applied. ${state.analysis.totalIssues} issue${state.analysis.totalIssues === 1 ? '' : 's'} remain.`,
    );
  });

  document.querySelector('#restore')?.addEventListener('click', () => {
    if (!state) return;
    state.current = {
      headers: [...state.original.headers],
      rows: state.original.rows.map((row) => [...row]),
    };
    state.analysis = analyze(state.current);
    renderAll();
    setStatus('Restored the original data.');
  });

  document.querySelector('#download')?.addEventListener('click', () => {
    if (!state) return;
    const csv = serializeCsv(state.current);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const base = state.filename.replace(/\.csv$/i, '') || 'data';
    anchor.href = url;
    anchor.download = `${base}-cleaned.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${anchor.download}. The file was built locally in this tab.`);
  });
}

function renderPreview(current: CsvTable, analysis: Analysis): void {
  const shown = current.rows.slice(0, PREVIEW_ROWS);
  const hiddenCount = current.rows.length - shown.length;

  previewEl.innerHTML = `
    <h2 id="preview-heading">Preview</h2>
    <p class="hint">Cells with issues are highlighted. Duplicate rows (after the first copy) have a red marker.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            ${current.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${shown
            .map(
              (row, rowIndex) => `
            <tr>
              <td>${rowIndex + 1}</td>
              ${row
                .map((cell, columnIndex) => {
                  const classes = issueClass(analysis, rowIndex, columnIndex);
                  const title = analysis.cellIssues
                    .filter((issue) => issue.row === rowIndex && issue.column === columnIndex)
                    .map((issue) => issue.message)
                    .join('; ');
                  return `<td class="${classes}"${title ? ` title="${escapeHtml(title)}"` : ''}>${escapeHtml(cell)}</td>`;
                })
                .join('')}
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    ${hiddenCount > 0 ? `<p class="hint">Showing the first ${PREVIEW_ROWS} rows. ${hiddenCount} more ${hiddenCount === 1 ? 'row is' : 'rows are'} not shown, but all rows are included in the download.</p>` : ''}
  `;
  previewEl.hidden = false;
}

function renderAll(): void {
  if (!state) return;
  renderSummary(state.current, state.analysis, state.filename);
  renderFixes();
  renderPreview(state.current, state.analysis);
}

function loadTable(text: string, filename: string): void {
  const table = parseCsv(text);
  const analysis = analyze(table);
  state = {
    filename,
    original: table,
    current: {
      headers: [...table.headers],
      rows: table.rows.map((row) => [...row]),
    },
    analysis,
  };
  renderAll();
  setStatus(
    `Loaded ${filename}: ${table.rows.length} data row${table.rows.length === 1 ? '' : 's'}, ${analysis.totalIssues} issue${analysis.totalIssues === 1 ? '' : 's'} found.`,
  );
}

async function readFile(file: File): Promise<void> {
  if (file.size > MAX_BYTES) {
    setStatus(`This file is larger than 8 MiB. Choose a smaller CSV.`, true);
    return;
  }
  const text = await file.text();
  loadTable(text, file.name || 'data.csv');
}

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('dragover');
  const file = event.dataTransfer?.files[0];
  if (file) void readFile(file).catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Could not read that file.', true));
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) {
    void readFile(file).catch((error: unknown) =>
      setStatus(error instanceof Error ? error.message : 'Could not read that file.', true),
    );
  }
});

loadSample.addEventListener('click', () => {
  try {
    loadTable(SAMPLE_CSV, SAMPLE_FILENAME);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not load the sample.', true);
  }
});

resetButton.addEventListener('click', () => {
  clearView();
  setStatus('Cleared.');
});
