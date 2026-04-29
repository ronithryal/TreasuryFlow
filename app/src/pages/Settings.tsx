import { useState } from "react";
import { useStore } from "@/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, RotateCcw, Pencil, Save, X } from "lucide-react";
import type { PolicyId, ApprovalRule } from "@/types/domain";

const SHOW_DEV_SETTINGS =
  import.meta.env.DEV ||
  import.meta.env.VITE_SHOW_DEV_SETTINGS === "true";

// Policy IDs that drive the approval matrix display.
const POL_SWEEP_OPS_ID = "pol_sweep_ops" as PolicyId;
const POL_CASH_OUT_ID = "pol_cash_out" as PolicyId;
const POL_FRIDAY_PAYOUT_ID = "pol_friday_payout" as PolicyId;

export function Settings() {
  const { ui, setForceMockAi, setDarkMode, resetToSeed, users, currentUserId, policies, updatePolicyApprovalRule } = useStore((s) => ({
    ui: s.ui,
    setForceMockAi: s.setForceMockAi,
    setDarkMode: s.setDarkMode,
    resetToSeed: s.resetToSeed,
    users: s.users,
    currentUserId: s.currentUserId,
    policies: s.policies,
    updatePolicyApprovalRule: s.updatePolicyApprovalRule,
  }));
  const currentUser = users.find((u) => u.id === currentUserId);

  // Derive current threshold values from actual policy rules.
  const cashOutPolicy = policies.find((p) => p.id === POL_CASH_OUT_ID);
  const sweepOpsPolicy = policies.find((p) => p.id === POL_SWEEP_OPS_ID);
  const fridayPayoutPolicy = policies.find((p) => p.id === POL_FRIDAY_PAYOUT_ID);

  const cashOutThreshold =
    cashOutPolicy?.approvalRule.kind === "cash-out-above" ? cashOutPolicy.approvalRule.amountUsd : 5_000;
  const sweepAutoThreshold =
    sweepOpsPolicy?.approvalRule.kind === "auto-if-below" ? sweepOpsPolicy.approvalRule.amountUsd : 100_000;

  const [editing, setEditing] = useState(false);
  const [cashOutInput, setCashOutInput] = useState(cashOutThreshold.toString());
  const [sweepInput, setSweepInput] = useState(sweepAutoThreshold.toString());
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setCashOutInput(cashOutThreshold.toString());
    setSweepInput(sweepAutoThreshold.toString());
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveThresholds() {
    const newCashOut = parseFloat(cashOutInput);
    const newSweep = parseFloat(sweepInput);

    if (!isNaN(newCashOut) && newCashOut > 0 && cashOutPolicy) {
      const updatedRule: ApprovalRule = { kind: "cash-out-above", amountUsd: newCashOut, minApprovers: 1 };
      updatePolicyApprovalRule(POL_CASH_OUT_ID, updatedRule);
    }

    if (!isNaN(newSweep) && newSweep > 0 && sweepOpsPolicy) {
      const updatedRule: ApprovalRule = { kind: "auto-if-below", amountUsd: newSweep };
      updatePolicyApprovalRule(POL_SWEEP_OPS_ID, updatedRule);
    }

    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Roles & permissions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Roles & Permissions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{currentUser?.name}</span> · role:{" "}
            <span className="font-medium text-foreground">{currentUser?.role}</span>.
            Use the user switcher in the top-right to simulate maker-checker workflows.
          </p>
          <p className="text-xs text-muted-foreground">
            This demo uses simulated finance roles to show maker-checker controls. Login and user accounts are coming soon.
          </p>
          <div className="divide-y divide-card-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline">{u.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval matrix — editable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Approval Matrix</CardTitle>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-xs text-chart-5">
                  <CheckCircle2 className="h-3.5 w-3.5" />Saved
                </span>
              )}
              {!editing ? (
                <Button size="sm" variant="outline" onClick={startEdit} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1">
                    <X className="h-3.5 w-3.5" />Cancel
                  </Button>
                  <Button size="sm" onClick={saveThresholds} className="gap-1">
                    <Save className="h-3.5 w-3.5" />Save
                  </Button>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Controls are linked to active policies. Changes take effect on the next policy evaluation.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border divide-y divide-border">
            {/* Cash-out approval threshold */}
            <div className="flex items-center justify-between px-3 py-3 text-sm">
              <div>
                <p className="font-medium">Cash-out approval threshold</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bank cash-outs above this amount require an independent approver.
                  <br />
                  <span className="text-[10px] font-mono">Policy: {cashOutPolicy?.name ?? "Bank Cash-Out Routing"}</span>
                </p>
              </div>
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    value={cashOutInput}
                    onChange={(e) => setCashOutInput(e.target.value)}
                    className="w-28 h-8 text-right font-mono text-sm"
                    min={1}
                  />
                  <span className="text-xs text-muted-foreground">USDC</span>
                </div>
              ) : (
                <span className="font-mono font-medium tabular-nums">
                  ${cashOutThreshold.toLocaleString()} USDC
                </span>
              )}
            </div>

            {/* Auto-approve sweep threshold */}
            <div className="flex items-center justify-between px-3 py-3 text-sm">
              <div>
                <p className="font-medium">Auto-approve sweep below</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sweep intents below this amount proceed without manual approval.
                  <br />
                  <span className="text-[10px] font-mono">Policy: {sweepOpsPolicy?.name ?? "Sweep Base Operating to Reserve"}</span>
                </p>
              </div>
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    value={sweepInput}
                    onChange={(e) => setSweepInput(e.target.value)}
                    className="w-28 h-8 text-right font-mono text-sm"
                    min={1}
                  />
                  <span className="text-xs text-muted-foreground">USDC</span>
                </div>
              ) : (
                <span className="font-mono font-medium tabular-nums">
                  ${sweepAutoThreshold.toLocaleString()} USDC
                </span>
              )}
            </div>

            {/* First-time counterparty — static display of composite rule */}
            <div className="flex items-center justify-between px-3 py-3 text-sm">
              <div>
                <p className="font-medium">First-time counterparty</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Payments to new counterparties always require at least 1 approver.
                  <br />
                  <span className="text-[10px] font-mono">Policy: {fridayPayoutPolicy?.name ?? "Friday Vendor & Contractor Payouts"}</span>
                </p>
              </div>
              <span className="text-xs font-medium">Always require 1</span>
            </div>

            {/* Payout batch */}
            <div className="flex items-center justify-between px-3 py-3 text-sm">
              <div>
                <p className="font-medium">Scheduled payout batch</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vendor/contractor payout runs always require at least 1 approver before release.
                  <br />
                  <span className="text-[10px] font-mono">Policy: {fridayPayoutPolicy?.name ?? "Friday Vendor & Contractor Payouts"}</span>
                </p>
              </div>
              <span className="text-xs font-medium">Always require 1</span>
            </div>
          </div>

          {editing && (
            <p className="text-[11px] text-muted-foreground">
              Threshold changes are applied immediately to the linked policies. Historical intents are unaffected.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            "Pending approval older than 24h",
            "Policy breach detected",
            "Failed execution",
            "Month-end close due",
            "Balance below threshold",
          ].map((label) => (
            <div key={label} className="flex items-center justify-between">
              <Label className="text-sm font-normal normal-case tracking-normal text-foreground">{label}</Label>
              <Switch defaultChecked={label !== "Month-end close due"} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Funding Rails */}
      <Card>
        <CardHeader><CardTitle className="text-base">Settlement Rails</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Base / USDC</p>
              <p className="text-xs text-muted-foreground">Digital dollar rails on Base — instant, programmable settlement</p>
            </div>
            <div className="flex items-center gap-2 text-chart-5"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Active</span></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">ACH / Wire cash-out <Badge variant="secondary" className="text-[10px]">Beta</Badge></p>
              <p className="text-xs text-muted-foreground">Partner-powered ACH and domestic wire settlement. 1–3 business days, fee varies by rail.</p>
            </div>
            <div className="flex items-center gap-2 text-chart-5"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Active</span></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                Bank funding (fiat → USDC)
                <Badge variant="muted" className="text-[10px]">Coming soon</Badge>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Fiat-to-USDC conversion via compliant partner rails. Identity verification required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI settings */}
      {SHOW_DEV_SETTINGS && (
        <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              AI Settings
              <Badge variant="secondary" className="text-[10px] font-mono">DEV ONLY</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-normal normal-case tracking-normal text-foreground">Force mock AI</Label>
                <p className="text-xs text-muted-foreground">Disable real API calls — use deterministic fallback responses. No key required.</p>
              </div>
              <Switch checked={ui.forceMockAi} onCheckedChange={setForceMockAi} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-normal normal-case tracking-normal text-foreground">Dark mode</Label>
            </div>
            <Switch checked={ui.darkMode} onCheckedChange={setDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Export preferences */}
      <Card>
        <CardHeader><CardTitle className="text-base">Export Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Default preset</span><span className="font-medium">ERP-ready (CSV)</span></div>
          <div className="flex justify-between"><span>Date format</span><span className="font-medium">ISO 8601</span></div>
          <div className="flex justify-between"><span>Currency</span><span className="font-medium">USD / USDC</span></div>
        </CardContent>
      </Card>

      {/* Demo reset */}
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">Reset demo data</p>
            <p className="text-xs text-muted-foreground">Returns all accounts, policies, payment requests, and ledger to the seed state. Also clears the canonical demo run.</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetToSeed}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
