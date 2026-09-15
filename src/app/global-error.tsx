"use client";

import React, { useEffect } from "react";
import { DatabaseOfflineNotice } from "@/components/common/database-offline-notice";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global uncaught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <DatabaseOfflineNotice error={error} onRetry={reset} />
      </body>
    </html>
  );
}
