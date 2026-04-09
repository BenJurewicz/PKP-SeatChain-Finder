import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { SEARCH_REQUEST_TIMEOUT_MS } from "./utils/constants";

export class HttpError extends Error {
  status: number;
  responseText: string;

  constructor(message: string, status: number, responseText: string) {
    super(message);
    this.status = status;
    this.responseText = responseText;
  }
}

function decodeBuffer(data: Buffer, encodingHeader: string | string[] | undefined): Buffer {
  if (!encodingHeader) return data;
  const encoding = Array.isArray(encodingHeader) ? encodingHeader.join(",") : encodingHeader;
  const normalized = encoding.toLowerCase();
  try {
    if (normalized.includes("gzip")) return zlib.gunzipSync(data);
    if (normalized.includes("br")) return zlib.brotliDecompressSync(data);
    if (normalized.includes("deflate")) return zlib.inflateSync(data);
  } catch {
    return data;
  }
  return data;
}

async function requestText(
  url: string,
  headers: Record<string, string>,
  body: string | null,
  timeoutMs: number = 30_000,
): Promise<string> {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const transport = isHttps ? https : http;

  const requestHeaders: Record<string, string> = { ...headers };
  if (body !== null) {
    requestHeaders["Content-Length"] = Buffer.byteLength(body).toString();
  }

  const options: https.RequestOptions = {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : undefined,
    path: `${parsed.pathname}${parsed.search}`,
    method: body !== null ? "POST" : "GET",
    headers: requestHeaders,
    timeout: timeoutMs,
  };

  if (isHttps) {
    options.agent = new https.Agent({ rejectUnauthorized: false });
  }

  return await new Promise<string>((resolve, reject) => {
    const req = transport.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        const decoded = decodeBuffer(raw, res.headers["content-encoding"]);
        const text = decoded.toString("utf-8").trim();
        const status = res.statusCode ?? 0;
        if (status >= 200 && status < 300) {
          resolve(text);
          return;
        }
        reject(new HttpError(`HTTP ${status}`, status, text));
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.on("error", (error) => reject(error));
    if (body !== null) {
      req.write(body);
    }
    req.end();
  });
}

export async function postJson<T>(url: string, headers: Record<string, string>, payload: unknown): Promise<T> {
  const text = await requestText(url, headers, JSON.stringify(payload));
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON response: ${(error as Error).message}`);
  }
}

export async function postText(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
): Promise<string> {
  return await requestText(url, headers, JSON.stringify(payload));
}

export async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const text = await requestText(url, headers ?? {}, null);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON response: ${(error as Error).message}`);
  }
}

export async function getText(url: string, headers?: Record<string, string>): Promise<string> {
  return await requestText(url, headers ?? {}, null, SEARCH_REQUEST_TIMEOUT_MS);
}
