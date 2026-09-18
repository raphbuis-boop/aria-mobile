import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/", label: "Desk" },
  { href: "/leads", label: "Leads" },
  { href: "/contracts", label: "Contracts" },
  { href: "/login", label: "Sign in" },
];

export function AppShell({
  children,
  title,
  kicker,
}: {
  children: React.ReactNode;
  title: string;
  kicker: string;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="grid min-h-screen lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-5 lg:block">
            <p className="font-display text-2xl leading-none">Aria</p>
            <p className="mt-1 hidden text-[11px] uppercase tracking-[0.18em] text-ink-soft lg:block">
              One-agent desk
            </p>
            <div className="lg:hidden">
              <ThemeToggle />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3 lg:pb-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block whitespace-nowrap px-3 py-2 text-sm text-ink-soft hover:bg-paper-2 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden border-t border-line px-5 py-5 lg:block">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              Qualification SLA
            </p>
            <p className="mt-1 font-mono text-sm">20 seconds</p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </aside>
        <main className="min-w-0">
          <header className="border-b border-line px-5 py-6 md:px-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              {kicker}
            </p>
            <h1 className="mt-2 max-w-[18ch] text-4xl md:text-5xl">{title}</h1>
          </header>
          <div className="px-5 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
