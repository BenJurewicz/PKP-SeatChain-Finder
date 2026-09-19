"use client";

import { TriangleAlert } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";

interface HarInstructionsProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function HarInstructions({ open, onOpenChange }: HarInstructionsProps) {
    return (
        <CollapsibleCard
            title="How to capture the HAR file"
            open={open ?? false}
            onOpenChange={(value) => onOpenChange?.(value)}
        >
            <div className="text-sm">
                <ol className="list-decimal space-y-2 pl-4">
                        <li>
                            Go to{" "}
                            <a
                                href="https://bilkom.pl"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-4"
                            >
                                bilkom.pl
                            </a>{" "}
                            and find your desired train.
                        </li>
                        <li className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            Only direct connections are supported.
                        </li>
                        <li>
                            Click <span className="font-semibold">Buy ticket</span> to proceed.
                        </li>
                        <li>
                            Open browser DevTools (
                            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                F12
                            </kbd>
                            ) → <span className="font-semibold">Network</span> tab.
                        </li>
                        <li>
                            Scroll down, select &ldquo;I choose a seat from a schematic&rdquo;,
                            then click the <span className="font-semibold">Class 2</span> button.
                        </li>
                        <li>
                            In the Network tab, find the request named{" "}
                            <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                                grm
                            </code>{" "}
                            (type: JSON).
                        </li>
                        <li>
                            Right-click → &ldquo;Save all as HAR&rdquo;, then upload the saved{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                .har
                            </code>{" "}
                            file below.
                        </li>
                    </ol>
            </div>
        </CollapsibleCard>
    );
}
