import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a seat string in "carriage:seat" format.
 * @param seat - The seat string (e.g., "10:42") or null
 * @returns Object with carriage and seat numbers, or both null if input is null
 * @example
 * parseSeat("10:42") // => { carriage: "10", seat: "42" }
 * parseSeat(null) // => { carriage: null, seat: null }
 * parseSeat("42") // => { carriage: null, seat: "42" } (malformed, no colon)
 */
export function parseSeat(seat: string | null): { carriage: string | null; seat: string | null } {
  if (!seat) {
    return { carriage: null, seat: null };
  }
  
  const parts = seat.split(":");
  if (parts.length === 2) {
    return { carriage: parts[0], seat: parts[1] };
  }
  
  // Malformed string (no colon) - treat as seat only
  return { carriage: null, seat };
}

