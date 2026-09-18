import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";

/**
 * View-model helpers shared by the wizard results "arrival" screen.
 * Derived only from SeatChainOutput so both the live-search and HAR flows
 * render identically.
 */

export interface CoverageStats {
    covered: number;
    total: number;
    percentage: number;
}

export function getCoverage(seatChain: SeatChainOutput): CoverageStats {
    if (isMultiChainOutput(seatChain)) {
        const covered = seatChain.summary.coveredTravelerSegments;
        const total = seatChain.summary.totalTravelerSegments;
        return { covered, total, percentage: total > 0 ? Math.round((covered / total) * 100) : 0 };
    }
    const covered = seatChain.summary.coveredSegments;
    const total = seatChain.summary.totalSegments;
    return { covered, total, percentage: total > 0 ? Math.round((covered / total) * 100) : 0 };
}

export function getSeatChanges(seatChain: SeatChainOutput): number {
    if (isMultiChainOutput(seatChain)) {
        return seatChain.summary.totalSeatChanges;
    }
    return seatChain.summary.seatChanges;
}

export function hasSeatCollisions(seatChain: SeatChainOutput): boolean {
    if (!isMultiChainOutput(seatChain)) return false;
    return seatChain.perSegmentTravelerAssignment.some((seg) => !seg.collisionFree);
}

export function getTravelers(seatChain: SeatChainOutput): number {
    if (isMultiChainOutput(seatChain)) {
        return seatChain.summary.travelers;
    }
    return 1;
}
