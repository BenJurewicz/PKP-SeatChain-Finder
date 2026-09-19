import { describe, it, expect } from "vitest";
import {
  decodeJourneyQuery,
  decodeSeatsQuery,
  decodeTravelers,
  journeyHref,
  seatsHref,
} from "@/lib/journey-params";
import type { Station, Trip } from "@/lib/types";

const from: Station = { name: "Ełk", id: "A=1@O=Ełk@L=5100305", extId: "5100305" };
const to: Station = { name: "Gdańsk", id: "A=1@O=Gdańsk@L=5101307", extId: "5101307" };

const journey = { from, to, date: "2026-04-06", time: "09:00" };

const trip: Trip = {
  tripIndex: 1,
  trainName: "IC 8114",
  trainNumber: "8114",
  carrierId: "IC",
  departure: { stationId: "5100305", stationName: "Ełk", dateTime: "2026-04-06T09:00:00" },
  arrival: { stationId: "5101307", stationName: "Gdańsk", dateTime: "2026-04-06T15:30:00" },
  duration: 23400,
  stops: [],
  segmentRequest: {
    stationFrom: 5100305,
    stationTo: 5101307,
    stationNumberingSystem: "HAFAS",
    vehicleNumber: 8114,
    departureDate: "2026-04-06T09:00:00",
    arrivalDate: "2026-04-06T15:30:00",
    type: "CARRIAGE",
  },
};

function parseHrefSearch(href: string): URLSearchParams {
  return new URL(href, "http://x").searchParams;
}

describe("journey params", () => {
  it("round-trips a journey query through an href", () => {
    const href = journeyHref(journey);
    expect(href.startsWith("/trains?j=")).toBe(true);
    const decoded = decodeJourneyQuery(Object.fromEntries(parseHrefSearch(href)));
    expect(decoded).toEqual(journey);
  });

  it("rejects garbage and missing params", () => {
    expect(decodeJourneyQuery({})).toBeNull();
    expect(decodeJourneyQuery({ j: "not json" })).toBeNull();
    expect(decodeJourneyQuery({ j: JSON.stringify({ ...journey, time: "25:99" }) })).toBeNull();
  });

  it("round-trips a seats query with travelers", () => {
    const href = seatsHref(trip, journey, 2);
    const params = Object.fromEntries(parseHrefSearch(href));
    const decoded = decodeSeatsQuery(params);
    expect(decoded).not.toBeNull();
    expect(decoded?.segmentRequest).toEqual(trip.segmentRequest);
    expect(decoded?.trainName).toBe("IC 8114");
    expect(decoded?.journey).toEqual(journey);
    expect(decodeTravelers(params)).toBe(2);
  });

  it("clamps invalid travelers to 1", () => {
    expect(decodeTravelers({ travelers: "0" })).toBe(1);
    expect(decodeTravelers({ travelers: "999" })).toBe(1);
    expect(decodeTravelers({ travelers: "abc" })).toBe(1);
    expect(decodeTravelers({})).toBe(1);
    expect(decodeTravelers({ travelers: "5" })).toBe(5);
  });

  it("rejects a seats query with a broken segmentRequest", () => {
    expect(
      decodeSeatsQuery({
        t: JSON.stringify({ ...trip, segmentRequest: { vehicleNumber: -1 } }),
      }),
    ).toBeNull();
  });
});
