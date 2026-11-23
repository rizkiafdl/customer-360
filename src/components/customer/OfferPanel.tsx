import { Separator } from '@/components/ui/separator'
import { OFFER_PANEL_NOTE_HEADING, OFFERS_LIST_LABEL, type OfferPanel as OfferPanelModel } from '@/lib/insights'
import { InsightCard } from './InsightCard'

/** The offer cards, or the empty line, then the KYC note apart under its own heading (F3 spec 4.4). */
export function OfferPanel({ panel }: { panel: OfferPanelModel }) {
  return (
    <div className="flex flex-col gap-3">
      {panel.cards.length ? (
        <ul aria-label={OFFERS_LIST_LABEL} className="grid gap-2 lg:grid-cols-2">
          {panel.cards.map((card) => (
            <li key={card.id}>
              <InsightCard card={card} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{panel.emptyText}</p>
      )}
      {panel.note ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">{OFFER_PANEL_NOTE_HEADING}</h3>
            <Separator className="flex-1" />
          </div>
          <div className="lg:w-1/2">
            <InsightCard card={panel.note} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
