import { isMultiChainOutput, type SeatChainOutput } from '@/lib/domain/seat-chain';

export function renderSummarySection(seatChain: SeatChainOutput): string {
  const isMulti = isMultiChainOutput(seatChain);

  const coverage = isMulti
    ? {
        covered: seatChain.summary.coveredTravelerSegments,
        total: seatChain.summary.totalTravelerSegments,
      }
    : {
        covered: seatChain.summary.coveredSegments,
        total: seatChain.summary.totalSegments,
      };

  const seatChanges = isMulti
    ? seatChain.summary.totalSeatChanges
    : seatChain.summary.seatChanges;

  const travelers = isMulti ? seatChain.summary.travelers : 1;
  const percentage = Math.round((coverage.covered / coverage.total) * 100);

  return `
  <section class="summary-section">
    <div class="summary-card">
      <div class="summary-label">Travelers</div>
      <div class="summary-value">${travelers}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Coverage</div>
      <div class="summary-value">${percentage}%</div>
      <div class="summary-sub">${coverage.covered} of ${coverage.total} segments</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Seat Changes</div>
      <div class="summary-value">${seatChanges}</div>
      <div class="summary-sub">${seatChanges === 0 ? 'Stay in same seat' : 'Changes required'}</div>
    </div>
  </section>`;
}