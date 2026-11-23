import { ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getCustomerOptions } from '@/lib/selectors/customer360'

/** The "filter per customer": a combobox over every customer ID that opens `/customers/:id`. */
export function CustomerSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Search customer"
          className="w-64 justify-between font-normal text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <SearchIcon />
            Search customer
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Customer ID" />
          <CommandList>
            <CommandEmpty>No customer with that ID.</CommandEmpty>
            {getCustomerOptions().map((option) => (
              <CommandItem
                key={option.id}
                value={String(option.id)}
                keywords={[option.label, option.detail]}
                onSelect={() => {
                  setOpen(false)
                  void navigate(`/customers/${option.id}`)
                }}
              >
                <div className="flex flex-col">
                  <span className="tabular-nums">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.detail}</span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
