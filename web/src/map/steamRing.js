export const STEAM_ORDER = ['S', 'T', 'E', 'A', 'M'];
export const NEUTRAL_COLOR = '#94A3B8';

export function ringGeometry(size, stroke) {
  const radius = size / 2 - stroke / 2 - 1;
  return { radius, circumference: 2 * Math.PI * radius, center: size / 2 };
}

// Сегменти кільця за кількістю курсів у кожній категорії STEAM
export function ringSegments(profile, colorByCode, circumference, gap = 2) {
  const entries = STEAM_ORDER.map((code) => [code, profile?.[code] ?? 0]).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }];

  const gapLength = entries.length > 1 ? gap : 0;
  let offset = 0;
  return entries.map(([code, count]) => {
    const full = (count / total) * circumference;
    const segment = { code, color: colorByCode[code] ?? NEUTRAL_COLOR, length: Math.max(full - gapLength, 0.5), offset };
    offset += full;
    return segment;
  });
}

export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}

// HTML для L.divIcon. Підпис завжди екранується: назви приходять з публічних заявок.
export function ringSvg({ profile, colorByCode, size, stroke, dashed = false, label = '' }) {
  const { radius, circumference, center } = ringGeometry(size, stroke);
  const segments = dashed
    ? [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }]
    : ringSegments(profile, colorByCode, circumference);
  const fixed = (n) => Number(n.toFixed(2));
  const circles = segments
    .map((s) => {
      const dash = dashed ? '4 3' : `${fixed(s.length)} ${fixed(circumference - s.length)}`;
      return `<circle cx="${center}" cy="${center}" r="${fixed(radius)}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${fixed(-s.offset)}" transform="rotate(-90 ${center} ${center})"/>`;
    })
    .join('');
  const fontSize = label.length > 3 ? Math.round(size * 0.2) : Math.round(size * 0.26);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">` +
    `<circle cx="${center}" cy="${center}" r="${fixed(radius + stroke / 2)}" fill="#fff"/>` +
    circles +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Manrope Variable, sans-serif" font-size="${fontSize}" font-weight="800" fill="#0F172A">${escapeHtml(label)}</text>` +
    `</svg>`
  );
}

export function initials(name) {
  const words = String(name ?? '')
    .replace(/[«»"'’ʼ.,()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const [first, second] = words;
  const isAcronym = first.length > 1 && first === first.toLocaleUpperCase('uk');
  if (isAcronym) return first.length <= 4 ? first : first.slice(0, 2);
  return `${first[0]}${second?.[0] ?? ''}`.toLocaleUpperCase('uk');
}
