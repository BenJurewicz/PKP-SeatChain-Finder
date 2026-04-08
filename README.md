# Train Seat Chain Finder

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
    shortly before tran departure, and the time when they become available.

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

### Linting

```bash
pnpm lint
```

Run lint before committing changes.

## How to Use

### Manual Search (Primary)

1. Enter departure and arrival stations (autocompletes as you type)
2. Select journey date and departure time
3. Click "Search Trips" to see available connections
4. Select a trip to view the optimal seat chain
5. Adjust traveler count (1-20) and recalculate if needed

### HAR Upload (Advanced)

For users with captured data from bilkom.pl,
the app supports uploading HAR files.
Instructions on how to acquire the correct HAR file are provided in the app.
Manual search is recommended over this method.

## Tech Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui
- **Package Manager:** pnpm

## Project Structure

```
webapp/
├── app/
│   ├── page.tsx              # Main UI with search flow
│   ├── layout.tsx            # Root layout
│   └── api/                  # API routes
│       ├── stations/search/  # Station autocomplete
│       ├── trips/search/    # Trip search
│       └── segments/build/   # Seat data processing
├── components/
│   ├── file-upload.tsx
│   ├── station-input.tsx
│   ├── date-time-input.tsx
│   ├── trip-list.tsx
│   ├── coverage-progress.tsx
│   ├── seat-timeline.tsx
│   ├── train-carrier-icon.tsx
│   ├── blocked-seats-section.tsx
│   ├── number-stepper.tsx
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── types.ts             # TypeScript type definitions
│   ├── utils.ts             # Utility functions (cn, parseSeat)
│   ├── constants.ts         # API URLs and configuration
│   ├── http.ts              # HTTP client with TLS bypass
│   ├── station-search.ts    # Station autocomplete API
│   ├── trip-search.ts       # Trip search and HTML parsing
│   ├── seat-chain.ts        # Seat chain algorithm
│   ├── blocked-seats.ts     # Blocked seat extraction
│   └── error-messages.ts    # User-friendly error handling
└── public/icons/            # Carrier logos (EIP, IC, TLK)
```

## Development Notes

- All times use Polish timezone (`Europe/Warsaw`)
- Seat data uses format `"carriage:seat"` (e.g., `"10:103"`)
- API calls are server-side (no CORS issues)
- TLS verification is disabled for Bilkom API compatibility

