import type { SegmentsOutput, SpecialSeatProperty, SpecialSeatFilters } from "@/lib/types";
import { SPECIAL_SEAT_LABELS } from "@/lib/types";
import { asObject } from "@/lib/parsing";

export interface NormalizedSegment {
  segmentIndex: number;
  stationFrom: number;
  stationTo: number;
  stationFromName?: string;
  stationToName?: string;
  departureTime?: string;
  arrivalTime?: string;
  carriages: unknown[];
}

export interface PerSegmentAssignment {
  segmentIndex: number;
  stationFrom: number;
  stationTo: number;
  stationFromName?: string;
  stationToName?: string;
  departureTime?: string;
  arrivalTime?: string;
  assignedSeat: string | null;
  hasSeat: boolean;
  availableClass2SeatCount: number;
}

export interface IntervalAssignment {
  seat: string | null;
  startSegmentIndex: number;
  endSegmentIndex: number;
  fromStation: number;
  toStation: number;
  fromStationName?: string;
  toStationName?: string;
  arrivalTime?: string;
}

export interface SingleChainOutput {
  summary: {
    totalSegments: number;
    coveredSegments: number;
    uncoveredSegments: number;
    seatChanges: number;
  };
  perSegmentAssignment: PerSegmentAssignment[];
  intervals: IntervalAssignment[];
}

export interface TravelerChainOutput extends SingleChainOutput {
  travelerIndex: number;
}

export interface MultiChainOutput {
  summary: {
    travelers: number;
    totalSegments: number;
    totalTravelerSegments: number;
    coveredTravelerSegments: number;
    uncoveredTravelerSegments: number;
    totalSeatChanges: number;
    collisionFree: boolean;
    allocationStrategy: "sequential-best-chain";
  };
  perSegmentTravelerAssignment: Array<{
    segmentIndex: number;
    stationFrom: number;
    stationTo: number;
    stationFromName?: string;
    stationToName?: string;
    departureTime?: string;
    arrivalTime?: string;
    assignedSeats: Array<string | null>;
    collisionFree: boolean;
  }>;
  travelerChains: TravelerChainOutput[];
}

export type SeatChainOutput = (SingleChainOutput | MultiChainOutput) & {
  stations: Record<string, string>;
};

type Candidate = [covered: number, changes: number, chain: Array<string | null>];

export function detectSpecialSeatProperties(data: SegmentsOutput): Set<SpecialSeatProperty> {
  const found = new Set<SpecialSeatProperty>();

  for (const item of data.segments) {
    const response = asObject(item.response);
    if (!response) continue;

    const carriages = response.carriages;
    if (!Array.isArray(carriages)) continue;

    for (const rawCarriage of carriages) {
      const carriage = asObject(rawCarriage);
      if (!carriage) continue;

      const spots = carriage.spots;
      if (!Array.isArray(spots)) continue;

      for (const rawSpot of spots) {
        const spot = asObject(rawSpot);
        if (!spot) continue;

        const properties = spot.properties;
        if (!Array.isArray(properties)) continue;

        for (const prop of properties) {
          if (typeof prop === "string" && prop in SPECIAL_SEAT_LABELS) {
            found.add(prop as SpecialSeatProperty);
          }
        }
      }
    }
  }

  return found;
}

function normalizeSegments(data: SegmentsOutput): { segments: NormalizedSegment[]; stations: Record<string, string> } {
  const stations = data.stations ?? {};
  const segments: NormalizedSegment[] = [];

  for (let i = 0; i < data.segments.length; i += 1) {
    const item = data.segments[i];
    const request = asObject(item.request);
    const response = asObject(item.response);
    if (!request || !response) {
      throw new Error(`Invalid request/response at segment index ${i}`);
    }

    const stationFrom = request.stationFrom;
    const stationTo = request.stationTo;
    if (typeof stationFrom !== "number" || typeof stationTo !== "number") {
      throw new Error(`Invalid stationFrom/stationTo in segment ${item.segmentIndex}`);
    }

    const carriages = response.carriages;
    if (!Array.isArray(carriages)) {
      const responseKeys = Object.keys(response).join(', ');
      console.warn(
        `[seat-chain] Segment ${item.segmentIndex} has invalid or missing carriages.`,
        `Response keys: [${responseKeys}].`,
        'This segment will show no available seats.'
      );
    }

    const stationFromName =
      typeof item.stationFromName === "string" ? item.stationFromName : stations[String(stationFrom)];
    const stationToName =
      typeof item.stationToName === "string" ? item.stationToName : stations[String(stationTo)];

    segments.push({
      segmentIndex: item.segmentIndex,
      stationFrom,
      stationTo,
      stationFromName,
      stationToName,
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,
      carriages: Array.isArray(carriages) ? carriages : [],
    });
  }

  return {
    segments: segments.sort((a, b) => a.segmentIndex - b.segmentIndex),
    stations,
  };
}

