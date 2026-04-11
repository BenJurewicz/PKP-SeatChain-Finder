import { isMultiChainOutput, type SeatChainOutput } from '@/lib/domain/seat-chain';
import { formatTime } from '@/lib/formatting';
import { parseSeat } from '@/lib/utils/parse-seat';
import { escapeHtml } from '../utils';

function renderMultiSegmentTable(seatChain: Extract<SeatChainOutput, { travelerChains: unknown[] }> & { stations: Record<string, string> }): string {
  const headerRow1 = `<th rowspan="2">Seg</th><th rowspan="2">From</th><th rowspan="2">To</th><th rowspan="2">Time</th>${seatChain.travelerChains.map((tc) => `<th colspan="2" class="traveler-header">Traveler ${tc.travelerIndex}</th>`).join('')}<th rowspan="2">Status</th>`;
  const headerRow2 = seatChain.travelerChains.map(() => `<th>Car</th><th>Seat</th>`).join('');

  const rows = seatChain.perSegmentTravelerAssignment
    .map((seg) => {
      const from = seg.stationFromName ?? String(seg.stationFrom);
      const to = seg.stationToName ?? String(seg.stationTo);
      const time = formatTime(seg.departureTime);
      const travelerCells = seg.assignedSeats
        .map((seat) => {
          const parsed = seat ? parseSeat(seat) : { carriage: null, seat: null };
          return `<td>${escapeHtml(parsed.carriage ?? '\u2014')}</td><td>${escapeHtml(parsed.seat ?? '\u2014')}</td>`;
        })
        .join('');
      const status = seg.collisionFree
        ? '<span class="status-ok">\u2713 OK</span>'
        : '<span class="status-collision">\u2715 Collision</span>';
      return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td class="time-cell">${time}</td>${travelerCells}<td>${status}</td></tr>`;
    })
    .join('');

  return `
    <table class="detailed-table">
      <thead><tr>${headerRow1}</tr><tr>${headerRow2}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderSingleSegmentTable(seatChain: Extract<SeatChainOutput, { perSegmentAssignment: unknown[] }> & { stations: Record<string, string> }): string {
  const header = '<thead><tr><th>Seg</th><th>From</th><th>To</th><th>Time</th><th>Carriage</th><th>Seat</th></tr></thead>';
  const rows = seatChain.perSegmentAssignment
    .map((seg) => {
      const from = seg.stationFromName ?? String(seg.stationFrom);
      const to = seg.stationToName ?? String(seg.stationTo);
      const time = formatTime(seg.departureTime);
      const parsed = seg.assignedSeat ? parseSeat(seg.assignedSeat) : { carriage: null, seat: null };
      return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td class="time-cell">${time}</td><td>${escapeHtml(parsed.carriage ?? '\u2014')}</td><td>${escapeHtml(parsed.seat ?? '\u2014')}</td></tr>`;
    })
    .join('');

  return `<table class="detailed-table">${header}<tbody>${rows}</tbody></table>`;
}

export function renderDetailedTable(seatChain: SeatChainOutput): string {
  if (isMultiChainOutput(seatChain)) {
    return renderMultiSegmentTable(seatChain as Extract<SeatChainOutput, { travelerChains: unknown[] }> & { stations: Record<string, string> });
  }
  return renderSingleSegmentTable(seatChain as Extract<SeatChainOutput, { perSegmentAssignment: unknown[] }> & { stations: Record<string, string> });
}