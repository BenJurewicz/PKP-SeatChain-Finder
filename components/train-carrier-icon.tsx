"use client";

import { cn } from "@/lib/utils";

interface TrainCarrierIconProps {
  carrierId: string;
  className?: string;
}

const CARRIER_ICONS: Record<string, string> = {
  EIP: "/icons/eip.svg",
  IC: "/icons/ic.svg",
  TLK: "/icons/tlk.svg",
};

const CARRIER_COLORS: Record<string, string> = {
  EIP: "bg-blue-600/20 text-blue-700 border-blue-600/50 dark:bg-blue-400/25 dark:text-blue-300 dark:border-blue-400/50",
  IC: "bg-orange-600/20 text-orange-700 border-orange-600/50 dark:bg-orange-400/25 dark:text-orange-300 dark:border-orange-400/50",
  TLK: "bg-emerald-600/20 text-emerald-700 border-emerald-600/50 dark:bg-emerald-400/25 dark:text-emerald-300 dark:border-emerald-400/50",
};

const CARRIER_NAMES: Record<string, string> = {
  EIP: "Express InterCity Premium",
  IC: "InterCity",
  TLK: "Twoje Linie Kolejowe",
};

export function TrainCarrierIcon({ carrierId, className }: TrainCarrierIconProps) {
  const upperCarrierId = carrierId.trim().toUpperCase();
  const iconSrc = CARRIER_ICONS[upperCarrierId];
  const colorClasses = CARRIER_COLORS[upperCarrierId];

  // The train name already contains the numeric train number (e.g. "IC 1546").
  // A pill showing a numeric carrier id would duplicate that number, so only
  // alphabetic carrier types (EIP, IC, TLK, …) get the colored type pill.
  const showTypePill = upperCarrierId !== "" && !/^\d+$/.test(upperCarrierId);

  if (!showTypePill) {
    return null;
  }

  return (
    <span className={cn("inline-flex flex-none items-center gap-1.5", className)}>
      {iconSrc ? (
        <img
          src={iconSrc}
          alt={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
          className="h-6 w-auto"
        />
      ) : null}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
          colorClasses || "bg-muted text-foreground border-border",
        )}
        title={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
      >
        {upperCarrierId}
      </span>
    </span>
  );
}
