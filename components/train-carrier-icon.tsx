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
  EIP: "bg-blue-50 text-blue-900 border-blue-200",
  IC: "bg-orange-50 text-orange-900 border-orange-200",
  TLK: "bg-emerald-50 text-emerald-900 border-emerald-200",
};

const CARRIER_NAMES: Record<string, string> = {
  EIP: "Express InterCity Premium",
  IC: "InterCity",
  TLK: "Twoje Linie Kolejowe",
};

export function TrainCarrierIcon({ carrierId, className }: TrainCarrierIconProps) {
  const upperCarrierId = carrierId.toUpperCase();
  const iconSrc = CARRIER_ICONS[upperCarrierId];
  const colorClasses = CARRIER_COLORS[upperCarrierId];

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
        className={cn("h-6 w-auto", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        colorClasses || "bg-gray-100 text-gray-800 border-gray-200",
        className
      )}
      title={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
    >
      {upperCarrierId}
    </span>
  );
}