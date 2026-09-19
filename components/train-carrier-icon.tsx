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
  EIP: "bg-blue-500/15 text-blue-600 border-blue-500/40 dark:text-blue-300",
  IC: "bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-300",
  TLK: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-300",
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
          "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
          colorClasses || "bg-muted text-foreground border-border",
        )}
        title={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
      >
        {upperCarrierId}
      </span>
    </span>
  );
}
