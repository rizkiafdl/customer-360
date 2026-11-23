import type { ReactNode } from 'react'

/** One key figure: a label, the value, and an optional line of context. */
export function KpiTile({ label, children, context }: { label: string; children: ReactNode; context?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{children}</dd>
      {context ? <dd className="text-xs text-muted-foreground">{context}</dd> : null}
    </div>
  )
}
