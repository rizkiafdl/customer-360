import { useParams } from 'react-router'
import { getCustomer360, parseCustomerId } from '@/lib/selectors/customer360'
import { NotFoundPage } from './NotFoundPage'

/** Route `/customers/:id`: the Customer 360 view model for one customer, or "Customer not found". */
export function CustomerPage() {
  const { id } = useParams()
  const customerId = parseCustomerId(id)
  const vm = customerId === null ? null : getCustomer360(customerId)
  if (!vm) return <NotFoundPage title="Customer not found" />

  return (
    <section>
      <h1 className="font-heading text-xl font-semibold">{vm.heading}</h1>
    </section>
  )
}
