import { cn } from "@/lib/utils";

type PillTone =
  | "neutral"
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "orange";

const TONE_CLASSES: Record<PillTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
};

const TONE_BORDER: Partial<Record<PillTone, string>> = {
  emerald: "border-emerald-500/40",
  amber: "border-amber-500/40",
  red: "border-red-500/40",
  blue: "border-blue-500/40",
  orange: "border-orange-500/40",
};

interface PillProps {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}

/** Small tinted status pill used for seat classes, positions, availability
 * hints, and collision states. Neutral pills read as labels; colored pills
 * as status. */
export function Pill({ tone = "neutral", className, children }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "border",
        TONE_BORDER[tone],
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
