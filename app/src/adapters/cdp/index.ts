/**
 * CDP adapters barrel export.
 *
 * Onramp and Offramp are MOCKED in v1.
 * Check ONRAMP_MOCKED / OFFRAMP_MOCKED before calling in production contexts.
 */
export {
  ONRAMP_MOCKED,
  getBuyQuote,
  initiateOnramp,
  type BuyQuote,
  type OnrampSession,
} from "./onramp";

export {
  OFFRAMP_MOCKED,
  initiateOfframp,
  type OfframpSession,
} from "./offramp";
