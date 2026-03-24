import type { FC } from "react";

interface ProgressBarProps {
  visitedCount: number;
  totalCount: number;
  color: string;
  isYearly?: boolean;
  stats?: Record<string, number>;
  yearlyColors?: Record<string, string>;
}

const ProgressBar: FC<ProgressBarProps> = ({ 
  visitedCount, totalCount, color, isYearly, stats, yearlyColors 
}) => {
  const percentage = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;

  const defaultYearlyColors = ["#e74c3c", "#3498db", "#9b59b6", "#f1c40f", "#1abc9c", "#e67e22", "#34495e", "#d35400", "#27ae60", "#ff69b4"];
  const getYearlyColor = (year: string) => yearlyColors?.[year] || defaultYearlyColors[parseInt(year) % 10];

  // Prepare segments for yearly view
  const segments = isYearly && stats ? Object.entries(stats)
    .sort((a, b) => b[0].localeCompare(a[0])) // Sort by year desc
    .map(([year, count]) => ({
      year,
      width: (count / totalCount) * 100,
      color: getYearlyColor(year)
    })) : [];

  return (
    <div className="progress-container" style={{ width: "100%" }}>
      <div className="progress-text">
        <span>{isYearly ? "Timeline Progress" : "Visited Countries"}</span>
        <span>{visitedCount} / {totalCount} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="progress-bar-background">
        {isYearly && segments.length > 0 ? (
          segments.map((seg, idx) => (
            <div 
              key={seg.year}
              className="progress-bar-fill"
              style={{ 
                width: `${seg.width}%`, 
                backgroundColor: seg.color,
                position: 'relative',
                float: 'left',
                borderRadius: idx === 0 ? '4px 0 0 4px' : (idx === segments.length - 1 && percentage >= 99.9 ? '0 4px 4px 0' : '0')
              }}
            />
          ))
        ) : (
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color 
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
