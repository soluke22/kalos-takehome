export function formatDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function signedDelta(value: number, digits = 1): string {
  const rounded = round(value, digits);
  const prefix = rounded > 0 ? '+' : '';
  return `${prefix}${rounded}`;
}

