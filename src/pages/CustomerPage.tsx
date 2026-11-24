import { useParams, useSearchParams } from 'react-router'
import { CustomerNav } from '@/components/customer/CustomerNav'
import { getCustomer360, parseCustomerId, parseTab, type CustomerTab } from '@/lib/selectors/customer360'
import { filterCustomers, getCustomerRows, neighbours, parseCustomerFilters } from '@/lib/selectors/customers'
import { CustomerDetail } from './CustomerDetail'
import { NotFoundPage } from './NotFoundPage'

/**
 * Route `/customers/:id`: the Customer 360 page, or "Customer not found". The
 * Customers filters and the tab come from the URL, so Back and links work.
 */
export function CustomerPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const customerId = parseCustomerId(id)
  const vm = customerId === null ? null : getCustomer360(customerId)
  if (!vm) return <NotFoundPage title="Customer not found" />

  const filters = parseCustomerFilters(params)
  const tab = parseTab(params.get('tab'))
  const position = neighbours(filterCustomers(getCustomerRows(), filters), vm.id)

  // A tab change is a new history entry and keeps the filter params. Overview is the default, so it has no param.
  const onTabChange = (next: CustomerTab) =>
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (next === 'overview') updated.delete('tab')
      else updated.set('tab', next)
      return updated
    })

  return (
    <CustomerDetail
      key={vm.id}
      vm={vm}
      tab={tab}
      onTabChange={onTabChange}
      nav={<CustomerNav id={vm.id} filters={filters} tab={tab} position={position} />}
    />
  )
}
