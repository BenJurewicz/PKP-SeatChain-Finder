import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinning loader icon with the standard size applied. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} aria-hidden="true" />;
}

interface LoadingButtonLabelProps {
  loading: boolean;
  loadingText: string;
  text: React.ReactNode;
  icon?: React.ReactNode;
  /** Explicit tailwind size class for the icon; defaults to size-4. */
  className?: string;
}

/** Standard label for buttons that kick off async work: spinner + text while
 * loading, icon + text otherwise. */
export function LoadingButtonLabel({
  loading,
  loadingText,
  text,
  icon,
  className,
}: LoadingButtonLabelProps) {
  if (loading) {
    return (
      <>
        <Spinner className={cn("size-4", className)} />
        {loadingText}
      </>
    );
  }
  return (
    <>
      {icon}
      {text}
    </>
  );
}
