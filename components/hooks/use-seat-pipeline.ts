"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import type { SeatChainOutput } from "@/lib/seat-chain";
import type {
  SegmentsOutput,
  SpecialSeatProperty,
  SpecialSeatFilters,
} from "@/lib/types";
import type { SeatRelease, TripInfo } from "@/lib/types";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { buildSegments, initialSpecialFilters, type HarRunResponse } from "@/lib/api";

/** Result of running the seat-chain pipeline once. */
export interface SeatPipelineOutput {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  reportHtml: string;
  seatReleases: SeatRelease[];
}

export interface SeatPipeline {
  /** Segments bundle, present once the live seat map has been fetched. */
  segmentsData: SegmentsOutput | null;
  /** Fetching the live seat map for the train. */
  segmentsLoading: boolean;
  /** Recomputing chains (travelers/filters changed). */
  building: boolean;
  error: string | null;

  detectedProperties: SpecialSeatProperty[];
  specialFilters: SpecialSeatFilters;
  /** True when the current filters differ from what the output was built with. */
  filtersChanged: boolean;

  travelers: number;
  setTravelers: (value: number) => void;
  setSpecialFilters: (filters: SpecialSeatFilters) => void;

  output: SeatPipelineOutput | null;
  tripInfo: TripInfo | null;

  /** Fetch segments for a train and build the first chain (live search). */
  loadSegments: (segmentRequest: unknown, tripInfo: TripInfo) => Promise<boolean>;
  /** Adopt an already-built segments bundle (HAR flow); builds the first chain. */
  adoptSegments: (segments: SegmentsOutput, tripInfo?: TripInfo) => void;
  /** Adopt a fully prebuilt HAR pipeline response (segments may be absent). */
  adoptHarResponse: (response: HarRunResponse) => void;
  /** Rebuild chains with the current travelers and filters. */
  recalculate: () => Promise<void>;
}

async function buildPipelineOutput(
  segmentsData: SegmentsOutput,
  travelers: number,
  filters: SpecialSeatFilters,
  tripInfo: TripInfo | null,
): Promise<SeatPipelineOutput> {
  const { buildSeatChainOutput } = await import("@/lib/seat-chain");
  const { buildTravelerViews } = await import("@/lib/instructions");
  const { generateStaticReportHtml } = await import("@/lib/report");
  const { extractReleasingSeats } = await import("@/lib/blocked-seats");

  const seatChain = buildSeatChainOutput(segmentsData, travelers, filters);
  const travelerViews = buildTravelerViews(seatChain);
  const seatReleases = extractReleasingSeats(segmentsData);
  const reportHtml = tripInfo
    ? generateStaticReportHtml(seatChain, travelerViews, tripInfo)
    : "";

  return { seatChain, travelerViews, reportHtml, seatReleases };
}

// detectSpecialSeatProperties is re-exported here for callers that adopt a
// segments bundle synchronously without rebuilding it themselves.
export async function detectProperties(
  segments: SegmentsOutput,
): Promise<SpecialSeatProperty[]> {
  const { detectSpecialSeatProperties } = await import("@/lib/seat-chain");
  return Array.from(detectSpecialSeatProperties(segments));
}

/**
 * State machine shared by the /seats page and the HAR import flow: fetches
 * (or adopts) a segments bundle, seeds the special-seat filters, and rebuilds
 * traveler chains whenever travelers or filters change.
 */
