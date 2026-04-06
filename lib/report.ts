import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import type { TravelerView } from "@/lib/instructions";
import { parseSeat } from "@/lib/utils";

export interface TripSummary {
  trainName: string;
  trainNumber: string;
  carrierId: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });
  } catch {
    return "—";
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("pl-PL", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getCarrierColor(carrierId: string): string {
  const colors: Record<string, string> = {
    EIP: "#142458",
    IC: "#F58220",
    TLK: "#1E5C4D",
  };
  return colors[carrierId.toUpperCase()] || "#6b7280";
}

function groupConsecutiveSteps(
  steps: TravelerView["changeSteps"],
  assignments: TravelerView["assignments"]
): Array<{
  station: string;
  carriage: string | null;
  seat: string | null;
  type: string;
  time?: string;
  segmentCount: number;
}> {
  const groups: Array<{
    station: string;
    carriage: string | null;
    seat: string | null;
    type: string;
    time?: string;
    segmentCount: number;
  }> = [];

  if (steps.length === 0) return groups;

  let currentGroup: (typeof groups)[0] | null = null;
  let currentSeatString: string | null = null;

  for (const step of steps) {
    const seatString = step.seat;
    const parsed = step.seat ? parseSeat(step.seat) : { carriage: null, seat: null };

    if (!currentGroup) {
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type,
        time: step.arrivalTime,
        segmentCount: 0,
      };
      currentSeatString = seatString;
    } else if (seatString === currentSeatString) {
      // Same seat as current group, continue
    } else {
      // Different seat, finalize current group
      currentGroup.segmentCount = assignments.filter(
        (a) => a.assignedSeat === currentSeatString
      ).length;
      groups.push(currentGroup);

      // Start new group
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type,
        time: step.arrivalTime,
        segmentCount: 0,
      };
      currentSeatString = seatString;
    }
  }

  // Push final group
  if (currentGroup) {
    currentGroup.segmentCount = assignments.filter(
      (a) => a.assignedSeat === currentSeatString
    ).length;
    groups.push(currentGroup);
  }

  return groups;
}

function renderTimeline(
  travelerViews: TravelerView[],
  totalSegments: number
): string {
  return travelerViews
    .map((traveler) => {
      const groups = groupConsecutiveSteps(traveler.changeSteps, traveler.assignments);
      const cards = groups
        .map((group, idx) => {
          const segmentCount = group.segmentCount;
          const percentage = Math.round((segmentCount / totalSegments) * 100);
          const timeStr = formatTime(group.time);
          const isFirst = idx === 0;

          const timeLabel = isFirst ? "Dep" : "Arr";

          return `
          <div class="timeline-group">
            <div class="timeline-card">
              <div class="timeline-station">${escapeHtml(group.station)}</div>
              ${timeStr !== "—" ? `<div class="timeline-time">${timeLabel}: ${timeStr}</div>` : ""}
              <div class="timeline-seat">Carriage ${group.carriage ?? "—"}, Seat ${group.seat ?? "—"}</div>
              <div class="timeline-meta">${segmentCount} ${segmentCount === 1 ? "segment" : "segments"} (${percentage}%)</div>
            </div>
          </div>`;
        })
        .join("");

      const arrows = groups
        .slice(0, -1)
        .map(() => `<div class="timeline-arrow">→</div>`)
        .join("");

      return `
      <section class="traveler-section">
        <h3 class="traveler-title">Traveler ${traveler.travelerIndex}</h3>
        <div class="timeline">
          ${cards}
        </div>
      </section>`;
    })
    .join("");
}

