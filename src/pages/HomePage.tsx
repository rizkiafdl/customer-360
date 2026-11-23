import { profiles } from '@/data'

export function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="font-heading text-2xl font-semibold">Customer 360</h1>
      <p className="mt-2 text-muted-foreground">{profiles.length} customers loaded.</p>
    </main>
  )
}
