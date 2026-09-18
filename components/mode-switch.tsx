"use client";

import { Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppMode = "search" | "har";

interface ModeOption {
    value: AppMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeOption[] = [
    {
        value: "search",
        label: "Search connections",
        description: "Look up a train by route and departure time.",
        icon: Search,
    },
    {
        value: "har",
        label: "Upload HAR file",
        description: "Run the pipeline from a captured browser request.",
        icon: Upload,
    },
];

interface ModeSwitchProps {
    mode: AppMode;
    onChange: (mode: AppMode) => void;
    disabled?: boolean;
}

export function ModeSwitch({ mode, onChange, disabled }: ModeSwitchProps) {
    return (
        <div
            role="group"
            aria-label="Input mode"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
            {MODES.map((option) => {
                const Icon = option.icon;
                const selected = mode === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            selected
                                ? "border-primary/60 bg-primary/10"
                                : "border-border bg-card hover:border-muted-foreground/40 hover:bg-accent/50",
                            disabled && "cursor-not-allowed opacity-60"
                        )}
                    >
                        <span
                            className={cn(
                                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                                selected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                            <span
                                className={cn(
                                    "block text-sm font-semibold",
                                    selected ? "text-foreground" : "text-foreground/90"
                                )}
                            >
                                {option.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {option.description}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
