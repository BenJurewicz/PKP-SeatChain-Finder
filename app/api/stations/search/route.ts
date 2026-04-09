import { searchStations } from "@/lib/station-search";
import { DEFAULT_SEARCH_HEADERS } from "@/lib/constants";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { errorResponse } from "@/app/api/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return errorResponse("Query must be at least 2 characters");
    }

    const stations = await searchStations(query);
    return Response.json({ stations });
  } catch (error) {
    return errorResponse(getFriendlyErrorMessage(error), 500);
  }
}