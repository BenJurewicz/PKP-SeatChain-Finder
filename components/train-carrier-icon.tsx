"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface TrainCarrierIconProps {
  carrierId: string;
  className?: string;
}

const CARRIER_ICONS: Record<string, { src: string; width: number; height: number }> = {
  EIP: { src: "/icons/eip.svg", width: 32, height: 24 },
  IC: { src: "/icons/ic.svg", width: 22, height: 24 },
  TLK: { src: "/icons/tlk.svg", width: 26, height: 16 },
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
  const icon = CARRIER_ICONS[upperCarrierId];
  const colorClasses = CARRIER_COLORS[upperCarrierId];

  // Known carriers (EIP/IC/TLK) render their brand logo — no extra pill needed.
  // The colored type pill is the fallback for carriers without a logo asset.
  // A numeric carrier id is just the train number (already shown in the train
  // name), so nothing is rendered for it.
  if (icon) {
    return (
      <Image
        src={icon.src}
        alt={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
        width={icon.width}
        height={icon.height}
        className={cn("h-6 w-auto flex-none", className)}
      />
    );
  }

  const isRenderableType = upperCarrierId !== "" && !/^\d+$/.test(upperCarrierId);
  if (!isRenderableType) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
        colorClasses || "bg-muted text-foreground border-border",
      )}
      title={CARRIER_NAMES[upperCarrierId] || upperCarrierId}
    >
      {upperCarrierId}
    </span>
  );
}
