import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Check, X, MessageSquareWarning } from "lucide-react";

interface Props {
  canDecide: boolean;
  reasonDisabled?: string;
  onDecision: (d: { decision: "approve" | "reject" | "request_changes"; comment?: string }) => void;
}

export function ApprovalDecisionBar({ canDecide, reasonDisabled, onDecision }: Props) {
  const [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
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
              disabled={!canDecide}
              onClick={() => onDecision({ decision: "approve", comment: comment || undefined })}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
