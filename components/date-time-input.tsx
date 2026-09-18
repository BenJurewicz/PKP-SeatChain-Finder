"use client";

import { Input } from "@/components/ui/input";
import { forwardRef } from "react";
import { toPolishIsoString } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
  date?: string;
  time?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
  /** Large single-question wizard style. */
  large?: boolean;
}

export const DateTimeInput = forwardRef<HTMLDivElement, DateTimeInputProps>(
  function DateTimeInput({ date, time, onDateChange, onTimeChange, disabled, large = false }, ref) {
    const todayStr = toPolishIsoString(new Date()).split("T")[0];

    return (
      <div ref={ref} className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium">
            Date
          </label>
          <Input
            id="date"
            type="date"
            value={date ?? ""}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={disabled}
            min={todayStr}
            className={cn(large && "h-12 text-base")}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="time" className="text-sm font-medium">
            Time
          </label>
          <Input
            id="time"
            type="time"
            value={time ?? ""}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className={cn(large && "h-12 text-base")}
          />
        </div>
      </div>
    );
  }
);
