import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, ArrowRight, Zap } from "lucide-react";

export function Landing({ onEnter }: { onEnter?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"landing" | "login">("landing");
  const [, navigate] = useLocation();
  const setDemoEntered = useStore((s) => s.setDemoEntered);

  const handleDemoClick = () => {
    setDemoEntered(true);
    onEnter?.();
    navigate("/");
  };

  const handleLoginClick = () => {
    setMode("login");
  };

  const handleBackClick = () => {
    setMode("landing");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just navigate to the app (no real auth yet)
    if (email && password) {
      setDemoEntered(true);
      onEnter?.();
      navigate("/");
    }
  };

  if (mode === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                T
              </div>
              <span className="font-semibold">TreasuryFlow</span>
            </div>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>Enter your credentials to access the treasury dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!email || !password}>
                Sign in
              </Button>
            </form>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" className="w-full" onClick={handleBackClick}>
                ← Back to landing
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Demo mode: any email/password will work. Real authentication coming in v1.0.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Button onClick={handleLoginClick} variant="outline" size="sm">
            <Lock className="h-4 w-4 mr-2" />
            Sign in
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="space-y-8 max-w-3xl">
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              Automate your treasury. Reduce the cost of trust.
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              TreasuryFlow is the non-custodial treasury operating system for the digital dollar economy — automating policy execution, continuous AI-verified audits, and real-time market response, all without ever touching your funds. <span className="font-semibold text-foreground">We don't ask you to trust us. We prove it onchain.</span>
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

          {/* CTA */}
          <div className="flex gap-4 pt-8">
            <Button size="lg" onClick={handleDemoClick} className="gap-2">
              <Zap className="h-4 w-4" />
              See demo
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
              desc: "Natural language policy drafting, intent rationale explainer, accounting tag suggestions.",
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
            "Click 'See demo' to trigger a reserve sweep policy",
            "Watch the intent flow through approvals and execution",
            "See balances update and ledger entries post in real-time",
            "Explore AI-powered tag suggestions and audit reports",
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
          <p>TreasuryFlow v0.1 — Demo mode. Real authentication and Coinbase integration coming in v1.0.</p>
        </div>
      </footer>
    </div>
  );
}
