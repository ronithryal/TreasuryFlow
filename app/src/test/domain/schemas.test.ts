import { describe, it, expect } from "vitest";
import {
  validateActionProposal,
  validateExecutionPlan,
} from "@/domain/schemas";

// ---------- Fixtures ----------

const VALID_PROPOSAL = {
  id: "prop_001",
  version: 1,
  createdAt: "2026-05-02T10:00:00.000Z",
  createdBy: "hermes",
  type: "REBALANCE",
  status: "UNDER_REVIEW",
  portfolioId: "portfolio_main",
  mode: "DEMO",
  inputs: {
    source: {
      walletIds: ["wallet_a"],
      currencies: ["USDC"],
      chains: ["base-sepolia"],
    },
    target: {
      targetAllocations: [
        { asset: "USDC", targetPct: 80, minPct: 70, maxPct: 90 },
        { asset: "ETH", targetPct: 20 },
      ],
      minLiquidityBufferUsd: 50000,
    },
    constraints: {
      maxSlippageBps: 50,
      maxNotionalUsd: 100000,
      allowedVenues: ["uniswap", "curve"],
    },
  },
  expectedImpact: {
    beforeExposure: { USDC: 0.6, ETH: 0.4 },
    afterExposure: { USDC: 0.8, ETH: 0.2 },
    estimatedPnlUsd: -120,
    feeEstimateUsd: 30,
    riskScore: 0.2,
  },
  policyChecks: [
    { policyId: "pol_concentration", result: "PASS" },
    { policyId: "pol_liquidity", result: "WARN", messages: ["Buffer below target by 5%"] },
  ],
  rationale: {
    summary: "Portfolio is overweight ETH; rebalancing to policy targets.",
    details: "Current ETH exposure is 40%, target is 20%.",
    marketContextId: "ctx_20260502",
  },
  linkedExecutionPlanId: "plan_001",
  metadata: { source: "scheduled-review" },
};

const VALID_PLAN = {
  id: "plan_001",
  version: 1,
  createdAt: "2026-05-02T10:05:00.000Z",
  createdBy: "hermes",
  proposalId: "prop_001",
  status: "PENDING_APPROVAL",
  mode: "DEMO",
  steps: [
    {
      id: "step_0",
      index: 0,
      type: "QUOTE",
      status: "PENDING",
      tool: { kind: "INTERNAL_API", name: "get_swap_quote" },
      params: { tokenIn: "ETH", tokenOut: "USDC", amountIn: "5000000000000000000" },
      expectedOutcome: { maxSlippageBps: 50, maxFeeUsd: 20 },
    },
    {
      id: "step_1",
      index: 1,
      dependsOn: ["step_0"],
      type: "SWAP",
      status: "PENDING",
      tool: { kind: "OPENCLAW_SKILL", name: "contract_swap" },
      params: {
        chain: "base-sepolia",
        routerAddress: "0xabc",
        walletId: "wallet_a",
        tokenIn: "ETH",
        tokenOut: "USDC",
        amountIn: "5000000000000000000",
        minAmountOut: "9900000000",
        deadline: 1746180000,
      },
      expectedOutcome: { minReceiveAmount: "9900000000", maxSlippageBps: 50 },
    },
    {
      id: "step_2",
      index: 2,
      dependsOn: ["step_1"],
      type: "LEDGER_WRITE",
      status: "PENDING",
      tool: { kind: "INTERNAL_API", name: "write_ledger_entry" },
      params: { description: "ETH→USDC rebalance" },
    },
  ],
  summary: {
    estimatedFeeUsd: 30,
    estimatedPnlUsd: -120,
    chainsInvolved: ["base-sepolia"],
    walletsInvolved: ["wallet_a"],
  },
  metadata: { generatedBy: "hermes-rebalance-v1" },
};

// =============================================================================
// ActionProposal validation
// =============================================================================

