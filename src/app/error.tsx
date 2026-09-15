"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { DatabaseOfflineNotice } from "@/components/common/database-offline-notice";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isDatabaseError(err: Error): boolean {
  const msg = (err?.message || "").toLowerCase();
  const name = (err?.name || "").toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes("database server") ||
    msg.includes("prismaclientinitializationerror") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("p1001") ||
    msg.includes("p1002") ||
    msg.includes("p1003") ||
    msg.includes("p1017") ||
    name.includes("prismaclientinitializationerror")
  );
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("Application runtime error caught by RootError boundary:", error);
  }, [error]);

  if (isDatabaseError(error)) {
    return <DatabaseOfflineNotice error={error} onRetry={reset} />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 text-center space-y-5">
        <div className="h-14 w-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900">Application Error</h1>
          <p className="mt-2 text-sm text-slate-600">
            An unexpected error occurred while processing your request. Please try again.
          </p>
        </div>

        {error?.message && (
          <div className="rounded-lg bg-slate-900 p-3 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-32">
            {error.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="bg-[#0b2d55] hover:bg-[#124177] text-white font-bold"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" /> Go to Storefront
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
