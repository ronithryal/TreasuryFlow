import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Check, X, MessageSquareWarning } from "lucide-react";
import { useWriteContract } from "wagmi";

interface Props {
  canDecide: boolean;
  reasonDisabled?: string;
  onDecision: (d: { decision: "approve" | "reject" | "request_changes"; comment?: string }) => void;
}

export function ApprovalDecisionBar({ canDecide, reasonDisabled, onDecision }: Props) {
  const [comment, setComment] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();
  return (
    <div className="space-y-3" data-tour="approvals-decision-bar">
      <Textarea
        placeholder="Optional comment (visible to other approvers and on the audit trail)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={!canDecide}
      />
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
            <Button
              variant="outline"
              size="sm"
              disabled={!canDecide}
              onClick={() => onDecision({ decision: "request_changes", comment: comment || undefined })}
            >
              <MessageSquareWarning className="h-4 w-4" />
              Request changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canDecide}
              onClick={() => onDecision({ decision: "reject", comment: comment || undefined })}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              disabled={!canDecide || isPending}
              onClick={async () => {
                // In a real environment, this would build a Safe transaction
                // using @safe-global/protocol-kit and @safe-global/api-kit,
                // propose it to the Safe transaction service, and then ask
                // the user to sign it via Wagmi useSignMessage/useWriteContract.
                // 
                // Example Safe integration:
                // const safeProtocolKit = await Safe.init({ provider: ..., safeAddress: ... })
                // const safeTransaction = await safeProtocolKit.createTransaction({ transactions: [...] })
                // const signedSafeTx = await safeProtocolKit.signTransaction(safeTransaction)
                // await apiKit.proposeTransaction({ safeAddress, safeTransactionData: signedSafeTx.data, ... })
                
                try {
                  // Simulate an onchain interaction with Wagmi
                  if (writeContractAsync) {
                    await writeContractAsync({
                      abi: [{
                        type: 'function',
                        name: 'approve',
                        inputs: [
                          { name: 'spender', type: 'address' },
                          { name: 'amount', type: 'uint256' }
                        ],
                        outputs: [{ type: 'bool' }],
                        stateMutability: 'nonpayable'
                      }],
                      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
                      functionName: 'approve',
                      args: ['0x1111111111111111111111111111111111111111', BigInt(1000000)], // Mock spender
                    });
                  }
                  
                  // Once the transaction succeeds or is mocked, resolve the intent
                  onDecision({ decision: "approve", comment: comment || undefined });
                } catch (error) {
                  console.error("Transaction failed:", error);
                }
              }}
            >
              <Check className="h-4 w-4" />
              {isPending ? "Confirm in Wallet..." : "Approve Onchain"}
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
