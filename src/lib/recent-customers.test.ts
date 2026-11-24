import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RECENT_CUSTOMERS_KEY,
  parseRecentCustomers,
  pushRecentCustomer,
  readRecentCustomers,
  recordCustomerVisit,
} from './recent-customers'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseRecentCustomers', () => {
  it.each([
    [null, []],
    ['not json', []],
    ['{"a":1}', []],
    ['[4857,2759]', [4857, 2759]],
    ['[4857,"x",-1,0,1.5,2759]', [4857, 2759]],
    ['[1,1,2]', [1, 2]],
    ['[1,2,3,4,5,6]', [1, 2, 3, 4, 5]],
  ])('parseRecentCustomers(%j) is %j', (raw, expected) => {
    expect(parseRecentCustomers(raw)).toEqual(expected)
  })
})

describe('pushRecentCustomer', () => {
  it.each([
    [[2759, 4857], 4857, [4857, 2759]],
    [[1, 2, 3, 4, 5], 6, [6, 1, 2, 3, 4]],
    [[], 7, [7]],
  ])('pushRecentCustomer(%j, %d) is %j', (ids, id, expected) => {
    expect(pushRecentCustomer(ids, id)).toEqual(expected)
  })
})

describe('readRecentCustomers', () => {
  it('reads the stored list', () => {
    localStorage.setItem(RECENT_CUSTOMERS_KEY, '[4857]')
    expect(readRecentCustomers()).toEqual([4857])
  })

  it('reads [] when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readRecentCustomers()).toEqual([])
  })
})

describe('recordCustomerVisit', () => {
  it('records visits, latest first', () => {
    recordCustomerVisit(4857)
    recordCustomerVisit(2759)
    expect(localStorage.getItem(RECENT_CUSTOMERS_KEY)).toBe('[2759,4857]')
  })

  it('drops the write when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => recordCustomerVisit(1)).not.toThrow()
  })
})
