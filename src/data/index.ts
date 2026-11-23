/**
 * Typed access to the JSON written by `npm run data:build`.
 * The casts are safe because scripts/excel/normalize.ts validates every row
 * against these types before writing; src/data/data.test.ts re-checks the output.
 */
import type { PortfolioItem, Profile, Transaction } from '@/types'
import portfolioJson from './portfolio.json'
import profilesJson from './profiles.json'
import transactionsJson from './transactions.json'

export const profiles = profilesJson as Profile[]
export const portfolio = portfolioJson as PortfolioItem[]
export const transactions = transactionsJson as Transaction[]
