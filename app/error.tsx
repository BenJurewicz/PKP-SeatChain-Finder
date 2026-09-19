"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Route-level error boundary: friendly message, retry, and a way home. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load this view. The train data service may be
            temporarily unavailable.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild>
            <Link href="/">Start a new search</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
