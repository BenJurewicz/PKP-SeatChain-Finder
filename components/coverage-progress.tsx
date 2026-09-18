"use client";

import { cn } from "@/lib/utils";

interface CoverageProgressProps {
  covered: number;
  total: number;
  className?: string;
}

export function CoverageProgress({ covered, total, className }: CoverageProgressProps) {
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  const getBarClass = () => {
    if (percentage === 100) return "bg-emerald-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTrackClass = () => {
    if (percentage === 100) return "bg-emerald-500/15";
    if (percentage >= 80) return "bg-amber-500/15";
    return "bg-red-500/15";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Coverage</span>
        <span className="text-lg font-semibold tabular-nums">{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Seat coverage"
        className={cn("h-2 w-full overflow-hidden rounded-full", getTrackClass())}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", getBarClass())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {covered} of {total} traveler segments have seats
      </p>
    </div>
  );
}
