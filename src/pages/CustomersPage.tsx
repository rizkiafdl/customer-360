import { useState } from 'react'
import { useLocation, useNavigationType, useSearchParams } from 'react-router'
import { CustomerFilters, type FilterChange } from '@/components/customers/CustomerFilters'
import { CustomerPreview } from '@/components/customers/CustomerPreview'
import { CustomersTable } from '@/components/customers/CustomersTable'
import { Button } from '@/components/ui/button'
import {
  customerHref,
  customerSummary,
  customersQuery,
  filterCustomers,
  getCustomerRows,
  paginate,
  parseCustomerFilters,
} from '@/lib/selectors/customers'

/** Route `/customers`: the filtered list, 25 rows per page, and the preview panel (redesign v2 spec, section 6.2). */
export function CustomersPage() {
  const [params, setParams] = useSearchParams()
  const rows = getCustomerRows()
  const filters = parseCustomerFilters(params)
  const visible = filterCustomers(rows, filters)
  const page = paginate(visible, filters.page)

  // The ID box keeps its own text. The router commits URL changes in a
  // transition, so a box bound straight to `q` loses the caret on each key.
  // Filter writes use `replace`. Any other navigation (a link, Back, a page
  // button) sets the box from the new URL (empty when the filter ignores its
  // `q`). "Clear filters" empties it directly.
  const location = useLocation()
  const navigationType = useNavigationType()
  const [qText, setQText] = useState(filters.q ?? '')
  const [seenKey, setSeenKey] = useState(location.key)
  if (location.key !== seenKey) {
    setSeenKey(location.key)
    if (navigationType !== 'REPLACE') setQText(filters.q ?? '')
  }

  // The selection belongs to one page of one filter set; any change shows the first row again.
  const viewKey = customersQuery({ ...filters, page: page.page })
  const [selection, setSelection] = useState<{ viewKey: string; id: number } | null>(null)
  const selectedId = selection?.viewKey === viewKey ? selection.id : (page.rows[0]?.customerId ?? null)
  const selectedIndex = page.rows.findIndex((row) => row.customerId === selectedId)
  const selected = page.rows[selectedIndex]
  const select = (id: number) => setSelection({ viewKey, id })
  const stepTo = (index: number) => {
    const row = page.rows[index]
    return row ? () => select(row.customerId) : null
  }

  const writeFilter = (key: FilterChange['key'] | 'q', value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace: true },
    )

  const goToPage = (target: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (target > 1) next.set('page', String(target))
      else next.delete('page')
      return next
    })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {customerSummary(visible.length, rows.length, filters)}
        </p>
      </div>
      <CustomerFilters
        filters={filters}
        q={qText}
        onChange={({ key, value }) => writeFilter(key, value)}
        onQueryChange={(q) => {
          setQText(q)
          writeFilter('q', q)
        }}
        onClear={() => {
          setQText('')
          setParams(new URLSearchParams(), { replace: true })
        }}
      />
      {selected ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-2">
            <CustomersTable
              rows={page.rows}
              selectedId={selectedId}
              onSelect={select}
              hrefOf={(id) => customerHref(id, filters)}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">{page.label}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page.page <= 1} onClick={() => goToPage(page.page - 1)}>
                  Previous page
                </Button>
                <Button variant="outline" disabled={page.page >= page.pageCount} onClick={() => goToPage(page.page + 1)}>
                  Next page
                </Button>
              </div>
            </div>
          </div>
          <CustomerPreview
            row={selected}
            position={selectedIndex + 1}
            total={page.rows.length}
            href={customerHref(selected.customerId, filters)}
            onPrevious={stepTo(selectedIndex - 1)}
            onNext={stepTo(selectedIndex + 1)}
          />
        </div>
      ) : null}
    </div>
  )
}
