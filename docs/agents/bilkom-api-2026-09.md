# Blikom API — verified live findings (2026-09-18)

This document records the results of live probing of the current Bilkomm (bilkom.pl) API.
Use these facts when updating `lib/trip-search.ts`, `lib/bilkom.ts`, `lib/constants.ts`,
`lib/segment-request.ts`, and `lib/har.ts`.

## 1. Station search — UNCHANGED

```
GET https://bilkom.pl/stacje/szukaj?q=<query>&source=FROMSTATION
```
- Still works, no cookies/auth needed.
- Response shape unchanged (stations array with `id`, `name`, `extId`, `geoPoint`).

## 2. Trip search (podroz) — REQUIRES SESSION COOKIE + NEW TRIP-DATA LOCATION

```
GET https://bilkom.pl/podroz?fromStation=...&poczatkowa=...&toStation=...&docelowa=...&data=DDMMYYYYHHMM&date=DD.MM.YYYY&time=HH:MM&przyjazd=false
```

- **BREAKING: requests without a `SESSION` cookie now return the page with
  "Nie znaleziono żadnego połączenia" (no results), even for valid queries.**
  Fix: first do `GET https://bilkom.pl/` and store the `SESSION` cookie from the
  response (`Set-Cookie: SESSION=<uuid>`), then send it with the podroz request.
  Verified: same URL returned 0 trips without cookie, 6 trips with cookie.
- Query parameters themselves are unchanged from the old implementation
  (poczatkowa/docelowa HAFAS ids, `data=DDMMYYYYHHMM`, etc.). `bilkomAvailOnly`
  is a checkbox that exists in the form; current site default is unchecked
  (branch name seat-filtering-and-no-blikomAviableOnly reflects this).
- Trip data JSON moved: it is now in a hidden input inside the trip element:

```html
<li class="el" data-trip="0" data-trip-id="¶HKI¶T$A=1@O=...$...">
  <input class="jsonPath" type="hidden"
         value="[{&quot;startDate&quot;:1789888860000,...,&quot;num&quot;:&quot;1546&quot;,...,&quot;stops&quot;:[...],...}]">
  ...
</li>
```

  The OLD parser looked for `data-partoftripobj="..."` — that attribute no longer
  exists. Parse `li.el[data-trip]` elements and decode the `value` of the
  `input.jsonPath` inside (HTML-entity decode then JSON.parse). The value is a
  JSON **array** with one object per leg (for direct trains the array has 1 entry;
  multi-leg trips have one entry per leg).
- Trip JSON fields (per leg):
  - `num`: train number as string, e.g. `"1546"` — this is the GRM `vehicleNumber`
    (vehicle `epaNumer` in the GRM response equals this number).
  - `trainCommercialName`: e.g. "MEDUZA"
  - `totalTime`: seconds
  - `startDate` / `stopDate`: epoch ms (Warsaw local)
  - `stops`: array of `{ type:"station", id, name, arrivalDate, departureDate,
    realArrivalDate, realDepartureDate, duration, sequenceIndex, routeIndex,
    platform, track, extId, geoPoint, stopTimeString, platformAndTrack }`
    — `extId` is the HAFAS station number ("5100065"), dates are epoch ms.
  - `routeIndex` on stops: index of the stop on the vehicle's FULL route. If the
    vehicle starts before the requested journey, `routeIndex` of the first trip
    stop is > 0 (e.g. 6). `availableFromStationIndex` in `additionalOptions` uses
    the same indexing.
- Train/carrier display name: check whether `<div class="hidden main-carrier">`
  still exists in the trip HTML. If not, derive a display name from
  `trainCommercialName` + category. (Verify against a fresh podroz HTML.)
- Alternative richer data source: `data-trip-id` contains a HAFAS-ish
  pipe/section-dollars string with legs (departure/arrival station ids + times +
  train numbers per leg), but the jsonPath JSON is easier and is what the old
  parser used.

## 3. GRM seat map — NEW HOST, HAFAS NUMBERING, NO COOKIES NEEDED

```
POST https://bilkom.pl/grm
Authorization: Basic Qmlsa29tUEtQOlY9dGZAc003NlZFOUhRUlloZEMzX3o=
Content-Type: application/json
Origin: https://bilkom.pl
```

- **BREAKING: the old host `https://beta.bilkom.pl/grm` returns HTTP 500 now.**
  The live Angular app posts to `https://bilkom.pl/grm` (same origin as site).
- The old payload with `stationNumberingSystem:"EPA"` + `serviceQualityKey` is
  obsolete. The ngx-grm app now sends:

```json
{
  "stationFrom": 5100065,
  "stationTo": 5100075,
  "stationNumberingSystem": "HAFAS",
  "vehicleNumber": 1546,
  "departureDate": "2026-09-20T09:21:00",
  "arrivalDate": "2026-09-20T11:23:00",
  "type": "CARRIAGE",
  "returnAllSectionsAvailableAtStationFrom": true,
  "returnBGMRecordsInfo": false
}
```

  - `stationFrom`/`stationTo` are HAFAS station numbers (51xxxxx — the trip stop
    `extId` values).
  - `departureDate`/`arrivalDate` are **Warsaw local time strings without
    timezone suffix and without `.000Z`** (ISO `YYYY-MM-DDTHH:MM:SS`).
  - `vehicleNumber` = trip JSON `num` (e.g. 1546).
