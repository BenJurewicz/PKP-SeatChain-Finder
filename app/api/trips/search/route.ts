import { findTrips } from "@/lib/trip-search";
import type { Station } from "@/lib/station-search";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

interface TripSearchRequest {
  fromStation: Station;
  toStation: Station;
  date: string;
  time: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<TripSearchRequest>;

    if (!body.fromStation?.name || !body.fromStation?.id || !body.fromStation?.extId) {
      return errorResponse("Invalid fromStation: must have name, id, and extId");
    }
    if (!body.toStation?.name || !body.toStation?.id || !body.toStation?.extId) {
      return errorResponse("Invalid toStation: must have name, id, and extId");
    }
    if (!body.date) {
      return errorResponse("Missing date (YYYY-MM-DD format required)");
    }
    if (!body.time) {
      return errorResponse("Missing time (HH:MM format required)");
    }

    const dateTimeStr = `${body.date}T${body.time}:00`;
    const dateTime = new Date(dateTimeStr);

    if (Number.isNaN(dateTime.getTime())) {
      return errorResponse(`Invalid date/time: ${dateTimeStr}`);
    }

    const trips = await findTrips(body.fromStation as Station, body.toStation as Station, dateTime);
    return Response.json({ trips });
  } catch (error) {
    return errorResponse(getFriendlyErrorMessage(error), 500);
  }
}