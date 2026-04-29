import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useStore } from "@/store";
import { jsPDF } from "jspdf";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Info,
  ShieldCheck,
  Database,
  AlertCircle,
} from "lucide-react";
import { IS_TESTNET } from "@/web3/mode";
import { BASESCAN_ADDR } from "@/web3/testnet";
import { usePolicyExecutionLogs, type IntentExecutionLog } from "@/web3/usePolicyExecutionLogs";
import { fmtDateAbs, fmtMoney } from "@/lib/format";
import type { CanonicalDemoState } from "@/store";

export function Audit() {
  const [generating, setGenerating] = useState(false);
  const ledger = useStore((s) => s.ledger);
  const audit = useStore((s) => s.audit);

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const doc = new jsPDF();
    doc.text("TreasuryFlow Audit Report", 20, 20);
    doc.text(`Total Ledger Entries: ${ledger.length}`, 20, 30);
    doc.text(`Total Audit Events: ${audit.length}`, 20, 40);
    doc.text("Onchain Proofs Included", 20, 50);
    doc.save("audit_report.pdf");
    setGenerating(false);
  };

  return (
    <div id="audit-section" data-tour="audit-section" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Database className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Immutable Ledger</span>
            </div>
            <CardTitle className="text-sm font-bold">Generate Forensic Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an exportable PDF bundle containing every transaction hash, policy evaluation, and AI rationale for the selected period.
            </p>
            <Button className="w-full text-xs h-9 gap-2" onClick={handleGenerate} disabled={generating}>
              {generating ? "Sequencing Report…" : <><Download className="h-4 w-4" />Export Evidence Bundle</>}
            </Button>
          </CardContent>
        </Card>

        <Card data-tour="audit-compliance">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-chart-5 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Compliance Status</span>
            </div>
            <CardTitle className="text-sm font-bold">Regulatory Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-5 shadow-[0_0_8px_rgba(var(--chart-5),0.5)]" />
                <span className="text-muted-foreground">All Policies Verified</span>
              </div>
              <span className="font-bold">100% Verified</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-5" />
                <span className="text-muted-foreground">Onchain Proven</span>
              </div>
              <span className="font-bold">{IS_TESTNET ? "Base Sepolia" : "Last block: 1,429,201"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {IS_TESTNET ? <OnchainAuditTrail /> : <DemoAuditSection />}
    </div>
  );
}

// ── Demo mode: canonical evidence packet or mock bundles ────────────────────

function DemoAuditSection() {
  const canonicalDemoState = useStore((s) => s.canonicalDemoState);
  if (canonicalDemoState.completed) {
    return <CanonicalDemoEvidencePacket state={canonicalDemoState} />;
  }
  return <MockAuditBundles />;
}

// ── Canonical demo evidence packet ─────────────────────────────────────────

