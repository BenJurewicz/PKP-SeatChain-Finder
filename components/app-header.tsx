"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Train } from "lucide-react";
import { cn } from "@/lib/utils";

/** App masthead: logo/title plus the primary nav between the live-search
 * and HAR import flows. Rendered from the root layout so every path gets it. */
export function AppHeader() {
  const activePath = usePathname();
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Train className="h-6 w-6" />
          </span>
          <span className="text-3xl font-bold tracking-tight">Seatway</span>
        </Link>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Your seats on PKP trains, one question at a time — even when none are
        bookable outright.
      </p>
      <nav aria-label="Main" className="flex items-center gap-1 text-sm">
        <HeaderLink href="/" active={activePath === "/"} label="Live search" />
        <HeaderLink href="/import" active={activePath === "/import"} label="Import HAR" />
      </nav>
    </header>
  );
}

function HeaderLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
