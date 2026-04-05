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

## Bilkom API Integration

The app consumes the **Bilkom train reservation API** (Polish rail system). All API requests must come from a HAR file captured from a browser session on the Bilkom website.

### API Endpoints

All endpoints are POST requests with JSON payloads. Base URL is extracted from the HAR file (typically `https://[domain]/grm`).

#### 1. Journey/Segment Seat Availability: `/grm`

**Purpose:** Get seat availability for a train journey or specific segment.

**Request payload** (extracted from HAR):
```json
{
  "stationFrom": 5100365,        // EPA station ID (numeric)
  "stationTo": 5100158,          // EPA station ID (numeric)
  "stationNumberingSystem": "EPA",
  "departureDate": "2026-04-05T04:30:00.000Z",
  "arrivalDate": "2026-04-05T11:04:00.000Z",
  // ... other fields from HAR (trainNumber, direction, etc.)
}
```

**Response:**
```json
{
  "stops": [
    {
      "stationNumber": 5100365,
      "epaDepartureDate": "2026-04-05T04:30:00.000Z",
      "epaArrivalDate": null,
      // ... stop metadata
    },
    // ... more stops
  ],
  "carriages": [
    {
      "carriageNumber": 10,
      "spots": [
        {
          "number": 42,
          "status": "AVAILABLE",  // or "OCCUPIED"
          "properties": ["CLASS_2", ...],
          // ... spot metadata
        },
        // ... more spots
      ]
    },
    // ... more carriages
  ]
}
```

**Key fields:**
- `stops[]`: Array of all stations the train stops at (used to derive segment requests)
- `carriages[].spots[]`: Seat availability data
  - `status`: "AVAILABLE" or "OCCUPIED"
  - `properties`: Array including "CLASS_2" or "CLASS_1" (we filter for CLASS_2)
  - `number`: Seat number within carriage

#### 2. Station Name Resolution: `/grm/epaStationName` (primary)

**Purpose:** Convert EPA station ID to human-readable name.

**Request:**
```json
{
  "epaId": 365  // Last 4 digits of EPA station number (e.g., 5100365 → 365)
}
```

**Response:** Plain text station name (e.g., "Ełk")

#### 3. Station Name Resolution (fallback): `/grm/hafasStationName`

**Purpose:** Fallback when EPA station name lookup fails (500 error).

**Request:**
```json
{
  "hafasId": "5100365"  // Full station number as string
}
```

**Response:** Plain text station name

### Station Name Resolution Strategy

1. Try EPA endpoint first (module 10000 to get last 4 digits)
2. If 500 error, fallback to HAFAS endpoint (full ID as string)
3. Cache resolved names to avoid duplicate requests

## Data Flow

```
1. User uploads HAR file + selects traveler count
   ↓
2. Parse HAR → extract:
   - Request URL (base /grm endpoint)
   - Request headers (auth, session cookies)
   - Request payload (journey parameters)
   ↓
3. Call /grm with original payload → get full journey response
   ↓
4. Extract stops[] array → derive segment boundaries
   ↓
5. For each stop pair (stop[i] → stop[i+1]):
   - Build segment payload (override stationFrom/To, departure/arrivalDate)
   - Call /grm for segment
   - Resolve station names via EPA/HAFAS endpoints
   ↓
6. Build segments output structure:
   {
     stations: { "5100365": "Ełk", ... },
     segments: [
       {
         segmentIndex: 1,
         stationFromName: "Ełk",
         stationToName: "Giżycko",
         request: { ... },
         response: { carriages: [...], ... }
       },
       ...
     ]
   }
   ↓
7. Run seat chain algorithm (see below)
   ↓
8. Build traveler instruction views (station → seat changes)
   ↓
9. Generate static HTML report
   ↓
10. Return JSON to client + render UI
```

## Seat Chain Algorithm

**Goal:** Find the best seat allocation that maximizes coverage and minimizes seat changes.

### Single Traveler

**Input:** Array of available CLASS_2 seats per segment (as Set<string>)
```typescript
[
  Set(["10:42", "10:43", ...]),  // Segment 1 available seats
  Set(["10:42", "10:43", ...]),  // Segment 2
  ...
]
```

**Algorithm:** Dynamic programming with state = last chosen seat
- State: `Map<seat | null, [covered, changes, chain]>`
- For each segment:
  - For each possible seat choice (including null = no seat):
    - Consider all previous states
    - Compute new covered count, seat change count
    - Keep best candidate for each ending seat
- Tie-breaking (in order):
  1. Max covered segments
  2. Min seat changes
  3. Lexicographic ordering of seat chain (deterministic)

**Output:**
```typescript
{
  summary: {
    totalSegments: 12,
    coveredSegments: 11,
    uncoveredSegments: 1,
    seatChanges: 2
  },
  perSegmentAssignment: [
    { segmentIndex: 1, assignedSeat: "10:42", hasSeat: true, ... },
    ...
  ],
  intervals: [
    { seat: "10:42", startSegmentIndex: 1, endSegmentIndex: 3, ... },
    ...
  ]
}
```

### Multi-Traveler

**Strategy:** Sequential allocation (greedy by best-chain-first)
1. Run single-traveler algorithm on full availability → allocate to Traveler 1
2. Remove Traveler 1's seats from availability
3. Run algorithm on reduced availability → allocate to Traveler 2
4. Repeat for all travelers

