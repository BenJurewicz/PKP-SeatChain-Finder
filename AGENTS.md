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

### HAR File Capture

The HAR tutorial in `app/page.tsx` guides users through:

1. Go to bilkom.pl
2. Find and select desired train
3. **WARNING: Only direct connections are supported**
4. Click **Buy Ticket** to proceed
5. Open browser **Dev Tools** (F12) → **Network** tab
6. Scroll to bottom, select "I choose a seat from a schematic"
7. Click the **Class 2** button
8. In Network tab, find request named **grm** (type: JSON)
9. Right-click → "Save all as HAR"
10. Upload the saved `.har` file

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
      "carrierId": "TLK",
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

**Response:** Same as `/api/run` (seatChain, travelerViews, reportHtml, tripInfo)

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
  "sourceHarName": string,
  "blockedSeats": BlockedSeat[],
  "tripInfo": {
    "trainName": "TLK 15110",
    "carrierId": "TLK",
    "departureStation": "Ełk",
    "arrivalStation": "Gdańsk Wrzeszcz",
    "departureTime": "2026-04-06T16:36:00",
    "arrivalTime": "2026-04-06T21:17:00",
    "duration": 16860
  }
}
```

## Error Handling

### `lib/error-messages.ts`

Utility functions for user-friendly error messages:

- **`getFriendlyErrorMessage(error: unknown): string`** - Converts technical errors to user-friendly messages
- Handles network errors (ENOTFOUND, ECONNREFUSED, ETIMEDOUT)
- Converts HTTP status codes to readable messages (401, 403, 404)
- Generic fallback for unknown errors
- **Never exposes bilkom.pl** in error messages

**Usage:**
```typescript
import { getFriendlyErrorMessage } from "@/lib/error-messages";

