/**
 * Circular score indicator for IELTS band scores (0-9).
 * Extracted from StudentPerformancePage for reuse across admin/teacher views.
 */
export default function ScoreRing({
  score,
  size = 56,
  strokeWidth = 5,
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = score != null ? Math.min(score / 9, 1) : 0;
  const offset = circumference * (1 - normalizedScore);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth}
        />
        {score != null && (
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{score != null ? score : "—"}</span>
      </div>
    </div>
  );
}
