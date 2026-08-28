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
      <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60" aria-label="Toggle theme">
        <Monitor className="h-4 w-4" />
      </button>
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
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white/70 hover:bg-white/14 hover:text-white transition-all shadow-sm"
        title={`Theme: ${current.label}`}
        aria-label={`Toggle theme (${current.label})`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/6 p-1 border border-white/10">
      {modes.map((m) => {
        const MIcon = m.icon;
        const active = theme === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setTheme(m.key)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
              active
                ? "bg-white/20 text-white shadow-sm font-semibold"
                : "text-white/50 hover:text-white/80"
            }`}
            aria-label={`${m.label} theme`}
          >
            <MIcon className="h-3.5 w-3.5" />
            <span className="sidebar-item-text">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
