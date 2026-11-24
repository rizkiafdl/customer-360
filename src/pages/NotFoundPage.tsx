import { Link } from 'react-router'

/** "Not found" with a way back to the customer list. HTTP 404 is out of scope (ADR 0003). */
export function NotFoundPage({ title = 'Page not found' }: { title?: string }) {
  return (
    <section className="py-12">
      <h1 className="font-heading text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm">
        <Link to="/customers" className="text-foreground underline underline-offset-4 hover:text-foreground">
          Back to customers
        </Link>
      </p>
    </section>
  )
}
