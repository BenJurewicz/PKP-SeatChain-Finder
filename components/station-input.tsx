"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";
import type { Station } from "@/lib/station-search";

interface StationInputProps {
  value: Station | null;
  onChange: (station: Station | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StationInput({ value, onChange, placeholder, disabled }: StationInputProps) {
  const [query, setQuery] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchStations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setStations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stations/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search stations");
      }

      setStations(data.stations || []);
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchStations(newValue);
    }, 300);
  };

  const handleSelect = (station: Station) => {
    setQuery(station.name);
    setStations([]);
    setIsOpen(false);
    onChange(station);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder || "Enter station name..."}
          disabled={disabled}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}

      {isOpen && stations.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {stations.map((station) => (
            <button
              key={station.extId}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm text-left",
                "hover:bg-accent focus:bg-accent focus:outline-none"
              )}
              onClick={() => handleSelect(station)}
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{station.name}</p>
                {station.geoPoint && (
                  <p className="text-xs text-muted-foreground truncate">
                    {station.geoPoint.lat.toFixed(4)}, {station.geoPoint.lon.toFixed(4)}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}