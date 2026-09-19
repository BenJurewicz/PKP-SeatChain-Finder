import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Route not found: bad or hand-edited link. */
export default function NotFound() {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold">This page went off the rails</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link you followed is broken or incomplete — journey details may
          be missing or malformed.
        </p>
        <Button asChild>
          <Link href="/">Start a new search</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
