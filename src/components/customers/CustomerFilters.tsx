import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AUM_CATEGORIES } from '@/lib/domain'
import { RULES } from '@/lib/insights'
import { toIdQuery, type CustomerFilters as Filters } from '@/lib/selectors/customers'
import { INCOME_BANDS } from '@/types'

/** A Radix select has no empty item value, so "any" is its own value. */
const ANY = 'any'

/** A filter key and its new URL value; `null` removes it. */
export type FilterChange = { key: 'rule' | 'band' | 'kyc' | 'lacks'; value: string | null }

function FilterSelect({
  label,
  value,
  anyLabel,
  options,
  onChange,
}: {
  label: string
  value: string | null
  anyLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string | null) => void
}) {
  return (
    <Select value={value ?? ANY} onValueChange={(next) => onChange(next === ANY ? null : next)}>
      <SelectTrigger aria-label={label} className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{anyLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const RULE_OPTIONS = RULES.map((rule) => ({ value: rule.id, label: rule.label }))
const BAND_OPTIONS = INCOME_BANDS.map((band, i) => ({ value: String(i + 1), label: band }))
const KYC_OPTIONS = [
  { value: 'yes', label: 'With KYC note' },
  { value: 'no', label: 'Without KYC note' },
]
const LACKS_OPTIONS = AUM_CATEGORIES.map((category) => ({ value: category, label: `No ${category}` }))

/** Four selects, the ID box, and "Clear filters". Each control writes the URL through the callbacks. */
export function CustomerFilters({
  filters,
  q,
  onChange,
  onQueryChange,
  onClear,
}: {
  filters: Filters
  /** The ID box text: digits only (`toIdQuery`). */
  q: string
  onChange: (change: FilterChange) => void
  onQueryChange: (q: string) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        label="Opportunity"
        anyLabel="All opportunities"
        value={filters.rule}
        options={RULE_OPTIONS}
        onChange={(value) => onChange({ key: 'rule', value })}
      />
      <FilterSelect
        label="Income band"
        anyLabel="All income bands"
        value={filters.band === null ? null : String(filters.band)}
        options={BAND_OPTIONS}
        onChange={(value) => onChange({ key: 'band', value })}
      />
      <FilterSelect
        label="KYC note"
        anyLabel="Any KYC note"
        value={filters.kyc === null ? null : filters.kyc ? 'yes' : 'no'}
        options={KYC_OPTIONS}
        onChange={(value) => onChange({ key: 'kyc', value })}
      />
      <FilterSelect
        label="Product not held"
        anyLabel="Any product"
        value={filters.lacks}
        options={LACKS_OPTIONS}
        onChange={(value) => onChange({ key: 'lacks', value })}
      />
      <Input
        aria-label="Filter by customer ID"
        placeholder="ID contains"
        inputMode="numeric"
        value={q}
        onChange={(event) => {
          // Strip non-digits in the field itself and put the caret back after
          // the digits before it. Otherwise React resets the value and the
          // caret jumps to the end.
          const field = event.target
          const digits = toIdQuery(field.value)
          if (digits !== field.value) {
            const caret = toIdQuery(field.value.slice(0, field.selectionStart ?? field.value.length)).length
            field.value = digits
            field.setSelectionRange(caret, caret)
          }
          onQueryChange(digits)
        }}
        className="w-full sm:w-36"
      />
      <Button variant="outline" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  )
}
