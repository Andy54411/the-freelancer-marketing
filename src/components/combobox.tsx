// src/components/Combobox.tsx
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

interface ComboboxProps {
  options: string[];
  placeholder?: string;
  selected: string | null;
  onChange: (value: string) => void;
}

export function Combobox({
  options,
  placeholder = 'Wähle eine Option',
  selected,
  onChange,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <VisuallyHidden>
          <DialogTitle>Option auswählen</DialogTitle>
          <DialogDescription>Wählen Sie eine Option aus der Liste aus.</DialogDescription>
        </VisuallyHidden>
        <Command>
          <CommandInput placeholder="Suchen..." />
          <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>
          <CommandGroup>
            {options.map(option => (
              <CommandItem
                key={option}
                value={option}
                onSelect={currentValue => {
                  onChange(currentValue === selected ? '' : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', selected === option ? 'opacity-100' : 'opacity-0')}
                />
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
