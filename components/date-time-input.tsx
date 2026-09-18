"use client";

import { Input } from "@/components/ui/input";
import { forwardRef } from "react";
import { toPolishIsoString } from "@/lib/formatting";

interface DateTimeInputProps {
  date?: string;
  time?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

export const DateTimeInput = forwardRef<HTMLDivElement, DateTimeInputProps>(
  function DateTimeInput({ date, time, onDateChange, onTimeChange, disabled }, ref) {
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
            className="h-9"
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
            className="h-9"
          />
        </div>
      </div>
    );
  }
);