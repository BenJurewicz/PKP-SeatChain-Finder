<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Seat Chain Builder App - Context & Architecture

## Purpose

This Next.js application helps train passengers find optimal seating arrangements for their entire journey, even when no single seat is available for the full trip. It analyzes seat availability across train segments and builds "seat chains" - sequences of seats that minimize the number of times a passenger needs to change seats.

**Key use case:** A train journey from Station A to Station J might have no single seat available for all 9 segments. The app finds the best combination (e.g., Seat X for segments 1-4, Seat Y for segments 5-9) so passengers have a seat for the maximum duration with minimal seat changes.

**Multi-traveler support:** Can find collision-free seat chains for multiple travelers (1-20), ensuring no two travelers are assigned the same seat in any segment.

## User Flows

### Flow A: Manual Search (Primary)

The new primary flow allows users to search for connections directly:

1. **Station Autocomplete** - User types station names with real-time suggestions
2. **Date/Time Selection** - User selects journey date and time
3. **Trip Selection** - App shows available trips, user selects one
4. **Seat Chain Building** - App automatically fetches seat data and builds chains

```
[Station Input] → [Date/Time] → [Trip List] → [Seat Chain Results]
```

### Flow B: HAR Upload (Advanced)

The original flow for users with captured HAR files:

1. **Upload HAR** - User provides HAR file with session data
2. **Configure Travelers** - Set number of travelers (1-20)
3. **Seat Chain Building** - App processes segments from HAR

```
[Upload HAR] → [Set Travelers] → [Seat Chain Results]
```

## API Routes

### `/api/stations/search` - Station Autocomplete

**Method:** `GET`

**Query Parameters:**
- `q` - Station name search query (min 2 characters)

**Response:**
```json
{
  "stations": [
    {
      "name": "Warszawa Centralna",
      "extId": "5100065",
      "id": "A=1@O=Warszawa Centralna@X=...",
      "geoPoint": { "lat": 52.228864, "lon": 21.003233 }
    }
  ]
}
```

### `/api/trips/search` - Find Train Connections

**Method:** `POST`

**Request Body:**
```json
{
  "fromStation": { "name": "...", "extId": "...", "id": "..." },
  "toStation": { "name": "...", "extId": "...", "id": "..." },
  "date": "2026-04-06",
  "time": "09:00"
}
```

**Response:**
```json
{
  "trips": [
    {
      "tripIndex": 0,
      "trainName": "TLK 15110",
      "trainNumber": "15110",
      "departure": {
        "stationId": "5100305",
        "stationName": "Ełk",
        "dateTime": "2026-04-06T16:36:00"
      },
      "arrival": {
        "stationId": "5101307",
        "stationName": "Gdańsk Wrzeszcz",
        "dateTime": "2026-04-06T21:17:00"
      },
      "duration": 16860,
      "stops": [...],
      "segmentRequest": {
        "stationFrom": 5100305,
        "stationTo": 5101307,
        "vehicleNumber": 15110,
        "departureDate": "2026-04-06T16:36:00",
        "arrivalDate": "2026-04-06T21:17:00",
        "type": "CARRIAGE"
      }
    }
  ]
}
```

### `/api/segments/build` - Build Segment Data

**Method:** `POST`

**Request Body:**
```json
{
  "segmentRequest": {
    "stationFrom": 5100305,
    "stationTo": 5101307,
    "vehicleNumber": 15110,
    "departureDate": "2026-04-06T16:36:00",
    "arrivalDate": "2026-04-06T21:17:00"
  }
}
```

**Response:** Same as `/api/run` (seatChain, travelerViews, reportHtml)

### `/api/run` - HAR Upload Flow (Existing)

**Method:** `POST`

**Request:** Multipart form data
- `harFile` - HAR file
- `travelers` - Number of travelers (1-20)

**Response:**
```json
{
  "seatChain": SeatChainOutput,
  "travelerViews": TravelerView[],
  "reportHtml": string,
  "sourceHarName": string
}
```

## Project Structure

```
webapp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main UI with tabs for both flows
│   ├── globals.css
│   └── api/
│       ├── run/route.ts            # HAR upload endpoint
│       ├── stations/search/route.ts # Station autocomplete
│       ├── trips/search/route.ts    # Trip search endpoint
│       └── segments/build/route.ts  # Segment builder endpoint
├── components/
│   ├── file-upload.tsx
│   ├── station-input.tsx           # Station autocomplete component
│   ├── date-time-input.tsx         # Date/time picker
│   ├── trip-list.tsx               # Trip selection list
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── types.ts                    # TypeScript types
│   ├── constants.ts                # Shared constants (API URLs, headers)
│   ├── http.ts                     # HTTP client (GET/POST support)
│   ├── har.ts                      # HAR parsing
│   ├── bilkom.ts                   # Bilkom API client
│   ├── station-search.ts           # Station autocomplete API
│   ├── trip-search.ts              # Trip HTML parsing
│   ├── segment-request.ts          # Build segment requests from trips
│   ├── seat-chain.ts               # Seat chain algorithm
│   ├── instructions.ts             # Build traveler instructions
│   └── report.ts                   # Generate static HTML report
└── AGENTS.md
```

