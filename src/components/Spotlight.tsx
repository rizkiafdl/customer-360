import { ArrowUpRightIcon, SearchIcon, SlidersHorizontalIcon, UserRoundIcon, type LucideIcon } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { wrapIndex } from '@/lib/keyboard'
import { readRecentCustomers } from '@/lib/recent-customers'
import { getSpotlightSections, noMatchText, type SpotlightItem, type SpotlightKind } from '@/lib/selectors/spotlight'
import { cn } from '@/lib/utils'

const ICONS: Record<SpotlightKind, LucideIcon> = {
  customer: UserRoundIcon,
  filter: SlidersHorizontalIcon,
  page: ArrowUpRightIcon,
}

/**
 * The spotlight dialog content (spec 5.4–5.7): must be rendered inside a
 * `Dialog.Root`. Choosing a row closes the panel (`onClose`) and navigates.
 */
export function Spotlight({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [recentIds] = useState(readRecentCustomers)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const sections = getSpotlightSections(query, recentIds)
  const items = sections.flatMap((section) => section.items)

  function choose(item: SpotlightItem | undefined) {
    if (!item) return
    onClose()
    void navigate(item.to)
  }

  function moveActive(delta: number) {
    if (items.length === 0) return
    const next = wrapIndex(active + delta, items.length)
    setActive(next)
    document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' })
  }

  function onInputChange(value: string) {
    setQuery(value)
    setActive(0)
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(items[active])
    }
  }

  function onListMouseDown(event: MouseEvent<HTMLUListElement>) {
    event.preventDefault()
  }

  let index = -1

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="spotlight-scrim" />
      <Dialog.Content
        className="spotlight-panel flex flex-col"
        aria-modal="true"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <Dialog.Title className="sr-only">Search</Dialog.Title>
        <div className="flex items-center gap-[14px] border-b border-sp-divider px-5 py-[18px]">
          <SearchIcon className="size-[22px] shrink-0 opacity-70" aria-hidden="true" />
          <label htmlFor={`${baseId}-input`} className="sr-only">
            Search customers, filters and pages
          </label>
          <input
            id={`${baseId}-input`}
            ref={inputRef}
            role="combobox"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Customer ID, opportunity or page"
            className="min-w-0 flex-1 border-0 bg-transparent text-[21px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
          />
          <Dialog.Close
            className="min-h-8 shrink-0 rounded-lg bg-sp-kbd px-[10px] text-xs font-semibold text-muted-foreground"
            aria-label="Close search (esc)"
          >
            esc
          </Dialog.Close>
        </div>
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Results"
          onMouseDown={onListMouseDown}
          className="max-h-[min(440px,60vh)] list-none overflow-y-auto px-[10px] py-2 pb-[10px]"
        >
          {items.length === 0 ? (
            <li role="presentation" className="px-3 py-7 text-center text-sm text-muted-foreground">
              {noMatchText(query)}
            </li>
          ) : (
            sections.flatMap((section) => [
              <li
                key={`heading-${section.title}`}
                role="presentation"
                className="px-3 pt-3 pb-1.5 text-xs font-semibold tracking-[.03em] text-muted-foreground"
              >
                {section.title}
              </li>,
              ...section.items.map((item) => {
                index += 1
                const i = index
                const Icon = ICONS[item.kind]
                const selected = i === active
                return (
                  <li
                    key={item.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected ? 'true' : 'false'}
                    onMouseMove={() => {
                      if (i !== active) setActive(i)
                    }}
                    onClick={() => choose(item)}
                    className={cn(
                      'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl px-3 py-1.5 transition-colors duration-[.12s]',
                      selected && 'bg-sp-active-bg text-sp-active-text',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-sp-icon-bg text-muted-foreground',
                        selected && 'bg-primary text-primary-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{item.title}</span>
                      <span
                        className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted-foreground"
                        title={item.subtitleTitle ?? undefined}
                      >
                        {item.subtitle}
                      </span>
                    </span>
                    {selected ? (
                      <span aria-hidden="true" className="shrink-0 text-xs font-semibold text-sp-active-text">
                        ↵ Open
                      </span>
                    ) : item.count !== null ? (
                      <span className="min-w-7 shrink-0 rounded-[10px] bg-sp-kbd px-2 py-0.5 text-center text-xs font-semibold text-muted-foreground">
                        {item.count}
                      </span>
                    ) : null}
                  </li>
                )
              }),
            ])
          )}
        </ul>
        <div className="flex items-center gap-[18px] border-t border-sp-divider px-5 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-md bg-sp-kbd px-1.5 text-xs font-semibold">
              ↑
            </kbd>
            <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-md bg-sp-kbd px-1.5 text-xs font-semibold">
              ↓
            </kbd>
            Navigate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-md bg-sp-kbd px-1.5 text-xs font-semibold">
              ↵
            </kbd>
            Open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-md bg-sp-kbd px-1.5 text-xs font-semibold">
              esc
            </kbd>
            Close
          </span>
          <span className="ml-auto">Try typing 87</span>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