try {
  // ... API call
} catch (error) {
  return errorResponse(getFriendlyErrorMessage(error), 500);
}
```

## Project Structure

```
webapp/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main UI with segmented control for both flows
│   ├── globals.css
│   └── api/
│       ├── run/route.ts            # HAR upload endpoint
│       ├── stations/search/route.ts # Station autocomplete
│       ├── trips/search/route.ts    # Trip search endpoint
│       └── segments/build/route.ts  # Segment builder endpoint
├── components/
│   ├── file-upload.tsx             # Drag & drop HAR file upload
│   ├── station-input.tsx           # Station autocomplete with live search and auto-selection
│   ├── date-time-input.tsx         # Date/time picker with compact grid layout
│   ├── trip-list.tsx               # Trip selection list with carrier icons
│   ├── coverage-progress.tsx       # Journey coverage percentage bar
│   ├── seat-timeline.tsx           # Seat assignment timeline view
│   ├── train-carrier-icon.tsx      # Carrier logo (EIP/IC/TLK) display
│   ├── blocked-seats-section.tsx   # Collapsible blocked seats display
│   ├── number-stepper.tsx          # Number input with +/- buttons for traveler count
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── types.ts                    # TypeScript types (Trip, Station, etc.)
│   ├── utils.ts                    # Utilities: cn(), parseSeat()
│   ├── constants.ts                # API URLs, headers, timeouts
│   ├── error-messages.ts           # Error message utilities
│   ├── http.ts                     # HTTP client (GET/POST with TLS bypass)
│   ├── har.ts                      # HAR file parsing
│   ├── bilkom.ts                   # Bilkom API client
│   ├── station-search.ts           # Station autocomplete API
│   ├── trip-search.ts              # Trip HTML parsing
│   ├── segment-request.ts          # Build segment requests from trips
│   ├── seat-chain.ts               # Seat chain algorithm
│   ├── blocked-seats.ts            # Extract temporarily blocked seats
│   ├── instructions.ts             # Build traveler instructions
│   └── report.ts                   # Generate static HTML report
├── public/
│   └── icons/                      # Carrier SVG logos
│       ├── eip.svg                 # Express InterCity Premium
│       ├── ic.svg                  # InterCity
│       └── tlk.svg                 # Twoje Linie Kolejowe
└── AGENTS.md
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
│   ├── file-upload.tsx             # Drag & drop HAR file upload
│   ├── station-input.tsx           # Station autocomplete with live search
│   ├── date-time-input.tsx         # Date/time picker inputs
│   ├── trip-list.tsx               # Trip selection list with carrier icons
│   ├── coverage-progress.tsx       # Journey coverage percentage bar
│   ├── seat-timeline.tsx           # Seat assignment timeline view
│   ├── train-carrier-icon.tsx      # Carrier logo (EIP/IC/TLK) display
│   ├── blocked-seats-section.tsx   # Collapsible blocked seats display
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── types.ts                    # TypeScript types (Trip, Station, etc.)
│   ├── utils.ts                    # Utilities: cn(), parseSeat()
│   ├── constants.ts                # API URLs, headers, timeouts
│   ├── http.ts                     # HTTP client (GET/POST with TLS bypass)
│   ├── har.ts                      # HAR file parsing
│   ├── bilkom.ts                   # Bilkom API client
│   ├── station-search.ts           # Station autocomplete API
│   ├── trip-search.ts              # Trip HTML parsing
│   ├── segment-request.ts          # Build segment requests from trips
│   ├── seat-chain.ts               # Seat chain algorithm
│   ├── blocked-seats.ts            # Extract temporarily blocked seats
│   ├── instructions.ts             # Build traveler instructions
│   └── report.ts                   # Generate static HTML report
├── public/
│   └── icons/                      # Carrier SVG logos
│       ├── eip.svg                 # Express InterCity Premium
│       ├── ic.svg                  # InterCity
│       └── tlk.svg                 # Twoje Linie Kolejowe
└── AGENTS.md
```

## Type Definitions

### `lib/types.ts`

Core types used throughout the app:

- **`Station`** - Station data from autocomplete API (name, extId, id, geoPoint)
- **`Trip`** - Train trip with carrierId, stops, segmentRequest
- **`TripStop`** - Individual stop with arrival/departure times
- **`SegmentOutputItem`** - Segment with departureTime/arrivalTime
- **`SegmentsOutput`** - Full segments response with stations map

### `lib/seat-chain.ts`

Seat chain algorithm types:

- **`NormalizedSegment`** - Segment with carriage data
- **`PerSegmentAssignment`** - Seat assignment per segment (has `departureTime`, `arrivalTime`)
- **`IntervalAssignment`** - Contiguous seat interval
- **`SingleChainOutput`** - Single traveler result
- **`MultiChainOutput`** - Multiple travelers result with collision detection
- **`SeatChainOutput`** - Union type

### `lib/instructions.ts`

User-facing instruction types:

- **`InstructionStep`** - Change point (start/change/resume/gap) with `arrivalTime`
- **`TravelerView`** - Per-traveler view with changeSteps and assignments

### `lib/report.ts`

- **`TripSummary`** - Trip metadata for static report (trainName, carrierId, times, duration)

### `lib/types.ts` (Additional)

- **`BlockedSeat`** - Temporarily blocked seat with validTo timestamp:
  - seatNumber, carriageNumber - Seat identification
  - trainClass - CLASS_1 or CLASS_2
  - position - AISLE, MIDDLE, or WINDOW
  - reason - Human-readable block reason (e.g., "Politician")
  - validTo - ISO timestamp when seat becomes available
  - firstSegmentIndex, lastSegmentIndex - Segment span
  - firstStationName, lastStationName - Journey span
  - firstDepartureTime, lastArrivalTime - Time span

## Key Conventions

### Time Formatting

All times use **Polish timezone (`Europe/Warsaw`)**:

- `formatTime()` in components use `toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw" })`
- `timestampToIso()` in trip-search.ts uses `Intl.DateTimeFormat` with Polish timezone
- **Never use `toISOString()` for display** - it returns UTC time

### Seat Display Format

Seats are stored as **"carriage:seat"** format:

- Example: `"10:103"` means Carriage 10, Seat 103
- Use `parseSeat()` from `lib/utils.ts` to split into `{ carriage: "10", seat: "103" }`
- Display as "**Carriage 10, Seat 103**" in UI
- Never display the raw "10:103" string to users

### Seat Changes Counting

Count **ALL transitions**:

- `seat → seat` (changing seats)
- `seat → null` (leaving a seat)
- `null → seat` (taking a seat)

Do NOT count only seat-to-seat changes. The count represents total transitions between different seat states.

### Percentage Calculation

Use `assignments` array to count segments per seat:

