import { groupConsecutiveSteps } from '@/lib/domain/group-steps';
import type { TravelerView } from '@/lib/domain/instructions';
import type { SeatChainOutput } from '@/lib/domain/seat-chain';
import { renderTimelineCard } from './timeline-card';

export function renderTimeline(seatChain: SeatChainOutput, travelerViews: TravelerView[]): string {
  const totalSegments = seatChain.summary.totalSegments;

  return travelerViews
    .map((traveler) => {
      const groups = groupConsecutiveSteps(traveler.changeSteps, traveler.assignments);
      const cards = groups
        .map((group, idx) => renderTimelineCard(group, totalSegments, idx === 0))
        .join('');

      return `
      <section class="traveler-section">
        <h3 class="traveler-title">Traveler ${traveler.travelerIndex}</h3>
        <div class="timeline">
          ${cards}
        </div>
      </section>`;
    })
    .join('');
}