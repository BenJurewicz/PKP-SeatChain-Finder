"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  /** Always-visible trigger row title (left, next to an optional icon). */
  title: string;
  /** Optional icon rendered before the title. */
  icon?: React.ReactNode;
  /** Optional extra info next to the title (e.g. item counts). */
  meta?: React.ReactNode;
  /** Accessible label of the toggle button; defaults to the title. */
  ariaLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Card with a disclosure header: the whole header is a toggle, the chevron
 * rotates when open. Consolidates the collapsible pattern used by the
 * HAR instructions, releasing seats, and the detailed segment view.
 */
export function CollapsibleCard({
  title,
  icon,
  meta,
  ariaLabel,
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleCardProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
        <CollapsibleTrigger
          aria-label={ariaLabel}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="truncate font-semibold">{title}</span>
            {meta}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 flex-none text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
