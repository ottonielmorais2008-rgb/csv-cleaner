/**
 * Parse a numeric cell. Accepts spaces, optional leading +/-,
 * thousands separators, and either a dot or a comma as the decimal mark.
 * Returns null when the value is not a number.
 */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[eE]/.test(trimmed)) return null;

  let signed = trimmed;
  let sign = 1;
  if (signed.startsWith('+')) signed = signed.slice(1);
  else if (signed.startsWith('-')) {
    sign = -1;
    signed = signed.slice(1);
  }
  if (!signed) return null;

  const lastDot = signed.lastIndexOf('.');
  const lastComma = signed.lastIndexOf(',');
  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(signed)) return null;
      normalized = signed.replace(/,/g, '');
    } else {
      if (!/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(signed)) return null;
      normalized = signed.replace(/\./g, '').replace(',', '.');
    }
  } else if (lastComma !== -1) {
    const fraction = signed.slice(lastComma + 1);
    const integer = signed.slice(0, lastComma);
    if (fraction.length === 3 && integer !== '' && !integer.includes(',')) {
      if (!/^\d{1,3}(,\d{3})+$/.test(signed)) return null;
      normalized = signed.replace(/,/g, '');
    } else {
      if (!/^\d+(,\d+)?$/.test(signed)) return null;
      normalized = signed.replace(',', '.');
    }
  } else if (lastDot !== -1) {
    const fraction = signed.slice(lastDot + 1);
    const integer = signed.slice(0, lastDot);
    if (fraction.length === 3 && integer !== '' && !integer.includes('.')) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(signed)) return null;
      normalized = signed.replace(/\./g, '');
    } else {
      if (!/^\d+(\.\d+)?$/.test(signed)) return null;
      normalized = signed;
    }
  } else {
    if (!/^\d+$/.test(signed)) return null;
    normalized = signed;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return sign * parsed;
}

export function decimalPlacesOf(value: string): number {
  const trimmed = value.trim().replace(/^[+-]/, '');
  const lastDot = trimmed.lastIndexOf('.');
  const lastComma = trimmed.lastIndexOf(',');
  if (lastDot === -1 && lastComma === -1) return 0;
  const decimalIndex = lastDot > lastComma ? lastDot : lastComma;
  const fraction = trimmed.slice(decimalIndex + 1);
  if (!/^\d+$/.test(fraction)) return 0;
  if (
    fraction.length === 3 &&
    ((lastDot > lastComma && !trimmed.slice(0, lastDot).includes('.') && !trimmed.includes(',')) ||
      (lastComma > lastDot && !trimmed.slice(0, lastComma).includes(',') && !trimmed.includes('.')))
  ) {
    return 0;
  }
  return fraction.length;
}

export function formatNumber(n: number, original: string): string {
  const places = Math.min(decimalPlacesOf(original), 6);
  if (places > 0) return n.toFixed(places);
  return Number.isInteger(n) ? String(n) : String(n);
}

export function isNumericCell(value: string): boolean {
  return parseNumber(value) !== null;
}
