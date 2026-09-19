import { describe, it, expect } from "vitest";
import { groupConsecutiveSteps } from "@/lib/domain/group-steps";
import { buildTravelerViews } from "@/lib/instructions";
import type { PerSegmentAssignment } from "@/lib/seat-chain";

function assignment(seat: string | null): PerSegmentAssignment {
  return {
    segmentIndex: 1,
    stationFrom: 1,
    stationTo: 2,
    assignedSeat: seat,
    hasSeat: seat !== null,
    availableClass2SeatCount: seat ? 1 : 0,
  };
}

describe("groupConsecutiveSteps", () => {
  it("counts runs by run length, not by seat occurrence", () => {
    // Seat A in runs [1, 2] separated by a gap — filter() would inflate both.
    const assignments = [
      assignment("A"),
      assignment(null),
      assignment("A"),
      assignment("A"),
      assignment("B"),
    ];
    const views = buildTravelerViews({
      stations: {},
      summary: { totalSegments: 5, coveredSegments: 4, uncoveredSegments: 1, seatChanges: 0 },
      perSegmentAssignment: assignments,
      intervals: [],
    });
    const groups = groupConsecutiveSteps(views[0].changeSteps, views[0].assignments);
    // Change steps only mark boundaries: start, gap, resume.
    expect(groups.map((g) => g.seat)).toEqual(["A", null, "A", "B"]);
    expect(groups.map((g) => g.segmentCount)).toEqual([1, 1, 2, 1]);
  });
});

describe("buildTravelerViews", () => {
  it("produces change steps at every assignment transition", () => {
    const assignments = [assignment("A"), assignment("A"), assignment(null), assignment("B")];
    const views = buildTravelerViews({
      stations: {},
      summary: { totalSegments: 4, coveredSegments: 3, uncoveredSegments: 1, seatChanges: 0 },
      perSegmentAssignment: assignments,
      intervals: [],
    });
    // Seat -> null and null -> seat are both counted as transitions.
    expect(views[0].changeSteps.map((s) => s.type)).toEqual(["start", "gap", "resume"]);
  });
});
