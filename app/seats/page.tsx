import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeSeatsQuery, decodeTravelers } from "@/lib/journey-params";
import { SeatsView } from "@/components/seats/seats-view";

export const metadata: Metadata = {
  title: "Seatway — your seats",
};

/** Seat-chain results for one train, encoded in the URL. Shareable: the
 * segments (and thus seats) are re-fetched live on each visit. */
export default async function SeatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = decodeSeatsQuery(params);
  if (!query) notFound();

  return <SeatsView query={query} initialTravelers={decodeTravelers(params)} />;
}
