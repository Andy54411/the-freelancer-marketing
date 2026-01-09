'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { InvoiceService, InvoiceServiceDraft, ServiceSelectionProps } from '@/types/service';

export interface ExtendedServiceSelectionProps extends ServiceSelectionProps {
  isLoading?: boolean;
  error?: string;
  services: InvoiceService[];
}

export const ServiceSelection: React.FC<ExtendedServiceSelectionProps> = ({
  selectedService,
  onServiceSelect,
  onServiceCreate,
  isLoading = false,
  error,
  services = [],
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [filteredServices, setFilteredServices] = useState<InvoiceService[]>(services);
  const inputRef = useRef<HTMLInputElement>(null);

  const [_newServiceDraft, _setNewServiceDraft] = useState<InvoiceServiceDraft>({
    name: '',
    description: '',
    price: '',
    unit: 'Stk',
  });

  useEffect(() => {
    if (selectedService) {
      setSearchValue(selectedService.name);
    }
  }, [selectedService]);

  useEffect(() => {
    setFilteredServices(
      services.filter(
        service =>
          service.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (service.description?.toLowerCase() || '').includes(searchValue.toLowerCase())
      )
    );
  }, [services, searchValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (!open && value.trim()) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (services.length > 0) {
      setOpen(true);
    }
  };

  const handleServiceSelect = (service: InvoiceService) => {
    onServiceSelect(service);
    setSearchValue(service.name);
    setOpen(false);
  };

  const handleCreateNew = async () => {
    if (onServiceCreate && searchValue.trim()) {
      setIsCreatingNew(true);
      try {
        await onServiceCreate({
          ..._newServiceDraft,
          name: searchValue,
        });
        setIsCreatingNew(false);
        setOpen(false);
      } catch (error) {
        setIsCreatingNew(false);
        // Hier könnte ein Toast oder eine andere Fehlerbehandlung implementiert werden
        console.error('Fehler beim Erstellen des Service:', error);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Dienstleistung suchen oder neue erstellen..."
              className="flex-1"
            />
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-10 p-0"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Suchen..."
            />
            <CommandEmpty className="p-2">
              {searchValue && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleCreateNew}
                  disabled={isCreatingNew}
                >
                  {isCreatingNew ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Neue Dienstleistung erstellen
                </Button>
              )}
            </CommandEmpty>
            {error ? (
              <div className="p-4 text-sm text-red-500">{error}</div>
            ) : isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Lade Dienstleistungen...</span>
              </div>
            ) : (
              <CommandGroup heading="Gespeicherte Dienstleistungen">
                {filteredServices.map(service => (
                  <CommandItem
                    key={service.id}
                    onSelect={() => handleServiceSelect(service)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span>{service.name}</span>
                      {service.description && (
                        <span className="text-sm text-gray-500">{service.description}</span>
                      )}
                    </div>
                    {selectedService?.id === service.id && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </CommandItem>
                ))}
                {filteredServices.length === 0 && !searchValue && (
                  <div className="p-2 text-sm text-gray-500">Keine Dienstleistungen gefunden</div>
                )}
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
