import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RULES, type RuleId } from '@/lib/insights'

/** The select has no empty item value, so "all types" is its own value. */
const ALL = 'all'

/** Opportunity type, customer ID, and "Clear filters". Each control writes the URL through the callbacks. */
export function WorklistFilters({
  rule,
  q,
  onRuleChange,
  onQueryChange,
  onClear,
}: {
  rule: RuleId | null
  /** The raw `q` text, so the input shows what was typed. */
  q: string
  onRuleChange: (rule: RuleId | null) => void
  onQueryChange: (q: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={rule ?? ALL} onValueChange={(value) => onRuleChange(value === ALL ? null : (value as RuleId))}>
        <SelectTrigger aria-label="Opportunity type" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All opportunity types</SelectItem>
          {RULES.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label="Filter by customer ID"
        placeholder="ID contains"
        inputMode="numeric"
        value={q}
        onChange={(event) => onQueryChange(event.target.value)}
        className="w-36"
      />
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}
