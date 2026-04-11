import { formatDateTime, formatDuration } from '@/lib/formatting';
import { escapeHtml, getCarrierColor } from '../utils';
import type { TripSummary } from '../types';

export function renderTripHeader(tripSummary?: TripSummary): string {
  if (!tripSummary) {
    return '<header class="trip-header"><h1>Seat Chain Report</h1></header>';
  }

  const carrierColor = getCarrierColor(tripSummary.carrierId);

  return `
  <header class="trip-header">
    <div class="trip-title">
      <span class="carrier-badge" style="background-color: ${carrierColor}">${escapeHtml(tripSummary.carrierId)}</span>
      <h1>${escapeHtml(tripSummary.trainName)}</h1>
    </div>
    <div class="trip-route">
      <span class="station">${escapeHtml(tripSummary.departureStation)}</span>
      <span class="arrow">\u2192</span>
      <span class="station">${escapeHtml(tripSummary.arrivalStation)}</span>
    </div>
    <div class="trip-details">
      <div class="trip-time">
        <span class="label">Departure</span>
        <span class="value">${formatDateTime(tripSummary.departureTime)}</span>
      </div>
      <div class="trip-time">
        <span class="label">Arrival</span>
        <span class="value">${formatDateTime(tripSummary.arrivalTime)}</span>
      </div>
      <div class="trip-time">
        <span class="label">Duration</span>
        <span class="value">${formatDuration(tripSummary.duration)}</span>
      </div>
    </div>
  </header>`;
}