**Collision detection:** After allocation, verify no two travelers share a seat in any segment (set `collisionFree` flag per segment and overall).

**Output:**
```typescript
{
  summary: {
    travelers: 2,
    totalSegments: 12,
    totalTravelerSegments: 24,  // segments × travelers
    coveredTravelerSegments: 21,
    totalSeatChanges: 3,
    collisionFree: true,
    allocationStrategy: "sequential-best-chain"
  },
  perSegmentTravelerAssignment: [
    {
      segmentIndex: 1,
      assignedSeats: ["10:42", "10:43"],  // Array indexed by traveler
      collisionFree: true
    },
    ...
  ],
  travelerChains: [
    { travelerIndex: 1, summary: {...}, perSegmentAssignment: [...], intervals: [...] },
    { travelerIndex: 2, ... }
  ]
}
```

## Seat Representation

Seats are identified as `"carriageNumber:spotNumber"` (e.g., `"10:42"` = carriage 10, spot 42).

## Project Structure

```
webapp/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main UI (upload form + results)
│   ├── globals.css          # Dark theme styles
│   └── api/
│       └── run/
│           └── route.ts     # POST /api/run endpoint (pipeline orchestration)
├── lib/
│   ├── types.ts             # Shared TypeScript types
│   ├── har.ts               # HAR parsing (extract URL, headers, payload)
│   ├── http.ts              # HTTP client (gzip/br/deflate decode, error handling)
│   ├── bilkom.ts            # Bilkom API client (journey + segments + station names)
│   ├── seat-chain.ts        # Seat chain optimization algorithm
│   ├── instructions.ts      # Derive station→seat change steps from chains
│   └── report.ts            # Generate static HTML report
└── AGENTS.md                # This file
```

## Key Implementation Details

### HAR Parsing (`lib/har.ts`)
- Extracts first entry from HAR `log.entries[]`
- Derives 3 endpoints from request URL:
  - `/grm` (journey/segments)
  - `/grm/epaStationName`
  - `/grm/hafasStationName`
- Strips `Content-Length` header (recomputed per request)
- Parses `request.postData.text` as JSON payload

### HTTP Client (`lib/http.ts`)
- Uses Node.js `http`/`https` modules (not fetch)
- **TLS verification disabled** (`rejectUnauthorized: false`) for Bilkom API
- Handles gzip/br/deflate response encoding
- 30s timeout
- Custom `HttpError` class for 4xx/5xx responses

### API Route (`app/api/run/route.ts`)
- `runtime = "nodejs"` (required for http module + file uploads)
- `dynamic = "force-dynamic"` (no static optimization)
- Accepts multipart form data:
  - `harFile`: File (must end in .har)
  - `travelers`: Number (1-20)
- Returns JSON:
  ```typescript
  {
    seatChain: SeatChainOutput,
    travelerViews: TravelerView[],
    reportHtml: string,
    sourceHarName: string
  }
  ```
- Error responses: `{ error: string }` with appropriate HTTP status

### UI (`app/page.tsx`)
- Client component (`"use client"`)
- Upload HAR → set travelers → submit
- Shows:
  1. **Seat change instructions** (primary): Station → Seat table per traveler
  2. **Detailed view (per segment)**: Full segment-by-segment breakdown
- Download button triggers browser download of `reportHtml` as `seat-chain-report.html`

### Static Report (`lib/report.ts`)
- Self-contained HTML file (inline CSS, no external deps)
- Dark theme matching main app
- Contains only:
  1. Seat change instructions
  2. Detailed per-segment view
- Can be opened offline after download

## Running the App

```bash
cd webapp
pnpm install   # First time only
pnpm dev       # Start dev server on http://localhost:3000
pnpm build     # Production build
pnpm start     # Run production build
```

## Testing

Use the HAR files in parent directory:
- `../blikom.har` - Original test journey (Ełk → Gdańsk Wrzeszcz, 12 segments)
- `../blikom-new.har` - Alternative journey for validation

Test API directly:
```bash
curl -X POST -F "harFile=@../blikom.har" -F "travelers=2" http://localhost:3000/api/run
```

## Important Constraints

1. **HAR files are session-specific**: Auth tokens/cookies expire. Fresh HAR capture needed if API returns 401/403.
2. **TLS verification disabled**: Required for Bilkom API (may use self-signed certs or local dev environment).
3. **No CORS handling needed**: HAR contains session context, requests are server-side from Next.js API route.
4. **Deterministic algorithm**: Same HAR + traveler count always produces same result (lexicographic tie-breaking).
5. **Class 2 only**: Algorithm filters for `CLASS_2` seats (hard-coded, could be parameterized).
6. **Sequential allocation**: Multi-traveler allocation is greedy (not globally optimal, but fast and predictable).

## Future Enhancement Ideas

- Parameterize seat class (CLASS_1 vs CLASS_2)
- Add carriage preferences (quiet zones, family carriages)
- Support for seat pairs/groups (keep travelers together)
- Visualize seat maps per carriage
- Save/load results from browser storage
- Export to calendar/ticket format
- Real-time seat updates (websocket polling)
