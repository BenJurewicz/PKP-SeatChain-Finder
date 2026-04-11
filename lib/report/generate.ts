import { REPORT_STYLES } from './styles';
import { renderTripHeader } from './components/trip-header';
import { renderSummarySection } from './components/summary-section';
import { renderTimeline } from './components/timeline';
import { renderDetailedTable } from './components/detailed-table';
import type { ReportProps } from './types';

export function generateStaticReportHtml(
  seatChain: ReportProps['seatChain'],
  travelerViews: ReportProps['travelerViews'],
  tripSummary?: ReportProps['tripSummary']
): string {
  const headerSection = renderTripHeader(tripSummary);
  const summarySection = renderSummarySection(seatChain);
  const timelineSection = renderTimeline(seatChain, travelerViews);
  const tableSection = renderDetailedTable(seatChain);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seat Chain Report${tripSummary ? ` - ${tripSummary.trainName}` : ''}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <main>
    ${headerSection}
    ${summarySection}
    ${timelineSection}
    <section class="detailed-section">
      <h2 class="detailed-title">Detailed Segment View</h2>
      <div style="overflow-x: auto;">
        ${tableSection}
      </div>
    </section>
  </main>
</body>
</html>`;
}