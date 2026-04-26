/**
 * Decorative SVG geometric shapes for KPI cards.
 * "Modern International Geometric" aesthetic — abstract 3D-like patterns
 * positioned in card corners. Tonal variants of brand colors.
 */

type Tone = "teal" | "coral" | "mixed";

interface DecorProps {
  tone?: Tone;
  className?: string;
}

/* Intersecting cylinders + dotted grid */
export function CylindersDecor({ tone = "teal", className }: DecorProps) {
  const main = tone === "coral" ? "hsl(10 93% 69%)" : "hsl(174 51% 47%)";
  const soft = tone === "coral" ? "hsl(10 93% 80%)" : "hsl(174 51% 65%)";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`cyl-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={main} stopOpacity="0.9" />
          <stop offset="1" stopColor={main} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* dotted grid */}
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={6 + c * 8} cy={6 + r * 8} r="1" fill={soft} opacity="0.5" />
        ))
      )}
      {/* back cylinder */}
      <ellipse cx="78" cy="48" rx="22" ry="6" fill={soft} opacity="0.6" />
      <rect x="56" y="48" width="44" height="42" fill={soft} opacity="0.55" />
      <ellipse cx="78" cy="90" rx="22" ry="6" fill={main} opacity="0.7" />
      {/* front cylinder */}
      <ellipse cx="58" cy="62" rx="18" ry="5" fill={`url(#cyl-${tone})`} />
      <rect x="40" y="62" width="36" height="42" fill={`url(#cyl-${tone})`} />
      <ellipse cx="58" cy="104" rx="18" ry="5" fill={main} />
    </svg>
  );
}

/* Striped semi-circle */
export function StripedArcDecor({ tone = "coral", className }: DecorProps) {
  const main = tone === "coral" ? "hsl(10 93% 69%)" : "hsl(174 51% 47%)";
  const soft = tone === "coral" ? "hsl(10 93% 85%)" : "hsl(174 51% 78%)";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`arc-clip-${tone}`}>
          <path d="M 10 110 A 60 60 0 0 1 110 110 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#arc-clip-${tone})`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <rect
            key={i}
            x="0"
            y={50 + i * 9}
            width="120"
            height="5"
            fill={i % 2 === 0 ? main : soft}
            opacity={i % 2 === 0 ? 0.85 : 0.55}
          />
        ))}
      </g>
      {/* small overlapping sphere */}
      <circle cx="100" cy="38" r="14" fill={soft} opacity="0.6" />
      <circle cx="100" cy="38" r="14" fill={`url(#sphere-${tone})`} opacity="0.9" />
      <defs>
        <radialGradient id={`sphere-${tone}`} cx="0.35" cy="0.35">
          <stop offset="0" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor={main} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* Overlapping spheres */
export function SpheresDecor({ tone = "mixed", className }: DecorProps) {
  const c1 = "hsl(174 51% 47%)";
  const c2 = "hsl(10 93% 69%)";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="sph1" cx="0.3" cy="0.3">
          <stop offset="0" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor={c1} stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id="sph2" cx="0.3" cy="0.3">
          <stop offset="0" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor={c2} stopOpacity="0.95" />
        </radialGradient>
      </defs>
      {/* faint dots backdrop */}
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={6 + c * 9} cy={6 + r * 9} r="1" fill={c1} opacity="0.3" />
        ))
      )}
      <circle cx="55" cy="80" r="32" fill="url(#sph1)" opacity={tone === "coral" ? 0.4 : 0.95} />
      <circle cx="92" cy="58" r="22" fill="url(#sph2)" opacity={tone === "teal" ? 0.4 : 0.95} />
      <circle cx="78" cy="98" r="14" fill={c2} opacity="0.6" />
    </svg>
  );
}

/* Stacked rings + grid */
export function RingsDecor({ tone = "teal", className }: DecorProps) {
  const main = tone === "coral" ? "hsl(10 93% 69%)" : "hsl(174 51% 47%)";
  const soft = tone === "coral" ? "hsl(10 93% 85%)" : "hsl(174 51% 80%)";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {Array.from({ length: 4 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={8 + c * 9} cy={8 + r * 9} r="1.2" fill={soft} opacity="0.5" />
        ))
      )}
      <circle cx="80" cy="80" r="32" fill="none" stroke={soft} strokeWidth="6" opacity="0.75" />
      <circle cx="80" cy="80" r="22" fill="none" stroke={main} strokeWidth="6" opacity="0.85" />
      <circle cx="80" cy="80" r="10" fill={main} />
      <circle cx="80" cy="80" r="4" fill="white" opacity="0.85" />
    </svg>
  );
}