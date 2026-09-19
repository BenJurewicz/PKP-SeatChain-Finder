"use client";

import { useId, useState } from "react";
import { format, parse } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toPolishIsoString } from "@/lib/formatting";

interface DateTimePickerProps {
  date?: string;
  time?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

/** "YYYY-MM-DD" -> Date at local midnight (avoids UTC-shifted parses). */
function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Polish-language calendar behind a trigger button. Weeks start on Monday
 * and labels come from the `pl` date-fns locale; booking never goes back
 * in time, so past days are disabled. */
function DatePickerField({
  value,
  onChange,
  disabled,
  labelId,
}: {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  labelId: string;
}) {
  const [open, setOpen] = useState(false);
  // parseDateParam cannot fail for today's Warsaw date, so the fallback never
  // fires; it only satisfies the Matcher type (which requires a real Date).
  const today = parseDateParam(toPolishIsoString(new Date()).slice(0, 10)) ?? new Date(0);
  const selected = parseDateParam(value);

  return (
    <div aria-labelledby={labelId}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-12 w-full justify-start px-3 text-base font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 text-muted-foreground" />
            {selected ? format(selected, "EEE d MMM yyyy", { locale: pl }) : "Wybierz datę"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={pl}
            selected={selected}
            defaultMonth={selected ?? today}
            disabled={{ before: today }}
            onSelect={(day) => {
              if (!day) return;
              onChange(format(day, "yyyy-MM-dd"));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Free-form 24-hour "HH:MM" time input. Normalizes "9:05" -> "09:05"
 * on blur and flags values that are not a valid 24h clock time. */
function TimeField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const invalid = value !== "" && !TIME_PATTERN.test(value);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        Godzina
      </label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="HH:MM"
          aria-invalid={invalid}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            // Left-pad a bare "H:MM" so the stored value stays canonical.
            const raw = e.target.value.trim();
            if (TIME_PATTERN.test(raw)) {
              onChange(raw);
            } else if (/^\d:\d\d$/.test(raw)) {
              onChange(`0${raw}`);
            }
          }}
          className="h-12 pl-9 text-base tabular-nums"
        />
        <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {invalid && (
        <p className="text-xs text-destructive">
          Podaj godzinę w formacie 24-godzinnym (np. 14:30).
        </p>
      )}
    </div>
  );
}

/** Date + time picker for the Polish search flow: a themed shadcn Calendar
 * (Monday-first week, Polish labels) and a 24-hour time input. */
export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  disabled,
}: DateTimePickerProps) {
  const dateId = useId();

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <label htmlFor={dateId} className="text-sm font-medium">
          Data
        </label>
        <DatePickerField
          labelId={dateId}
          value={date ?? ""}
          onChange={onDateChange}
          disabled={disabled}
        />
      </div>
      <TimeField value={time ?? ""} onChange={onTimeChange} disabled={disabled} />
    </div>
  );
}
