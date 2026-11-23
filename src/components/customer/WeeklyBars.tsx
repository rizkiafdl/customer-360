import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'

export interface WeekDatum {
  weekStart: string
  label: string
  count: number
}

const config: ChartConfig = { count: { label: 'Transactions' } }

/** Customer-initiated transactions per ISO week (Monday start), counts only. */
export function WeeklyBars({ data, label }: { data: WeekDatum[]; label: string }) {
  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={`${label}: ${data.map((w) => `week from ${w.label} ${w.count}`).join(', ')}`}
      className="aspect-auto h-44 w-full"
    >
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const week = payload?.[0]?.payload as WeekDatum | undefined
            if (!active || !week) return null
            return (
              <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground tabular-nums shadow">
                Week from {week.label}: {week.count}
              </div>
            )
          }}
        />
        <Bar dataKey="count" fill="var(--muted-foreground)" radius={2} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}
