/**
 * Time and date formatting utilities for Polish timezone.
 * All times in this application use Europe/Warsaw timezone as per AGENTS.md.
 */

const POLISH_TIMEZONE = 'Europe/Warsaw' as const;
const POLISH_LOCALE = 'pl-PL' as const;

/**
 * Formats an ISO timestamp to time string (HH:MM)
 * Returns em-dash for null/undefined/invalid values
 */
export function formatTime(iso: string | undefined | null): string {
  const date = parseWarsawDate(iso);
  if (!date) return '—';
  return date.toLocaleTimeString(POLISH_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: POLISH_TIMEZONE,
  });
}

/** Parse an ISO timestamp, rejecting values like "nonsense" that toLocale*
 * methods silently render as "Invalid Date" instead of throwing. */
function parseWarsawDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats an ISO timestamp to date string (Mon DD)
 */
export function formatDate(iso: string | undefined | null): string {
  const date = parseWarsawDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString(POLISH_LOCALE, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats an ISO timestamp to full date string (Mon DD, YYYY)
 */
export function formatFullDate(iso: string | undefined | null): string {
  const date = parseWarsawDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString(POLISH_LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: POLISH_TIMEZONE,
  });
}

/**
 * Formats an ISO timestamp to date and time string (Mon DD, HH:MM)
 */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/**
 * Formats a duration in seconds to human-readable string (Xh Xm)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Converts a Date to Polish timezone ISO-like string
 */
export function toPolishIsoString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: POLISH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => 
    parts.find(p => p.type === type)?.value ?? '';
  
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}
/**
 * Current Warsaw wall-clock date ("YYYY-MM-DD") and time ("HH:MM"),
 * for default search input values.
 */
export function nowPolish(): { date: string; time: string } {
  const iso = toPolishIsoString(new Date());
  const [date, time] = iso.split('T');
  return { date, time: time.slice(0, 5) };
}