function extractAvailableClass2Seats(
  segment: NormalizedSegment,
  filters?: SpecialSeatFilters
): Set<string> {
  const seats = new Set<string>();
  for (const rawCarriage of segment.carriages) {
    const carriage = asObject(rawCarriage);
    if (!carriage) continue;
    const carriageNumber = carriage.carriageNumber;
    const spots = carriage.spots;
    if (typeof carriageNumber !== "number" || !Array.isArray(spots)) continue;

    for (const rawSpot of spots) {
      const spot = asObject(rawSpot);
      if (!spot) continue;
      const status = spot.status;
      const spotNumber = spot.number;
      const properties = spot.properties;
      if (status !== "AVAILABLE") continue;
      if (typeof spotNumber !== "number" || !Array.isArray(properties)) continue;
      if (!properties.includes("CLASS_2")) continue;

      // Check for special seat properties and filter if needed
      if (filters) {
        const hasExcludedProperty = properties.some((prop) => {
          if (typeof prop !== "string") return false;
          const isSpecialProperty = prop in SPECIAL_SEAT_LABELS;
          const shouldInclude = filters[prop];
          return isSpecialProperty && !shouldInclude;
        });
        if (hasExcludedProperty) continue;
      }

      seats.add(`${carriageNumber}:${spotNumber}`);
    }
  }
  return seats;
}

function chainKey(chain: Array<string | null>): string {
  return chain.map((seat) => seat ?? "").join("|");
}

function isBetter(a: Candidate, b: Candidate): boolean {
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] < b[1];
  return chainKey(a[2]) < chainKey(b[2]);
}

function optimizeChain(availablePerSegment: Array<Set<string>>): Array<string | null> {
  let state = new Map<string | null, Candidate>();
  state.set(null, [0, 0, []]);

  for (const seats of availablePerSegment) {
    const choices: Array<string | null> = [...seats].sort();
    choices.push(null);
    const nextState = new Map<string | null, Candidate>();

    for (const choice of choices) {
      let best: Candidate | null = null;
      for (const [prevChoice, [covered, changes, chain]] of state.entries()) {
        const newCovered = covered + (choice ? 1 : 0);
        let newChanges = changes;
        if (prevChoice && choice && prevChoice !== choice) {
          newChanges += 1;
        }
        const candidate: Candidate = [newCovered, newChanges, [...chain, choice]];
        if (!best || isBetter(candidate, best)) {
          best = candidate;
        }
      }
      if (!best) continue;
      const previous = nextState.get(choice);
      if (!previous || isBetter(best, previous)) {
        nextState.set(choice, best);
      }
    }
    state = nextState;
  }

  let bestFinal: Candidate | null = null;
  for (const candidate of state.values()) {
    if (!bestFinal || isBetter(candidate, bestFinal)) {
      bestFinal = candidate;
    }
  }
  if (!bestFinal) {
    throw new Error("Unable to compute seat chain");
  }
  return bestFinal[2];
}

function buildIntervals(
  segments: NormalizedSegment[],
  chain: Array<string | null>,
): IntervalAssignment[] {
  if (segments.length === 0) return [];

  const intervals: IntervalAssignment[] = [];
  let current: IntervalAssignment = {
    seat: chain[0] ?? null,
    startSegmentIndex: segments[0].segmentIndex,
    endSegmentIndex: segments[0].segmentIndex,
    fromStation: segments[0].stationFrom,
    toStation: segments[0].stationTo,
    fromStationName: segments[0].stationFromName,
    toStationName: segments[0].stationToName,
    arrivalTime: segments[0].departureTime,
  };

  for (let i = 1; i < segments.length; i += 1) {
    if (chain[i] === current.seat) {
      current.endSegmentIndex = segments[i].segmentIndex;
      current.toStation = segments[i].stationTo;
      current.toStationName = segments[i].stationToName;
      continue;
    }
    intervals.push(current);
    current = {
      seat: chain[i] ?? null,
      startSegmentIndex: segments[i].segmentIndex,
      endSegmentIndex: segments[i].segmentIndex,
      fromStation: segments[i].stationFrom,
      toStation: segments[i].stationTo,
      fromStationName: segments[i].stationFromName,
      toStationName: segments[i].stationToName,
      arrivalTime: segments[i].departureTime,
    };
  }
  intervals.push(current);
  return intervals;
}

