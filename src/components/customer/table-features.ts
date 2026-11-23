/** The TanStack Table features every customer table uses: client-side sorting. */
import { createSortedRowModel, rowSortingFeature, sortFn_alphanumeric, sortFn_basic, tableFeatures } from '@tanstack/react-table'

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})

export type Features = typeof features
