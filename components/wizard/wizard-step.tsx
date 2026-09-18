"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerChip {
    label: string;
    onClick: () => void;
    ariaLabel?: string;
}

interface WizardStepProps {
    /** Big question heading, e.g. "Where are you headed?" */
    title: string;
    /** One-line guidance under the question. */
    description?: string;
    /** Prior answers shown as clickable chips to jump back. */
    chips?: AnswerChip[];
    children: React.ReactNode;
    /** Bottom row: back link and primary continue action. */
    footer?: React.ReactNode;
    /** Wider card for steps with lots of content (trip list, results). */
    wide?: boolean;
    className?: string;
}

export function WizardStep({
    title,
    description,
    chips,
    children,
    footer,
    wide = false,
    className,
}: WizardStepProps) {
    return (
        <section
            className={cn(
                "rounded-3xl border bg-card shadow-sm",
                wide ? "w-full" : "mx-auto w-full max-w-2xl",
                className,
            )}
        >
            <div className="p-6 md:p-8">
                {chips && chips.length > 0 ? (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {chips.map((chip, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={chip.onClick}
                                aria-label={chip.ariaLabel ?? `Change: ${chip.label}`}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <span className="truncate">{chip.label}</span>
                            </button>
                        ))}
                    </div>
                ) : null}

                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                {description ? (
                    <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
                        {description}
                    </p>
                ) : null}

                <div className="mt-6">{children}</div>
            </div>

            {footer ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 md:px-8">
                    {footer}
                </div>
            ) : null}
        </section>
    );
}

export function WizardBackButton({
    onClick,
    label = "Back",
}: {
    onClick: () => void;
    label?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
            <ChevronLeft className="h-4 w-4" />
            {label}
        </button>
    );
}
