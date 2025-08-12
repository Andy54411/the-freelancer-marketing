'use client';

import { useState } from 'react';
import type { TicketFilters, TicketStatus, TicketPriority, TicketCategory } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
}

export function TicketFilters({ filters, onFiltersChange }: TicketFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  const statusOptions = [
    { value: 'open', label: 'Offen' },
    { value: 'in-progress', label: 'In Bearbeitung' },
    { value: 'waiting', label: 'Wartend' },
    { value: 'resolved', label: 'Gelöst' },
    { value: 'closed', label: 'Geschlossen' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
    { value: 'urgent', label: 'Dringend' },
  ];

  const categoryOptions = [
    { value: 'bug', label: 'Bug/Fehler' },
    { value: 'feature', label: 'Feature' },
    { value: 'support', label: 'Support' },
    { value: 'billing', label: 'Abrechnung' },
    { value: 'payment', label: 'Zahlung' },
    { value: 'account', label: 'Account' },
    { value: 'technical', label: 'Technisch' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Sonstiges' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, searchTerm: searchTerm.trim() || undefined });
  };

  const toggleArrayFilter = (key: 'status' | 'priority' | 'category', value: string) => {
    if (key === 'status') {
      const currentArray = filters.status || [];
      const newArray = currentArray.includes(value as TicketStatus)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as TicketStatus];
      onFiltersChange({ ...filters, status: newArray.length > 0 ? newArray : undefined });
    } else if (key === 'priority') {
      const currentArray = filters.priority || [];
      const newArray = currentArray.includes(value as TicketPriority)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as TicketPriority];
      onFiltersChange({ ...filters, priority: newArray.length > 0 ? newArray : undefined });
    } else if (key === 'category') {
      const currentArray = filters.category || [];
      const newArray = currentArray.includes(value as TicketCategory)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as TicketCategory];
      onFiltersChange({ ...filters, category: newArray.length > 0 ? newArray : undefined });
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    onFiltersChange({});
  };

  const activeFiltersCount =
    (filters.status?.length || 0) +
    (filters.priority?.length || 0) +
    (filters.category?.length || 0) +
    (filters.searchTerm ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Suchfeld */}
      <form onSubmit={handleSearchSubmit} className="space-y-2">
        <Label htmlFor="search">Suche</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Titel, Beschreibung, E-Mail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            Suchen
          </Button>
        </div>
      </form>

      {/* Filter-Chips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Filter */}
        <div className="space-y-3">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => {
              const isSelected = filters.status?.includes(option.value as TicketStatus);
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('status', option.value)}
                  className={isSelected ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
                >
                  {option.label}
                  {isSelected && <X className="ml-1 h-3 w-3" />}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Priorität Filter */}
        <div className="space-y-3">
          <Label>Priorität</Label>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(option => {
              const isSelected = filters.priority?.includes(option.value as TicketPriority);
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('priority', option.value)}
                  className={isSelected ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
                >
                  {option.label}
                  {isSelected && <X className="ml-1 h-3 w-3" />}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Kategorie Filter */}
        <div className="space-y-3">
          <Label>Kategorie</Label>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(option => {
              const isSelected = filters.category?.includes(option.value as TicketCategory);
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArrayFilter('category', option.value)}
                  className={isSelected ? 'bg-[#14ad9f] hover:bg-[#129488]' : ''}
                >
                  {option.label}
                  {isSelected && <X className="ml-1 h-3 w-3" />}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aktive Filter Übersicht */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Aktive Filter:</span>
            <Badge variant="secondary">{activeFiltersCount} Filter aktiv</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Alle löschen
          </Button>
        </div>
      )}
    </div>
  );
}
