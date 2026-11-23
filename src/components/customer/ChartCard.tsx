import type { ReactNode } from 'react'

/**
 * A card with a fact title from the view model, then the chart. When
 * `emptyText` is set it replaces the chart.
 */
export function ChartCard({
  label,
  title,
  emptyText,
  children,
  footer,
}: {
  label: string
  title?: string | null
  emptyText?: string | null
  children?: ReactNode
  footer?: ReactNode
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3">
      <figcaption>
        <span className="block text-xs text-muted-foreground">{label}</span>
        {title ? <span className="block text-sm font-medium">{title}</span> : null}
      </figcaption>
      {emptyText ? <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p> : children}
      {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
    </figure>
  )
}
