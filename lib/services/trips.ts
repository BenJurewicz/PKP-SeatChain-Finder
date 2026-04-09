import { apiClient } from './api-client';
import type { Station, Trip } from '@/lib/domain/types';

export interface TripSearchResponse {
  trips: Trip[];
}

export interface TripSearchParams {
  fromStation: Station;
  toStation: Station;
  date: string;
  time: string;
}

export async function searchTrips(params: TripSearchParams): Promise<Trip[]> {
  const result = await apiClient.post<TripSearchResponse>('/trips/search', params);
  return result.trips;
}