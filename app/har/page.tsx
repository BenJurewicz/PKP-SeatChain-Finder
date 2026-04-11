"use client";

import React, { FormEvent, useState } from "react";
import { runHarFile } from "@/lib/services/run";
import type { RunResponse } from "@/lib/services/run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { ResultsView } from "@/components/results";

export default function HarPage() {
  const [travelers, setTravelers] = useState(1);
  const [harFile, setHarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  async function handleHarSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!harFile) {
      setError("Please select a HAR file.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await runHarFile({ harFile, travelers });
      setResult(data);
    } catch (submitError) {
      setError(getFriendlyErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload HAR File</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleHarSubmit}>
            <details className="group">
              <summary className="cursor-pointer p-4 bg-muted rounded-lg font-medium flex items-center justify-between list-none marker:content-['']">
                <span>How to get the HAR file</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Go to{" "}
                    <a href="https://bilkom.pl" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      bilkom.pl
                    </a>
                  </li>
                  <li>Find and select your desired train</li>
                  <li className="text-amber-600">Only direct connections are supported</li>
                  <li>
                    Click{" "}
                    <span className="font-semibold text-primary">Buy Ticket</span> to proceed
                  </li>
                  <li>
                    Open browser{" "}
                    <span className="font-semibold text-primary">Dev Tools</span>{" "}
                    (<kbd className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">F12</kbd>) →{" "}
                    <span className="font-semibold text-primary">Network</span> tab
                  </li>
                  <li>Scroll to bottom, select &ldquo;I choose a seat from a schematic&rdquo;</li>
                  <li>
                    Click the{" "}
                    <span className="font-semibold text-primary">Class 2</span> button
                  </li>
                  <li>
                    In <span className="font-semibold text-primary">Network</span> tab, find request named{" "}
                    <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">grm</span>{" "}
                    (type: JSON)
                  </li>
                  <li>
                    Right-click → &ldquo;Save all as HAR&rdquo;
                  </li>
                  <li>
                    Upload the saved{" "}
                    <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">.har</code> file here
                  </li>
                </ol>
              </div>
            </details>
            <FileUpload
              onChange={setHarFile}
              accept=".har,application/json"
              disabled={loading}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  "Build seat chains"
                )}
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {loading && !result && (
        <>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <ResultsView
          result={result}
          travelers={travelers}
          onTravelersChange={setTravelers}
          showNewSearchButton={false}
          onNewSearch={() => {}}
          canRecalculate={false}
          onRecalculate={() => {}}
          isRecalculating={false}
        />
      )}
    </div>
  );
}