import { getText } from "./http";
import { BILKOM_STATION_SEARCH_URL, DEFAULT_SEARCH_HEADERS } from "./constants";
import type { Station } from "./types";

interface StationApiResponse {
  stations?: Array<{
    name?: string;
    extId?: string;
    id?: string;
    geoPoint?: {
      lat?: number;
      lon?: number;
    };
  }>;
}

export async function searchStations(query: string): Promise<Station[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());
  const url = `${BILKOM_STATION_SEARCH_URL}?q=${encodedQuery}&source=FROMSTATION`;

  const responseText = await getText(url, DEFAULT_SEARCH_HEADERS);

  let parsed: StationApiResponse;
  try {
    parsed = JSON.parse(responseText) as StationApiResponse;
  } catch (error) {
    throw new Error(`Invalid JSON response from station search: ${(error as Error).message}`);
  }

  const stations = parsed.stations;
  if (!Array.isArray(stations)) {
    throw new Error("Station search response missing 'stations' array");
  }

  return stations
    .filter((station) => station.name && station.extId && station.id)
    .map((station) => ({
      name: station.name!,
      extId: station.extId!,
      id: station.id!,
      geoPoint: station.geoPoint?.lat != null && station.geoPoint?.lon != null
        ? { lat: station.geoPoint.lat, lon: station.geoPoint.lon }
        : undefined,
    }));
}