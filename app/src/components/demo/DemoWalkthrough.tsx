import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, ShieldCheck, Info, Zap, CheckCircle2, TrendingUp, AlertTriangle, Fingerprint, BarChart3, FileText } from "lucide-react";
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
    title: "Wallet + Sweep",
    steps: [
      { title: "Active Policies", content: "TreasuryFlow autonomous policies monitor your target bands. A sweep policy is currently active to move excess funds.", icon: Zap, selector: '[data-tour="policies-section"]', route: "/" },
      { title: "Approval Required", content: "The sweep was proposed because reserves exceeded the threshold. Review the pending transfer.", icon: ShieldCheck, selector: '[data-tour="approvals-sweep-row"]', route: "/approvals" }
    ]
  },
  morpho_yield: {
    title: "Morpho Yield",
    steps: [
      { title: "Yield Opportunities", content: "Discover non-custodial yield strategies. Morpho Blue allows you to earn institutional yield while maintaining 100% control.", icon: TrendingUp, selector: '[data-tour="yield-opportunities"]', route: "/yield" },
      { title: "Direct Accrual", content: "Deposit proposed. You will start earning 8.42% APY directly into your Base Morpho vault once approved.", icon: CheckCircle2, selector: '[data-tour="approvals-morpho-row"]', route: "/approvals" }
    ]
  },
  anomaly_warning: {
    title: "Anomaly Warning",
    steps: [
      { title: "Forensic Alert", content: "A high-value transfer triggered an anomaly alert. The system has automatically paused the execution for review. Click the highlighted row.", icon: AlertTriangle, selector: '[data-tour="approvals-anomaly-row"]', route: "/approvals" },
      { title: "Review Rationale", content: "Inspect the evidence bundle. Perplexity AI has scanned the counterparty's onchain history, surfacing a 'Flash-Loan Association' risk vector.", icon: Zap, selector: '[data-tour="approvals-decision-bar"]', route: "/approvals" },
    ]
  },
  counterparty_risk: {
    title: "Counterparty Risk",
    steps: [
      { title: "New Counterparty", content: "A vendor from a new jurisdiction was added. We are running a deep forensic scan on their liquidity profile.", icon: Info, selector: '[data-tour="risk-new-counterparty"]', route: "/risk" },
      { title: "Identity Fingerprint", content: "Our Global Trust Radar verified the counterparty, but flagged it as a first-time vendor. Risk limits are dynamically adjusted.", icon: Fingerprint, selector: '[data-tour="risk-new-rationale"]', route: "/risk" },
    ]
  },
  market_shock: {
    title: "Market Shock",
    steps: [
      { title: "Liquidity Forecast", content: "AI projects a potential shortfall if payouts continue at this velocity. View the 7-day visual projection here.", icon: BarChart3, selector: '[data-tour="forecast-chart"]', route: "/forecast" },
      { title: "Volatility Sensor", content: "Sensors detected a deviation in liquidity depth. A gap is identified, and a rebalance is recommended.", icon: Info, selector: '[data-tour="forecast-intelligence"]', route: "/forecast" },
      { title: "Resilience Policy", content: "Executing a rapid rebalance to pull capital from cold storage and stabilize the operating floor.", icon: Zap, selector: '[data-tour="policies-rebalance"]', route: "/policies" },
    ]
  },
  predictive_forecast: {
    title: "Predictive Forecast",
    steps: [
      { title: "Predictive Analytics", content: "We've projected your cash flow for the next month. A funding gap is identified for Friday the 14th.", icon: TrendingUp, selector: '[data-tour="forecast-chart"]', route: "/forecast" },
      { title: "Proactive Signal", content: "Based on the gap, the system has generated a proactive rebalance intent to fund operations now.", icon: Zap, selector: '[data-tour="forecast-recommendation"]', route: "/forecast" },
    ]
  },
  audit_pdf: {
    title: "Audit PDF",
    steps: [
      { title: "Evidence Bundles", content: "Generate regulatory-grade evidence bundles that contain every citation and block hash in one click.", icon: FileText, selector: '[data-tour="audit-section"]', route: "/audit" },
      { title: "Unified Sequencing", content: "Every action is sequenced into a cryptographic ledger that you truly own.", icon: Info, selector: '[data-tour="audit-bundle-row"]', route: "/audit" },
      { title: "Self-Auditing", content: "The promise of 'trust' is replaced by the reality of 'proof'. Your audit is now 24/7.", icon: CheckCircle2, selector: '[data-tour="audit-compliance"]', route: "/audit" },
    ]
  },
  create_policy: {
    title: "Create New Policy",
    steps: [
      { title: "AI Policy Builder", content: "Our autonomous agents translate plain English into deterministic smart-contract logic.", icon: Zap, selector: '[data-tour="btn-create-policy"]', route: "/policies" },
      { title: "Natural Language", content: "Just describe the rule. For example: 'Sweep any USDC above $100k to Morpho Yield daily.'", icon: Info, selector: '[data-tour="ai-policy-prompt"]', route: "/policies" },
      { title: "Compile", content: "The agent compiles your natural language into a highly deterministic, onchain executable policy.", icon: Zap, selector: '[data-tour="ai-policy-generate"]', route: "/policies" },
      { title: "Deploy to Network", content: "Review the compiled configuration. Once confirmed, the policy runs continuously without human intervention.", icon: ShieldCheck, selector: '[data-tour="ai-policy-deploy"]', route: "/policies" },
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
  const [location, navigate] = useLocation();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, isAbove: false });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const scenario = activeScenarioKey ? WALKTHROUGH_CONTENT[activeScenarioKey] : null;
  const step = scenario?.steps[currentStep];

  // Update target rect when step or route changes
  useLayoutEffect(() => {
    if (!walkthroughActive || !step) return;

    if (step.route && step.route !== location) {
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
          
          let top = rect.bottom + 24;
          let left = rect.left + rect.width / 2 - tooltipWidth / 2;
          let isAbove = false;
          
          left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
          
          if (top + tooltipHeight + 20 > window.innerHeight) {
            top = rect.top - tooltipHeight - 24;
            isAbove = true;
          }
          
          if (top < 16) {
            top = Math.max(16, window.innerHeight / 2 - tooltipHeight / 2);
            left = Math.max(16, window.innerWidth / 2 - tooltipWidth / 2);
            isAbove = false;
          }

          setTooltipPos({ top, left, isAbove });
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setTargetRect(null);
          setTooltipPos({ top: window.innerHeight / 2 - 140, left: window.innerWidth / 2 - 192, isAbove: false });
        }
      } else {
        setTargetRect(null);
        setTooltipPos({ top: window.innerHeight / 2 - 140, left: window.innerWidth / 2 - 192, isAbove: false });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [walkthroughActive, currentStep, step?.selector, step?.route, navigate]);

  if (!walkthroughActive || !scenario || !step) return null;

  const Icon = step.icon;
  const isLast = currentStep >= scenario.steps.length - 1;

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
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
          onClick={(e) => handleAction(e, endWalkthrough)}
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
        <Card className="shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl ring-1 ring-white/10 relative">
          {/* Tooltip Pointer Arrow */}
          {targetRect && (
            <div 
              className={cn(
                "absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-primary/20 rotate-45 pointer-events-none",
                tooltipPos.isAbove ? "bottom-[-9px] border-b border-r shadow-[2px_2px_4px_rgba(0,0,0,0.1)]" : "top-[-9px] border-t border-l bg-primary/5"
              )}
            />
          )}
          <CardHeader className="pb-2 border-b border-white/5 flex flex-row items-center justify-between bg-primary/5 rounded-t-xl">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/20 text-primary">
                <Zap className="h-3.5 w-3.5 fill-primary" />
              </div>
              <CardTitle className="text-xs font-bold tracking-widest uppercase opacity-80">{scenario.title}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 hover:bg-primary/10" onClick={(e) => handleAction(e, endWalkthrough)}>
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
              onClick={(e) => handleAction(e, prevStep)} 
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
                  onClick={(e) => handleAction(e, endWalkthrough)}
                  className="text-xs h-8 px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Explore MVP <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
               ) : (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => handleAction(e, nextStep)}
                  className="text-xs h-8 px-6 bg-white/10 hover:bg-white/20 border-white/5"
                >
                  Next <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
               )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>,
    document.body
  );
}
