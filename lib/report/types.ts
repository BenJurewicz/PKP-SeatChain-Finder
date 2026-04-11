import type { SeatChainOutput } from '@/lib/domain/seat-chain';
import type { TravelerView } from '@/lib/domain/instructions';

export interface TripSummary {
  trainName: string;
  trainNumber: string;
  carrierId: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

export interface ReportProps {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  tripSummary?: TripSummary;
}