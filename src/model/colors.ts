export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  white: '#ffffff',
  black: '#000000',
};

export function parseColor(input: string | null): RGBA | null {
  if (!input) return null;
  let value = NAMED[input.toLowerCase()] || input.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }
  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (match) {
    const parts = match[1].split(',').map(part => parseFloat(part.trim()));
    if (parts.length >= 3) {
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 1,
      };
    }
  }
  return null;
}

export function rgbaString(color: RGBA): string {
  const channel = (value: number) => Math.round(Math.max(0, Math.min(255, value)));
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${Math.max(
    0,
    Math.min(1, color.a),
  )})`;
}

export function mixColor(a: string | null, b: string | null, t: number): string | null {
  const from = parseColor(a);
  const to = parseColor(b);
  if (!from && !to) return null;

  const fallbackA = from || { ...to!, a: 0 };
  const fallbackB = to || { ...from!, a: 0 };
  return rgbaString({
    r: fallbackA.r + (fallbackB.r - fallbackA.r) * t,
    g: fallbackA.g + (fallbackB.g - fallbackA.g) * t,
    b: fallbackA.b + (fallbackB.b - fallbackA.b) * t,
    a: fallbackA.a + (fallbackB.a - fallbackA.a) * t,
  });
}

export function colorWithAlpha(color: string | null, alpha: number): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;
  return rgbaString({ ...parsed, a: parsed.a * alpha });
}

export function toHex(color: string | null, fallback = '#3ee6c4'): string {
  const parsed = parseColor(color);
  if (!parsed) return fallback;
  const channel = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${channel(parsed.r)}${channel(parsed.g)}${channel(parsed.b)}`;
}
