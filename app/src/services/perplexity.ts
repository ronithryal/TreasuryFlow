/// <reference types="vite/client" />
/**
 * Perplexity Agent API adapter.
 *
 * Two implementations behind a single interface:
 *   1. FetchAgentClient  — POSTs to /api/agent-proxy (Vite dev proxy injects
 *      the bearer token server-side). Set VITE_AGENT_PROXY_URL for deployed envs.
 *   2. MockAgentClient   — Returns deterministic plausible responses keyed on
 *      the prompt category. Used when no key is configured.
 *
 * Selection happens at app boot in createAgentClient(). A "Force mock AI"
 * toggle in Settings overrides to mock even when a key is present.
 */

export interface AgentClient {
  ask(opts: {
    instructions: string;
    input: string;
    signal?: AbortSignal;
  }): Promise<string>;
}

// ----- Fetch implementation -----

class FetchAgentClient implements AgentClient {
  private base: string;
  constructor(base: string) {
    this.base = base.replace(/\/$/, "");
  }
  async ask({ instructions, input, signal }: Parameters<AgentClient["ask"]>[0]): Promise<string> {
    const res = await fetch(`${this.base}/v1/agent`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "sonar-pro",
        instructions,
        input,
        temperature: 0.3,
        max_output_tokens: 512,
      }),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Agent API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    if (json.output_text) return json.output_text;
    // Fallback: parse first text block from output array
    const text = json.output?.[0]?.content?.[0]?.text;
    if (text) return text;
    throw new Error("No text in agent response");
  }
}

// ----- Mock implementation -----

type MockCategory = "explain" | "tags" | "policy" | "summary" | "default";

function detectCategory(instructions: string, input: string): MockCategory {
  const haystack = (instructions + " " + input).toLowerCase();
  if (haystack.includes("policy") && haystack.includes("json")) return "policy";
  if (haystack.includes("tag") || haystack.includes("accounting") || haystack.includes("purpose")) return "tags";
  if (haystack.includes("explain") || haystack.includes("why") || haystack.includes("rationale")) return "explain";
  if (haystack.includes("summary") || haystack.includes("close") || haystack.includes("month")) return "summary";
  return "default";
}

const MOCK_RESPONSES: Record<MockCategory, string> = {
  explain: "This intent was created by the reserve sweep policy when the Base Operating Wallet exceeded the $125,000 threshold. The policy is designed to keep operating balances lean by moving excess digital dollars to the reserve, where they earn no idle risk but remain available for rapid redeployment. The amount was calculated as balance minus the $25,000 floor, ensuring the operating wallet retains enough for daily disbursements.",
  tags: JSON.stringify({
    purpose: "Vendor payout — monthly software services",
    accountingCategory: "COGS - software",
    costCenter: "ENG-1",
    counterpartyName: "Initech Cloud Services",
    reasoning: "Amount and destination pattern match prior monthly software bills from this counterparty. Categorized under engineering cost center per historical tagging of similar entries.",
  }),
  policy: JSON.stringify({
    name: "Suggested Policy",
    type: "sweep",
    description: "Auto-generated from natural-language description.",
    sourceAccountIds: [],
    destinationAccountIds: [],
    conditions: { kind: "balance_above", thresholdUsd: 100000, keepMinUsd: 25000 },
    approvalRule: { kind: "auto-if-below", amountUsd: 50000 },
  }),
  summary: "Month-end close is complete. All 42 ledger entries have been tagged and reviewed. The reserve balance stands at $1.21M across Base and Ethereum, with $34.2k in the Base Payouts Wallet ahead of the Friday batch. Two failed executions from earlier in the month have been reconciled with notes. The ERP export is ready for upload.",
  default: "TreasuryFlow analyzed your request. All balances are within policy thresholds and no exceptions require immediate attention.",
};

class MockAgentClient implements AgentClient {
  async ask({ instructions, input }: Parameters<AgentClient["ask"]>[0]): Promise<string> {
    // Simulate ~600ms latency so the streaming skeleton is visible.
    await new Promise((r) => setTimeout(r, 600));
    const category = detectCategory(instructions, input);
    return MOCK_RESPONSES[category];
  }
}

// ----- Factory -----

export function createAgentClient(forceMock?: boolean): AgentClient {
  if (forceMock) return new MockAgentClient();
  const proxyUrl = import.meta.env.VITE_AGENT_PROXY_URL as string | undefined;
  const hasProxy = proxyUrl && proxyUrl.length > 0;
  // In dev mode, the Vite proxy answers at /api/agent-proxy (no env var needed if key is in .env).
  const isDev = import.meta.env.DEV as boolean;
  if (hasProxy) return new FetchAgentClient(proxyUrl);
  if (isDev) return new FetchAgentClient("/api/agent-proxy");
  // No proxy configured → fall back to mock.
  return new MockAgentClient();
}
