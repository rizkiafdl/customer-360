/** Selectors over the whole book of customers. */
import { latestActivityDate } from '@/lib/domain'
import { dataset, type Dataset } from './dataset'

export function customerCount(data: Dataset): number {
  return data.profiles.length
}

/** The as-of date for all recency values: the latest `activity_date` (ADR 0005). */
export function asOfDateOf(data: Dataset): string {
  return latestActivityDate(data.transactions)
}

export function getCustomerCount(): number {
  return customerCount(dataset)
}

/** Computed once at module load. `2024-04-26` for the committed data. */
export const asOfDate: string = asOfDateOf(dataset)
