import { cn } from '@/lib/utils'
import { INCOME_BANDS } from '@/types'

/** All, then one chip per income band (rank 1 to 8). `null` is All. */
export function BandChips({ band, onChange }: { band: number | null; onChange: (band: number | null) => void }) {
  const chips = [{ rank: null, label: 'All' }, ...INCOME_BANDS.map((label, i) => ({ rank: i + 1, label }))]
  return (
    <div role="group" aria-label="Income band" className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const pressed = chip.rank === band
        return (
          <button
            key={chip.label}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(chip.rank)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pressed
                ? 'border-primary-border bg-primary-tint font-medium text-primary-strong'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
