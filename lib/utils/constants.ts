export const BILKOM_STATION_SEARCH_URL = "https://bilkom.pl/stacje/szukaj";
export const BILKOM_TRIP_SEARCH_URL = "https://bilkom.pl/podroz";

export const DEFAULT_BILKOM_AUTH =
  "Basic Qmlsa29tUEtQOlY9dGZAc003NlZFOUhRUlloZEMzX3o=";

export const DEFAULT_BILKOM_GRM_URL = "https://beta.bilkom.pl/grm";

export const DEFAULT_BILKOM_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Authorization: DEFAULT_BILKOM_AUTH,
  "Content-Type": "application/json",
  Origin: "https://beta.bilkom.pl",
  DNT: "1",
  "Sec-GPC": "1",
  Connection: "keep-alive",
  Referer: "https://beta.bilkom.pl/ngx-grm/ngx-grm/?v=%204.3",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

export const DEFAULT_SEARCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
};

export const SEARCH_REQUEST_TIMEOUT_MS = 30_000;