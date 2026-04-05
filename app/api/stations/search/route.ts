import { searchStations } from "@/lib/station-search";
import { DEFAULT_SEARCH_HEADERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

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
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
}