import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import type { TravelerView } from "@/lib/instructions";
import { parseSeat } from "@/lib/utils";

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
        .map((step) => {
          const parsed = parseSeat(step.seat);
          return `<tr><td>${escapeHtml(step.station)}</td><td>${escapeHtml(parsed.carriage ?? "—")}</td><td>${escapeHtml(parsed.seat ?? "—")}</td></tr>`;
        })
        .join("");
      return `
      <section class="card">
        <h3>Traveler ${traveler.travelerIndex}</h3>
        <div class="scroll">
          <table>
            <thead><tr><th>Station</th><th>Carriage</th><th>Seat</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
    })
    .join("");

  const detailedTableHeader = isMultiChainOutput(seatChain)
    ? `<thead><tr><th rowspan="2">Segment</th><th rowspan="2">From</th><th rowspan="2">To</th>${seatChain.travelerChains.map((tc) => `<th colspan="2" style="text-align:center;">Traveler ${tc.travelerIndex}</th>`).join("")}</tr><tr>${seatChain.travelerChains.map(() => `<th>Carriage</th><th>Seat</th>`).join("")}</tr></thead>`
    : `<thead><tr><th>Segment</th><th>From</th><th>To</th><th>Carriage</th><th>Seat</th></tr></thead>`;

  const detailedRows = isMultiChainOutput(seatChain)
    ? seatChain.perSegmentTravelerAssignment
        .map((seg) => {
          const from = seg.stationFromName ?? String(seg.stationFrom);
          const to = seg.stationToName ?? String(seg.stationTo);
          const parsedSeats = seg.assignedSeats.map(parseSeat);
          const travelerCells = parsedSeats
            .map((parsed) => `<td>${escapeHtml(parsed.carriage ?? "—")}</td><td>${escapeHtml(parsed.seat ?? "—")}</td>`)
            .join("");
          return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td>${travelerCells}</tr>`;
        })
        .join("")
    : seatChain.perSegmentAssignment
        .map((seg) => {
          const from = seg.stationFromName ?? String(seg.stationFrom);
          const to = seg.stationToName ?? String(seg.stationTo);
          const parsed = parseSeat(seg.assignedSeat);
          return `<tr><td>${seg.segmentIndex}</td><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td>${escapeHtml(parsed.carriage ?? "—")}</td><td>${escapeHtml(parsed.seat ?? "—")}</td></tr>`;
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
            ${detailedTableHeader}
            <tbody>${detailedRows}</tbody>
          </table>
        </div>
      </section>
    </main>
  </body>
</html>`;
}
