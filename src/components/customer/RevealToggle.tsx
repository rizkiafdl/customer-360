import { ChevronDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** A button with the given text that shows or hides its content. */
export function RevealToggle({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="w-fit"
      >
        <ChevronDownIcon aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
        {label}
      </Button>
      <div id={id} hidden={!open}>
        {open ? children : null}
      </div>
    </div>
  )
}
