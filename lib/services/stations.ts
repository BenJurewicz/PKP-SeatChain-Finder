import { apiClient } from './api-client';
import type { Station } from '@/lib/types';

export interface StationSearchResponse {
  stations: Station[];
}

export async function searchStations(query: string): Promise<Station[]> {
  const trimmed = query.trim();
  
  if (trimmed.length < 2) {
    return [];
  }

  const result = await apiClient.get<StationSearchResponse>(
    `/api/stations/search?q=${encodeURIComponent(trimmed)}`
  );
  
  return result.stations;
}