function renderDetailedTable(seatChain: SeatChainOutput): string {
  if (isMultiChainOutput(seatChain)) {
    const headerRow1 = `<th rowspan="2">Seg</th><th rowspan="2">From</th><th rowspan="2">To</th><th rowspan="2">Time</th>${seatChain.travelerChains.map((tc) => `<th colspan="2" class="traveler-header">Traveler ${tc.travelerIndex}</th>`).join("")}<th rowspan="2">Status</th>`;
    const headerRow2 = seatChain.travelerChains.map(() => `<th>Car</th><th>Seat</th>`).join("");

    const rows = seatChain.perSegmentTravelerAssignment
      .map((seg) => {
        const from = seg.stationFromName ?? String(seg.stationFrom);
        const to = seg.stationToName ?? String(seg.stationTo);
        const time = formatTime(seg.departureTime);
        const travelerCells = seg.assignedSeats
          .map((seat) => {
            const parsed = seat ? parseSeat(seat) : { carriage: null, seat: null };
            return `<td>${escapeHtml(parsed.carriage ?? "—")}</td><td>${escapeHtml(parsed.seat ?? "—")}</td>`;
          })
          .join("");
        const status = seg.collisionFree
          ? `<span class="status-ok">✓ OK</span>`
          : `<span class="status-collision">✕ Collision</span>`;
        return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td class="time-cell">${time}</td>${travelerCells}<td>${status}</td></tr>`;
      })
      .join("");

    return `
      <table class="detailed-table">
        <thead><tr>${headerRow1}</tr><tr>${headerRow2}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const header = `<thead><tr><th>Seg</th><th>From</th><th>To</th><th>Time</th><th>Carriage</th><th>Seat</th></tr></thead>`;
  const rows = seatChain.perSegmentAssignment
    .map((seg) => {
      const from = seg.stationFromName ?? String(seg.stationFrom);
      const to = seg.stationToName ?? String(seg.stationTo);
      const time = formatTime(seg.departureTime);
      const parsed = seg.assignedSeat ? parseSeat(seg.assignedSeat) : { carriage: null, seat: null };
      return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td class="time-cell">${time}</td><td>${escapeHtml(parsed.carriage ?? "—")}</td><td>${escapeHtml(parsed.seat ?? "—")}</td></tr>`;
    })
    .join("");

  return `<table class="detailed-table">${header}<tbody>${rows}</tbody></table>`;
}

export function generateStaticReportHtml(
  seatChain: SeatChainOutput,
  travelerViews: TravelerView[],
  tripSummary?: TripSummary
): string {
  const totalSegments = isMultiChainOutput(seatChain)
    ? seatChain.summary.totalSegments
    : seatChain.summary.totalSegments;

  let coverage: { covered: number; total: number };
  let seatChanges: number;
  let travelersCount: number;

  if (isMultiChainOutput(seatChain)) {
    coverage = {
      covered: seatChain.summary.coveredTravelerSegments,
      total: seatChain.summary.totalTravelerSegments,
    };
    seatChanges = seatChain.summary.totalSeatChanges;
    travelersCount = seatChain.summary.travelers;
  } else {
    coverage = {
      covered: seatChain.summary.coveredSegments,
      total: seatChain.summary.totalSegments,
    };
    seatChanges = seatChain.summary.seatChanges;
    travelersCount = 1;
  }

  const coveragePercent = Math.round((coverage.covered / coverage.total) * 100);

  const headerSection = tripSummary
    ? `
      <header class="trip-header">
        <div class="trip-title">
          <span class="carrier-badge" style="background-color: ${getCarrierColor(tripSummary.carrierId)}">${escapeHtml(tripSummary.carrierId)}</span>
          <h1>${escapeHtml(tripSummary.trainName)}</h1>
        </div>
        <div class="trip-route">
          <span class="station">${escapeHtml(tripSummary.departureStation)}</span>
          <span class="arrow">→</span>
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
      </header>`
    : `
      <header class="trip-header">
        <h1>Seat Chain Report</h1>
      </header>`;

  const summarySection = `
      <section class="summary-section">
        <div class="summary-card">
          <div class="summary-label">Travelers</div>
          <div class="summary-value">${travelersCount}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Coverage</div>
          <div class="summary-value">${coveragePercent}%</div>
          <div class="summary-sub">${coverage.covered} of ${coverage.total} segments</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Seat Changes</div>
          <div class="summary-value">${seatChanges}</div>
          <div class="summary-sub">${seatChanges === 0 ? "Stay in same seat" : "Changes required"}</div>
        </div>
      </section>`;

  const timelineSection = renderTimeline(travelerViews, totalSegments);
  const tableSection = renderDetailedTable(seatChain);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seat Chain Report${tripSummary ? ` - ${tripSummary.trainName}` : ""}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --card-hover: #334155;
      --border: #475569;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --warning: #f59e0b;
      --success: #22c55e;
      --error: #ef4444;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    
    main {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .trip-header {
      background: var(--card);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .trip-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .carrier-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    
    .trip-title h1 {
      font-size: 24px;
      font-weight: 700;
    }
    
    .trip-route {
      font-size: 18px;
      margin-bottom: 16px;
    }
    
    .trip-route .station {
      font-weight: 600;
    }
    
    .trip-route .arrow {
      margin: 0 12px;
      color: var(--text-muted);
    }
    
    .trip-details {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    
    .trip-time {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .trip-time .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .trip-time .value {
      font-size: 16px;
      font-weight: 600;
    }
    
    .summary-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .summary-card {
      background: var(--card);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    
    .summary-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .summary-value {
      font-size: 28px;
      font-weight: 700;
    }
    
    .summary-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    
    .traveler-section {
      background: var(--card);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    
    .traveler-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    
    .timeline {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
    }
    
    .timeline-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .timeline-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      min-width: 140px;
    }
    
    .timeline-station {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .timeline-time {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    .timeline-seat {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .timeline-meta {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .timeline-arrow {
      display: flex;
      align-items: center;
      font-size: 20px;
      color: var(--text-muted);
      padding-top: 40px;
    }
    
    .detailed-section {
      margin-top: 32px;
    }
    
    .detailed-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .detailed-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .detailed-table th,
    .detailed-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .detailed-table th {
      background: rgba(0, 0, 0, 0.2);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
    
    .detailed-table .traveler-header {
      text-align: center;
      color: var(--text);
    }
    
    .detailed-table .time-cell {
      font-size: 13px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    
    .status-ok {
      color: var(--success);
      font-weight: 600;
    }
    
    .status-collision {
      color: var(--error);
      font-weight: 600;
    }
    
    .detailed-table tbody tr:hover {
      background: var(--card-hover);
    }
    
    @media (max-width: 640px) {
      main { padding: 12px; }
      .timeline { flex-direction: column; }
      .timeline-arrow { display: none; }
      .trip-details { flex-direction: column; gap: 12px; }
      .detailed-table { font-size: 14px; }
      .detailed-table th, .detailed-table td { padding: 8px 10px; }
    }
    
    @media print {
      body { background: white; color: black; }
      .trip-header, .summary-card, .traveler-section, .detailed-table { 
        background: white; 
        border: 1px solid #ddd;
      }
      .timeline-card { border: 1px solid #ddd; }
    }
  </style>
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