import { SearchIcon } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'
import { isSpotlightShortcut, shortcutLabel } from '@/lib/keyboard'
import { Spotlight } from './Spotlight'

/**
 * The top-bar search trigger: opens the spotlight (spec 5.3) on a click, or
 * on ⌘K / Ctrl+K anywhere in the app. The shortcut toggles an open panel
 * closed. `Spotlight` is mounted only while open, so each open starts empty.
 */
export function SpotlightSearch() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isSpotlightShortcut(event)) return
      event.preventDefault()
      if (event.repeat) return
      setOpen((current) => !current)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-keyshortcuts="Meta+K Control+K"
          className="flex min-h-10 flex-[0_1_460px] items-center gap-2.5 rounded-[10px] border border-border bg-muted pl-3 pr-2 text-sm text-muted-foreground"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Search customer, filter or page</span>
          <kbd
            aria-hidden="true"
            className="rounded-md bg-sp-kbd px-1.5 py-0.5 text-xs font-semibold text-muted-foreground"
          >
            {shortcutLabel(navigator.platform)}
          </kbd>
        </button>
      </Dialog.Trigger>
      {open && <Spotlight onClose={() => setOpen(false)} />}
    </Dialog.Root>
  )
}
