"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface DealerCredentialsDialogProps {
  dealerId?: string | null;
  dealerName?: string;
  dealerCode?: string;
  defaultEmail?: string;
  dealer?: {
    id: string;
    code?: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    hasPortalAccess?: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DealerCredentialsDialog({
  dealerId,
  dealerName,
  dealerCode,
  defaultEmail,
  dealer,
  isOpen,
  onClose,
  onSuccess,
}: DealerCredentialsDialogProps) {
  const resolvedDealerId = dealer?.id || dealerId;
  const resolvedDealerName = dealer?.name || dealerName;
  const resolvedDealerCode = dealer?.code || dealerCode;
  const resolvedDefaultEmail = dealer?.email || defaultEmail;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCredentials, setHasCredentials] = useState(dealer?.hasPortalAccess ?? false);
  const [existingUser, setExistingUser] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Success state showing generated/updated credentials
  const [resultCredentials, setResultCredentials] = useState<{
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let randomStr = "";
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Dealer#${randomStr}!`;
  };

  useEffect(() => {
    if (isOpen && resolvedDealerId) {
      setError(null);
      setResultCredentials(null);
      setCopied(false);
      setLoading(true);
      setPassword(generateRandomPassword());

      fetch(`/api/admin/dealers/${resolvedDealerId}/credentials`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setHasCredentials(data.data.hasCredentials);
            setExistingUser(data.data.user);
            setEmail(data.data.user?.email || data.data.dealer?.email || resolvedDefaultEmail || "");
          } else {
            setEmail(resolvedDefaultEmail || "");
          }
        })
        .catch(() => {
          setEmail(resolvedDefaultEmail || "");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, resolvedDealerId, resolvedDefaultEmail]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedDealerId) return;

    if (!email.trim()) {
      setError("Please enter a valid login email.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/dealers/${resolvedDealerId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || json?.message || "Failed to configure credentials.");
      }

      setResultCredentials({
        email: json.data.email,
        password: json.data.password,
        loginUrl: json.data.loginUrl || "/dealer/login",
      });
      setHasCredentials(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error setting credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!resultCredentials) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portalUrl = `${origin}${resultCredentials.loginUrl}`;
    const text = `*Bageshwari B2B Dealer Portal Credentials*\nDealer: ${resolvedDealerName || "Valued Dealer"} (${resolvedDealerCode || "DEALER"})\nPortal Login: ${portalUrl}\nEmail: ${resultCredentials.email}\nPassword: ${resultCredentials.password}\n\nPlease keep these credentials secure and sign in to access product pricing, wholesale ordering, and account statements.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Dealer Portal Login Access
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Manage login credentials for {resolvedDealerName || "Dealer"} ({resolvedDealerCode || "DLR"})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Checking login account status...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Current Status Indicator */}
            {hasCredentials && !resultCredentials ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Portal Login Active</div>
                    <div className="text-[11px] text-emerald-800 font-mono">
                      {existingUser?.email || email}
                    </div>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  Configured
                </Badge>
              </div>
            ) : !resultCredentials ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-950">No Login Account Configured</div>
                  <div className="text-[11px] text-amber-800">
                    This dealer currently cannot sign in to the Dealer Portal. Set up their login email and password below.
                  </div>
                </div>
              </div>
            ) : null}

            {/* Success Card with Copy Feature */}
            {resultCredentials ? (
              <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Credentials Successfully Activated!
                </div>

                <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Portal URL</span>
                    <span className="text-blue-700 font-semibold flex items-center gap-1">
                      {typeof window !== "undefined" ? window.location.origin : ""}{resultCredentials.loginUrl}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Login Email</span>
                    <span className="font-bold text-slate-900">{resultCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Password</span>
                    <span className="font-bold text-emerald-900 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                      {resultCredentials.password}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-white" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Credentials (WhatsApp / Email)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Configuration Form */
              <form onSubmit={handleSaveCredentials} className="space-y-3">
                <div>
                  <Label htmlFor="dealerEmail" className="text-xs font-bold text-slate-700">
                    Dealer Login Email
                  </Label>
                  <Input
                    id="dealerEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dealer@example.com"
                    className="mt-1 h-8 text-xs bg-white font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dealerPass" className="text-xs font-bold text-slate-700">
                      {hasCredentials ? "Set New Password" : "Login Password"}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateRandomPassword())}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Auto-generate
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Input
                      id="dealerPass"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-8 text-xs bg-white font-mono font-bold pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0b2d55] hover:bg-[#124177] text-white font-bold text-xs h-9 gap-1.5"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Key className="h-3.5 w-3.5" />
                    )}
                    {hasCredentials ? "Update / Reset Credentials" : "Create & Activate Portal Access"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            {resultCredentials ? "Done" : "Cancel"}
          </Button>

          <a
            href="/dealer/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-500 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            Open Dealer Portal <ExternalLink className="h-3 w-3" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
