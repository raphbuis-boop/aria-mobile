"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? (theme === "system" ? resolvedTheme : theme) : "dark";
  const next = current === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next ?? "dark")}
      className="border border-line px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-ink-soft hover:border-accent hover:text-ink"
      aria-label={`Switch to ${next} mode`}
    >
      {current === "dark" ? "Day desk" : "Night desk"}
    </button>
  );
}
