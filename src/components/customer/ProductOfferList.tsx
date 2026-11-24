import { OFFERS_LIST_LABEL, type ProductOffer } from '@/lib/insights'

/**
 * One card per product, in the `productOffers` order. The first card shows its
 * reasons, basis, and the top channel; the rest show the title and basis only,
 * so a reason shared by two cards (cash-heavy) is not read as two pitches.
 */
export function ProductOfferList({ offers, channelText }: { offers: ProductOffer[]; channelText: string | null }) {
  return (
    <ul aria-label={OFFERS_LIST_LABEL} className="flex flex-col gap-2">
      {offers.map((offer, index) => {
        const titleId = `offer-${offer.product.replace(/\s+/g, '-').toLowerCase()}`
        const first = index === 0
        return (
          <li
            key={offer.product}
            aria-labelledby={titleId}
            className={first ? 'rounded-xl border border-primary-border bg-card p-4' : 'rounded-lg border bg-card px-4 py-3'}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 id={titleId} className={first ? 'font-heading text-base font-semibold' : 'text-sm font-medium'}>
                {offer.title}
              </h3>
              {offer.basisText ? (
                <span className="text-sm text-muted-foreground tabular-nums">{offer.basisText}</span>
              ) : null}
            </div>
            {first ? (
              <>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
                  {offer.reasons.map((reason) => (
                    <li key={reason} className="tabular-nums">
                      {reason}
                    </li>
                  ))}
                </ul>
                {channelText ? <p className="mt-2 text-sm text-muted-foreground">{channelText}</p> : null}
              </>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
