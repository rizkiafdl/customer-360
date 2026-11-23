import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatIDR, formatIDRShort } from '@/lib/format'
import { cn } from '@/lib/utils'

/** A short Rupiah value with the full `formatIDR` value in a tooltip and as screen-reader text. */
export function Money({ amount, className }: { amount: number; className?: string }) {
  const full = formatIDR(amount)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className={cn('tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}>
          <span aria-hidden="true">{formatIDRShort(amount)}</span>
          <span className="sr-only">{full}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="tabular-nums">{full}</TooltipContent>
    </Tooltip>
  )
}
