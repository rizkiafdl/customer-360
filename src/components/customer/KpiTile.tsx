import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** One key figure: a label, the value, and an optional line of context. */
export function KpiTile({
  label,
  children,
  context,
  className,
}: {
  label: ReactNode
  children: ReactNode
  context?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-3 py-2.5', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{children}</dd>
      {context ? <dd className="text-xs text-muted-foreground">{context}</dd> : null}
    </div>
  )
}
