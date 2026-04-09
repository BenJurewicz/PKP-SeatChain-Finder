import { apiClient } from './api-client';
import type { SegmentsOutput } from '@/lib/domain/types';

export interface SegmentBuildParams {
  segmentRequest: Record<string, unknown>;
}

export async function buildSegments(params: SegmentBuildParams): Promise<SegmentsOutput> {
  return await apiClient.post<SegmentsOutput>('/segments/build', params);
}