import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Check, X, MessageSquareWarning, ExternalLink } from "lucide-react";
import { IS_TESTNET } from "@/web3/mode";
import { BASESCAN_TX } from "@/web3/testnet";
import type { Intent } from "@/types/domain";
import { useState } from "react";

interface Props {
  canDecide: boolean;
  reasonDisabled?: string;
  intent?: Intent;
  onDecision: (d: { decision: "approve" | "reject" | "request_changes"; comment?: string; txHash?: string }) => void;
}

/**
 * Shell component. Delegates to the testnet variant (wagmi hooks) or the mock
 * variant (pure UI) depending on build mode so that wagmi hooks are never
 * called outside a WagmiProvider.
 */
export function ApprovalDecisionBar(props: Props) {
  if (IS_TESTNET) return <TestnetDecisionBar {...props} />;
  return <MockDecisionBar {...props} />;
}

// ---- mock variant (no wagmi) ------------------------------------------------

function MockDecisionBar({ canDecide, reasonDisabled, onDecision }: Props) {
  const [comment, setComment] = useState("");
  return (
    <DecisionLayout
      comment={comment}
      setComment={setComment}
      canDecide={canDecide}
      reasonDisabled={reasonDisabled}
      isPending={false}
      txHash={undefined}
      onRequestChanges={() => onDecision({ decision: "request_changes", comment: comment || undefined })}
      onReject={() => onDecision({ decision: "reject", comment: comment || undefined })}
      onApprove={() => onDecision({ decision: "approve", comment: comment || undefined })}
      approveLabel="Approve"
    />
  );
}

// ---- testnet variant (wagmi hooks safe here) --------------------------------

import { useTestnetExecution } from "@/web3/useTestnetExecution";

function TestnetDecisionBar({ canDecide, reasonDisabled, intent, onDecision }: Props) {
  const [comment, setComment] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const { executeIntentOnchain, isPending } = useTestnetExecution();

  const handleApprove = async () => {
    setError(undefined);
    if (intent) {
      try {
        const hash = await executeIntentOnchain(intent, intent.type ?? "execute");
        setTxHash(hash);
        onDecision({ decision: "approve", comment: comment || undefined, txHash: hash });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    onDecision({ decision: "approve", comment: comment || undefined });
  };

  return (
    <>
      {error ? <p className="text-xs text-destructive mb-2">{error}</p> : null}
      <DecisionLayout
        comment={comment}
        setComment={setComment}
        canDecide={canDecide}
        reasonDisabled={reasonDisabled}
        isPending={isPending}
        txHash={txHash}
        onRequestChanges={() => onDecision({ decision: "request_changes", comment: comment || undefined })}
        onReject={() => onDecision({ decision: "reject", comment: comment || undefined })}
        onApprove={handleApprove}
        approveLabel={isPending ? "Confirm in Wallet…" : "Approve Onchain"}
      />
    </>
  );
}

// ---- shared layout ----------------------------------------------------------

interface LayoutProps {
  comment: string;
  setComment: (v: string) => void;
  canDecide: boolean;
  reasonDisabled?: string;
  isPending: boolean;
  txHash?: string;
  onRequestChanges: () => void;
  onReject: () => void;
  onApprove: () => void;
  approveLabel: string;
}

function DecisionLayout({
  comment, setComment, canDecide, reasonDisabled, isPending, txHash,
  onRequestChanges, onReject, onApprove, approveLabel,
}: LayoutProps) {
  return (
    <div className="space-y-3" data-tour="approvals-decision-bar">
      <Textarea
        placeholder="Optional comment (visible to other approvers and on the audit trail)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={!canDecide}
      />
      {txHash ? (
        <div className="rounded-lg border border-chart-5/30 bg-chart-5/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-chart-5">
            <Check className="h-3.5 w-3.5" />
            Transaction confirmed on Base Sepolia
          </div>
          <div className="font-mono text-[11px] text-muted-foreground break-all">{txHash}</div>
          <a
            href={BASESCAN_TX(txHash)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            See Onchain Tx — BaseScan
          </a>
        </div>
      ) : null}
      <TooltipProvider>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {!canDecide && reasonDisabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">{reasonDisabled}</span>
              </TooltipTrigger>
              <TooltipContent>Maker-checker: initiator cannot approve their own intent.</TooltipContent>
            </Tooltip>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!canDecide || isPending} onClick={onRequestChanges}>
              <MessageSquareWarning className="h-4 w-4" />
              Request changes
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={!canDecide || isPending}
              onClick={onReject}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button size="sm" disabled={!canDecide || isPending} onClick={onApprove}>
              <Check className="h-4 w-4" />
              {approveLabel}
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
