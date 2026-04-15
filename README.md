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

## Example use case

If you, like me, often book train tickets last minute, you might find this tool
useful.

You want to travel by train from city A to city G in **Poland**.
You checked for available seats on typical websites and found none.

The train you want to book goes through cities:
A -> B -> C -> D -> E -> F -> G

Now you can use this project to solve your problem.

Host it on your computer, go the landing page.

Enter the information about your journey:

- departure station (city A)
- departure date and time
- destination station (city B)

You will be presented with a list of trains matching your criteria.
Pick your preferred train.

This app will go fetch all the data about available seats between each station pair
(Ex. A->B, B->C and so on) and then try to find a chain of available seats that
maximizes the amount of time you will have a seat and minimizes the amount of
times you need to change seats.

*For Example*:
Seat 42 in carriage 10 is free from station A to station C.
There is no free seats from station C to station D.
Seat 21 in carriage 37 is free from station D to station G.

In addition this app will look for seats that will become available for booking.
In Polish trains some of the seats are blocked and appear as if they were
taken, available interfaces for booking a seat do not show this information
clearly.
This app will show you precisely what seat become available at what time.
(Ex. Seat 73 in carriage 16 will be available on April 6 13:37)

As you can imagine the seat chains become more useful if the journey is longer.

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

## Development Notes

- All times use Polish timezone (`Europe/Warsaw`)
- Seat data uses format `"carriage:seat"` (e.g., `"10:103"`)
- API calls are server-side (no CORS issues)
- TLS verification is disabled for Bilkom API compatibility
