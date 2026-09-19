import { cn } from "@/lib/utils";

interface FieldProps {
  /** id of the controlled element this label points at. */
  htmlFor?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Label + control stack used by search form inputs. */
export function Field({ htmlFor, label, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
