import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Zap, Info, ShieldCheck, CheckCircle2 } from "lucide-react";
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
    title: "Onchain Identity & Sweeps",
    steps: [
      { title: "Onchain Identity", content: "TreasuryFlow is non-custodial. It starts by connecting your institutional wallet to prove ownership of the treasury reserves.", icon: ShieldCheck, selector: "#wallet-status", route: "/" },
      { title: "Policy Engine", content: "Our engine identified $80k in excess reserves. Rules are executed based on these immutable policies.", icon: Info, selector: "#policies-section", route: "/policies" },
      { title: "Review Queue", content: "Every automated intent requires a final cryptographic signature. Review the rationale and sign to execute.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Immutable Ledger", content: "Success. The transaction is now permanently recorded on Base Sepolia, citing the policy and AI rationale.", icon: CheckCircle2, selector: "#activity-feed", route: "/activity" },
    ]
  },
  morpho_yield: {
    title: "Non-Custodial Yield",
    steps: [
      { title: "Idle Capital", content: "We track your idle USDC across all networks. Idle capital is a missed opportunity for your treasury.", icon: Info, selector: "#kpi-operating", route: "/" },
      { title: "Morpho Strategy", content: "TreasuryFlow proposes low-risk yield strategies using Morpho. You maintain 100% control of the mUSDC asset.", icon: ShieldCheck, selector: "#policies-yield", route: "/policies" },
      { title: "Authorize Deployment", content: "Authorize the deployment. No third-party custodian is involved; you are lending directly to the protocol.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Real-time Accrual", content: "Yield is now accruing. View your real-time performance and liquidity depth here.", icon: CheckCircle2, selector: "#accounts-morpho", route: "/accounts" },
    ]
  },
  anomaly_warning: {
    title: "Forensic AI Audit",
    steps: [
      { title: "Anomaly Detected", content: "A high-value transfer triggered our anomaly engine due to unusual timing and counterparty signals.", icon: Info, selector: "#kpi-approvals", route: "/" },
      { title: "Perplexity Analysis", content: "Perplexity Agent AI has already scanned the transaction, citing specific risk vectors and chain history.", icon: ShieldCheck, selector: "#approvals-queue", route: "/approvals" },
      { title: "Risk Forensics", content: "Inspect the automated evidence. We verify every signal so you don't have to trust blindly.", icon: Zap, selector: "#activity-feed", route: "/activity" },
      { title: "Safe Resolution", content: "Risk mitigated. Your treasury operations are now protected by continuous, 24/7 AI auditing.", icon: CheckCircle2, selector: "#audit-section", route: "/audit" },
    ]
  },
  counterparty_risk: {
    title: "Trust-as-a-Service",
    steps: [
      { title: "New Counterparty", content: "A new vendor payment was initiated. We're running a deep forensic scan on the destination wallet.", icon: Info, selector: "#kpi-approvals", route: "/" },
      { title: "Risk Profiling", content: "Perplexity is analyzing the vendor's reputation and historical behavior across the digital dollar economy.", icon: ShieldCheck, selector: "#risk-section", route: "/risk" },
      { title: "Dynamic Limits", content: "Based on the risk score, we've adjusted the approval thresholds for this specific counterparty.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Verified Vendor", content: "Vendor successfully onboarded with a verifiable trust profile recorded on your private ledger.", icon: CheckCircle2, selector: "#activity-feed", route: "/activity" },
    ]
  },
  market_shock: {
    title: "Market Resilience",
    steps: [
      { title: "Market Volatility", content: "Real-time sensors detected a >5% deviation in USDC liquidity depth across major venues.", icon: Info, selector: "#kpi-reserve", route: "/" },
      { title: "Rebalance Suggestion", content: "Intelligence engine suggests rebalancing to maintain 100% liquidity health for upcoming payouts.", icon: ShieldCheck, selector: "#policies-rebalance", route: "/policies" },
      { title: "Rapid Execution", content: "Execution happens in blocks, not days. Approve the rebalance to stabilize your reserves immediately.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Resilience Proven", icon: CheckCircle2, content: "Market shock absorbed. Your treasury responded automatically while others were still reconciling.", selector: "#activity-feed", route: "/activity" },
    ]
  },
  predictive_forecast: {
    title: "Intelligent Liquidity",
    steps: [
      { title: "Cash Flow Patterns", content: "AI is analyzing your recurring payroll and vendor patterns to project cash flow for the next 30 days.", icon: Info, selector: "#kpi-total", route: "/" },
      { title: "Liquidity Forecast", content: "A potential gap is identified for next Friday. View the AI-generated projection here.", icon: ShieldCheck, selector: "#forecast-section", route: "/forecast" },
      { title: "Proactive Rebalance", content: "Initiate a proactive rebalance now to avoid high-urgency transfers later this week.", icon: Zap, selector: "#approvals-queue", route: "/approvals" },
      { title: "Operational Peace", icon: CheckCircle2, content: "Treasury is fully funded for the next 7 days. Operational risk has been systematically eliminated.", selector: "#activity-feed", route: "/activity" },
    ]
  },
  audit_pdf: {
    title: "Compliance Automation",
    steps: [
      { title: "Immutable Records", content: "Every transaction, rationale, and citation is stored as a verifiable event on Base Sepolia.", icon: Info, selector: "#activity-feed", route: "/activity" },
      { title: "On-Demand Reports", content: "Generate a forensic-grade PDF report for regulators, board members, or internal auditors in seconds.", icon: ShieldCheck, selector: "#reconciliation-section", route: "/reconciliation" },
      { title: "AI-Generated Rationales", content: "The report includes citations for every decision, proving your adherence to treasury policy 24/7.", icon: Zap, selector: "#audit-section", route: "/audit" },
      { title: "Audit Complete", icon: CheckCircle2, content: "The cost of trust has been collapsed. Your treasury is now self-auditing and fully transparent.", selector: "#activity-feed", route: "/activity" },
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
        animate={{ opacity: 1, y: 0, x: tooltipPos.left, y: tooltipPos.top }}
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