```typescript
const segmentCount = assignments.filter(a => a.assignedSeat === seatString).length;
const percentage = Math.round((segmentCount / totalSegments) * 100);
```

**Do NOT use `changeSteps` indices** - that array only contains change points (start, change, resume, gap), not all segments. The `changeSteps` array has fewer elements than `assignments` because it only records transitions.

### Carrier Icon Mapping

Map carrier IDs to SVG files:

- `EIP` → `/icons/eip.svg` (Express InterCity Premium)
- `IC` → `/icons/ic.svg` (InterCity)
- `TLK` → `/icons/tlk.svg` (Twoje Linie Kolejowe)
- Unknown → Fallback badge with carrier ID in colored pill

### UI State Machine

The search flow uses a state machine:

- `searchStep`: `"stations"` → `"trips"` → `"results"`
- `mode`: `"search"` or `"har"` (tab toggle)
- Reset with `resetSearch()` clears all state

### UI Conventions

**"No Seat Available" Display:**

When a seat is `null` (no seat assigned), display `"No seat available"` in muted text (`text-muted-foreground`) instead of showing dash characters or empty fields.

```tsx
// Instead of:
<span>Carriage {carriage ?? "—"}, Seat {seat ?? "—"}</span>

// Use:
{seat === null ? (
  <span className="text-muted-foreground">No seat available</span>
) : (
  <span>Carriage {carriage}, Seat {seat}</span>
)}
```

**Blocked Seats Card Layout:**

Cards use `w-68` (272px) fixed width to fit 3 per row on desktop:
- Header: Left side (carriage/seat) + Right side (availability time/date)
- Middle: Class + Position badges
- Bottom: Journey span + Reason

**Seat Timeline Mobile vs Desktop:**

- Desktop: Horizontal timeline with segment cards, arrows between groups
- Mobile: Vertical stack of cards, segment count + percentage on right side
- Both: "No seat available" displayed as muted text when seat is null

## UI Components

### `components/station-input.tsx`

Station autocomplete with debounced search and auto-selection:

- Queries `/api/stations/search` with min 2 characters
- Shows loading spinner during search
- Displays station name and coordinates
- Handles click-outside to close dropdown
- **Auto-selects top suggestion on blur** when dropdown is open or query matches exactly
- Callback `onTopSuggestion` for parent component handling

### `components/date-time-input.tsx`

Date and time picker inputs with compact layout:

- Date input with `min=today` validation
- Time input for departure time
- Returns separate date/time strings
- **Compact grid layout** (`grid grid-cols-2 gap-3`) for better spacing

### `components/number-stepper.tsx`

Number input with increment/decrement buttons:

- Editable numeric input with +/- buttons
- Uses shadcn Button components with `variant="outline" size="icon"`
- Large font display (`text-3xl font-bold`) for readability
- Input dimensions: `h-12 w-24` (48px × 96px)
- Button dimensions: `h-12 w-12` (48px × 48px)
- Supports manual typing with bounds checking (min/max)
- Handles empty/invalid input gracefully
- Hidden browser spinners with Tailwind classes
- Centered layout within parent container
- **Props:** value, onChange, min (default: 1), max (default: 20), disabled

```tsx
<NumberStepper
  value={travelers}
  onChange={setTravelers}
  min={1}
  max={20}
  disabled={loading}
/>
```

### `components/trip-list.tsx`

Trip selection list with expandable details:

- Shows train name, carrier icon (EIP/IC/TLK), times, duration
- Displays departure/arrival dates under times
- Expandable stops list showingall stations
- Highlights selected trip card

### `components/coverage-progress.tsx`

Journey coverage progress bar:

- Shows percentage with color coding:
  - Green (100%): All segments covered
  - Yellow (≥80%): Most segments covered
  - Red (<80%): Many gaps
- Displays "X of Y segments have seats"

### `components/seat-timeline.tsx`

Seat assignment timeline visualization with responsive design:

**Desktop (horizontal timeline):**
- Cards displayed horizontally with arrows between them
- Each card shows: station, time (Dep/Arr), carriage/seat, segment count and percentage
- Shows "No seat available" (muted text) when no seat assigned
- Segments grouped by consecutive seat changes

