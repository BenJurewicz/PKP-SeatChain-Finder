"use client";

import React from "react";
import { Check, MapPinCheckInside } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStepDef {
    key: "details" | "train";
    label: string;
    question: string;
}

/** The questions of the guided flow, in order. Travelers are chosen on the
 * seats page itself; results are the terminus. */
export const WIZARD_STEPS: WizardStepDef[] = [
    { key: "details", label: "Journey", question: "Where and when do you travel?" },
    { key: "train", label: "Train", question: "Which train suits you?" },
];

export const RESULTS_STEP_INDEX = WIZARD_STEPS.length;

interface WizardProgressProps {
    /** 0-based index into WIZARD_STEPS, or RESULTS_STEP_INDEX when arrived. */
    current: number;
    onStepClick?: (index: number) => void;
    className?: string;
}

export function WizardProgress({ current, onStepClick, className }: WizardProgressProps) {
    return (
        <nav
            aria-label="Booking progress"
            className={cn("flex w-full items-center gap-1.5", className)}
        >
            {WIZARD_STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                const clickable = done && onStepClick !== undefined;

                return (
                    <React.Fragment key={step.key}>
                        {i > 0 && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "h-0.5 min-w-2 flex-1 rounded-full",
                                    i <= current ? "bg-primary/70" : "bg-border",
                                )}
                            />
                        )}
                        <button
                            type="button"
                            disabled={!clickable}
                            onClick={clickable ? () => onStepClick?.(i) : undefined}
                            aria-current={active ? "step" : undefined}
                            aria-label={`${done || active ? `Step ${i + 1}: ${step.label}` : `Step ${i + 1}: ${step.label} (not yet answered)`}${clickable ? " — go back to this step" : ""}`}
                            className={cn(
                                "group flex flex-none items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors sm:pr-3",
                                clickable && "cursor-pointer hover:bg-accent",
                                !clickable && "cursor-default",
                                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold transition-colors",
                                    active
                                        ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                                        : done
                                          ? "bg-primary/15 text-primary"
                                          : "bg-muted text-muted-foreground",
                                )}
                            >
                                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <span
                                className={cn(
                                    "hidden text-sm font-medium sm:inline",
                                    active
                                        ? "text-foreground"
                                        : done
                                          ? "text-foreground/80"
                                          : "text-muted-foreground",
                                )}
                            >
                                {step.label}
                            </span>
                        </button>
                    </React.Fragment>
                );
            })}
            <span
                aria-hidden="true"
                className={cn(
                    "h-0.5 min-w-2 flex-1 rounded-full",
                    current === RESULTS_STEP_INDEX ? "bg-primary/70" : "bg-border",
                )}
            />
            <span
                className={cn(
                    "flex h-7 w-7 flex-none items-center justify-center rounded-full transition-colors",
                    current === RESULTS_STEP_INDEX
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                        : "bg-muted text-muted-foreground",
                )}
                title="Your seats"
            >
                <MapPinCheckInside className="h-4 w-4" />
            </span>
            <span
                className={cn(
                    "hidden text-sm font-medium sm:inline",
                    current === RESULTS_STEP_INDEX ? "text-foreground" : "text-muted-foreground",
                )}
            >
                Seats
            </span>
        </nav>
    );
}
