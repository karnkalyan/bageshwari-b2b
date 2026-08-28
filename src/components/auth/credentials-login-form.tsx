"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CredentialsLoginFormProps = {
  scope: "staff" | "dealer";
  title: string;
  description: string;
};

function safeLocalCallback(value: string | null, fallback: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function CredentialsLoginForm({
  scope,
  title,
  description,
}: CredentialsLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") === "CredentialsSignin"
      ? "The email or password is incorrect for this portal."
      : ""
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        loginScope: scope,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(
          scope === "staff"
            ? "Invalid staff credentials or this is a dealer account."
            : "Invalid dealer credentials or the dealership is not active."
        );
        return;
      }

      if (scope === "dealer") {
        router.replace(safeLocalCallback(searchParams.get("callbackUrl"), "/dealer/dashboard"));
      } else {
        const session = await getSession();
        const roles = session?.roles || [];
        const fallback = roles.some((role) => ["SALES_MANAGER", "SALES_REP", "SALESPERSON"].includes(role))
          ? "/sales/dashboard"
          : roles.some((role) => ["ACCOUNT_MANAGER", "ACCOUNTANT", "ACCOUNTS_MANAGER", "ACCOUNTS_USER"].includes(role))
            ? "/accounts/dashboard"
            : roles.some((role) => ["WAREHOUSE_MANAGER", "WAREHOUSE_USER", "WAREHOUSE_PICKER", "PACKING_USER"].includes(role))
              ? "/warehouse/dashboard"
              : roles.includes("DISPATCH_USER")
                ? "/dispatch/dashboard"
                : "/admin/dashboard";
        router.replace(safeLocalCallback(searchParams.get("callbackUrl"), fallback));
      }
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#0b2d55]">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${scope}-email`}>Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input id={`${scope}-email`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 pl-10" placeholder={scope === "dealer" ? "dealer@example.com" : "your.name@bageshwari.com.np"} autoComplete="email" required disabled={isLoading} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label htmlFor={`${scope}-password`}>Password</Label><span className="text-[10px] font-semibold text-slate-400">Secure access</span></div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input id={`${scope}-password`} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 px-10" placeholder="Enter your password" autoComplete="current-password" minLength={6} required disabled={isLoading} />
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="h-11 w-full bg-red-600 font-extrabold hover:bg-red-700">
        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : scope === "dealer" ? "Open dealer portal" : "Open staff workspace"}
      </Button>

      {scope === "dealer" && (
        <p className="text-center text-xs text-slate-500">Need a dealer account? <Link href="/request-dealership" className="font-bold text-red-600 hover:underline">Request dealership</Link></p>
      )}
    </form>
  );
}
