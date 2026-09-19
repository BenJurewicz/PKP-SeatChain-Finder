import { describe, it, expect } from "vitest";
import { formatTime, formatDate, formatDuration, toPolishIsoString } from "@/lib/formatting";
import { getCoverage, getSeatChanges, getTravelers } from "@/lib/view-model";
import { parseSeat } from "@/lib/utils";

describe("formatting", () => {
  it("formats time in 24h Polish format (Europe/Warsaw)", () => {
    // 23:30 UTC = 01:30 next day in Warsaw (summer)
    expect(formatTime("2026-04-06T21:30:00Z")).toBe("23:30");
    expect(formatTime(null)).toBe("—");
    expect(formatTime("nonsense")).toBe("—");
  });

  it("formats dates in Polish", () => {
    expect(formatDate("2026-04-06T21:30:00Z")).toBe("6 kwi");
  });

  it("formats duration", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(3660)).toBe("1h 1m");
    expect(formatDuration(59)).toBe("0m");
  });

  it("converts to Polish ISO wall-clock string", () => {
    const iso = toPolishIsoString(new Date("2026-04-06T21:30:00Z"));
    expect(iso.startsWith("2026-04-06T23:30:00")).toBe(true);
  });
});

describe("view-model", () => {
  it("computes coverage for multi-chain output", () => {
    const chain = {
      stations: {},
      summary: {
        travelers: 2,
        totalSegments: 2,
        totalTravelerSegments: 4,
        coveredTravelerSegments: 3,
        uncoveredTravelerSegments: 1,
        totalSeatChanges: 1,
        collisionFree: true,
        allocationStrategy: "sequential-best-chain" as const,
      },
      perSegmentTravelerAssignment: [],
      travelerChains: [],
    };
    expect(getCoverage(chain)).toEqual({ covered: 3, total: 4, percentage: 75 });
    expect(getSeatChanges(chain)).toBe(1);
    expect(getTravelers(chain)).toBe(2);
  });

  it("handles zero total segments", () => {
    const chain = {
      stations: {},
      summary: {
        totalSegments: 0,
        coveredSegments: 0,
        uncoveredSegments: 0,
        seatChanges: 0,
      },
      perSegmentAssignment: [],
      intervals: [],
    };
    expect(getCoverage(chain).percentage).toBe(0);
  });
});

describe("parseSeat", () => {
  it("splits carriage:seat", () => {
    expect(parseSeat("10:42")).toEqual({ carriage: "10", seat: "42" });
    expect(parseSeat(null)).toEqual({ carriage: null, seat: null });
    expect(parseSeat("42")).toEqual({ carriage: null, seat: "42" });
  });
});
