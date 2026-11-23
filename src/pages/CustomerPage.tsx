import { useParams } from 'react-router'
import { getCustomer360, parseCustomerId } from '@/lib/selectors/customer360'
import { CustomerDetail } from './CustomerDetail'
import { NotFoundPage } from './NotFoundPage'

/** Route `/customers/:id`: the Customer 360 page, or "Customer not found". */
export function CustomerPage() {
  const { id } = useParams()
  const customerId = parseCustomerId(id)
  const vm = customerId === null ? null : getCustomer360(customerId)
  return vm ? <CustomerDetail key={vm.id} vm={vm} /> : <NotFoundPage title="Customer not found" />
}
