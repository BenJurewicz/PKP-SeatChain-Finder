"use client";

import { SpecialSeatProperty, SPECIAL_SEAT_LABELS, SpecialSeatFilters } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

interface SpecialSeatsFilterProps {
  detectedProperties: SpecialSeatProperty[];
  filters: SpecialSeatFilters;
  onFiltersChange: (filters: SpecialSeatFilters) => void;
  onRecalculate: () => void;
  disabled?: boolean;
  filtersChanged: boolean;
}

export function SpecialSeatsFilter({
  detectedProperties,
  filters,
  onFiltersChange,
  onRecalculate,
  disabled = false,
  filtersChanged,
}: SpecialSeatsFilterProps) {
  const sortedProperties = useMemo(() => {
    return [...detectedProperties].sort();
  }, [detectedProperties]);

  const handleCheckboxChange = (property: SpecialSeatProperty, checked: boolean) => {
    onFiltersChange({
      ...filters,
      [property]: checked,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">Special Seats</span>
      </div>
      <div className="space-y-2">
        {sortedProperties.map((property) => (
          <div key={property} className="flex items-start space-x-2">
            <Checkbox
              id={`filter-${property}`}
              checked={filters[property] ?? false}
              onCheckedChange={(checked) =>
                handleCheckboxChange(property, checked === true)
              }
              disabled={disabled}
            />
            <label
              htmlFor={`filter-${property}`}
              className="text-sm leading-tight cursor-pointer"
            >
              {SPECIAL_SEAT_LABELS[property]}
            </label>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        onClick={onRecalculate}
        disabled={disabled || !filtersChanged}
        className="w-full mt-3"
      >
        Recalculate
      </Button>
    </div>
  );
}