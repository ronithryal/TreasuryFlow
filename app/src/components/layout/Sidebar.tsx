import { Link, useLocation } from "wouter";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import {
  LayoutDashboard,
  ShieldCheck,
  Clock,
  Activity,
  Wallet2,
  FileSpreadsheet,
  Settings2,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/approvals", label: "Approvals", icon: Clock },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/accounts", label: "Accounts", icon: Wallet2 },
  { href: "/reconciliation", label: "Reconciliation", icon: FileSpreadsheet },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  const [location] = useLocation();
  const pendingCount = useStore((s) => s.intents.filter((i) => i.status === "pending_approval").length);

  return (
    <aside className="flex h-full w-56 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <span className="text-sm font-bold leading-none">TF</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">TreasuryFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <li key={href}>
                <Link href={href}>
                  <a
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {label === "Approvals" && pendingCount > 0 ? (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-chart-3 px-1.5 text-[11px] font-semibold text-white">
                        {pendingCount}
                      </span>
                    ) : null}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer version badge */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/40">TreasuryFlow · v0.1 demo</p>
      </div>
    </aside>
  );
}
