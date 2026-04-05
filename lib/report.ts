import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import type { TravelerView } from "@/lib/instructions";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function generateStaticReportHtml(
  seatChain: SeatChainOutput,
  travelerViews: TravelerView[],
): string {
  const instructionBlocks = travelerViews
    .map((traveler) => {
      const rows = traveler.changeSteps
        .map(
          (step) =>
            `<tr><td>${escapeHtml(step.station)}</td><td>${escapeHtml(step.seat ?? "—")}</td></tr>`,
        )
        .join("");
      return `
      <section class="card">
        <h3>Traveler ${traveler.travelerIndex}</h3>
        <div class="scroll">
          <table>
            <thead><tr><th>Station</th><th>Seat</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
    })
    .join("");

  const detailedRows = isMultiChainOutput(seatChain)
    ? seatChain.perSegmentTravelerAssignment
        .map((seg) => {
          const from = seg.stationFromName ?? String(seg.stationFrom);
          const to = seg.stationToName ?? String(seg.stationTo);
          const seats = seg.assignedSeats.map((seat) => seat ?? "—").join(", ");
          return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td>${escapeHtml(seats)}</td></tr>`;
        })
        .join("")
    : seatChain.perSegmentAssignment
        .map((seg) => {
          const from = seg.stationFromName ?? String(seg.stationFrom);
          const to = seg.stationToName ?? String(seg.stationTo);
          const seat = seg.assignedSeat ?? "—";
          return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td>${escapeHtml(seat)}</td></tr>`;
        })
        .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Seat Chain Report</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; background: #0b0f16; color: #e5e7eb; font-family: Inter, system-ui, sans-serif; }
      main { max-width: 1020px; margin: 0 auto; padding: 1.25rem; }
      h1, h2, h3 { margin: 0.35rem 0 0.7rem; }
      section { margin-bottom: 1rem; }
      .card { background: #131a24; border: 1px solid #2a3342; border-radius: 10px; padding: 0.85rem; }
      .scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #2a3342; text-align: left; padding: 0.45rem 0.55rem; }
      th { color: #9ca3af; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Seat Chain Report</h1>
      </header>
      <section>
        <h2>Seat change instructions</h2>
        ${instructionBlocks}
      </section>
      <section>
        <h2>Detailed view (per segment)</h2>
        <div class="card scroll">
          <table>
            <thead><tr><th>Segment</th><th>From</th><th>To</th><th>Seat(s)</th></tr></thead>
            <tbody>${detailedRows}</tbody>
          </table>
        </div>
      </section>
    </main>
  </body>
</html>`;
}
