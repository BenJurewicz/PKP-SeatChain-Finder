<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Seat Chain Builder

Train seat-change planning tool. Upload HAR files or search connections to generate optimal seat assignment chains. Next.js 16.2.2 + React 19.2 + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Commands

- `pnpm install` — Install dependencies
- `pnpm dev` — Start dev server (http://localhost:3000)
- `pnpm build` — Production build
- `pnpm lint` — Run ESLint (run before committing)
- Use `pnpm` not `npm` or `yarn`

## Critical Rules

- Never use `toISOString()` for display — it returns UTC, not Polish time
- Never show raw seat strings like `"10:103"` to users — always format as "Carriage 10, Seat 103"
- Never expose `bilkom.pl` in error messages — use `getFriendlyErrorMessage()` from `lib/error-messages.ts`
- Never use emoji characters in `.ts`/`.tsx`/`.js`/`.jsx` files — use lucide-react icons or SVGs from `/public/icons/`
- Never use `changeSteps` indices for percentage calculations — use `assignments` array to count segments per seat
- Count ALL seat transitions including `seat → null` and `null → seat`, not just `seat → seat`

## Project Structure

- `lib/domain/` — Core business logic (seat-chain algorithm, trip/station search, Bilkom API client)
- `lib/domain/bilkom.ts` — NOT exported from barrel file; import directly as `@/lib/domain/bilkom`
- `lib/services/` — Client-side API service layer (api-client, api-error, stations, trips, segments, run)
- `lib/parsing/` — HAR parsing and generic object parsing utilities
- `lib/formatting/` — Time/date formatters (all use `Europe/Warsaw` timezone)
- `lib/report/` — Static HTML report generation (separate component files in `components/` subfolder)
- `lib/http.ts` — Low-level HTTP client with TLS-disabled fetch wrapper
- `lib/error-messages.ts` — User-friendly error message mapper
- `app/har/` — HAR upload flow page
- `app/search/` — Direct connection search flow page
- `app/api/` — API routes (`_lib/` has shared validation/error helpers)

## Key Conventions

### Time Formatting
All times use `Europe/Warsaw` timezone. Use functions from `lib/formatting/time.ts` (`formatTime`, `formatDate`, `formatDuration`, `toPolishIsoString`). Never construct date strings manually.

### Seat Display
Seats stored as `"carriage:seat"` (e.g., `"10:103"`). Parse with `parseSeat()` from `lib/utils/parse-seat.ts`. Display as "**Carriage 10, Seat 103**".

### Carrier Icons
Map carrier IDs to `/public/icons/`:
- `EIP` → `/icons/eip.svg`
- `IC` → `/icons/ic.svg`
- `TLK` → `/icons/tlk.svg`
- Unknown → Fallback badge with colored pill

### API Route Helpers
Use `errorResponse()` and `successResponse()` from `app/api/_lib/error-response.ts` for all API route responses.

## Constraints

1. TLS verification disabled — required for Bilkom API (self-signed certs)
2. Class 2 seats only — seat chain algorithm filters for `CLASS_2`
3. Direct connections only — no multi-leg journey support
4. All API calls are server-side — no CORS concerns
5. All times must use `Europe/Warsaw` timezone