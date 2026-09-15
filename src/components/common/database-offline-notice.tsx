"use client";

import React, { useState } from "react";
import { Database, RefreshCw, AlertTriangle, Terminal, CheckCircle2, Server, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatabaseOfflineNoticeProps {
  error?: Error | string | null;
  onRetry?: () => void;
}

export function DatabaseOfflineNotice({ error, onRetry }: DatabaseOfflineNoticeProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const errorMessage = typeof error === "string" ? error : error?.message || "Can't reach database server at localhost:3306";

  const handleRetry = () => {
    setIsRetrying(true);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Accent Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 h-2 w-full" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Status Badge & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-inner">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> Database Service Offline
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Database Is Not Running
                </h1>
              </div>
            </div>

            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-[#0b2d55] hover:bg-[#124177] text-white font-bold shadow-sm shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Checking connection…" : "Retry Connection"}
            </Button>
          </div>

          {/* Description */}
          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950 leading-relaxed">
            The platform is unable to connect to the MySQL database server at <code className="font-bold bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-900">localhost:3306</code>.
            Please ensure your local database service is started.
          </div>

          {/* How to Resolve Steps */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Server className="h-4 w-4 text-[#0b2d55]" /> Quick Fix Options
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              {/* Option 1: WAMP / XAMPP / Laragon */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-900 text-[10px] font-black">1</span>
                  WAMP / XAMPP / Laragon
                </div>
                <p className="text-slate-600">
                  Open your <strong>WAMP</strong> or <strong>XAMPP Control Panel</strong> and ensure the <strong>MySQL / MariaDB</strong> service status is <strong>Running</strong> (green).
                </p>
              </div>

              {/* Option 2: Windows Service Command */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-900 text-[10px] font-black">2</span>
                  Windows Service (PowerShell)
                </div>
                <p className="text-slate-600">
                  Run in Administrator Command Prompt or PowerShell:
                </p>
                <div className="rounded bg-slate-900 p-1.5 font-mono text-[11px] text-emerald-400 select-all">
                  net start wampmysqld64
                </div>
              </div>

              {/* Option 3: Docker */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-900 text-[10px] font-black">3</span>
                  Docker Container
                </div>
                <p className="text-slate-600">
                  If you run MySQL inside Docker, start your container with:
                </p>
                <div className="rounded bg-slate-900 p-1.5 font-mono text-[11px] text-emerald-400 select-all">
                  docker compose up -d
                </div>
              </div>

              {/* Option 4: .env Settings */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-blue-900 text-[10px] font-black">4</span>
                  Check .env Configuration
                </div>
                <p className="text-slate-600">
                  Ensure <code className="font-semibold text-slate-800">DATABASE_URL</code> in <code className="font-semibold text-slate-800">.env</code> contains the correct password and port (e.g. 3306 or 3307).
                </p>
              </div>
            </div>
          </div>

          {/* Collapsible Technical Details */}
          <div className="border-t border-slate-200 pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <span>Technical Diagnostics &amp; Error Details</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDetails && (
              <div className="mt-3 rounded-lg bg-slate-900 p-3.5 font-mono text-[11px] text-red-300 leading-relaxed overflow-x-auto max-h-40">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
            <div>
              Platform: <span className="font-bold text-slate-700">Bageshwari B2B Commerce</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
