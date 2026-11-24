/**
 * Recently viewed customers, kept in localStorage for the spotlight search.
 * Storage reads and writes are wrapped the same way as `src/lib/theme.ts`:
 * a blocked storage (private mode, policy) never throws, it just no-ops.
 */
export const RECENT_CUSTOMERS_KEY = 'recent-customers'
export const RECENT_CUSTOMERS_LIMIT = 5

/** Parses the stored value into at most `RECENT_CUSTOMERS_LIMIT` positive integer ids, first occurrence kept. */
export function parseRecentCustomers(raw: string | null): number[] {
  if (raw === null) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) {
    return []
  }

  const ids: number[] = []
  for (const value of parsed) {
    if (ids.length >= RECENT_CUSTOMERS_LIMIT) {
      break
    }
    if (
      typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      value > 0 &&
      !ids.includes(value)
    ) {
      ids.push(value)
    }
  }
  return ids
}

/** Moves `id` to the front of `ids`, dedupes, and keeps at most `RECENT_CUSTOMERS_LIMIT` entries. */
export function pushRecentCustomer(ids: readonly number[], id: number): number[] {
  return [id, ...ids.filter((existing) => existing !== id)].slice(0, RECENT_CUSTOMERS_LIMIT)
}

/** The stored recent customer ids, or [] when nothing valid is stored or storage is blocked. */
export function readRecentCustomers(): number[] {
  try {
    return parseRecentCustomers(localStorage.getItem(RECENT_CUSTOMERS_KEY))
  } catch {
    return []
  }
}

/** Records a visit to customer `id`, latest first, and stores the result when storage allows. */
export function recordCustomerVisit(id: number): void {
  const next = pushRecentCustomer(readRecentCustomers(), id)
  try {
    localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked (private mode, policy). The visit is not kept.
  }
}