**Mobile (vertical cards):**
- Vertical stack of cards, one per seat change
- Right side: segment count (top) + percentage (below)
- Bottom: carriage/seat or "No seat available" (muted)
- No progress bar (removed for cleaner UI)
- **REQUIRES `assignments` prop** to calculate segment counts correctly

### `components/blocked-seats-section.tsx`

Collapsible section for temporarily blocked seats that will become available:

**Card layout (`w-68` = 272px, 3 cards per row on desktop):**
- **Header (split left/right):**
  - Left: Carriage number + Seat number (separate lines)
  - Right: "Available at" label + Time (large) + Date (below)
- **Middle:** Class badge (1st/2nd) + Position badge (aisle/middle/window)
- **Bottom:** Journey span (stations + times) + Reason for block

**Features:**
- Shows both CLASS_1 and CLASS_2 seats (unlike seat chain which is CLASS_2 only)
- Sorted by: validTo date → carriage number → seat number
- Merges duplicate seats across segments
- Excludes permanent blocks (EMPLOYEE without validTo)
- Collapsed by default, expandable on click

### `components/train-carrier-icon.tsx`

Carrier logo display with fallback:

- Maps carrierId (EIP/IC/TLK) to SVG files in `public/icons/`
- Shows colored badge for unknown carriers
- Includes carrier name tooltips (Express InterCity Premium, InterCity, Twoje Linie Kolejowe)

### `components/file-upload.tsx`

HAR file drag & drop upload:

- Accepts `.har` and `application/json` files
- Shows file name and size after selection
- Disabled state during processing

## Page Layout

### Main Page (`app/page.tsx`)

**Container and Spacing:**
- Container width: `max-w-5xl` (increased from max-w-4xl)
- Gap spacing: `gap-8` (increased from gap-6)
- Hero section with larger title (`text-4xl`, increased from text-3xl)
- Train icon larger: `h-10 w-10` (increased from h-8 w-8)

**Mode Switching:**
- Segmented control (tab-like styling) instead of separate buttons
- Uses `bg-muted` background with `bg-background` for active tab
- Clean visual separation with rounded corners

**Traveler Count:**
- Moved from search/HAR forms to results stats card
- NumberStepper component in stats grid alongside coverage and seat changes
- Editable input with +/- buttons for adjustment
- Recalculate button appears below when using search flow
- Disabled for HAR upload flow (fixed traveler count)
- Stats grid: `grid-cols-3` with Travelers, Coverage Progress, Seat Changes

**Error Handling:**
- All API errors use `getFriendlyErrorMessage()` for user-friendly messages
- Network errors shown as "Unable to connect to server"
- Generic errors fallback to "An unexpected error occurred"
- Never exposes technical details or bilkom.pl

## Key Files

### `lib/utils.ts`

Utility functions:

- **`cn()`** - Tailwind class merger (from shadcn/ui)
- **`parseSeat()`** - Parse "carriage:seat" format into `{ carriage, seat }`

### `lib/error-messages.ts`

Error message utilities:

- **`getFriendlyErrorMessage(error: unknown): string`** - Converts technical errors to user-friendly messages
- Never exposes bilkom.pl in error messages
- Handles network errors (ENOTFOUND, ECONNREFUSED, ETIMEDOUT)
- Handles HTTP status codes (401, 403, 404)
- Returns generic message for unknown errors

### `lib/constants.ts`

Shared constants including:

- `BILKOM_STATION_SEARCH_URL` - Station search API endpoint
- `BILKOM_TRIP_SEARCH_URL` - Trip search HTML endpoint
- `DEFAULT_BILKOM_AUTH` - Default authorization header
- `DEFAULT_BILKOM_GRM_URL` - Default GRM endpoint
- `DEFAULT_BILKOM_HEADERS` - Default headers for API requests
- `DEFAULT_SEARCH_HEADERS` - Headers for station/trip search
- `SEARCH_REQUEST_TIMEOUT_MS` - Request timeout (30 seconds)

### `lib/http.ts`

HTTP client with TLS bypass:

- `postJson()` - POST JSON and parse response
- `postText()` - POST JSON and return text
- `getJson()` - GET and parse JSON
- `getText()` - GET and return text
- Handles gzip, brotli, deflate compression
- **Disables TLS verification** for Bilkom API

### `lib/station-search.ts`

