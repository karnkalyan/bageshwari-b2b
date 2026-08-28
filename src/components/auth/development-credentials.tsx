type DevelopmentCredentialsProps = {
  accounts: Array<{ label: string; email: string }>;
};

export function DevelopmentCredentials({
  accounts,
}: DevelopmentCredentialsProps) {
  if (process.env.NODE_ENV === "production") return null;
  const password = process.env.SEED_PASSWORD;
  if (!password) return null;

  return (
    <details className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
      <summary className="cursor-pointer font-extrabold">
        Development login accounts
      </summary>
      <div className="mt-3 space-y-2">
        {accounts.map((account) => (
          <div
            key={account.email}
            className="grid gap-0.5 sm:grid-cols-[110px_1fr]"
          >
            <span className="font-bold">{account.label}</span>
            <code className="break-all">{account.email}</code>
          </div>
        ))}
        <div className="grid gap-0.5 border-t border-amber-200 pt-2 sm:grid-cols-[110px_1fr]">
          <span className="font-bold">Password</span>
          <code className="break-all">{password}</code>
        </div>
      </div>
    </details>
  );
}
