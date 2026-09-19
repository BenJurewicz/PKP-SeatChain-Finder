<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Build & Run Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Run production build
pnpm lint             # Run ESLint (run before committing)
pnpm test             # Run vitest unit tests (tests/)
```

# Key Conventions

## Locale

The site targets the Polish locale:
- Weeks start on Monday; calendar labels are Polish (pass `pl` from
  date-fns to the shadcn Calendar — see `components/date-time-picker.tsx`)
- Times are 24-hour ("HH:MM"), never AM/PM

## Routing

The flow is split across routes; wizard state is encoded in URL search
params so any view can be linked or refreshed:

- `/` — journey search form (from/to/when)
- `/trains?j=…` — train list, server-fetched from the journey param
- `/seats?t=…&travelers=n` — per-train seat results, re-fetched live
- `/import` — HAR capture replay, results render in place

`lib/journey-params.ts` is the seam: encode/decode `j`/`t` params there;
never hand-build the JSON params in pages. The seat-chain pipeline state
(fetched segments, special filters, chains) lives in
`components/hooks/use-seat-pipeline.ts`, shared by `/seats` and `/import`.

## Time Formatting

All times must use **Polish timezone (`Europe/Warsaw`)**:
- Use `toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw" })` for display
- Use `Intl.DateTimeFormat` with Polish timezone for conversions
- **Never use `toISOString()` for display** - it returns UTC

## Seat Display Format

Seats are stored as `"carriage:seat"` (e.g., `"10:103"`):
- Use `parseSeat()` from `lib/utils.ts` to split
- Display as "**Carriage 10, Seat 103**" in UI
- Never show raw "10:103" string to users

## Seat Changes Counting

Count **ALL transitions**, not just seat-to-seat:
- `seat → seat` (changing seats)
- `seat → null` (leaving a seat)
- `null → seat` (taking a seat)

## Percentage Calculation

Use `assignments` array to count segments per seat:
```typescript
const segmentCount = assignments.filter(a => a.assignedSeat === seatString).length;
const percentage = Math.round((segmentCount / totalSegments) * 100);
```
**Do NOT use `changeSteps` indices** - that array only contains change points, not all segments.

## Carrier Icons

Map carrier IDs to `/public/icons/`:
- `EIP` → `/icons/eip.svg`
- `IC` → `/icons/ic.svg`
- `TLK` → `/icons/tlk.svg`
- Unknown → Fallback badge with colored pill

## Error Messages

**Never expose `bilkom.pl` in error messages.** Use `getFriendlyErrorMessage()` from `lib/error-messages.ts`:
```typescript
import { getFriendlyErrorMessage } from "@/lib/error-messages";
// Returns user-friendly messages for network/HTTP errors
```

# Important Constraints

1. **TLS verification disabled** - Required for Bilkom API (self-signed certs)
2. **Class 2 seats only** - Seat chain algorithm filters for CLASS_2
3. **Direct connections only** - HAR flow doesn't support multi-leg journeys
4. **No CORS** - All API calls are server-side
5. **Polish timezone only** - All times must use `Europe/Warsaw`

# Tech Stack

- **Framework:** Next.js16.2.2 with App Router
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Language:** TypeScript
- **Package Manager:** pnpm