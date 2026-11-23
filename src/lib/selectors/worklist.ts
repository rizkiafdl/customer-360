/**
 * The opportunity worklist at `/` (F4 spec, section 4): one row per
 * customer, in the ranking order, with the URL filters.
 *
 * `buildWorklist(data)` is the pure selector. `getWorklist()` reads the real
 * data, built once at module load.
 */
import { RULES, RULE_ORDER, compareWorklist, type RuleId } from '@/lib/insights'
import { bookCustomersOf } from './book'
import { dataset, type Dataset } from './dataset'

export interface WorklistRow {
  /** 1 to n, the position in the default order. */
  rank: number
  customerId: number
  href: string
  aum: number
  /** Never added to `aum`. */
  loanExposure: number
  firedCount: number
  /** Fired rules, in `RULE_ORDER`. */
  ruleIds: RuleId[]
  /** The reason of the first fired rule, or `null` when no rule fired. */
  topReason: string | null
  /** The `RULE_ORDER` index of the top reason, or `null`. The sort key of the top reason column. */
  topReasonOrder: number | null
  /** The KYC note reason, or `null`. Not a rank input and never the top reason. */
  kycNote: string | null
}

export interface WorklistFilters {
  rule: RuleId | null
  /** Digits only. */
  q: string | null
}

/** Every customer, in the default order: fired rules, then AUM, then `customer_id`. */
export function buildWorklist(data: Dataset): WorklistRow[] {
  return bookCustomersOf(data)
    .sort((a, b) => compareWorklist(a.evaluation, b.evaluation))
    .map(({ evaluation, loanExposure }, index) => {
      const top = evaluation.insights[0]
      return {
        rank: index + 1,
        customerId: evaluation.customer_id,
        href: `/customers/${evaluation.customer_id}`,
        aum: evaluation.aum,
        loanExposure,
        firedCount: evaluation.insights.length,
        ruleIds: evaluation.insights.map((insight) => insight.id),
        topReason: top ? top.reason : null,
        topReasonOrder: top ? RULE_ORDER.indexOf(top.id) : null,
        kycNote: evaluation.kycNote ? evaluation.kycNote.reason : null,
      }
    })
}

function isRuleId(value: string | null): value is RuleId {
  return (RULE_ORDER as readonly (string | null)[]).includes(value)
}

/** The ID box text: digits only, so the box never shows text that the filter ignores. */
export function toIdQuery(text: string): string {
  return text.replace(/\D/g, '')
}

/** The filters from the URL. An unknown rule or a non-digit ID is ignored. */
export function parseWorklistFilters(params: URLSearchParams): WorklistFilters {
  const rule = params.get('rule')
  const q = params.get('q')
  return {
    rule: isRuleId(rule) ? rule : null,
    q: q !== null && /^\d+$/.test(q) ? q : null,
  }
}

/** The rows that match every set filter (AND). The rule matches at any position. */
export function filterWorklist(rows: readonly WorklistRow[], filters: WorklistFilters): WorklistRow[] {
  const { rule, q } = filters
  return rows.filter(
    (row) => (rule === null || row.ruleIds.includes(rule)) && (q === null || String(row.customerId).includes(q)),
  )
}

/** The short name of a rule (`RULES`). */
function ruleLabel(id: RuleId): string {
  return RULES.find((rule) => rule.id === id)?.label ?? id
}

/** The line above the table, from fixed templates. */
export function worklistSummary(shown: number, total: number, filters: WorklistFilters): string {
  if (shown === 0) return 'No customers match these filters.'
  if (filters.rule === null && filters.q === null) return `${total} customers.`
  const parts = [`${shown} of ${total} customers.`]
  if (filters.rule !== null) parts.push(`Opportunity: ${ruleLabel(filters.rule)}.`)
  if (filters.q !== null) parts.push(`ID contains ${filters.q}.`)
  return parts.join(' ')
}

const worklist = buildWorklist(dataset)

export function getWorklist(): WorklistRow[] {
  return worklist
}