- The response (unchanged shape, verified fresh in `test-grm-fresh.json` in the
  repo root):

```json
{
  "hadesResponseInfo": {...},
  "vehicle": { "epaNumer": 1546, "plkNumer": "1547/6", "name": "MEDUZA", "type": "EP07 EU200" },
  "stops": [
    { "skrjArrivalDate": "...", "skrjDepartureDate": "...",
      "epaArrivalDate": "2026-09-20T09:16:00", "epaDepartureDate": "2026-09-20T09:21:00",
      "stationNumber": 5100136, "arrivalDirection": 1, "departureDirection": 1 }
  ],
  "carriages": [
    { "carriageNumber": 11, "epaType": ..., "compartmentType": "...", "schema": "...",
      "spots": [ { "number": 11, "status": "AVAILABLE|RESERVED|BLOCKED",
        "properties": ["CLASS_1","CLASS_2","AISLE|MIDDLE|WINDOW","WITH_TABLE","BIKE",
                       "PERSON_WITH_CHILD","HANDICAPPED_*","POLITICIAN","BLOCKED",...],
        "serviceType": "SEAT",
        "specialProperties": [ { "property": "POLITICIAN", "validTo": "2026-09-20T05:50:00" } ] } ] }
  ]
}
```

- Response **stops use EPA station numbers which are NOT the HAFAS numbers you
  sent**. E.g. request `stationFrom=5100065` (HAFAS Warszawa Centralna) but
  `stops[0].stationNumber = 5100136`. To resolve a stop's station number back to
  an EPA id: strip leading "51" and zeros — `5100136` → epaId `136`
  (regex `^51(0*)(\d+)$`). This mirrors the ngx-grm app's
  `convertStationNumberToEpaNumber`.

  Flow used by the app (and ngx-grm): initial journey request with HAFAS
  numbers → response stops (EPA numbers) → per-segment requests with EPA
  numbering → station names via `epaStationName` for those stops.
- **Per-segment requests (verified experimentally):** to get segment-specific
  availability, take the journey response's `stops`, and for each consecutive
  pair POST `/grm` with the response's 8-digit EPA `stationNumber` values and
  `"stationNumberingSystem": "EPA"`:

```json
{
  "stationFrom": 5100136,
  "stationTo": 5100138,
  "stationNumberingSystem": "EPA",
  "vehicleNumber": 1546,
  "departureDate": "2026-09-20T09:21:00",
  "arrivalDate": "2026-09-20T09:27:00",
  "type": "CARRIAGE",
  "returnAllSectionsAvailableAtStationFrom": true,
  "returnBGMRecordsInfo": false
}
```

  where departureDate = `stops[i].epaDepartureDate` and arrivalDate =
  `stops[i+1].epaArrivalDate` (copy strings verbatim from the journey response —
  they are already Warsaw-local without Z suffix).
  - Using `"HAFAS"` numbering with those EPA stop numbers returns `{}` (empty)
    — use `"EPA"` for stop-derived requests.
  - The response to a per-segment request contains exactly the 2 stops and
    carriages with per-segment spot statuses (AVAILABLE counts differ from the
    full-journey call, as expected).

## 4. Station name resolution

- `POST https://bilkom.pl/grm/hafasStationName` with `{"hafasId":"5100065"}` →
  `"Warszawa Centr."` — use for HAFAS ids (trip stop extIds).
- `POST https://bilkom.pl/grm/epaStationName` with `{"epaId":136}` →
  `"Warszawa Centr."` — use for GRM response stop EPA numbers after stripping
  the `51` prefix + zeros (see above).
- **The old code called `epaStationName` with `stationNumber % 10000` as primary
  and `hafasStationName` as fallback. That mapping is wrong for the new API:
  epaId and hafasId numbering are different namespaces.** e.g. `{"epaId":65}` →
  "Lublin Gł." but HAFAS 5100065 → Warszawa Centralna.

## 5. Seat statuses & special properties (fresh live example)

From a live IC 1546 "MEDUZA" Warszawa Centralna → Iława Główna on 2026-09-20
(saved as `test-grm-fresh.json`):

- Statuses present: AVAILABLE (219), RESERVED (259), BLOCKED (6).
- `specialProperties` (with `validTo` timestamps) appear on BOTH RESERVED and
  BLOCKED spots:
  - `POLITICIAN` (6, on BLOCKED spots), validTo `2026-09-20T05:50:00`
  - `PERSON_WITH_CHILD` (12, on RESERVED spots), validTo `2026-09-19T07:50:00`
  - `HANDICAPPED_WITHOUT_WHEELCHAIR` (4, on RESERVED spots), validTo `2026-09-19T07:50:00`
- Spot `properties` may also include static props: `WITH_TABLE`, `BIKE`,
  `HANDICAPPED_GUARDIAN`, `HANDICAPPED_WITH_WHEELCHAIR`, and even a literal
  `BLOCKED` property on some spots.

## 6. Misc

- TLS verification must stay disabled for bilkom.pl (self-signed certs).
- `POST /grm/available/<trainNo>/<DDMMYYYY>` (`{"available":true}`) — used by the
  cart page to check if the seat-map app is offered for a train; not needed by us.
- The Angular seat-map app is at `/ngx-grm/index.html` and talks via postMessage;
  irrelevant for us except as a reference for endpoints above.
