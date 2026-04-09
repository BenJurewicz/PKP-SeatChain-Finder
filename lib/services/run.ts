import { apiClient } from './api-client';
import type { BlockedSeat } from '@/lib/types';
import type { SeatChainOutput } from '@/lib/seat-chain';
import type { TravelerView } from '@/lib/instructions';

export interface TripInfo {
  trainName: string;
  carrierId: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

export interface RunResponse {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  reportHtml: string;
  sourceHarName: string;
  blockedSeats?: BlockedSeat[];
  tripInfo?: TripInfo;
}

export interface RunParams {
  harFile: File;
  travelers: number;
}

export async function runHarFile(params: RunParams): Promise<RunResponse> {
  const formData = new FormData();
  formData.set('harFile', params.harFile);
  formData.set('travelers', String(params.travelers));
  
  return await apiClient.postFormData<RunResponse>('/api/run', formData);
}