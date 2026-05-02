/**
 * Server-side JSON Schema validators for ActionProposal and ExecutionPlan.
 *
 * Built with Zod — works in both the Vercel serverless runtime and the browser
 * (for client-side pre-validation). Each export follows the pattern:
 *   <Name>Schema  — the Zod schema object (for composition / type inference)
 *   validate<Name> — returns { success, data } | { success, errors }
 *
 * These validators are the single source of truth that all sessions 3–12 must
 * conform to when generating or consuming ActionProposal / ExecutionPlan JSON.
 */

import { z } from "zod";
import {
  ActionProposalTypes,
  ActionProposalStatuses,
  ProposalPriorities,
  TreasuryModes,
  ExecutionPlanStatuses,
  ExecutionStepTypes,
  ExecutionStepStatuses,
  ToolKinds,
} from "@/types/domain";

// ---------- Shared primitives ----------

const PolicyCheckResultSchema = z.object({
  policyId: z.string().min(1),
  result: z.enum(["PASS", "WARN", "FAIL"]),
  messages: z.array(z.string()).optional(),
});

// ---------- ActionProposal schema ----------

const ActionProposalSourceSchema = z
  .object({
    walletIds: z.array(z.string()).optional(),
    currencies: z.array(z.string()).optional(),
    chains: z.array(z.string()).optional(),
  })
  .passthrough();

const ActionProposalTargetAllocationSchema = z.object({
  asset: z.string().min(1),
  targetPct: z.number(),
  minPct: z.number().optional(),
  maxPct: z.number().optional(),
});

const ActionProposalTargetSchema = z
  .object({
    targetAllocations: z.array(ActionProposalTargetAllocationSchema).optional(),
    minLiquidityBufferUsd: z.number().optional(),
    hedgeHorizonDays: z.number().int().optional(),
  })
  .passthrough();

const ActionProposalConstraintsSchema = z
  .object({
    maxSlippageBps: z.number().int().optional(),
    maxNotionalUsd: z.number().optional(),
    allowedVenues: z.array(z.string()).optional(),
    disallowedVenues: z.array(z.string()).optional(),
  })
  .passthrough();

const ActionProposalInputsSchema = z.object({
  source: ActionProposalSourceSchema,
  target: ActionProposalTargetSchema,
  constraints: ActionProposalConstraintsSchema.optional(),
});

const ActionProposalExpectedImpactSchema = z.object({
  beforeExposure: z.record(z.unknown()).optional(),
  afterExposure: z.record(z.unknown()).optional(),
  estimatedPnlUsd: z.number().optional(),
  feeEstimateUsd: z.number().optional(),
  riskScore: z.number().min(0).max(1).optional(),
});

const ActionProposalRationaleSchema = z.object({
  summary: z.string().min(1),
  details: z.string().optional(),
  marketContextId: z.string().optional(),
});

export const ActionProposalSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  type: z.enum(ActionProposalTypes),
  status: z.enum(ActionProposalStatuses),
  portfolioId: z.string().min(1),
  priority: z.enum(ProposalPriorities).default("MEDIUM"),
  mode: z.enum(TreasuryModes).default("DEMO"),
  inputs: ActionProposalInputsSchema,
  expectedImpact: ActionProposalExpectedImpactSchema,
  policyChecks: z.array(PolicyCheckResultSchema).optional(),
  rationale: ActionProposalRationaleSchema,
  linkedExecutionPlanId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ActionProposalInput = z.input<typeof ActionProposalSchema>;
export type ActionProposalOutput = z.output<typeof ActionProposalSchema>;

// ---------- ExecutionPlan / ExecutionStep schema ----------

const ExecutionStepToolSchema = z.object({
  kind: z.enum(ToolKinds),
  name: z.string().min(1),
});

const ExecutionStepExpectedOutcomeSchema = z
  .object({
    maxSlippageBps: z.number().int().optional(),
    minReceiveAmount: z.string().optional(),
    maxFeeUsd: z.number().optional(),
  })
  .passthrough();

const ExecutionStepResultSchema = z.object({
  raw: z.record(z.unknown()).optional(),
  txHash: z.string().optional(),
  quoteId: z.string().optional(),
});

const ExecutionStepErrorSchema = z.object({
  message: z.string().min(1),
  code: z.string().optional(),
  retryable: z.boolean().optional(),
});

export const ExecutionStepSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(0),
  dependsOn: z.array(z.string()).optional(),
  type: z.enum(ExecutionStepTypes),
  status: z.enum(ExecutionStepStatuses),
  tool: ExecutionStepToolSchema,
  params: z.record(z.unknown()),
  expectedOutcome: ExecutionStepExpectedOutcomeSchema.optional(),
  result: ExecutionStepResultSchema.optional(),
  error: ExecutionStepErrorSchema.optional(),
});

const ExecutionPlanSummarySchema = z.object({
  estimatedFeeUsd: z.number().optional(),
  estimatedPnlUsd: z.number().optional(),
  chainsInvolved: z.array(z.string()).optional(),
  walletsInvolved: z.array(z.string()).optional(),
});

export const ExecutionPlanSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  proposalId: z.string().min(1),
  status: z.enum(ExecutionPlanStatuses),
  mode: z.enum(TreasuryModes).default("DEMO"),
  steps: z.array(ExecutionStepSchema),
  summary: ExecutionPlanSummarySchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ExecutionPlanInput = z.input<typeof ExecutionPlanSchema>;
export type ExecutionPlanOutput = z.output<typeof ExecutionPlanSchema>;

// ---------- Validate helpers ----------

export type ValidationSuccess<T> = { success: true; data: T };
export type ValidationFailure = { success: false; errors: Array<{ path: string; message: string }> };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function formatErrors(err: z.ZodError): ValidationFailure["errors"] {
  return err.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

/**
 * Validate an unknown value as an ActionProposal.
 * Applies Zod defaults (priority, mode) on success.
 */
export function validateActionProposal(data: unknown): ValidationResult<ActionProposalOutput> {
  const result = ActionProposalSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: formatErrors(result.error) };
}

/**
 * Validate an unknown value as an ExecutionPlan.
 * Applies Zod defaults (mode) on success.
 */
export function validateExecutionPlan(data: unknown): ValidationResult<ExecutionPlanOutput> {
  const result = ExecutionPlanSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: formatErrors(result.error) };
}
