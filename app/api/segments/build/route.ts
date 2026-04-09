import { buildSegmentsOutput } from "@/lib/domain/bilkom";
import { buildHarConfigFromSegmentRequest } from "@/lib/segment-request";
import type { JsonObject } from "@/lib/domain/types";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { errorResponse } from "@/app/api/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SegmentBuildRequest {
  segmentRequest: {
    stationFrom: number;
    stationTo: number;
    vehicleNumber: number;
    departureDate: string;
    arrivalDate: string;
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<SegmentBuildRequest>;

    if (!body.segmentRequest) {
      return errorResponse("Missing segmentRequest");
    }

    const { stationFrom, stationTo, vehicleNumber, departureDate, arrivalDate } = body.segmentRequest;

    if (typeof stationFrom !== "number" || typeof stationTo !== "number") {
      return errorResponse("stationFrom and stationTo must be numbers");
    }
    if (typeof vehicleNumber !== "number") {
      return errorResponse("vehicleNumber must be a number");
    }
    if (typeof departureDate !== "string" || typeof arrivalDate !== "string") {
      return errorResponse("departureDate and arrivalDate must be strings");
    }

    const config = buildHarConfigFromSegmentRequest({
      stationFrom,
      stationTo,
      vehicleNumber,
      departureDate,
      arrivalDate,
    });

    const segmentsOutput = await buildSegmentsOutput(config);

    return Response.json(segmentsOutput);
  } catch (error) {
    return errorResponse(getFriendlyErrorMessage(error), 500);
  }
}