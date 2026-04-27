import { Switch, Route } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Overview } from "@/pages/Overview";
import { Policies } from "@/pages/Policies";
import { Approvals } from "@/pages/Approvals";
import { Activity } from "@/pages/Activity";
import { Accounts } from "@/pages/Accounts";
import { Reconciliation } from "@/pages/Reconciliation";
import { Settings } from "@/pages/Settings";
import { useStore } from "@/store";
import { useEffect } from "react";

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Overview", subtitle: "Treasury operations dashboard" },
  "/policies": { title: "Policies", subtitle: "Treasury rules and automation" },
  "/approvals": { title: "Approvals", subtitle: "Pending decisions and review queue" },
  "/activity": { title: "Activity", subtitle: "Unified operations and audit history" },
  "/accounts": { title: "Accounts", subtitle: "Wallets, reserves, and settlement destinations" },
  "/reconciliation": { title: "Reconciliation", subtitle: "Ledger review and close-ready exports" },
  "/settings": { title: "Settings", subtitle: "Roles, thresholds, and funding rails" },
};

function Shell({ path, children }: { path: string; children: React.ReactNode }) {
  const meta = PAGE_META[path] ?? { title: "TreasuryFlow" };
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}

export function App() {
  const darkMode = useStore((s) => s.ui.darkMode);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <Switch>
      <Route path="/">{() => <Shell path="/"><Overview /></Shell>}</Route>
      <Route path="/policies">{() => <Shell path="/policies"><Policies /></Shell>}</Route>
      <Route path="/approvals">{() => <Shell path="/approvals"><Approvals /></Shell>}</Route>
      <Route path="/activity">{() => <Shell path="/activity"><Activity /></Shell>}</Route>
      <Route path="/accounts">{() => <Shell path="/accounts"><Accounts /></Shell>}</Route>
      <Route path="/reconciliation">{() => <Shell path="/reconciliation"><Reconciliation /></Shell>}</Route>
      <Route path="/settings">{() => <Shell path="/settings"><Settings /></Shell>}</Route>
    </Switch>
  );
}