describe("validateActionProposal — valid inputs", () => {
  it("accepts a full valid proposal", () => {
    const result = validateActionProposal(VALID_PROPOSAL);
    expect(result.success).toBe(true);
  });

  it("applies default priority=MEDIUM when omitted", () => {
    const { priority: _omit, ...withoutPriority } = VALID_PROPOSAL as Record<string, unknown>;
    const result = validateActionProposal(withoutPriority);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe("MEDIUM");
  });

  it("applies default mode=DEMO when omitted", () => {
    const { mode: _omit, ...withoutMode } = VALID_PROPOSAL as Record<string, unknown>;
    const result = validateActionProposal(withoutMode);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("DEMO");
  });

  it("accepts a minimal proposal (only required fields)", () => {
    const minimal = {
      id: "prop_min",
      version: 1,
      createdAt: "2026-05-02T10:00:00.000Z",
      createdBy: "user:alice",
      type: "PAYMENT",
      status: "DRAFT",
      portfolioId: "portfolio_main",
      inputs: { source: {}, target: {} },
      expectedImpact: {},
      rationale: { summary: "Pay vendor ABC." },
    };
    expect(validateActionProposal(minimal).success).toBe(true);
  });

  it("accepts all proposal types", () => {
    const types = ["REBALANCE", "FX_HEDGE", "FUNDING", "PAYMENT", "YIELD_SHIFT"] as const;
    for (const type of types) {
      const result = validateActionProposal({ ...VALID_PROPOSAL, type });
      expect(result.success, `type=${type} should be valid`).toBe(true);
    }
  });

  it("accepts all proposal statuses", () => {
    const statuses = [
      "DRAFT",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
      "EXECUTED_PARTIAL",
      "EXECUTED_FULL",
    ] as const;
    for (const status of statuses) {
      const result = validateActionProposal({ ...VALID_PROPOSAL, status });
      expect(result.success, `status=${status} should be valid`).toBe(true);
    }
  });

  it("accepts riskScore at boundary values 0 and 1", () => {
    const at0 = validateActionProposal({
      ...VALID_PROPOSAL,
      expectedImpact: { ...VALID_PROPOSAL.expectedImpact, riskScore: 0 },
    });
    const at1 = validateActionProposal({
      ...VALID_PROPOSAL,
      expectedImpact: { ...VALID_PROPOSAL.expectedImpact, riskScore: 1 },
    });
    expect(at0.success).toBe(true);
    expect(at1.success).toBe(true);
  });

  it("passes through extra keys in source/target via passthrough", () => {
    const withExtra = {
      ...VALID_PROPOSAL,
      inputs: {
        ...VALID_PROPOSAL.inputs,
        source: { ...VALID_PROPOSAL.inputs.source, customField: "value" },
      },
    };
    expect(validateActionProposal(withExtra).success).toBe(true);
  });
});

describe("validateActionProposal — invalid inputs", () => {
  it("rejects null", () => {
    const result = validateActionProposal(null);
    expect(result.success).toBe(false);
  });

  it("rejects a plain string", () => {
    expect(validateActionProposal("not an object").success).toBe(false);
  });

  it("rejects missing required id", () => {
    const { id: _omit, ...noId } = VALID_PROPOSAL as Record<string, unknown>;
    const result = validateActionProposal(noId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "id")).toBe(true);
    }
  });

  it("rejects version < 1", () => {
    const result = validateActionProposal({ ...VALID_PROPOSAL, version: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "version")).toBe(true);
    }
  });

  it("rejects invalid ISO datetime for createdAt", () => {
    const result = validateActionProposal({ ...VALID_PROPOSAL, createdAt: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "createdAt")).toBe(true);
    }
  });

  it("rejects unknown proposal type", () => {
    const result = validateActionProposal({ ...VALID_PROPOSAL, type: "LIQUIDATE" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "type")).toBe(true);
    }
  });

  it("rejects unknown status", () => {
    const result = validateActionProposal({ ...VALID_PROPOSAL, status: "PENDING" });
    expect(result.success).toBe(false);
  });

  it("rejects riskScore > 1", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      expectedImpact: { ...VALID_PROPOSAL.expectedImpact, riskScore: 1.5 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("riskScore"))).toBe(true);
    }
  });

  it("rejects riskScore < 0", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      expectedImpact: { ...VALID_PROPOSAL.expectedImpact, riskScore: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty rationale summary", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      rationale: { summary: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("summary"))).toBe(true);
    }
  });

  it("rejects missing inputs.source", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      inputs: { target: {} },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing inputs.target", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      inputs: { source: {} },
    });
    expect(result.success).toBe(false);
  });

  it("rejects policyCheck with invalid result enum", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      policyChecks: [{ policyId: "pol_x", result: "OK" }],
    });
    expect(result.success).toBe(false);
  });

  it("returns structured errors with path info", () => {
    const result = validateActionProposal({
      ...VALID_PROPOSAL,
      version: "not-a-number",
      rationale: { summary: "" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("version");
      expect(paths.some((p) => p.includes("summary"))).toBe(true);
    }
  });
});

// =============================================================================
// ExecutionPlan validation
// =============================================================================

