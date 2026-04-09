import { parseSeat } from '@/lib/utils';
import type { PerSegmentAssignment } from './seat-chain';

/**
 * Represents a contiguous group of segments with the same seat assignment.
 * Used to display "Carriage X, Seat Y from Station A to Station B".
 */
export interface GroupedStep {
  station: string;
  carriage: string | null;
  seat: string | null;
  type: 'start' | 'change' | 'resume' | 'gap';
  arrivalTime?: string;
  segmentCount: number;
}

/**
 * Groups consecutive segments with the same seat assignment into timeline steps.
 * 
 * Takes a series of "change points" (where you get on/off/change seats) and
 * groups them into contiguous ranges showing:
 * - Starting station
 * - Carriage and seat number
 * - Number of segments covered
 * 
 * Used to show: "Carriage 10, Seat 103 (3 segments, 50% of journey)"
 * 
 * @param changeSteps - Change points from InstructionStep[]
 * @param assignments - All segment assignments from PerSegmentAssignment[]
 * @returns Grouped steps ready for display
 */
export function groupConsecutiveSteps(
  changeSteps: Array<{
    station: string;
    seat: string | null;
    type: string;
    arrivalTime?: string;
  }>,
  assignments: PerSegmentAssignment[]
): GroupedStep[] {
  if (changeSteps.length === 0) return [];
  
  const groups: GroupedStep[] = [];
  let currentGroup: GroupedStep | null = null;
  let currentSeatString: string | null = null;
  
  for (const step of changeSteps) {
    const seatString = step.seat;
    const parsed = step.seat ? parseSeat(step.seat) : { carriage: null, seat: null };
    
    if (!currentGroup) {
      // First step - start a new group
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type as GroupedStep['type'],
        arrivalTime: step.arrivalTime,
        segmentCount: 0,
      };
      currentSeatString = seatString;
    } else if (seatString === currentSeatString) {
      // Same seat as current group - this shouldn't happen in changeSteps
      // since each step is a change point, but handle it gracefully
      continue;
    } else {
      // Different seat - finalize current group and start new one
      
      // Count segments for the previous seat
      currentGroup.segmentCount = assignments.filter(
        a => a.assignedSeat === currentSeatString
      ).length;
      groups.push(currentGroup);
      
      // Start new group
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type as GroupedStep['type'],
        arrivalTime: step.arrivalTime,
        segmentCount: 0,
      };
      currentSeatString = seatString;
    }
  }
  
  // Finalize the last group
  if (currentGroup) {
    currentGroup.segmentCount = assignments.filter(
      a => a.assignedSeat === currentSeatString
    ).length;
    groups.push(currentGroup);
  }
  
  return groups;
}