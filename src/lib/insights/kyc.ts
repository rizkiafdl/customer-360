/**
 * The KYC income-band note (ADR 0008). A note, not an offer: it is not in
 * `RULE_ORDER`, is never a top reason, and does not affect ranking.
 */
import { customerAum, incomeRank } from '@/lib/domain'
import { formatIDR } from '@/lib/format'
import { insightResult } from './rules'
import { incomeBandAtRank } from './text'
import { KYC_NOTE_MAX_INCOME_RANK, KYC_NOTE_MIN_AUM } from './thresholds'
import type { CustomerInput, InsightResult, NoteId } from './types'

const KYC_TEXT =
  `Income band ${incomeBandAtRank(KYC_NOTE_MAX_INCOME_RANK)} or below, ` +
  `and AUM is ${formatIDR(KYC_NOTE_MIN_AUM)} or more.`

/** Income rank 3 (`>3 Juta - 5 Juta`) or below, and AUM at least Rp 1.000.000.000. */
export function kycIncomeBandNote({
  profile,
  portfolio,
}: CustomerInput): InsightResult<'kyc-income-band'> {
  const aum = customerAum(portfolio)
  const band = profile.customer_income
  const fired = incomeRank(band) <= KYC_NOTE_MAX_INCOME_RANK && aum >= KYC_NOTE_MIN_AUM
  return insightResult(
    'kyc-income-band',
    KYC_TEXT,
    { aum, incomeBand: band },
    fired,
    () => `Income band ${band}. AUM ${formatIDR(aum)}.`,
  )
}

/** What F3 and F6 show about the note. */
export const KYC_NOTE: { id: NoteId; label: string; ruleText: string; source: string } = {
  id: 'kyc-income-band',
  label: 'KYC income band',
  ruleText: KYC_TEXT,
  source: 'User decision, 2026-11-23.',
}
