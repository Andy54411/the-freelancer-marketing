// src/components/Combobox.tsx
'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ComboboxProps {
  options: string[]
  placeholder?: string
  selected: string | null
  onChange: (value: string) => void
}

export function Combobox({ options, placeholder = 'Wähle eine Option', selected, onChange }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/*
        FINALE ANPASSUNG: Die Tailwind-Klasse "z-50" wird hinzugefügt.
        Dies ist die saubere Methode, um sicherzustellen, dass die Auswahlliste
        immer über anderen Inhalten (wie z.B. Modal-Hintergründen) angezeigt wird.
      */}
      <PopoverContent
        className="w-full p-0 z-50"
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Suchen..." className="h-9" />
          <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selected === option ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}