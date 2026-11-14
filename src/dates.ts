export interface DateFormat {
  name: string;
  test: (value: string) => boolean;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function ymdFromParts(raw: string, order: 'ymd' | 'dmy'): boolean {
  const parts = raw.split(/[-/.]/);
  if (parts.length !== 3) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n))) return false;
  if (order === 'ymd') return isValidYmd(nums[0], nums[1], nums[2]);
  return isValidYmd(nums[2], nums[1], nums[0]);
}

export const DATE_FORMATS: DateFormat[] = [
  {
    name: 'YYYY-MM-DD',
    test: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && ymdFromParts(value, 'ymd'),
  },
  {
    name: 'YYYY/MM/DD',
    test: (value) => /^\d{4}\/\d{2}\/\d{2}$/.test(value) && ymdFromParts(value, 'ymd'),
  },
  {
    name: 'DD/MM/YYYY',
    test: (value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value) && ymdFromParts(value, 'dmy'),
  },
  {
    name: 'DD-MM-YYYY',
    test: (value) => /^\d{2}-\d{2}-\d{4}$/.test(value) && ymdFromParts(value, 'dmy'),
  },
  {
    name: 'DD.MM.YYYY',
    test: (value) => /^\d{2}\.\d{2}\.\d{4}$/.test(value) && ymdFromParts(value, 'dmy'),
  },
];

export function detectDateFormat(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  for (const format of DATE_FORMATS) {
    if (format.test(trimmed)) return format.name;
  }
  return null;
}

export function isDateCell(value: string): boolean {
  return detectDateFormat(value) !== null;
}
