import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatIDR, formatIDRShort } from '@/lib/format'
import { AXIS_TICK } from './axis'

export interface BarDatum {
  label: string
  value: number
  /** A CSS color, `var(--…)` only. Defaults to the neutral bar color. */
  color?: string
}

/** Neutral bars for counts: not a category color, never red. */
const NEUTRAL = 'var(--muted-foreground)'
const config: ChartConfig = { value: { label: 'Value' } }
/**
 * Category axis width for the longest possible label, RETAIL TRANSACTION:
 * 129.6px at 12px Inter (ADR 0009), plus the 8px gap Recharts leaves before
 * the axis edge, rounded up. The e2e smoke test checks the fit in a real
 * browser.
 */
const LABEL_WIDTH = 140

/**
 * One horizontal bar per entry, the value as a label at the end of each bar.
 * `format="idr"` labels with `formatIDRShort` and shows the full value on hover.
 */
export function HorizontalBars({ data, format, label }: { data: BarDatum[]; format: 'idr' | 'count'; label: string }) {
  const short = (v: number) => (format === 'idr' ? formatIDRShort(v) : String(v))
  const full = (v: number) => (format === 'idr' ? formatIDR(v) : String(v))
  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={`${label}: ${data.map((d) => `${d.label} ${full(d.value)}`).join(', ')}`}
      className="aspect-auto w-full"
      style={{ height: data.length * 28 + 8 }}
    >
      {/* The container is role="img" with the data in its name, so the chart itself takes no keyboard focus. */}
      <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ left: 0, right: 72, top: 4, bottom: 4 }}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="label"
          width={LABEL_WIDTH}
          // Recharts measures a label in this style to decide where to wrap it.
          // Without it, it measures at the body size (16px) and wraps labels that fit.
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const datum = payload?.[0]?.payload as BarDatum | undefined
            if (!active || !datum) return null
            return (
              <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground tabular-nums shadow">
                {datum.label}: {full(datum.value)}
              </div>
            )
          }}
        />
        <Bar dataKey="value" radius={3} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? NEUTRAL} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            // Text color, not the bar color: chart colors are only checked at 3:1.
            fill="var(--foreground)"
            className="tabular-nums"
            formatter={(v: unknown) => (typeof v === 'number' ? short(v) : '')}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
