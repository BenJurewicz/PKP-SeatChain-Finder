import {
  isMultiChainOutput,
  type PerSegmentAssignment,
  type SeatChainOutput,
  type SingleChainOutput,
} from "@/lib/seat-chain";

export interface InstructionStep {
  type: "start" | "change" | "resume" | "gap";
  station: string;
  seat: string | null;
  arrivalTime?: string;
}

export interface TravelerView {
  travelerIndex: number;
  summary: SingleChainOutput["summary"];
  assignments: PerSegmentAssignment[];
  changeSteps: InstructionStep[];
}

function stationLabel(
  assignment: PerSegmentAssignment,
  key: "stationFrom" | "stationTo",
): string {
  const name = key === "stationFrom" ? assignment.stationFromName : assignment.stationToName;
  const id = key === "stationFrom" ? assignment.stationFrom : assignment.stationTo;
  return name && name.trim() ? name : String(id);
}

function buildChangeSteps(assignments: PerSegmentAssignment[]): InstructionStep[] {
  if (assignments.length === 0) return [];
  const steps: InstructionStep[] = [];

  let currentSeat = assignments[0].assignedSeat;
  steps.push({
    type: "start",
    station: stationLabel(assignments[0], "stationFrom"),
    seat: currentSeat,
    arrivalTime: assignments[0].departureTime,
  });

  for (let i = 1; i < assignments.length; i += 1) {
    const seat = assignments[i].assignedSeat;
    if (seat === currentSeat) continue;

    let type: InstructionStep["type"];
    if (seat) {
      type = currentSeat ? "change" : "resume";
    } else {
      type = "gap";
    }

    steps.push({
      type,
      station: stationLabel(assignments[i], "stationFrom"),
      seat,
      arrivalTime: assignments[i].departureTime,
    });
    currentSeat = seat;
  }
  return steps;
}

export function buildTravelerViews(seatChain: SeatChainOutput): TravelerView[] {
  if (isMultiChainOutput(seatChain)) {
    return seatChain.travelerChains.map((traveler) => ({
      travelerIndex: traveler.travelerIndex,
      summary: traveler.summary,
      assignments: traveler.perSegmentAssignment,
      changeSteps: buildChangeSteps(traveler.perSegmentAssignment),
    }));
  }
  return [
    {
      travelerIndex: 1,
      summary: seatChain.summary,
      assignments: seatChain.perSegmentAssignment,
      changeSteps: buildChangeSteps(seatChain.perSegmentAssignment),
    },
  ];
}