export function useSeatPipeline(initialTravelers = 1): SeatPipeline {
  const [segmentsData, setSegmentsData] = useState<SegmentsOutput | null>(null);
  const [detectedProperties, setDetectedProperties] = useState<SpecialSeatProperty[]>([]);
  const [specialFilters, setSpecialFiltersState] = useState<SpecialSeatFilters>({});
  const [initialFilters, setInitialFilters] = useState<SpecialSeatFilters>({});
  const [travelers, setTravelersState] = useState(initialTravelers);
  const [output, setOutput] = useState<SeatPipelineOutput | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks the inputs the current output was built from, so stale async
  // rebuilds (user changed travelers twice quickly) are dropped.
  const buildGeneration = useRef(0);

  const filtersChanged = useMemo(
    () => JSON.stringify(specialFilters) !== JSON.stringify(initialFilters),
    [specialFilters, initialFilters],
  );

  /** Rebuild with explicit inputs; callers pass the state they want applied
   * rather than relying on closures that may lag behind the current render. */
  const rebuild = useCallback(
    async (
      segments: SegmentsOutput,
      tripInfoForReport: TripInfo | null,
      travelersArg: number,
      filtersArg: SpecialSeatFilters,
      markFiltersApplied: boolean,
    ) => {
      const generation = ++buildGeneration.current;
      setBuilding(true);
      setError(null);
      try {
        const next = await buildPipelineOutput(
          segments,
          travelersArg,
          filtersArg,
          tripInfoForReport,
        );
        if (generation === buildGeneration.current) {
          setOutput(next);
          if (markFiltersApplied) {
            setInitialFilters(filtersArg);
          }
        }
      } catch (buildError) {
        if (generation === buildGeneration.current) {
          setError(getFriendlyErrorMessage(buildError));
        }
      } finally {
        if (generation === buildGeneration.current) {
          setBuilding(false);
        }
      }
    },
    [],
  );

  const loadSegments = useCallback(
    async (segmentRequest: unknown, info: TripInfo): Promise<boolean> => {
      buildGeneration.current += 1;
      setSegmentsLoading(true);
      setError(null);
      setOutput(null);
      try {
        const segments = await buildSegments(segmentRequest);
        const detected = await detectProperties(segments);
        // Seed every detected special property as excluded so the first chain
        // matches what any later recalculation would produce.
        const filters = initialSpecialFilters(detected);
        setSegmentsData(segments);
        setDetectedProperties(detected);
        setSpecialFiltersState(filters);
        setInitialFilters(filters);
        setTripInfo(info);
        await rebuild(segments, info, travelers, filters, false);
        return true;
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
        return false;
      } finally {
        setSegmentsLoading(false);
      }
    },
    // loadSegments is stable per travelers value; /seats triggers it once per trip.
    [rebuild, travelers],
  );

  const adoptSegments = useCallback(
    (segments: SegmentsOutput, info?: TripInfo) => {
      buildGeneration.current += 1;
      void (async () => {
        const detected = await detectProperties(segments);
        const filters = initialSpecialFilters(detected);
        setSegmentsData(segments);
        setDetectedProperties(detected);
        setSpecialFiltersState(filters);
        setInitialFilters(filters);
        setTripInfo(info ?? null);
        await rebuild(segments, info ?? null, travelers, filters, false);
      })();
    },
    [rebuild, travelers],
  );

  /** Adopt a HAR response: use its segments when present (recalculation
   * possible), otherwise show the prebuilt output as-is (travelers locked). */
  const adoptHarResponse = useCallback(
    (response: HarRunResponse) => {
      if (response.segmentsData) {
        adoptSegments(response.segmentsData, response.tripInfo ?? undefined);
        return;
      }
      buildGeneration.current += 1;
      setSegmentsData(null);
      setDetectedProperties(response.detectedSpecialProperties ?? []);
      setSpecialFiltersState({});
      setInitialFilters({});
      setTripInfo(response.tripInfo ?? null);
      setOutput({
        seatChain: response.seatChain,
        travelerViews: response.travelerViews,
        reportHtml: response.reportHtml,
        seatReleases: response.seatReleases ?? [],
      });
    },
    [adoptSegments],
  );

  const recalculate = useCallback(async () => {
    if (!segmentsData) return;
    await rebuild(segmentsData, tripInfo, travelers, specialFilters, true);
  }, [segmentsData, tripInfo, travelers, specialFilters, rebuild]);

  return {
    segmentsData,
    segmentsLoading,
    building,
    error,
    detectedProperties,
    specialFilters,
    filtersChanged,
    travelers,
    setTravelers: setTravelersState,
    setSpecialFilters: setSpecialFiltersState,
    output,
    tripInfo,
    loadSegments,
    adoptSegments,
    adoptHarResponse,
    recalculate,
  };
}