function buildSingleChainOutput(
  segments: NormalizedSegment[],
  availablePerSegment: Array<Set<string>>,
  chain: Array<string | null>,
): SingleChainOutput {
  const perSegmentAssignment: PerSegmentAssignment[] = segments.map((segment, i) => ({
    segmentIndex: segment.segmentIndex,
    stationFrom: segment.stationFrom,
    stationTo: segment.stationTo,
    stationFromName: segment.stationFromName,
    stationToName: segment.stationToName,
    departureTime: segment.departureTime,
    arrivalTime: segment.arrivalTime,
    assignedSeat: chain[i] ?? null,
    hasSeat: chain[i] != null,
    availableClass2SeatCount: availablePerSegment[i].size,
  }));

  let seatChanges = 0;
  for (let i = 1; i < chain.length; i += 1) {
    const prev = chain[i - 1];
    const current = chain[i];
    if (prev !== current) {
      seatChanges += 1;
    }
  }
  const coveredSegments = chain.filter((seat) => seat != null).length;

  return {
    summary: {
      totalSegments: segments.length,
      coveredSegments,
      uncoveredSegments: segments.length - coveredSegments,
      seatChanges,
    },
    perSegmentAssignment,
    intervals: buildIntervals(segments, chain),
  };
}

function allocateUniqueChains(
  availablePerSegment: Array<Set<string>>,
  travelers: number,
): Array<Array<string | null>> {
  const remaining = availablePerSegment.map((set) => new Set(set));
  const chains: Array<Array<string | null>> = [];

  for (let i = 0; i < travelers; i += 1) {
    const chain = optimizeChain(remaining);
    chains.push(chain);
    chain.forEach((seat, index) => {
      if (seat) remaining[index].delete(seat);
    });
  }
  return chains;
}

export function buildSeatChainOutput(
  data: SegmentsOutput,
  travelers: number,
  specialSeatFilters?: SpecialSeatFilters
): SeatChainOutput {
  if (travelers < 1) {
    throw new Error("Travelers must be at least 1");
  }
  const { segments, stations } = normalizeSegments(data);
  if (segments.length === 0) {
    throw new Error("No segments provided");
  }
  const availablePerSegment = segments.map((seg) =>
    extractAvailableClass2Seats(seg, specialSeatFilters)
  );
  const chains = allocateUniqueChains(availablePerSegment, travelers);

  if (travelers === 1) {
    return {
      ...buildSingleChainOutput(segments, availablePerSegment, chains[0]),
      stations,
    };
  }

  const travelerChains: TravelerChainOutput[] = chains.map((chain, index) => ({
    travelerIndex: index + 1,
    ...buildSingleChainOutput(segments, availablePerSegment, chain),
  }));

  const perSegmentTravelerAssignment: MultiChainOutput["perSegmentTravelerAssignment"] = [];
  let coveredTravelerSegments = 0;
  let totalSeatChanges = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const assignedSeats = chains.map((chain) => chain[i] ?? null);
    const nonNullSeats = assignedSeats.filter((seat): seat is string => seat !== null);
    perSegmentTravelerAssignment.push({
      segmentIndex: segments[i].segmentIndex,
      stationFrom: segments[i].stationFrom,
      stationTo: segments[i].stationTo,
      stationFromName: segments[i].stationFromName,
      stationToName: segments[i].stationToName,
      departureTime: segments[i].departureTime,
      arrivalTime: segments[i].arrivalTime,
      assignedSeats,
      collisionFree: new Set(nonNullSeats).size === nonNullSeats.length,
    });
    coveredTravelerSegments += nonNullSeats.length;
  }

  for (const chain of chains) {
    for (let i = 1; i < chain.length; i += 1) {
      const prev = chain[i - 1];
      const current = chain[i];
      if (prev !== current) {
        totalSeatChanges += 1;
      }
    }
  }

  const totalTravelerSegments = segments.length * travelers;
  return {
    summary: {
      travelers,
      totalSegments: segments.length,
      totalTravelerSegments,
      coveredTravelerSegments,
      uncoveredTravelerSegments: totalTravelerSegments - coveredTravelerSegments,
      totalSeatChanges,
      collisionFree: perSegmentTravelerAssignment.every((row) => row.collisionFree),
      allocationStrategy: "sequential-best-chain",
    },
    perSegmentTravelerAssignment,
    travelerChains,
    stations,
  };
}

export function isMultiChainOutput(output: SeatChainOutput): output is MultiChainOutput & { stations: Record<string, string> } {
  return "travelerChains" in output;
}
