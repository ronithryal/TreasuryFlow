# OpenFX Integration — Notes & Expectations

**Status:** Scaffold only — not wired into any live code path  
**Feature flag:** `OPENFX_ENABLED=false` (default, hardcoded for v1)  
**Source branch:** `p1/openfx-scaffold` (not merged into `plan1-integration`)  
**Ticket:** TF-013

---

## What OpenFX Is

OpenFX is a cross-border FX settlement layer that routes stablecoin liquidity
(USDC on Base) through corridor-specific payment rails (SPEI for MXN, FPS for GBP, etc.).
It provides real-time or near-real-time quote-and-execute semantics with explicit
settlement routing and spread disclosure.

---

## What Lives Here

| Path | Purpose |
|------|---------|
| `integrations/openfx/types.ts` | `SimulatedQuote`, `OpenFXAdapter` interface, corridor constants |
| `integrations/openfx/index.ts` | `getOpenFXAdapter()` factory — throws when `OPENFX_ENABLED=false` |
| `docs/openfx-integration.md` | This file |

The adapters in `p1/openfx-scaffold:app/src/adapters/openfx.ts` were **not** copied
into `app/src/` to avoid polluting live frontend bundles. The types and mock live here
under `integrations/` instead, decoupled from the Vite build.

---

## Supported Corridors (v1 Scaffold)

| Source | Destination | Rail | Availability |
|--------|------------|------|-------------|
| USD | MXN | SPEI | 24/7 instant |
| USD | GBP | FPS | Mon–Fri, same-day |

More corridors to be confirmed with the OpenFX team before enabling.

---

## Integration Contract

```ts
// Request a quote
const adapter = getOpenFXAdapter(); // throws if OPENFX_ENABLED=false
const quote = await adapter.requestQuote(10_000, "USD", "MXN");
// quote.expiry: ISO timestamp (~5 minutes)
// quote.spread: decimal, e.g. 0.002 = 20 bps
// quote.route: ["Base USDC", "OpenFX Aggregator", "MXN SPEI"]

// Accept and execute
await adapter.executeQuote(quote.id);
```

---

## Enabling in a Future Ticket

1. Set `OPENFX_ENABLED=true` in environment config.
2. Replace `MockOpenFXAdapter` in `integrations/openfx/index.ts` with a real
   implementation backed by the OpenFX HTTP API credentials.
3. Wire `getOpenFXAdapter()` into the `execute_step` API handler (TF-020) for
   steps with `type: "QUOTE"` and corridor metadata.
4. Add `cross_border_sweep` policy type to `domain.ts` and implement
   `evalCrossBorderSweep` in `policy-engine.ts` (stubs exist in `p1/openfx-scaffold`).
5. Update this doc and mark TF-013 done.

---

## What NOT to Do Before OpenFX Is Enabled

- Do not import from `integrations/openfx` in any Vite-bundled frontend code.
- Do not add `cross_border_sweep` to `PolicyTypes` or `IntentTypes` in `domain.ts`
  (those changes are isolated in `p1/openfx-scaffold` and not merged).
- Do not expose OpenFX quotes in the UI without the "Coming soon / mocked rail" label.

---

## Environment Variables Required (Future)

```
OPENFX_ENABLED=true
OPENFX_API_URL=https://api.openfx.io/v1
OPENFX_API_KEY=<secret>
```

These are not in `.env.example` yet because they are out of v1 scope.
Add them when TF-013 is promoted to an active ticket.
