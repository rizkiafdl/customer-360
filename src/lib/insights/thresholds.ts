/**
 * Every threshold the insight rules use, in one place (ADR 0008).
 *
 * Each value names its source. CLAUDE.md Rule 3: no value here is a
 * "sensible default"; each one was decided by the user or comes from the
 * Part 1 or Part 2 analysis of this assessment. `thresholds.test.ts` pins
 * them, so a change is always deliberate.
 *
 * Definitions that are not thresholds (AUM, "holds", high income) live in
 * `src/lib/domain/` (ADR 0006).
 */

/**
 * Cash-heavy rule: fires when cash is at least this share of AUM.
 * Source: user decision, 2026-11-23.
 */
export const CASH_HEAVY_MIN_SHARE = 0.8

/**
 * A FUNDING product whose name starts with this prefix is a deposit
 * (DEPOSITO01, DEPO14H, DEPOHAR 21-31, ...). Every other named FUNDING
 * product is cash. Source: user decision, 2026-11-23.
 */
export const DEPOSIT_PRODUCT_PREFIX = 'DEPO'

/**
 * Investment gap rules: fire only when AUM is above this value (strictly
 * greater). Source: Part 1 cut-off (Rp 100 jt); reuse for this rule is a
 * user decision, 2026-11-23.
 */
export const INVESTMENT_GAP_MIN_AUM = 100_000_000

/**
 * KYC income-band note: income rank at or below this value, i.e.
 * `>3 Juta - 5 Juta` or lower. Source: user decision, 2026-11-23.
 */
export const KYC_NOTE_MAX_INCOME_RANK = 3

/** KYC income-band note: AUM at or above this value (Rp 1 Bn). Source: user decision, 2026-11-23. */
export const KYC_NOTE_MIN_AUM = 1_000_000_000
