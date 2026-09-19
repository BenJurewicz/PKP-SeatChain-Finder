# Seatway — Train Seat Chain Finder

A Next.js application that helps train passengers find optimal seating
arrangements when no single seat is available for their entire journey.
It analyzes seat availability across train segments and builds "seat chains",
sequences of seats that minimize the number of times a passenger
needs to change seats.

## What It Does

When booking a train journey with multiple stops,
passengers often find that no single seat is available for the entire trip.
This app solves that by:

- Searching for available train connections between stations
- Analyzing seat availability across all journey segments
- Finding the optimal combination of seats
    (e.g., Seat A for segments 1-4, Seat B for segments 5-9)
- Supporting multiple travelers with collision-free seat assignments
- Showing temporarily blocked seats that will be available for booking
    shortly before train departure, and the time when they become available.

**Example:** A journey from Station A to Station J might have
no single seat for all 9 segments. The app finds the best combination so
passengers have a seat for the maximum duration with minimal changes.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended package manager)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production Build

```bash
pnpm build
pnpm start
```

### Linting & Tests

```bash
pnpm lint    # ESLint (run before committing)
pnpm test    # vitest unit tests for lib logic
```

## How to Use

### Live Search (Primary)

1. On `/`, enter departure and arrival stations (autocompletes as you type)
   and pick a date and 24-hour departure time (Polish locale calendar)
2. Press Enter or click "Find trains" — you land on `/trains`, whose URL
   encodes the journey, so the train list can be shared or refreshed
3. Select a train — you land on `/seats`, which re-fetches the live seat
   map for that exact train and shows the seat chain; this URL is also
   shareable (refresh recomputes seats with fresh availability)
4. Adjust the traveler count (1–20) on the results page and recalculate

### HAR Upload (Advanced, `/import`)

For users with captured data from bilkom.pl,
the app supports uploading HAR files.
Instructions on how to acquire the correct HAR file are provided in the app.
Manual search is recommended over this method.

## Routes

| Route     | Content                                        | Shareable |
| --------- | ---------------------------------------------- | --------- |
| `/`       | Journey search (from/to/when)                  | —         |
| `/trains` | Train list; journey encoded in `?j=`           | yes       |
| `/seats`  | Seat results; trip encoded in `?t=`            | yes       |
| `/import` | HAR capture replay; results render in place    | —         |

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **Testing:** vitest
- **Package Manager:** pnpm

## Project Structure

```
webapp/
├── app/
│   ├── page.tsx                # / — journey search form
│   ├── trains/page.tsx         # /trains — train list (server-fetched)
│   ├── seats/page.tsx          # /seats — seat results (server wrapper)
│   ├── import/page.tsx         # /import — HAR flow
│   ├── layout.tsx              # Root layout (app header + nav)
│   ├── error.tsx / not-found.tsx  # Route-level states
│   └── api/                    # API routes
│       ├── stations/search/    # Station autocomplete
│       ├── trips/search/       # Trip search
│       ├── segments/build/     # Seat data for one train
│       └── run/                # Full HAR pipeline
├── components/
│   ├── journey/                # Home search form
│   ├── trains/                 # Train list view
│   ├── seats/                  # Seat results view
│   ├── hooks/                  # useSeatPipeline (shared chain state)
│   ├── app-header.tsx          # Masthead + nav (rendered by layout)
│   ├── seat-results.tsx        # Results block (shared by /seats + /import)
│   ├── date-time-picker.tsx    # Polish-locale calendar + 24h time
│   ├── trip-list.tsx / trip-card.tsx
│   ├── collapsible-card.tsx / pill.tsx / loading.tsx / skeletons.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── journey-params.ts       # URL <-> state encoding (the routing seam)
│   ├── api.ts                  # Client-side API wrappers
│   ├── trip-utils.ts           # Windowed trip merging helpers
│   ├── types.ts                # Shared domain types
│   ├── trip-search.ts          # Trip search + HTML parsing
│   ├── station-search.ts       # Station autocomplete
│   ├── bilkom.ts / segment-request.ts / har.ts  # GRM seat-map pipeline
│   ├── seat-chain.ts           # Seat chain algorithm (DP)
│   ├── instructions.ts / domain/group-steps.ts  # Traveler views
│   ├── blocked-seats.ts        # Releasing-seat extraction
│   ├── report.ts / report-download.ts           # Offline HTML report
│   ├── http.ts                 # HTTP client with TLS bypass
│   ├── formatting/             # Europe/Warsaw time formatting
│   └── error-messages.ts       # User-friendly error mapping
├── tests/                      # vitest unit tests
└── public/icons/               # Carrier logos (EIP, IC, TLK)
```
