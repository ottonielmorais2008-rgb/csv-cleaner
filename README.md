# CSV Cleaner

A browser-only tool that inspects a CSV file, highlights common data-quality issues, and lets you download a cleaned copy. The file never leaves your device.

**Live demo:** [https://ottonielmorais2008-rgb.github.io/csv-cleaner/](https://ottonielmorais2008-rgb.github.io/csv-cleaner/)

## Features

- Open a CSV with drag-and-drop or a file picker, or load a bundled messy sample.
- Preview the table and review an issue summary per column.
- Detect empty cells, leading or trailing whitespace, duplicate rows, values that do not match an inferred column type (for example text in a numeric column), and simple inconsistent date formats.
- Apply fixes: trim whitespace, remove duplicate rows, drop or fill empty cells with a value you choose, and normalize numbers (thousands separators and decimal marks).
- Download the cleaned CSV. Nothing is uploaded.

## Privacy

All parsing, analysis and cleaning run locally in your browser. The page ships with a strict Content Security Policy that includes `connect-src 'none'`, so it cannot make network requests. The sample CSV is bundled with the app and is not fetched at runtime.

## Tech stack

- TypeScript
- Vite
- Papa Parse
- Vitest
- GitHub Pages

## Tests

Unit tests cover type inference, issue detection (empty cells, whitespace, duplicates, type mismatches, inconsistent dates) and cleaning (trim, de-duplicate, fill or drop empties, number normalization, parse/serialize). Run them with:

```bash
npm test
```

## Run locally

```bash
npm ci
npm test
npm run dev
```

Then open the URL printed by Vite (typically `http://127.0.0.1:5173/csv-cleaner/`). Build a production bundle with `npm run build`.

## License

MIT
