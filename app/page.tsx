"use client";

import { FormEvent, useMemo, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";

type RunResponse = {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  reportHtml: string;
  sourceHarName: string;
};

function downloadReportHtml(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "seat-chain-report.html";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [travelers, setTravelers] = useState(1);
  const [harFile, setHarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  const summaryCards = useMemo(() => {
    if (!result) return null;
    if (isMultiChainOutput(result.seatChain)) {
      return [
        { label: "Travelers", value: String(result.seatChain.summary.travelers) },
        {
          label: "Coverage",
          value: `${result.seatChain.summary.coveredTravelerSegments}/${result.seatChain.summary.totalTravelerSegments}`,
        },
        { label: "Seat changes", value: String(result.seatChain.summary.totalSeatChanges) },
      ];
    }
    return [
      {
        label: "Segments covered",
        value: `${result.seatChain.summary.coveredSegments}/${result.seatChain.summary.totalSegments}`,
      },
      { label: "Seat changes", value: String(result.seatChain.summary.seatChanges) },
    ];
  }, [result]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!harFile) {
      setError("Please select a HAR file.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("harFile", harFile);
      formData.set("travelers", String(travelers));

      const response = await fetch("/api/run", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as Partial<RunResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Pipeline failed");
      }
      if (!data.seatChain || !data.travelerViews || !data.reportHtml || !data.sourceHarName) {
        throw new Error("Invalid API response");
      }
      setResult({
        seatChain: data.seatChain,
        travelerViews: data.travelerViews,
        reportHtml: data.reportHtml,
        sourceHarName: data.sourceHarName,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <header className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h1 className="text-2xl font-semibold">Seat Chain Builder</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Upload a HAR file, choose travelers, build seat-chain recommendations.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-3 text-lg font-semibold">Run pipeline</h2>
        <form className="grid gap-4 md:grid-cols-[1fr_160px_auto]" onSubmit={onSubmit}>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            type="file"
            accept=".har,application/json"
            onChange={(event) => setHarFile(event.target.files?.[0] ?? null)}
          />
          <input
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            type="number"
            min={1}
            max={20}
            value={travelers}
            onChange={(event) => setTravelers(Number(event.target.value))}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running..." : "Build seat chains"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      {result ? (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Run complete</h2>
            <p className="mt-1 text-sm text-zinc-400">Source: {result.sourceHarName}</p>
            <button
              type="button"
              className="mt-3 rounded-md border border-zinc-600 px-3 py-2 text-sm hover:bg-zinc-800"
              onClick={() => downloadReportHtml(result.reportHtml)}
            >
              Download static HTML report
            </button>
          </section>

          {summaryCards ? (
            <section className="grid gap-3 md:grid-cols-3">
              {summaryCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <h3 className="text-sm text-zinc-400">{card.label}</h3>
                  <p className="mt-1 text-xl font-semibold">{card.value}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Seat change instructions</h2>
            <p className="mb-3 mt-1 text-sm text-zinc-400">Station to seat plan per traveler.</p>
            <div className="grid gap-4">
              {result.travelerViews.map((traveler) => (
                <article
                  key={traveler.travelerIndex}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <h3 className="mb-2 text-sm font-semibold">Traveler {traveler.travelerIndex}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[360px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-zinc-400">
                          <th className="px-2 py-2">Station</th>
                          <th className="px-2 py-2">Seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traveler.changeSteps.map((step, idx) => (
                          <tr key={`${traveler.travelerIndex}-${idx}`} className="border-b border-zinc-900">
                            <td className="px-2 py-2">{step.station}</td>
                            <td className="px-2 py-2 font-medium">{step.seat ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Detailed view (per segment)</h2>
            <p className="mb-3 mt-1 text-sm text-zinc-400">Secondary reference table.</p>
            <div className="overflow-x-auto">
              {isMultiChainOutput(result.seatChain) ? (
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-400">
                      <th className="px-2 py-2">Segment</th>
                      <th className="px-2 py-2">From</th>
                      <th className="px-2 py-2">To</th>
                      <th className="px-2 py-2">Seats</th>
                      <th className="px-2 py-2">Collision free</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.seatChain.perSegmentTravelerAssignment.map((seg) => (
                      <tr key={seg.segmentIndex} className="border-b border-zinc-900">
                        <td className="px-2 py-2">{seg.segmentIndex}</td>
                        <td className="px-2 py-2">{seg.stationFromName ?? seg.stationFrom}</td>
                        <td className="px-2 py-2">{seg.stationToName ?? seg.stationTo}</td>
                        <td className="px-2 py-2">{seg.assignedSeats.map((seat) => seat ?? "—").join(", ")}</td>
                        <td className="px-2 py-2">{seg.collisionFree ? "yes" : "no"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-zinc-400">
                      <th className="px-2 py-2">Segment</th>
                      <th className="px-2 py-2">From</th>
                      <th className="px-2 py-2">To</th>
                      <th className="px-2 py-2">Seat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.seatChain.perSegmentAssignment.map((seg) => (
                      <tr key={seg.segmentIndex} className="border-b border-zinc-900">
                        <td className="px-2 py-2">{seg.segmentIndex}</td>
                        <td className="px-2 py-2">{seg.stationFromName ?? seg.stationFrom}</td>
                        <td className="px-2 py-2">{seg.stationToName ?? seg.stationTo}</td>
                        <td className="px-2 py-2">{seg.assignedSeat ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
