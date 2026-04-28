import { useState, useLayoutEffect, useRef } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, ShieldCheck, Info, Zap, CheckCircle2, Building2, TrendingUp, AlertTriangle, Search, Fingerprint, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface WalkthroughStep {
  content: string;
  icon: any;
  selector?: string;
  route?: string;
  title?: string;
}

const WALKTHROUGH_CONTENT: Record<string, { title: string; steps: WalkthroughStep[] }> = {
  wallet_connect_sweep: {
    title: "Institutional Identity",
    steps: [
      { title: "Hybrid Onboarding", content: "TreasuryFlow supports a hybrid wallet stack. Connect your existing Safes via WalletConnect or instantly provision institutional wallets via CDP Embedded Wallets.", icon: ShieldCheck, selector: "#wallet-status", route: "/" },
      { title: "Entity Provisioning", content: "Once a legal entity is verified, you can provision their operational wallet with one click—no private key management required for your subsidiaries.", icon: Building2, selector: "#entities-list", route: "/entities" },
      { title: "Policy Execution", content: "Autonomous policies monitor your target bands. A sweep is proposed when reserves exceed the defined threshold.", icon: Zap, selector: "#policies-sweep", route: "/policies" },
      { title: "Immutable Success", content: "The transfer is complete and permanently recorded on the Base Sepolia ledger with full cryptographic proof.", icon: CheckCircle2, selector: "#activity-feed", route: "/activity" },
    ]
  },
  morpho_yield: {
    title: "Yield Forensics",
    steps: [
      { title: "Idle Capital Scan", content: "Our sensors identified $1.2M in idle USDC. In high-inflation environments, idle capital is a liability.", icon: Info, selector: "#kpi-operating", route: "/" },
      { title: "Yield Marketplace", content: "Discover non-custodial yield strategies. Morpho Blue allows you to earn institutional yield while maintaining 100% control.", icon: TrendingUp, selector: "#yield-opportunities", route: "/yield" },
      { title: "Policy Safeguard", content: "Automate your yield. This policy ensures only low-risk, verified protocols are used for reserve optimization.", icon: ShieldCheck, selector: "#policies-yield", route: "/policies" },
      { title: "Direct Accrual", content: "Deployment verified. You are now earning 8.42% APY directly into your Base Morpho vault.", icon: CheckCircle2, selector: "#accounts-morpho", route: "/accounts" },
    ]
  },
  anomaly_warning: {
    title: "AI Risk Engine",
    steps: [
      { title: "Forensic Alert", content: "A high-value transfer triggered an anomaly alert. The system has automatically paused the execution for review.", icon: AlertTriangle, selector: "#kpi-approvals", route: "/" },
      { title: "Perplexity Analysis", content: "Perplexity AI has scanned the counterparty's onchain history, surfacing a 'Flash-Loan Association' risk vector.", icon: Search, selector: "#risk-section", route: "/risk" },
      { title: "Review Rationale", content: "Inspect the evidence bundle. We provide the citations so your compliance team doesn't have to guess.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Safe Resolution", content: "Anomaly rejected. Your treasury is protected by 24/7 autonomous risk auditing.", icon: CheckCircle2, selector: "#activity-feed", route: "/activity" },
    ]
  },
  counterparty_risk: {
    title: "Global Trust Radar",
    steps: [
      { title: "New Counterparty", content: "A vendor from a new jurisdiction was added. We are running a deep forensic scan on their liquidity profile.", icon: Info, selector: "#kpi-approvals", route: "/" },
      { title: "Identity Fingerprint", content: "Our Global Trust Radar verifies the counterparty against thousands of onchain and offchain data points.", icon: Fingerprint, selector: "#risk-section", route: "/risk" },
      { title: "Dynamic Thresholds", content: "Risk score (98.4) passed. The system has adjusted the approval limit for this specific relationship.", icon: ShieldCheck, selector: "#approvals-queue", route: "/approvals" },
      { title: "Verified Record", content: "Counterparty onboarded. Every future transaction with this vendor will be cited against this trust profile.", icon: CheckCircle2, selector: "#activity-feed", route: "/activity" },
    ]
  },
  market_shock: {
    title: "Operational Resilience",
    steps: [
      { title: "Volatility Sensor", content: "Sensors detected a deviation in liquidity depth. Traditional treasuries react in days; we react in blocks.", icon: Info, selector: "#kpi-reserve", route: "/" },
      { title: "Liquidity Forecast", content: "AI projects a potential shortfall if payouts continue at this velocity. View the 7-day visual projection here.", icon: BarChart3, selector: "#forecast-chart", route: "/forecast" },
      { title: "Resilience Policy", content: "Executing a rapid rebalance to pull capital from cold storage and stabilize the operating floor.", icon: Zap, selector: "#policies-rebalance", route: "/policies" },
      { title: "Shock Absorbed", icon: CheckCircle2, content: "Treasury stabilized. Your operations remained 100% liquid throughout the market shock.", selector: "#activity-feed", route: "/activity" },
    ]
  },
  predictive_forecast: {
    title: "Predictive Treasury",
    steps: [
      { title: "Pattern Recognition", content: "AI is analyzing your recurring vendor flows to optimize your long-term capital allocation.", icon: Info, selector: "#kpi-total", route: "/" },
      { title: "Predictive Analytics", content: "We've projected your cash flow for the next month. A funding gap is identified for Friday the 14th.", icon: TrendingUp, selector: "#forecast-chart", route: "/forecast" },
      { title: "Proactive Signal", content: "Based on the gap, the system has generated a proactive rebalance intent to fund operations now.", icon: Zap, selector: "#forecast-intelligence", route: "/forecast" },
      { title: "Forward Ready", icon: CheckCircle2, content: "Treasury is now fully funded for the upcoming pay cycle. Operational risk eliminated.", selector: "#activity-feed", route: "/activity" },
    ]
  },
  audit_pdf: {
    title: "Proof Onchain",
    steps: [
      { title: "Unified Sequencing", content: "Every action—whether from a connected Safe or a provisioned CDP wallet—is sequenced into a cryptographic ledger that you truly own.", icon: Info, selector: "#activity-feed", route: "/activity" },
      { title: "Evidence Bundles", content: "Generate regulatory-grade evidence bundles that contain every citation and block hash in one click.", icon: FileText, selector: "#audit-bundles", route: "/audit" },
      { title: "Verification Rail", content: "Regulators can verify these proofs directly on Base Sepolia, collapsing the cost of traditional audits.", icon: ShieldCheck, selector: "#reconciliation-section", route: "/reconciliation" },
      { title: "Self-Auditing", icon: CheckCircle2, content: "The promise of 'trust' is replaced by the reality of 'proof'. Your audit is now 24/7.", selector: "#audit-section", route: "/audit" },
    ]
  }
};

