import { buildSegmentsOutput } from "@/lib/bilkom";
import { parseHarRequestConfig } from "@/lib/har";
import { buildTravelerViews } from "@/lib/instructions";
import { generateStaticReportHtml } from "@/lib/report";
import { buildSeatChainOutput } from "@/lib/seat-chain";

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
    const reportHtml = generateStaticReportHtml(seatChain, travelerViews);

    return Response.json({
      seatChain,
      travelerViews,
      reportHtml,
      sourceHarName: harFile.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
