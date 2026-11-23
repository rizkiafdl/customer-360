import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { AXIS_TICK } from '@/components/customer/axis'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatIDR, formatIDRShort } from '@/lib/format'
import type { Overview, ScatterPoint } from '@/lib/selectors/overview'

const KYC_COLOR = 'var(--warning)'
const PLAIN_COLOR = 'var(--info)'
const config: ChartConfig = {
  kyc: { label: 'KYC note', color: KYC_COLOR },
  plain: { label: 'No KYC note', color: PLAIN_COLOR },
}

/** A legend in HTML, so the marker shape and the label are both visible: never color alone. */
function Legend() {
  return (
    <ul aria-label="Legend" className="flex gap-4 text-xs text-muted-foreground">
      <li className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5">
          <polygon points="5,0 10,10 0,10" fill={KYC_COLOR} />
        </svg>
        KYC note
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5">
          <circle cx="5" cy="5" r="5" fill={PLAIN_COLOR} />
        </svg>
        No KYC note
      </li>
    </ul>
  )
}

/**
 * One point per customer with AUM: income rank on x (labelled with the band),
 * AUM on a log y axis. Points with the KYC note are triangles in the warning color.
 */
export function IncomeAumScatter({ scatter, label }: { scatter: Overview['scatter']; label: string }) {
  const kyc = scatter.points.filter((p) => p.kyc)
  const plain = scatter.points.filter((p) => !p.kyc)
  const bandAt = new Map(scatter.ticks.map((t) => [t.rank, t.band]))
  return (
    <div className="flex flex-col gap-2">
      <ChartContainer
        config={config}
        role="img"
        aria-label={`${label}: ${scatter.title}`}
        className="aspect-auto h-80 w-full"
      >
        {/* The container is role="img" with the data in its name, so the chart itself takes no keyboard focus. */}
        <ScatterChart accessibilityLayer={false} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="rank"
            domain={[0.5, scatter.ticks.length + 0.5]}
            ticks={scatter.ticks.map((t) => t.rank)}
            tickFormatter={(rank: number) => bandAt.get(rank) ?? ''}
            tick={{ ...AXIS_TICK, angle: -30, textAnchor: 'end' }}
            height={84}
            interval={0}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            dataKey="aum"
            scale="log"
            domain={[scatter.aumTicks[0] ?? 'auto', scatter.aumTicks.at(-1) ?? 'auto']}
            ticks={scatter.aumTicks}
            interval={0}
            tickFormatter={(aum: number) => formatIDRShort(aum)}
            tick={AXIS_TICK}
            width={72}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ScatterPoint | undefined
              if (!active || !point) return null
              return (
                <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground tabular-nums shadow">
                  <div className="font-medium">Customer {point.customerId}</div>
                  <div>AUM {formatIDR(point.aum)}</div>
                  <div>Income band {point.band}</div>
                </div>
              )
            }}
          />
          <Scatter name="No KYC note" data={plain} fill={PLAIN_COLOR} shape="circle" isAnimationActive={false} />
          <Scatter name="KYC note" data={kyc} fill={KYC_COLOR} shape="triangle" isAnimationActive={false} />
        </ScatterChart>
      </ChartContainer>
      <Legend />
    </div>
  )
}
