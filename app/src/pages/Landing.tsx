import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Lock, ArrowRight, Zap } from "lucide-react";

export function Landing({ onEnter }: { onEnter?: () => void } = {}) {
  const [showSignInInfo, setShowSignInInfo] = useState(false);
  const [, navigate] = useLocation();
  const setDemoEntered = useStore((s) => s.setDemoEntered);

  const handleDemoClick = () => {
    setDemoEntered(true);
    onEnter?.();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-card-border backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              T
            </div>
            <span className="font-semibold">TreasuryFlow</span>
          </div>
          {/* Sign In replaced with honest info tooltip */}
          <Button onClick={() => setShowSignInInfo(true)} variant="outline" size="sm">
            <Lock className="h-4 w-4 mr-2" />
            Sign in
          </Button>
        </div>
      </header>

      {/* Sign-in info dialog — honest about demo status */}
      <Dialog open={showSignInInfo} onOpenChange={setShowSignInInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>About Sign In</DialogTitle>
            <DialogDescription>
              This demo uses simulated finance roles to show maker-checker workflows.
              Login and user accounts are coming soon.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To explore the full dashboard now, use <strong>Enter Demo</strong> below.
            Role switching (Initiator / CFO Approver) is available inside the app via the user switcher.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSignInInfo(false)}>
              Close
            </Button>
            <Button className="flex-1 gap-2" onClick={() => { setShowSignInInfo(false); handleDemoClick(); }}>
              <Zap className="h-4 w-4" /> Enter Demo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="space-y-8 max-w-3xl">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Automate your treasury. Reduce the cost of trust.
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              TreasuryFlow is the non-custodial treasury operating system for the digital dollar economy — automating policy execution, continuous AI-verified audits, and real-time market response, all without ever touching your funds.{" "}
              <span className="font-semibold text-foreground">We don't ask you to trust us. We prove it onchain.</span>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">50%</div>
                <p className="text-xs text-muted-foreground mt-1">Time reduction</p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">&lt;30s</div>
                <p className="text-xs text-muted-foreground mt-1">Approval to execution</p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">40%</div>
                <p className="text-xs text-muted-foreground mt-1">Audit cost reduction</p>
              </CardContent>
            </Card>
          </div>

          {/* Primary CTA */}
          <div className="flex gap-4 pt-8">
            <Button size="lg" onClick={handleDemoClick} className="gap-2">
              <Zap className="h-4 w-4" />
              Enter Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Learn more
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-t border-card-border">
        <h2 className="text-3xl font-bold mb-12">What's included</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: <Building2 className="h-6 w-6 text-primary" />,
              title: "Policy Engine",
              desc: "Automatic sweep, rebalance, payout, and routing policies. Policies execute in seconds.",
            },
            {
              icon: <Zap className="h-6 w-6 text-primary" />,
              title: "Real-time Execution",
              desc: "Maker-checker approval workflow with risk flagging and real-time balance impact preview.",
            },
            {
              icon: <Lock className="h-6 w-4 text-primary" />,
              title: "24/7 Audit",
              desc: "Every transaction auto-tagged, categorized, and explained with Perplexity citations.",
            },
            {
              icon: <ArrowRight className="h-6 w-6 text-primary" />,
              title: "AI Assistants",
              desc: "Natural language policy drafting, payment request rationale explainer, accounting tag suggestions.",
            },
          ].map((feature, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Demo flow */}
      <section className="max-w-6xl mx-auto px-4 py-20 border-t border-card-border">
        <h2 className="text-3xl font-bold mb-12">See it in action</h2>
        <div className="space-y-4">
          {[
            "Click 'Enter Demo' to trigger a reserve sweep policy",
            "Watch payment requests flow through maker-checker approvals and execution",
            "See balances update and ledger entries post in real-time",
            "Explore AI-powered tag suggestions and onchain audit reports",
          ].map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </div>
              <p className="flex-1 text-foreground pt-1">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border mt-20 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TreasuryFlow v0.1 — Demo mode. Login and Coinbase integration coming soon.</p>
        </div>
      </footer>
    </div>
  );
}
