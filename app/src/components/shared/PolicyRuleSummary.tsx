import type { Policy } from "@/types/domain";
import { useStore } from "@/store";
import { fmtAmountOnly } from "@/lib/format";

export function policyRuleText(policy: Policy, accounts: { id: string; name: string }[]): string {
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const sources = policy.sourceAccountIds.map(name);
  const dests = policy.destinationAccountIds.map(name);
  const c = policy.conditions;
  switch (policy.type) {
    case "sweep":
      if (c.kind === "balance_above") {
        return `When ${sources.join(", ")} exceeds $${fmtAmountOnly(c.thresholdUsd, { compact: true })}, move excess USDC to ${dests.join(", ")} while retaining $${fmtAmountOnly(c.keepMinUsd, { compact: true })}.`;
      }
      return `Sweep policy from ${sources.join(", ")} to ${dests.join(", ")}.`;
    case "rebalance":
      if (c.kind === "balance_below") {
        return `Keep at least $${fmtAmountOnly(c.minimumUsd, { compact: true })} in ${dests.join(", ")}; refill from ${sources.join(", ")}.`;
      }
      return `Rebalance from ${sources.join(", ")} to ${dests.join(", ")}.`;
    case "payout_run":
      return `${policy.cadence ?? "On schedule"}, prepare contractor and vendor payouts from ${sources.join(", ")} and hold for approval.`;
    case "deposit_routing": {
      const splits = policy.splits ?? [];
      const split =
        splits.length > 0
          ? splits.map((s) => `${Math.round(s.ratio * 100)}% to ${name(s.destinationAccountId)}`).join(", ")
          : `100% to ${dests[0] ?? "operations"}`;
      return `When customer receipts land in ${sources.join(", ")}, forward ${split}.`;
    }
    case "cash_out":
      return `When a counterparty prefers bank settlement, route approved payout from ${sources.join(", ")} through partner cash-out flow.`;
    default:
      return policy.description;
  }
}

export function PolicyRuleSummary({ policy }: { policy: Policy }) {
  const accounts = useStore((s) => s.accounts);
  return <p className="text-sm text-muted-foreground">{policyRuleText(policy, accounts)}</p>;
}
