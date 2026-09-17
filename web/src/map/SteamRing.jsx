import { useMeta } from '../state/MetaProvider.jsx';
import styles from './SteamRing.module.css';
import { NEUTRAL_COLOR, ringGeometry, ringSegments, STEAM_ORDER } from './steamRing.js';

export function SteamRing({ profile, size = 40, stroke = 6, dashed = false, label, title }) {
  const { colorByCode } = useMeta();
  const { radius, circumference, center } = ringGeometry(size, stroke);
  const segments = dashed
    ? [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }]
    : ringSegments(profile, colorByCode, circumference);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.ring}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
      {segments.map((s, index) => (
        <circle
          key={s.code ?? index}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={dashed ? '4 3' : `${s.length} ${circumference - s.length}`}
          strokeDashoffset={-s.offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ))}
      {label && (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className={styles.label}>
          {label}
        </text>
      )}
    </svg>
  );
}

// Текстова розшифровка кільця — кольори не єдиний носій інформації
export function SteamLegend({ profile }) {
  const { categoryByCode } = useMeta();
  const entries = STEAM_ORDER.filter((code) => (profile?.[code] ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <ul className={styles.legend}>
      {entries.map((code) => (
        <li key={code} style={{ '--legend-color': categoryByCode[code].color }}>
          <span className={styles.swatch} aria-hidden="true" />
          {categoryByCode[code].name} · {profile[code]}
        </li>
      ))}
    </ul>
  );
}
