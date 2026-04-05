"use client";

import { cn } from "@/lib/utils";

interface CoverageProgressProps {
  covered: number;
  total: number;
  className?: string;
}

export function CoverageProgress({ covered, total, className }: CoverageProgressProps) {
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  const getColorClass = () => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getBackgroundClass = () => {
    if (percentage ===100) return "bg-green-100";
    if (percentage >= 80) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Coverage</span>
        <span className="text-lg font-semibold">{percentage}%</span>
      </div>
      <div className={cn("h-2 w-full overflow-hidden rounded-full", getBackgroundClass())}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", getColorClass())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{covered} of {total} segments have seats</p>
    </div>
  );
}