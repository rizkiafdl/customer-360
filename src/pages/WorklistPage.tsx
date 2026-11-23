import { useSearchParams } from 'react-router'
import { WorklistFilters } from '@/components/worklist/WorklistFilters'
import { WorklistTable } from '@/components/worklist/WorklistTable'
import type { RuleId } from '@/lib/insights'
import { filterWorklist, getWorklist, parseWorklistFilters, worklistSummary } from '@/lib/selectors/worklist'

/** Route `/`: the ranked opportunity worklist, filtered by the URL (F4 spec, section 4). */
export function WorklistPage() {
  const [params, setParams] = useSearchParams()
  const rows = getWorklist()
  const filters = parseWorklistFilters(params)
  const visible = filterWorklist(rows, filters)

  const setParam = (key: 'rule' | 'q', value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h1 className="font-heading text-xl font-semibold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {worklistSummary(visible.length, rows.length, filters)}
        </p>
      </div>
      <WorklistFilters
        rule={filters.rule}
        q={params.get('q') ?? ''}
        onRuleChange={(rule: RuleId | null) => setParam('rule', rule)}
        onQueryChange={(q) => setParam('q', q)}
        onClear={() => setParams(new URLSearchParams(), { replace: true })}
      />
      <WorklistTable rows={visible} />
    </section>
  )
}
