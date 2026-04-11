"use client";

import React, { useState } from "react";
import type { Station, Trip } from "@/lib/domain/types";
import { searchTrips } from "@/lib/services/trips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StationInput } from "@/components/station-input";
import { DateTimeInput } from "@/components/date-time-input";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { toPolishIsoString } from "@/lib/formatting";
import { useRouter } from "next/navigation";

interface SearchFormData {
  fromStation: Station;
  toStation: Station;
  date: string;
  time: string;
  trips: Trip[];
}

const STORAGE_KEY = "seatChainSearchData";

export function saveSearchData(data: SearchFormData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadSearchData(): SearchFormData | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SearchFormData;
  } catch {
    return null;
  }
}

export function clearSearchData() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function getDefaultDateTime(): { date: string; time: string } {
  const now = new Date();
  const polishStr = toPolishIsoString(now);
  return {
    date: polishStr.split("T")[0],
    time: polishStr.split("T")[1].slice(0, 5),
  };
}

export default function SearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [tripDate, setTripDate] = useState<string>(() => getDefaultDateTime().date);
  const [tripTime, setTripTime] = useState<string>(() => getDefaultDateTime().time);

  async function handleSearchTrips(): Promise<void> {
    if (!fromStation || !toStation) {
      setError("Please select both departure and destination stations.");
      return;
    }
    if (!tripDate || !tripTime) {
      setError("Please select date and time.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trips = await searchTrips({
        fromStation,
        toStation,
        date: tripDate,
        time: tripTime,
      });

      saveSearchData({
        fromStation,
        toStation,
        date: tripDate,
        time: tripTime,
        trips,
      });

      router.push("/search/trips");
    } catch (searchError) {
      setError(getFriendlyErrorMessage(searchError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Train Connections</CardTitle>
          <CardDescription>Find optimal seat arrangements for your journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Departure Station</label>
                <StationInput
                  value={fromStation}
                  onChange={setFromStation}
                  placeholder="Enter departure station..."
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Destination Station</label>
                <StationInput
                  value={toStation}
                  onChange={setToStation}
                  placeholder="Enter destination station..."
                  disabled={loading}
                />
              </div>
            </div>

            <DateTimeInput
              date={tripDate}
              time={tripTime}
              onDateChange={setTripDate}
              onTimeChange={setTripTime}
              disabled={loading}
            />

            <Button
              type="button"
              onClick={handleSearchTrips}
              disabled={loading || !fromStation || !toStation}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Trips
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}