import { Intent, LedgerEntry } from "@/types/domain";

export function scoreAnomaly(intent: Intent, history: LedgerEntry[]): { score: number, flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  const cpHistory = history.filter(e => e.counterpartyId === intent.counterpartyId);
  
  const avgAmount = cpHistory.reduce((sum, e) => sum + e.amount, 0) / (cpHistory.length || 1);
  if (cpHistory.length > 0 && intent.amount > avgAmount * 2) {
    score += 30;
    flags.push("High value for counterparty");
  }

  const hour = new Date().getHours();
  if (hour > 18 || hour < 6) {
    score += 20;
    flags.push("Outside business hours");
  }

  if (cpHistory.length === 0) {
    score += 25;
    flags.push("First transaction with counterparty");
  }

  const lastHourCount = cpHistory.filter(e => Date.now() - new Date(e.effectiveAt).getTime() < 3600000).length;
  if (lastHourCount >= 3) {
    score += 25;
    flags.push("Rapid sequential transfers");
  }

  // Check balance drop (simplified)
  if (intent.amount > 100000) {
    score += 30;
    flags.push("Large balance drop");
  }

  return { score, flags };
}
