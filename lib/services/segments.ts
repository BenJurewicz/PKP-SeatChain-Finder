import { apiClient } from './api-client';
import type { SegmentsOutput, JsonObject } from '@/lib/types';

export interface SegmentBuildParams {
  segmentRequest: {
    stationFrom: number;
    stationTo: number;
    vehicleNumber: number;
    departureDate: string;
    arrivalDate: string;
    stationNumberingSystem?: string;
    type?: string;
  };
}

export async function buildSegments(params: SegmentBuildParams): Promise<SegmentsOutput> {
  return await apiClient.post<SegmentsOutput>('/api/segments/build', params);
}