export function DemoWalkthrough() {
  const activeScenarioKey = useStore(s => s.activeScenario);
  const currentStep = useStore(s => s.currentStep);
  const nextStep = useStore(s => s.nextStep);
  const prevStep = useStore(s => s.prevStep);
  const endWalkthrough = useStore(s => s.endWalkthrough);
  const walkthroughActive = useStore(s => s.walkthroughActive);
  const [, navigate] = useLocation();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const scenario = activeScenarioKey ? WALKTHROUGH_CONTENT[activeScenarioKey] : null;
  const step = scenario?.steps[currentStep];

  // Update target rect when step or route changes
  useLayoutEffect(() => {
    if (!walkthroughActive || !step) return;

    if (step.route) {
      navigate(step.route);
    }

    const timer = setTimeout(() => {
      if (step.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          
          const tooltipWidth = tooltipRef.current?.offsetWidth || 384;
          const tooltipHeight = tooltipRef.current?.offsetHeight || 280;
          
          // Calculate tooltip position (centered below or above)
          let top = rect.bottom + 24;
          let left = rect.left + rect.width / 2 - tooltipWidth / 2;
          
          // Adjust if off-screen horizontally
          left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
          
          // If it doesn't fit below, try above
          if (top + tooltipHeight + 20 > window.innerHeight) {
            top = rect.top - tooltipHeight - 24;
          }
          
          // Final fallback to center if still bad
          if (top < 16) {
            top = Math.max(16, window.innerHeight / 2 - tooltipHeight / 2);
            left = Math.max(16, window.innerWidth / 2 - tooltipWidth / 2);
          }

          setTooltipPos({ top, left });
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setTargetRect(null);
          setTooltipPos({ top: window.innerHeight / 2 - 140, left: window.innerWidth / 2 - 192 });
        }
      } else {
        setTargetRect(null);
        setTooltipPos({ top: window.innerHeight / 2 - 140, left: window.innerWidth / 2 - 192 });
      }
    }, 400); // More time for layout shifts

    return () => clearTimeout(timer);
  }, [walkthroughActive, currentStep, step?.selector, step?.route, navigate]);

  if (!walkthroughActive || !scenario || !step) return null;

  const Icon = step.icon;
  const isLast = currentStep >= scenario.steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <AnimatePresence>
        {/* Backdrop with Hole */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-[2px] pointer-events-auto"
          style={{
            clipPath: targetRect 
              ? `polygon(0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%)`
              : "none"
          }}
          onClick={endWalkthrough}
        />
      </AnimatePresence>

      {/* Spotlight Border */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1, x: targetRect.left - 4, y: targetRect.top - 4, width: targetRect.width + 8, height: targetRect.height + 8 }}
          className="absolute border-2 border-primary rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] pointer-events-none"
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        />
      )}

      {/* Tooltip Card */}
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, x: tooltipPos.left, y: tooltipPos.top }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="absolute w-[calc(100vw-32px)] md:w-96 pointer-events-auto"
      >
        <Card className="shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader className="pb-2 border-b border-white/5 flex flex-row items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/20 text-primary">
                <Zap className="h-3.5 w-3.5 fill-primary" />
              </div>
              <CardTitle className="text-xs font-bold tracking-widest uppercase opacity-80">{scenario.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 hover:bg-primary/10" onClick={endWalkthrough}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary flex items-center justify-center shadow-inner">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-foreground">
                  {step.title}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.content}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 pt-2">
              {scenario.steps.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    i <= currentStep ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "bg-primary/10"
                  )} 
                />
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between bg-black/20 py-3 px-4 rounded-b-xl border-t border-white/5">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevStep} 
              disabled={currentStep === 0}
              className="text-xs h-8 hover:bg-white/5"
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
               {isLast ? (
                 <Button 
                  variant="default" 
                  size="sm" 
                  onClick={endWalkthrough}
                  className="text-xs h-8 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Explore MVP <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
               ) : (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={nextStep}
                  className="text-xs h-8 px-6 bg-white/10 hover:bg-white/20 border-white/5"
                >
                  Next <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
               )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
