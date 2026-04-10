"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Train, Search, Upload } from "lucide-react";

const links = [
  { href: "/search", label: "Search Connections", icon: Search, match: "/search" },
  { href: "/har", label: "Upload HAR File", icon: Upload, match: "/har" },
] as const;

export function ModeNav() {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 md:px-6">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Train className="h-10 w-10" />
          <h1 className="text-4xl font-bold">Seat Chain Builder</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Find optimal seat arrangements for your train journey
        </p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = pathname === match;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 ${
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}