Station autocomplete using the Bilkom API:

- Queries `https://bilkom.pl/stacje/szukaj?q=<query>&source=FROMSTATION`
- Returns station name, extId, id, and coordinates

### `lib/trip-search.ts`

Trip search via HTML parsing:

- Queries `https://bilkom.pl/podroz` with station IDs and datetime
- Parses HTML to extract trip data:
  - Train name, number, carrierId, duration
  - Departure/arrival times and stations
  - All stops along the route
  - Segment request ready for processing
- **Uses Polish timezone** for timestamp conversion

### `lib/segment-request.ts`

Builds segment requests from trip data:

- Takes a `SegmentRequestConfig` (station IDs, vehicle number, dates)
- Returns config compatible with `buildSegmentsOutput()`
- Includes `stationNumberingSystem` (defaults to "HAFAS")

### `lib/blocked-seats.ts`

Extracts temporarily blocked seats that will become available:

- `extractBlockedSeats(data: SegmentsOutput)` - Processes segments to find blocked seats
- Filters for seats with `specialProperties` containing `validTo` timestamp
- Parses properties to extract class (CLASS_1/CLASS_2) and position (AISLE/MIDDLE/WINDOW)
- Merges duplicate seats across segments (keeps earliest validTo)
- Returns seats sorted by: validTo → carriage → seat number
- Excludes permanent blocks (EMPLOYEE without validTo)

## Bilkom API Integration

### API Endpoints

1. **Station Search:** `GET https://bilkom.pl/stacje/szukaj?q=<query>&source=FROMSTATION`
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
2. Click "Upload HAR File" tab (segmented control)
3. Upload HAR file from `../blikom.har` or `../blikom-new.har`
4. Traveler count is displayed in results (fixed from HAR file)
5. View seat chain results

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
4. **TLS verification disabled**: Required for Bilkom API (self-signed certificates)
5. **No CORS**: All API calls are server-side
6. **Class 2 seats only for seat chains**: Seat chain algorithm filters for CLASS_2 seats only
7. **Blocked seats show both classes**: Blocked seats section displays CLASS_1 and CLASS_2
8. **Sequential allocation**: Multi-traveler uses greedy approach
9. **Polish timezone**: All times must use `Europe/Warsaw` for correct display
10. **Direct connections only**: HAR flow only supports single-train journeys

## Recent Changes

### UI Redesign (April 2026)

**Error Messages:**
- Created `lib/error-messages.ts` with `getFriendlyErrorMessage()` utility
- Converted all technical errors to user-friendly messages
- Network errors → "Unable to connect to server. Please check your internet connection."
- HTTP 401/403 → "Authentication required" / "Access denied"
- Never exposes bilkom.pl in error messages

**Station Input Auto-Selection:**
- Auto-selects top suggestion on blur when dropdown is open
- Auto-selects when query text matches station name exactly
- Added `onTopSuggestion` callback for parent components

**Date/Time Input:**
- Changed from flex layout to compact grid (`grid grid-cols-2 gap-3`)
- Better spacing and alignment

**Traveler Count:**
- Removed from both search and HAR upload forms
- Moved to results stats card
- Uses NumberStepper component with increment/decrement buttons
- Editable input with manual typing support
- Recalculate button for search flow

**NumberStepper Component:**
- `h-12 w-12` buttons with `h-5 w-5` icons
- `h-12 w-24` input with `text-3xl font-bold` text
- Editable number input with +/- buttons
- Bounds checking (min/max)
- Hidden browser spinners
- Centered layout

**Page Layout:**
- Container width: `max-w-5xl` (increased)
- Gap spacing: `gap-8` (increased)
- Hero section: `text-4xl` title, `h-10 w-10` icon
- Segmented control for mode switching
- Stats grid: 3 columns (Travelers, Coverage, Seat Changes)

**API Routes:**
- All 4 routes updated to use friendly error messages
- `/api/stations/search/route.ts`
- `/api/trips/search/route.ts`
- `/api/segments/build/route.ts`
- `/api/run/route.ts`

## Future Enhancements

- Add date/time picker improvements
- Cache station search results
- Show seat maps visually
- Export to calendar/ticket format
- Real-time seat updates via polling
- Support Class 1 seats
- Support multi-leg journeys (connections)