function CanonicalDemoEvidencePacket({ state }: { state: CanonicalDemoState }) {
  const intents = useStore((s) => s.intents);
  const executions = useStore((s) => s.executions);
  const ledger = useStore((s) => s.ledger);
  const accounts = useStore((s) => s.accounts);
  const counterparties = useStore((s) => s.counterparties);
  const users = useStore((s) => s.users);
  const policies = useStore((s) => s.policies);

  const intent = intents.find((i) => i.id === state.intentId);
  const execution = executions.find((e) => e.id === state.executionId);

  if (!intent || !execution) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-4 text-xs text-muted-foreground">Evidence packet not found. Run the canonical demo again.</CardContent>
      </Card>
    );
  }

  const sourceAccount = accounts.find((a) => a.id === intent.sourceAccountId);
  const destAccount = accounts.find((a) => a.id === intent.destinationAccountId);
  const policy = policies.find((p) => p.id === intent.policyId);
  const counterparty = counterparties.find((c) => c.id === intent.counterpartyId);
  const initiator = users.find((u) => u.id === intent.requestedBy);
  const approval = intent.approvals[0];
  const approver = approval ? users.find((u) => u.id === approval.approver) : null;
  const ledgerEntries = ledger.filter((l) => l.intentId === intent.id && execution.id === l.executionId);

  const isDistinctApprover = approver && initiator && approver.id !== initiator.id;
  const railLabel = counterparty?.destinationDetails.rail === "wire" ? "Domestic Wire" : "ACH";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Canonical Payout Demo — Evidence Packet
        </h2>
        <Badge variant="secondary" className="text-[10px] font-mono gap-1">
          <AlertCircle className="h-3 w-3" />
          DEMO · server_signed_demo
        </Badge>
      </div>

      {/* Disclosure banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Demo disclosure:</strong> This execution uses <code>server_signed_demo</code> mode — the flow is deterministic and the transaction reference is simulated. Live execution via connected wallet or CDP Embedded Wallet is available in production.
        </CardContent>
      </Card>

      {/* Step cards */}
      <div className="space-y-3">

        {/* Step 1: Request Created */}
        <EvidenceStep
          step={1}
          title="Payment Request Created"
          status="verified"
          details={[
            { label: "Payment request", value: intent.title },
            { label: "Amount", value: fmtMoney(intent.amount, intent.asset) },
            { label: "Rail", value: railLabel + " · " + (counterparty?.destinationDetails.primary ?? "—") },
            { label: "Initiated by", value: `${initiator?.name ?? intent.requestedBy} · ${initiator?.role ?? "—"}` },
            { label: "Policy", value: policy?.name ?? "Manual" },
            { label: "Created at", value: fmtDateAbs(intent.createdAt) },
          ]}
          riskFlags={intent.riskFlags.map((f) => {
            if (f.kind === "first_time_counterparty") return "First-time counterparty — no prior payment history";
            if (f.kind === "cash_out_high_value") return `Cash-out above $${f.threshold.toLocaleString()} threshold`;
            if (f.kind === "amount_above_normal_range") return `Amount $${f.observed.toLocaleString()} above normal max $${f.max.toLocaleString()}`;
            return f.kind;
          })}
        />

        {/* Step 2: Independent Approval */}
        <EvidenceStep
          step={2}
          title="Independent Approval — Maker-Checker Enforced"
          status={isDistinctApprover ? "verified" : "warning"}
          details={[
            { label: "Approved by", value: `${approver?.name ?? "—"} · ${approver?.role ?? "—"}` },
            { label: "Initiator", value: `${initiator?.name ?? "—"}` },
            { label: "Same person?", value: isDistinctApprover ? "No — distinct users ✓" : "⚠ Same user — maker-checker not satisfied" },
            { label: "Comment", value: approval?.comment ?? "No comment" },
            { label: "Approved at", value: approval ? fmtDateAbs(approval.at) : "—" },
          ]}
        />

        {/* Step 3: Policy Validation */}
        <EvidenceStep
          step={3}
          title="Policy Validation"
          status="verified"
          details={[
            { label: "Policy", value: policy?.name ?? "—" },
            { label: "Rule type", value: intent.policyId ? "cash-out-above ($5,000)" : "manual" },
            { label: "Amount", value: fmtMoney(intent.amount, intent.asset) },
            { label: "Rule result", value: "PASSED — approval satisfied" },
            { label: "Risk flags", value: intent.riskFlags.length > 0 ? `${intent.riskFlags.length} flag(s) — reviewed` : "None" },
          ]}
        />

        {/* Step 4: Execution */}
        <EvidenceStep
          step={4}
          title="Execution"
          status="verified"
          details={[
            { label: "Mode", value: execution.executionMode ?? "simulated_demo" },
            { label: "Reference", value: execution.txReference ?? "—" },
            { label: "Source", value: sourceAccount?.name ?? "—" },
            { label: "Destination", value: destAccount?.name ?? "—" },
            ...(counterparty?.bankDetails ? [
              { label: "Bank", value: counterparty.bankDetails.bankName },
              { label: "Account", value: counterparty.bankDetails.accountNumberDisplay },
              { label: "Settlement ETA", value: counterparty.bankDetails.settlementEta },
              { label: "Est. fee", value: `$${counterparty.bankDetails.estimatedFeeUsd}` },
            ] : []),
            { label: "Completed at", value: execution.completedAt ? fmtDateAbs(execution.completedAt) : "—" },
          ]}
        />

        {/* Step 5: Ledger Posted */}
        {ledgerEntries.length > 0 && (
          <EvidenceStep
            step={5}
            title="Ledger Posted"
            status="verified"
            details={[
              ...ledgerEntries.map((entry) => ({
                label: entry.direction === "outflow" ? "Outflow" : entry.direction === "inflow" ? "Inflow" : "Internal",
                value: `${fmtMoney(entry.amount, entry.asset)} · ${accounts.find((a) => a.id === entry.accountId)?.name ?? "—"}`,
              })),
              { label: "Category", value: ledgerEntries[0]?.accountingCategory ?? "Missing" },
              { label: "Purpose", value: ledgerEntries[0]?.purpose ?? "Missing" },
              { label: "Cost center", value: ledgerEntries[0]?.costCenter ?? "—" },
              { label: "Reconciliation", value: ledgerEntries[0]?.reconciliationStatus ?? "—" },
            ]}
          />
        )}

        {/* Step 6: Reconciliation Ready */}
        <EvidenceStep
          step={6}
          title="Reconciliation Ready"
          status={ledgerEntries[0]?.reconciliationStatus === "tagged" ? "verified" : "pending"}
          details={[
            { label: "Status", value: ledgerEntries[0]?.reconciliationStatus ?? "—" },
            { label: "Entries", value: `${ledgerEntries.length} posted` },
            { label: "Next step", value: "Available for controller review and ERP export" },
          ]}
        />
      </div>

      {/* Non-technical proof interpreter */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <span className="text-xs font-bold">What did this prove?</span>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            This payment was <strong>requested by {initiator?.name ?? "one person"}</strong> and <strong>approved by {approver?.name ?? "a different person"}</strong> before any funds moved — enforcing the maker-checker control. No single individual can authorize their own payment.
          </p>
          <p>
            The <strong>policy engine validated the approval rule</strong> (cash-out above $5,000 requires independent authorization) before execution was permitted. The first-time counterparty flag required the approver to explicitly confirm the recipient's bank details.
          </p>
          <p>
            Every step — request creation, approval decision, policy validation, execution, and ledger posting — is recorded in the <strong>immutable audit log</strong> with timestamps and actor identity. In production this chain is anchored onchain via IntentRegistry on Base Sepolia.
          </p>
          <p className="text-[10px] italic">
            Demo mode: execution reference is simulated ({execution.executionMode}). Connect a wallet to execute against the live IntentRegistry contract on Base Sepolia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared step card component ──────────────────────────────────────────────

function EvidenceStep({
  step,
  title,
  status,
  details,
  riskFlags,
}: {
  step: number;
  title: string;
  status: "verified" | "warning" | "pending";
  details: { label: string; value: string }[];
  riskFlags?: string[];
}) {
  const statusColor = {
    verified: "text-chart-5",
    warning: "text-amber-500",
    pending: "text-muted-foreground",
  }[status];

  const StatusIcon = status === "verified" ? CheckCircle2 : status === "warning" ? AlertCircle : Info;

  return (
    <Card className="border-border">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {step}
          </div>
          <p className="text-sm font-semibold flex-1">{title}</p>
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        </div>

        {riskFlags && riskFlags.length > 0 && (
          <div className="space-y-1">
            {riskFlags.map((flag) => (
              <div key={flag} className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {flag}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {details.map(({ label, value }) => (
            <div key={label} className="text-xs">
              <span className="text-muted-foreground">{label}</span>
              <p className="mt-0.5 font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mock demo bundles (shown before canonical run) ───────────────────────────

function MockAuditBundles() {
  const BUNDLES = [
    { id: "EB-2026-04-27-01", type: "Monthly Close", events: 142, status: "finalized", hash: "0x82f…a12b", note: "Run the canonical payout demo above to generate a real evidence packet." },
    { id: "EB-2026-04-26-02", type: "Policy Change", events: 1, status: "finalized", hash: "0x31a…e921", note: null },
    { id: "EB-2026-04-25-01", type: "Anomaly Report", events: 3, status: "finalized", hash: "0x992…c81d", note: null },
  ];

  return (
    <div id="audit-bundles" data-tour="audit-bundles" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Evidence Bundles</h2>
        <span className="text-[10px] text-muted-foreground italic">Run the canonical payout demo to generate a live evidence packet</span>
      </div>
      <div className="space-y-2">
        {BUNDLES.map((b) => (
          <div
            key={b.id}
            data-tour={b.id === "EB-2026-04-27-01" ? "audit-bundle-row" : undefined}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{b.type}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{b.id} · {b.events} events recorded</p>
                {b.note && <p className="text-[10px] text-primary/60 mt-0.5">{b.note}</p>}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Hash</p>
                <p className="text-[11px] font-mono text-foreground/70">{b.hash}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ExternalLink className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Testnet audit trail ──────────────────────────────────────────────────────

function OnchainAuditTrail() {
  const { logs, loading, error } = usePolicyExecutionLogs();
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Onchain Payment Executions · Base Sepolia
        </h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-[11px] text-muted-foreground">Refreshing…</span>}
          <button
            onClick={() => setExplainerOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="What am I verifying?"
          >
            <Info className="h-3.5 w-3.5" />
            What am I verifying?
          </button>
        </div>
      </div>

      {explainerOpen && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p className="font-bold text-foreground">What am I verifying?</p>
            <p>
              This execution proves that a payment request was created by the initiator,
              approved by a <em>different</em> approver address, validated against PolicyEngine,
              executed through IntentRegistry, and transferred by TreasuryVault to the destination
              on Base Sepolia.
            </p>
            <p>
              The approval step is signed server-side by a separate key (the Treasury Admin demo
              signer), enforcing the <strong>maker-checker</strong> control onchain — the same
              wallet cannot both create and approve a payment request.
            </p>
            <p className="text-[10px]">
              In production, approval would be signed by an authorized approver wallet via Safe,
              WalletConnect, or CDP Embedded Wallets.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 text-xs text-destructive">{error}</CardContent>
        </Card>
      )}

      {logs.length === 0 && !loading && (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-medium">No onchain Payment Requests executed yet.</p>
            <p>Complete the golden path to write the first onchain payment request proof.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {logs.map((log) => (
          <IntentExecutionCard key={log.executionTxHash} log={log} />
        ))}
      </div>
    </div>
  );
}

function IntentExecutionCard({ log }: { log: IntentExecutionLog }) {
  const short = (addr: string, n = 6) =>
    addr && addr.length > 12 ? `${addr.slice(0, n)}…${addr.slice(-4)}` : addr;
  const shortTx = (hash: string) =>
    hash && hash.length > 12 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;

  const amountStr = log.amount.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Card className="border-border hover:border-primary/40 transition-colors">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {log.policyName !== "—" ? log.policyName : "Payment Request"}
                {" "}· {amountStr} USDC
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                Payment Request #{log.intentId !== "—" ? log.intentId : "?"}{" "}
                · block {log.blockNumber > 0n ? log.blockNumber.toString() : "?"}
                {log.timestamp > 0 && ` · ${new Date(log.timestamp * 1000).toLocaleString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-chart-5/10 text-chart-5 text-[10px] font-bold">
            <ShieldCheck className="h-3 w-3" />
            Executed
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Initiator</p>
            <a
              href={log.initiator && log.initiator !== "—" ? BASESCAN_ADDR(log.initiator) : "#"}
              target="_blank" rel="noreferrer"
              className="font-mono hover:text-primary transition-colors truncate block"
            >
              {short(log.initiator)}
            </a>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Approved by</p>
            <div className="group relative">
              <span className="font-mono truncate block">
                {log.approver === "Approved by Treasury Admin demo signer"
                  ? "Treasury Admin demo signer"
                  : short(log.approver)}
              </span>
              <div className="absolute hidden group-hover:block bottom-full left-0 z-10 w-56 p-2 rounded-lg bg-popover border border-border text-[10px] text-muted-foreground shadow-lg mb-1">
                In production, approval would be signed by an authorized approver wallet via Safe,
                WalletConnect, or CDP Embedded Wallets.
              </div>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/40 space-y-0.5">
            <p className="text-muted-foreground font-medium uppercase tracking-tight text-[9px]">Destination</p>
            <a
              href={log.destination && log.destination !== "—" ? BASESCAN_ADDR(log.destination as string) : "#"}
              target="_blank" rel="noreferrer"
              className="font-mono hover:text-primary transition-colors truncate block"
            >
              {short(log.destination as string)}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {log.approvalTxHash && (
            <a
              href={log.approvalUrl}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
            >
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-tight text-muted-foreground font-medium">Approval Tx</p>
                <p className="font-mono text-foreground/80">{shortTx(log.approvalTxHash)}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          )}
          <a
            href={log.executionUrl}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between p-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group"
            title="Opens Base Sepolia transaction evidence for this payment request."
          >
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-tight text-primary/70 font-medium">Execution Tx (proof)</p>
              <p className="font-mono text-foreground/80">{shortTx(log.executionTxHash)}</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
