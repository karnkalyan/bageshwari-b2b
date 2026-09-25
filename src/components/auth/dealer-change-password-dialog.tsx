"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DealerChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  isLoggedIn?: boolean;
  onSuccess?: () => void;
}

export function DealerChangePasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
  isLoggedIn = false,
  onSuccess,
}: DealerChangePasswordDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    if (!defaultEmail) setEmail("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isLoggedIn && !email.trim()) {
      setError("Please enter your dealer account email address.");
      return;
    }

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/dealer/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: !isLoggedIn ? email.trim() : undefined,
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || json?.message || "Failed to update password.");
      }

      setSuccessMessage(
        json.data?.message || "Password changed successfully! You can now log in with your new password."
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="sm:max-w-[440px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-black text-[#092f5c]">
              {isLoggedIn ? "Change Password" : "Update Dealer Password"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            {isLoggedIn
              ? "Update your authorized dealer account password for secure access."
              : "Enter your registered dealer email, current password, and choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-sm text-emerald-900">Password Updated</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLoggedIn && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Dealer Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dealer@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="h-10 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="h-10 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={loading}
                  className="h-10 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={loading}
                className="h-10 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
