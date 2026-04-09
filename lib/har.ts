import type { HarRequestConfig, JsonValue } from "@/lib/types";
import { requireObject, requireJsonObject } from "@/lib/parsing";

function deriveGrmUrls(grmUrl: string): {
  grmUrl: string;
  epaStationNameUrl: string;
  hafasStationNameUrl: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(grmUrl);
  } catch {
    throw new Error(`Invalid request URL: ${grmUrl}`);
  }
  const origin = `${parsed.protocol}//${parsed.host}`;
  const normalizedGrm = grmUrl.endsWith("/grm") ? grmUrl : `${origin}/grm`;
  return {
    grmUrl: normalizedGrm,
    epaStationNameUrl: `${normalizedGrm}/epaStationName`,
    hafasStationNameUrl: `${normalizedGrm}/hafasStationName`,
  };
}

export function parseHarRequestConfig(harText: string): HarRequestConfig {
  let parsedRoot: unknown;
  try {
    parsedRoot = JSON.parse(harText);
  } catch (error) {
    throw new Error(`Invalid HAR JSON: ${(error as Error).message}`);
  }

  const root = requireObject(parsedRoot, "HAR root");
  const log = requireObject(root.log, "HAR log");
  const entries = log.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("HAR missing log.entries");
  }

  const firstEntry = requireObject(entries[0], "HAR first entry");
  const request = requireObject(firstEntry.request, "HAR request");
  const grmUrlRaw = request.url;
  if (typeof grmUrlRaw !== "string" || !grmUrlRaw.trim()) {
    throw new Error("HAR request.url missing or invalid");
  }

  const headersList = request.headers;
  if (!Array.isArray(headersList)) {
    throw new Error("HAR request.headers missing or invalid");
  }

  const headers: Record<string, string> = {};
  for (const item of headersList) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const header = item as Record<string, unknown>;
    const name = header.name;
    const value = header.value;
    if (typeof name === "string" && typeof value === "string") {
      headers[name] = value;
    }
  }
  delete headers["Content-Length"];

  const postData = requireObject(request.postData, "HAR postData");
  const text = postData.text;
  if (typeof text !== "string") {
    throw new Error("HAR request.postData.text missing or invalid");
  }

  let payloadParsed: unknown;
  try {
    payloadParsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`HAR postData.text is not valid JSON: ${(error as Error).message}`);
  }
  const payload = requireJsonObject(payloadParsed, "HAR payload");

  const urls = deriveGrmUrls(grmUrlRaw);
  return {
    ...urls,
    headers,
    payload: payload as { [key: string]: JsonValue },
  };
}
