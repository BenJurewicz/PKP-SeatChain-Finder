import type {
  SegmentsOutput,
  Station,
  Trip,
  SpecialSeatProperty,
  SpecialSeatFilters,
} from "@/lib/types";
import { detectSpecialSeatProperties } from "@/lib/seat-chain";
import type { TravelerView } from "@/lib/instructions";
import type { SeatChainOutput } from "@/lib/seat-chain";
import type { TripInfo } from "@/lib/types";
import type { SeatRelease } from "@/lib/types";

/**
 * Thin client-side wrappers around the Next.js API routes. Every caller
 * funnels through here so error handling and response shapes stay consistent.
 */

async function postJson<T>(url: string, body: unknown, failure: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as Partial<T> & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? failure);
  }
  return data as T;
}

export async function searchTrips(
  fromStation: Station,
  toStation: Station,
  date: string,
  time: string,
): Promise<Trip[]> {
  const data = await postJson<{ trips: Trip[] }>(
    "/api/trips/search",
    { fromStation, toStation, date, time },
    "Failed to search trips",
  );
  return data.trips ?? [];
}

export async function buildSegments(segmentRequest: unknown): Promise<SegmentsOutput> {
  return await postJson<SegmentsOutput>(
    "/api/segments/build",
    { segmentRequest },
    "Failed to build segments",
  );
}

export interface HarRunResponse {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  reportHtml: string;
  sourceHarName: string;
  segmentsData?: SegmentsOutput;
  detectedSpecialProperties?: SpecialSeatProperty[];
  seatReleases?: SeatRelease[];
  tripInfo?: TripInfo;
}

export async function runHarFile(harFile: File, travelers: number): Promise<HarRunResponse> {
  const formData = new FormData();
  formData.set("harFile", harFile);
  formData.set("travelers", String(travelers));

  const response = await fetch("/api/run", { method: "POST", body: formData });
  const data = (await response.json()) as Partial<HarRunResponse> & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Pipeline failed");
  }
  if (!data.seatChain || !data.travelerViews || !data.reportHtml || !data.sourceHarName) {
    throw new Error("Invalid API response");
  }
  return data as HarRunResponse;
}

/** Seed the special-seat filter state for a freshly built segments bundle:
 * every detected special property starts excluded so the first chain matches
 * what any later recalculation would produce. */
export function initialSpecialFilters(detected: Iterable<SpecialSeatProperty>): SpecialSeatFilters {
  const filters: SpecialSeatFilters = {};
  for (const prop of detected) {
    filters[prop] = false;
  }
  return filters;
}

/** Build initial filter state straight from a segments payload. */
export function initialSpecialFiltersFromSegments(data: SegmentsOutput): SpecialSeatFilters {
  return initialSpecialFilters(Array.from(detectSpecialSeatProperties(data)));
}