describe("validateExecutionPlan — valid inputs", () => {
  it("accepts a full valid plan", () => {
    expect(validateExecutionPlan(VALID_PLAN).success).toBe(true);
  });

  it("applies default mode=DEMO when omitted", () => {
    const { mode: _omit, ...withoutMode } = VALID_PLAN as Record<string, unknown>;
    const result = validateExecutionPlan(withoutMode);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe("DEMO");
  });

  it("accepts an empty steps array", () => {
    const result = validateExecutionPlan({ ...VALID_PLAN, steps: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a plan without optional summary and metadata", () => {
    const { summary: _s, metadata: _m, ...minimal } = VALID_PLAN as Record<string, unknown>;
    expect(validateExecutionPlan(minimal).success).toBe(true);
  });

  it("accepts all plan statuses", () => {
    const statuses = [
      "DRAFT",
      "PENDING_APPROVAL",
      "APPROVED",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ] as const;
    for (const status of statuses) {
      expect(validateExecutionPlan({ ...VALID_PLAN, status }).success, `status=${status}`).toBe(true);
    }
  });

  it("accepts all step types", () => {
    const types = ["QUOTE", "SWAP", "TRANSFER", "ONRAMP", "OFFRAMP", "APPROVAL", "LEDGER_WRITE", "NOOP"] as const;
    for (const type of types) {
      const plan = {
        ...VALID_PLAN,
        steps: [{ ...VALID_PLAN.steps[0], type }],
      };
      expect(validateExecutionPlan(plan).success, `step.type=${type}`).toBe(true);
    }
  });

  it("accepts all step statuses", () => {
    const statuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"] as const;
    for (const status of statuses) {
      const plan = {
        ...VALID_PLAN,
        steps: [{ ...VALID_PLAN.steps[0], status }],
      };
      expect(validateExecutionPlan(plan).success, `step.status=${status}`).toBe(true);
    }
  });

  it("accepts both tool kinds", () => {
    for (const kind of ["OPENCLAW_SKILL", "INTERNAL_API"] as const) {
      const plan = {
        ...VALID_PLAN,
        steps: [{ ...VALID_PLAN.steps[0], tool: { kind, name: "some_tool" } }],
      };
      expect(validateExecutionPlan(plan).success, `tool.kind=${kind}`).toBe(true);
    }
  });

  it("accepts a step with a populated result", () => {
    const plan = {
      ...VALID_PLAN,
      steps: [
        {
          ...VALID_PLAN.steps[1],
          status: "COMPLETED",
          result: { raw: { amountOut: "9950000000" }, txHash: "0xabc123", quoteId: "q_001" },
        },
      ],
    };
    expect(validateExecutionPlan(plan).success).toBe(true);
  });

  it("accepts a step with a populated error", () => {
    const plan = {
      ...VALID_PLAN,
      steps: [
        {
          ...VALID_PLAN.steps[0],
          status: "FAILED",
          error: { message: "Slippage too high", code: "SLIPPAGE_EXCEEDED", retryable: true },
        },
      ],
    };
    expect(validateExecutionPlan(plan).success).toBe(true);
  });

  it("accepts dependsOn as an array of step ids", () => {
    const plan = {
      ...VALID_PLAN,
      steps: [
        VALID_PLAN.steps[0],
        { ...VALID_PLAN.steps[1], dependsOn: ["step_0"] },
      ],
    };
    expect(validateExecutionPlan(plan).success).toBe(true);
  });
});

describe("validateExecutionPlan — invalid inputs", () => {
  it("rejects null", () => {
    expect(validateExecutionPlan(null).success).toBe(false);
  });

  it("rejects missing id", () => {
    const { id: _omit, ...noId } = VALID_PLAN as Record<string, unknown>;
    expect(validateExecutionPlan(noId).success).toBe(false);
  });

  it("rejects missing proposalId", () => {
    const { proposalId: _omit, ...noProp } = VALID_PLAN as Record<string, unknown>;
    expect(validateExecutionPlan(noProp).success).toBe(false);
  });

  it("rejects version < 1", () => {
    const result = validateExecutionPlan({ ...VALID_PLAN, version: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "version")).toBe(true);
    }
  });

  it("rejects invalid createdAt", () => {
    const result = validateExecutionPlan({ ...VALID_PLAN, createdAt: "2026/05/02" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path === "createdAt")).toBe(true);
    }
  });

  it("rejects unknown plan status", () => {
    expect(validateExecutionPlan({ ...VALID_PLAN, status: "PAUSED" }).success).toBe(false);
  });

  it("rejects unknown mode", () => {
    expect(validateExecutionPlan({ ...VALID_PLAN, mode: "SANDBOX" }).success).toBe(false);
  });

  it("rejects a step with missing id", () => {
    const { id: _omit, ...noId } = VALID_PLAN.steps[0] as Record<string, unknown>;
    expect(validateExecutionPlan({ ...VALID_PLAN, steps: [noId] }).success).toBe(false);
  });

  it("rejects a step with negative index", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      steps: [{ ...VALID_PLAN.steps[0], index: -1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("index"))).toBe(true);
    }
  });

  it("rejects a step with unknown type", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      steps: [{ ...VALID_PLAN.steps[0], type: "BURN" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("type"))).toBe(true);
    }
  });

  it("rejects a step with unknown tool kind", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      steps: [{ ...VALID_PLAN.steps[0], tool: { kind: "WEBHOOK", name: "foo" } }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("kind"))).toBe(true);
    }
  });

  it("rejects a step with empty tool name", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      steps: [{ ...VALID_PLAN.steps[0], tool: { kind: "INTERNAL_API", name: "" } }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes("name"))).toBe(true);
    }
  });

  it("rejects a step error object missing message", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      steps: [{ ...VALID_PLAN.steps[0], error: { code: "E001" } }],
    });
    expect(result.success).toBe(false);
  });

  it("returns structured errors with path info", () => {
    const result = validateExecutionPlan({
      ...VALID_PLAN,
      version: "bad",
      steps: [{ ...VALID_PLAN.steps[0], index: -5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain("version");
      expect(paths.some((p) => p.includes("index"))).toBe(true);
    }
  });
});
