import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  unit?: string;
  source: 'services' | 'inlineServices';
}

interface ServiceSelectorProps {
  services: Service[];
  selectedService: Service | null;
  onSelect: (service: Service) => void;
  onAdd: () => void;
}

export function ServiceSelector({
  services,
  selectedService,
  onSelect,
  onAdd,
}: ServiceSelectorProps) {
  return (
    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="justify-between"
            style={{ minWidth: '240px' }}
          >
            {selectedService?.name || 'Dienstleistung auswählen'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0">
          <Command>
            <CommandInput placeholder="Dienstleistung suchen..." />
            <CommandEmpty>Keine Dienstleistung gefunden.</CommandEmpty>
            <CommandGroup>
              {services.map(service => (
                <CommandItem key={service.id} onSelect={() => onSelect(service)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedService?.id === service.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {service.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedService && (
        <Button type="button" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      )}
    </div>
  );
}
