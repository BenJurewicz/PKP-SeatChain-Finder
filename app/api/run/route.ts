import { buildSegmentsOutput } from "@/lib/bilkom";
import { extractBlockedSeats } from "@/lib/blocked-seats";
import { parseHarRequestConfig } from "@/lib/har";
import { buildTravelerViews } from "@/lib/instructions";
import { generateStaticReportHtml, type TripSummary } from "@/lib/report";
import { buildSeatChainOutput } from "@/lib/seat-chain";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const harFile = formData.get("harFile");
    if (!(harFile instanceof File)) {
      return errorResponse("Missing HAR file");
    }
    if (!harFile.name.toLowerCase().endsWith(".har")) {
      return errorResponse("Uploaded file must have .har extension");
    }

    const travelersRaw = formData.get("travelers");
    const travelers = Number(travelersRaw ?? 1);
    if (!Number.isInteger(travelers) || travelers < 1 || travelers > 20) {
      return errorResponse("Travelers must be an integer between 1 and 20");
    }

    const harText = await harFile.text();
    const config = parseHarRequestConfig(harText);
    const segmentsOutput = await buildSegmentsOutput(config);
    const seatChain = buildSeatChainOutput(segmentsOutput, travelers);
    const travelerViews = buildTravelerViews(seatChain);
    const blockedSeats = extractBlockedSeats(segmentsOutput);

    const firstSegment = segmentsOutput.segments[0];
    const lastSegment = segmentsOutput.segments[segmentsOutput.segments.length - 1];
    
    const tripSummary: TripSummary = {
      trainName: "Unknown Train",
      trainNumber: "",
      carrierId: "",
      departureStation: firstSegment.stationFromName ?? String(firstSegment.request.stationFrom ?? ""),
      arrivalStation: lastSegment.stationToName ?? String(lastSegment.request.stationTo ?? ""),
      departureTime: firstSegment.departureTime ?? "",
      arrivalTime: lastSegment.arrivalTime ?? "",
      duration: 0,
    };

    if (firstSegment.departureTime && lastSegment.arrivalTime) {
      const departureDate = new Date(firstSegment.departureTime);
      const arrivalDate = new Date(lastSegment.arrivalTime);
      tripSummary.duration = Math.round((arrivalDate.getTime() - departureDate.getTime()) / 1000);
    }

    const reportHtml = generateStaticReportHtml(seatChain, travelerViews, tripSummary);

    return Response.json({
      seatChain,
      travelerViews,
      reportHtml,
      sourceHarName: harFile.name,
      tripInfo: {
        trainName: tripSummary.trainName,
        carrierId: tripSummary.carrierId,
        departureStation: tripSummary.departureStation,
        arrivalStation: tripSummary.arrivalStation,
        departureTime: tripSummary.departureTime,
        arrivalTime: tripSummary.arrivalTime,
        duration: tripSummary.duration,
      },
      blockedSeats,
    });
  } catch (error) {
    return errorResponse(getFriendlyErrorMessage(error), 500);
  }
}
