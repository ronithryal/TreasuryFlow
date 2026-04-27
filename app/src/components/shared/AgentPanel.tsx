import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

/**
 * Streamed/buffered AI surface used in three places:
 *   - Intent rationale explainer (Approvals/Activity drawer)
 *   - Reconciliation tag suggester
 *   - Policy authoring assistant (PolicyEditor)
 *
 * Caller passes a request function that returns a Promise<text>. Token streaming
 * is supported via onToken; falls back gracefully when the adapter buffers.
 */
export function AgentPanel({
  title,
  description,
  request,
  cta = "Ask the agent",
  autoRun = false,
  className,
}: {
  title: string;
  description?: string;
  request: () => Promise<string>;
  cta?: string;
  autoRun?: boolean;
  className?: string;
}) {
  const [running, setRunning] = useState(false);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setText("");
    try {
      const result = await request();
      setText(result);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (autoRun) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </div>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : text ? <RefreshCw className="h-3.5 w-3.5" /> : null}
          {running ? "Thinking…" : text ? "Re-run" : cta}
        </Button>
      </div>
      {(text || error || running) && (
        <div className="border-t border-card-border bg-accent/30 px-4 py-3 text-sm leading-relaxed">
          {error ? (
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : running && !text ? (
            <div className="flex flex-col gap-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-foreground/90">{text}</div>
          )}
        </div>
      )}
    </Card>
  );
}
