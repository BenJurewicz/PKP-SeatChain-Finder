import type { GroupedStep } from '@/lib/domain/group-steps';
import { formatTime } from '@/lib/formatting';

export function renderTimelineCard(group: GroupedStep, totalSegments: number, isFirst: boolean): string {
  const percentage = Math.round((group.segmentCount / totalSegments) * 100);
  const timeStr = group.arrivalTime ? formatTime(group.arrivalTime) : null;
  const timeLabel = isFirst ? 'Dep' : 'Arr';

  const seatText = group.seat === null
    ? 'No seat available'
    : `Carriage ${group.carriage}, Seat ${group.seat}`;

  const timeHtml = timeStr && timeStr !== '\u2014'
    ? `<div class="timeline-time">${timeLabel}: ${timeStr}</div>`
    : '';

  return `
    <div class="timeline-group">
      <div class="timeline-card">
        <div class="timeline-station">${group.station}</div>
        ${timeHtml}
        <div class="timeline-seat">${seatText}</div>
        <div class="timeline-meta">${group.segmentCount} ${group.segmentCount === 1 ? 'segment' : 'segments'} (${percentage}%)</div>
      </div>
    </div>`;
}