import { Info, Lightbulb, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { InsightKind, OfferCard } from '@/lib/insights'

const ICONS: Record<InsightKind, LucideIcon> = { opportunity: Lightbulb, warning: TriangleAlert, info: Info }

// Full class names, so Tailwind finds them. Color is the left border and the icon only (F1 spec 4.5).
const BORDER: Record<InsightKind, string> = {
  opportunity: 'border-l-opportunity',
  warning: 'border-l-warning',
  info: 'border-l-info',
}
const TINT: Record<InsightKind, string> = {
  opportunity: 'text-opportunity',
  warning: 'text-warning',
  info: 'text-info',
}

/** One insight: kind icon and label, rule label, reason, then the rule text in muted type. */
export function InsightCard({ card }: { card: OfferCard }) {
  const Icon = ICONS[card.kind]
  return (
    <article className={`flex h-full flex-col gap-1 rounded-lg border border-l-4 bg-card px-3 py-2 ${BORDER[card.kind]}`}>
      <header className="flex items-center gap-1.5 text-xs">
        <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${TINT[card.kind]}`} />
        <span className="font-medium">{card.kindLabel}</span>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <span className="text-muted-foreground">{card.label}</span>
      </header>
      <p className="text-sm font-medium">{card.reason}</p>
      <p className="text-xs text-muted-foreground">{card.ruleText}</p>
    </article>
  )
}
