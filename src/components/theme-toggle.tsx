"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Monitor className="h-3.5 w-3.5" />
      </div>
    );
  }

  const modes = [
    { key: "light", icon: Sun, label: "Light" },
    { key: "dark", icon: Moon, label: "Dark" },
    { key: "system", icon: Monitor, label: "System" },
  ] as const;

  const next = () => {
    const order = ["light", "dark", "system"] as const;
    const idx = order.indexOf(theme as any);
    setTheme(order[(idx + 1) % order.length]);
  };

  const current = modes.find((m) => m.key === theme) || modes[0];
  const Icon = current.icon;

  if (collapsed) {
    return (
      <button
        onClick={next}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-all shadow-2xs"
        title={`Theme: ${current.label}`}
        aria-label={`Toggle theme (${current.label})`}
      >
        <Icon className="h-3.5 w-3.5 text-foreground" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5">
      {modes.map((m) => {
        const MIcon = m.icon;
        const active = theme === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setTheme(m.key)}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
              active
                ? "bg-card text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
            }`}
            aria-label={`${m.label} theme`}
          >
            <MIcon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[11px]">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
