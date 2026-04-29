import { useStore } from "@/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, RotateCcw } from "lucide-react";

// Show internal dev settings only in local dev or when explicitly enabled.
const SHOW_DEV_SETTINGS =
  import.meta.env.DEV ||
  import.meta.env.VITE_SHOW_DEV_SETTINGS === "true";

export function Settings() {
  const { ui, setForceMockAi, setDarkMode, resetToSeed, users, currentUserId } = useStore((s) => ({
    ui: s.ui,
    setForceMockAi: s.setForceMockAi,
    setDarkMode: s.setDarkMode,
    resetToSeed: s.resetToSeed,
    users: s.users,
    currentUserId: s.currentUserId,
  }));
  const currentUser = users.find((u) => u.id === currentUserId);

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

      {/* Approval thresholds */}
      <Card>
        <CardHeader><CardTitle className="text-base">Approval Thresholds</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Auto-approve below</span><span className="font-mono font-medium">25,000 USDC</span></div>
          <div className="flex justify-between"><span>Require 1 approver above</span><span className="font-mono font-medium">25,000 USDC</span></div>
          <div className="flex justify-between"><span>Cash-out approval threshold</span><span className="font-mono font-medium">5,000 USDC</span></div>
          <div className="flex justify-between"><span>First-time counterparty</span><span className="font-mono font-medium">Always require</span></div>
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
        <CardHeader><CardTitle className="text-base">Funding Rails</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Base / USDC</p>
              <p className="text-xs text-muted-foreground">Digital dollar rails on Base</p>
            </div>
            <div className="flex items-center gap-2 text-chart-5"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Active</span></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">Bank cash-out <Badge variant="secondary" className="text-[10px]">Beta</Badge></p>
              <p className="text-xs text-muted-foreground">Partner-powered ACH / wire offramp</p>
            </div>
            <div className="flex items-center gap-2 text-chart-5"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Active</span></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                Bank funding (fiat → digital dollar)
                <Badge variant="muted" className="text-[10px]">Coming soon</Badge>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bank funding and fiat-to-digital-dollar conversion will be offered via compliant partner-powered rails.
                Identity verification may be handled by regulated providers where required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI settings — only visible to developers */}
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
                <p className="text-xs text-muted-foreground">Disable real API calls — use plausible mock responses. No key required.</p>
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
            <p className="text-xs text-muted-foreground">Returns all accounts, policies, payment requests, and ledger to the seed state.</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetToSeed}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
