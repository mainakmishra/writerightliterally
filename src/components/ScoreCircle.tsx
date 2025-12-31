interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreCircle({ score, size = 'md' }: ScoreCircleProps) {
  const sizeConfig = {
    sm: { containerSize: 48, strokeWidth: 3, fontSize: 'text-sm' },
    md: { containerSize: 72, strokeWidth: 4, fontSize: 'text-xl' },
    lg: { containerSize: 100, strokeWidth: 5, fontSize: 'text-3xl' },
  };

  const { containerSize, strokeWidth, fontSize } = sizeConfig[size];
  const radius = (containerSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) return 'text-success stroke-success';
    if (score >= 60) return 'text-warning stroke-warning';
    return 'text-destructive stroke-destructive';
  };

  return (
    <div 
      className="score-circle"
      style={{ width: containerSize, height: containerSize }}
    >
      <svg
        className="transform -rotate-90"
        width={containerSize}
        height={containerSize}
      >
        {/* Background circle */}
        <circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${getScoreColor()} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className={`absolute ${fontSize} font-semibold ${getScoreColor().split(' ')[0]}`}>
        {score}
      </span>
    </div>
  );
}
