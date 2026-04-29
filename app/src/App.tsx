import { Switch, Route, useLocation } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Landing } from "@/pages/Landing";
import { Overview } from "@/pages/Overview";
import { Policies } from "@/pages/Policies";
import { Approvals } from "@/pages/Approvals";
import { Activity } from "@/pages/Activity";
import { Accounts } from "@/pages/Accounts";
import { Risk } from "@/pages/Risk";
import { Forecast } from "@/pages/Forecast";
import { Audit } from "@/pages/Audit";
import { Reconciliation } from "@/pages/Reconciliation";
import { Settings } from "@/pages/Settings";
import { Yield } from "@/pages/Yield";
import { Entities } from "@/pages/Entities";
import { ComingSoon } from "@/pages/ComingSoon";
import { UnlinkedWallet } from "@/pages/UnlinkedWallet";
import { DemoWalkthrough } from "@/components/demo/DemoWalkthrough";
import { AskAI } from "@/components/shared/AskAI";
import { useStore } from "@/store";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Overview", subtitle: "Treasury operations dashboard" },
  "/policies": { title: "Policies", subtitle: "Treasury rules and automation" },
  "/approvals": { title: "Approvals", subtitle: "Pending decisions and review queue" },
  "/activity": { title: "Activity", subtitle: "Unified operations and audit history" },
  "/accounts": { title: "Accounts", subtitle: "Wallets, reserves, and settlement destinations" },
  "/risk": { title: "Counterparty Risk", subtitle: "AI-driven risk scoring and analysis" },
  "/forecast": { title: "Predictive Forecast", subtitle: "Balance projections and AI rebalancing" },
  "/audit": { title: "Audit Reports", subtitle: "Immutable onchain records and AI rationale" },
  "/reconciliation": { title: "Reconciliation", subtitle: "Ledger review and close-ready exports" },
  "/yield": { title: "Yield Strategies", subtitle: "Non-custodial performance optimization" },
  "/entities": { title: "Legal Entities", subtitle: "Multi-entity organizational structure" },
  "/settings": { title: "Settings", subtitle: "Roles, thresholds, and funding rails" },
  "/roadmap": { title: "Roadmap", subtitle: "Institutional-grade treasury infrastructure" },
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
  const demoEntered = useStore((s) => s.ui.demoEntered);
  const setDemoEntered = useStore((s) => s.setDemoEntered);
  const accounts = useStore((s) => s.accounts);
  
  const { isConnected, address } = useAccount();
  const [, setLocation] = useLocation();
  const prevAddress = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Handle global wallet redirection logic once per address change.
  // This lives here (above the Switch) so it survives page navigation.
  useEffect(() => {
    if (isConnected && address && address !== prevAddress.current) {
      prevAddress.current = address;
      
      const match = accounts.find((a) => a.address?.toLowerCase() === address.toLowerCase());
      
      // Only redirect if we are NOT already on the onboarding page.
      const isUnlinkedPage = window.location.pathname === "/onboarding/unlinked";
      
      if (match) {
        setLocation(`/accounts?id=${match.id}`);
      } else if (!isUnlinkedPage) {
        setLocation("/onboarding/unlinked");
      }
    } else if (!isConnected) {
      prevAddress.current = null;
    }
  }, [isConnected, address, accounts, setLocation]);

  // If user hasn't entered demo yet, show landing page
  if (!demoEntered) {
    return (
      <Switch>
        <Route path="/landing">{() => <Landing onEnter={() => setDemoEntered(true)} />}</Route>
        <Route>{() => <Landing onEnter={() => setDemoEntered(true)} />}</Route>
      </Switch>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/policies">{() => <Shell path="/policies"><Policies /></Shell>}</Route>
        <Route path="/approvals">{() => <Shell path="/approvals"><Approvals /></Shell>}</Route>
        <Route path="/activity">{() => <Shell path="/activity"><Activity /></Shell>}</Route>
        <Route path="/accounts">{() => <Shell path="/accounts"><Accounts /></Shell>}</Route>
        <Route path="/risk">{() => <Shell path="/risk"><Risk /></Shell>}</Route>
        <Route path="/forecast">{() => <Shell path="/forecast"><Forecast /></Shell>}</Route>
        <Route path="/audit">{() => <Shell path="/audit"><Audit /></Shell>}</Route>
        <Route path="/reconciliation">{() => <Shell path="/reconciliation"><Reconciliation /></Shell>}</Route>
        <Route path="/yield">{() => <Shell path="/yield"><Yield /></Shell>}</Route>
        <Route path="/entities">{() => <Shell path="/entities"><Entities /></Shell>}</Route>
        <Route path="/settings">{() => <Shell path="/settings"><Settings /></Shell>}</Route>
        <Route path="/roadmap">{() => <Shell path="/roadmap"><ComingSoon /></Shell>}</Route>
        <Route path="/onboarding/unlinked">{() => <UnlinkedWallet />}</Route>
        <Route path="/">{() => <Shell path="/"><Overview /></Shell>}</Route>
      </Switch>
      <DemoWalkthrough />
      <AskAI />
    </>
  );
}