## Key Files

### `lib/constants.ts`

Shared constants including:
- `BILKOM_STATION_SEARCH_URL` - Station search API endpoint
- `BILKOM_TRIP_SEARCH_URL` - Trip search HTML endpoint
- `DEFAULT_BILKOM_AUTH` - Default authorization header
- `DEFAULT_BILKOM_GRM_URL` - Default GRM endpoint
- `DEFAULT_BILKOM_HEADERS` - Default headers for API requests
- `DEFAULT_SEARCH_HEADERS` - Headers for station/trip search

### `lib/station-search.ts`

Station autocomplete using the Bilkom API:
- Queries `https://bilkom.pl/stacje/szukaj?q=<query>&source=FROMSTATION`
- Returns station name, extId, id, and coordinates

### `lib/trip-search.ts`

Trip search via HTML parsing:
- Queries `https://bilkom.pl/podroz` with station IDs and datetime
- Parses HTML to extract trip data:
  - Train name, number, duration
  - Departure/arrival times and stations
  - All stops along the route
  - Segment request ready for processing

### `lib/segment-request.ts`

Builds segment requests from trip data:
- Takes a `SegmentRequestConfig` (station IDs, vehicle number, dates)
- Returns `HarRequestConfig` compatible with `buildSegmentsOutput()`

## Bilkom API Integration

### API Endpoints

1. **Station Search:** `GET https://bilkom.pl/stacje/szukay?q=<query>&source=FROMSTATION`
2. **Trip Search:** `GET https://bilkom.pl/podroz?<params>` (returns HTML)
3. **Segment Data:** `POST https://beta.bilkom.pl/grm`
4. **Station Names:**
   - `POST https://beta.bilkom.pl/grm/epaStationName` (primary)
   - `POST https://beta.bilkom.pl/grm/hafasStationName` (fallback)

### Authentication

Two modes:
1. **Manual Search Flow:** Uses default auth header (may expire)
2. **HAR Upload Flow:** Extracts auth from uploaded HAR file (fresh session)

## Running the App

```bash
cd webapp
pnpm install   # First time only
pnpm dev        # Start dev server on http://localhost:3000
pnpm build      # Production build
pnpm start      # Run production build
```

## Testing

### Manual Search Flow
1. Navigate to `http://localhost:3000`
2. Enter departure and destination stations (autocomplete)
3. Select date and time
4. Click "Search Trips"
5. Select a trip from the results
6. View seat chain results

### HAR Upload Flow
1. Navigate to `http://localhost:3000`
2. Click "Upload HAR File" tab
3. Upload HAR file from `../blikom.har` or `../blikom-new.har`
4. Set number of travelers
5. Click "Build seat chains"

### Test API Endpoints Directly

```bash
# Station search
curl "http://localhost:3000/api/stations/search?q=Warszawa"

# Trip search
curl -X POST http://localhost:3000/api/trips/search \
  -H "Content-Type: application/json" \
  -d '{"fromStation":{"name":"Ełk","extId":"5100305","id":"..."},"toStation":{"name":"Gdańsk Wrzeszcz","extId":"5101307","id":"..."},"date":"2026-04-06","time":"09:00"}'

# Segment build (from selected trip)
curl -X POST http://localhost:3000/api/segments/build \
  -H "Content-Type: application/json" \
  -d '{"segmentRequest":{"stationFrom":5100305,"stationTo":5101307,"vehicleNumber":15110,"departureDate":"2026-04-06T16:36:00","arrivalDate":"2026-04-06T21:17:00"}}'

# HAR upload (existing flow)
curl -X POST -F "harFile=@../blikom.har" -F "travelers=2" http://localhost:3000/api/run
```

## Important Constraints

1. **HAR auth expires**: HAR sessions have limited lifetime - fresh captures needed
2. **Default auth may fail**: Manual search uses hardcoded auth that may expire
3. **HTML parsing fragile**: Trip search relies on parsing HTML - may break if site changes
4. **TLS verification disabled**: Required for Bilkom API
5. **No CORS**: All API calls are server-side
6. **Class 2 seats only**: Currently filters for CLASS_2 seats only
7. **Sequential allocation**: Multi-traveler uses greedy approach

## Future Enhancements

- Add date/time picker improvements
- Cache station search results
- Show seat maps visually
- Export to calendar/ticket format
- Real-time seat updates via polling