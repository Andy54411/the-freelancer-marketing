'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface SearchFilters {
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  doesNotHave: string;
  sizeOperator: 'greater' | 'less';
  sizeValue: string;
  sizeUnit: 'MB' | 'KB' | 'Bytes';
  dateWithin: '1day' | '3days' | '1week' | '2weeks' | '1month' | '3months' | '6months' | '1year' | 'custom';
  date: Date | undefined;
  searchIn: 'all' | 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam';
  hasAttachment: boolean;
  excludeChats: boolean;
}

interface MailSearchFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  onCreateFilter?: (filters: SearchFilters) => void;
  mailboxes?: Array<{ path: string; name: string }>;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

const defaultFilters: SearchFilters = {
  from: '',
  to: '',
  subject: '',
  hasWords: '',
  doesNotHave: '',
  sizeOperator: 'greater',
  sizeValue: '',
  sizeUnit: 'MB',
  dateWithin: '1day',
  date: undefined,
  searchIn: 'all',
  hasAttachment: false,
  excludeChats: false,
};

export function MailSearchFilter({
  isOpen,
  onClose,
  onSearch,
  onCreateFilter,
  mailboxes = [],
  anchorRef,
}: MailSearchFilterProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
    onClose();
  };

  const handleCreateFilter = () => {
    if (onCreateFilter) {
      onCreateFilter(filters);
    }
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden"
      style={{ maxWidth: '720px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">Erweiterte Suche</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Schließen"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Filter Form */}
      <div className="p-4 space-y-4">
        {/* Von */}
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-from" className="w-40 text-right text-sm text-gray-600 shrink-0">
            Von
          </Label>
          <Input
            id="filter-from"
            type="text"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            placeholder="Absender eingeben"
            className="flex-1 h-9"
          />
        </div>

        {/* An */}
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-to" className="w-40 text-right text-sm text-gray-600 shrink-0">
            An
          </Label>
          <Input
            id="filter-to"
            type="text"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            placeholder="Empfänger eingeben"
            className="flex-1 h-9"
          />
        </div>

        {/* Betreff */}
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-subject" className="w-40 text-right text-sm text-gray-600 shrink-0">
            Betreff
          </Label>
          <Input
            id="filter-subject"
            type="text"
            value={filters.subject}
            onChange={(e) => updateFilter('subject', e.target.value)}
            placeholder="Betreff eingeben"
            className="flex-1 h-9"
          />
        </div>

        {/* Enthält die Wörter */}
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-hasWords" className="w-40 text-right text-sm text-gray-600 shrink-0">
            Enthält die Wörter
          </Label>
          <Input
            id="filter-hasWords"
            type="text"
            value={filters.hasWords}
            onChange={(e) => updateFilter('hasWords', e.target.value)}
            placeholder="Wörter eingeben"
            className="flex-1 h-9"
          />
        </div>

        {/* Enthält nicht */}
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-doesNotHave" className="w-40 text-right text-sm text-gray-600 shrink-0">
            Enthält nicht
          </Label>
          <Input
            id="filter-doesNotHave"
            type="text"
            value={filters.doesNotHave}
            onChange={(e) => updateFilter('doesNotHave', e.target.value)}
            placeholder="Ausgeschlossene Wörter"
            className="flex-1 h-9"
          />
        </div>

        {/* Größe */}
        <div className="flex items-center gap-4">
          <Label className="w-40 text-right text-sm text-gray-600 shrink-0">
            Größe
          </Label>
          <div className="flex items-center gap-2 flex-1">
            <Select
              value={filters.sizeOperator}
              onValueChange={(value: 'greater' | 'less') => updateFilter('sizeOperator', value)}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="greater">Größer als</SelectItem>
                <SelectItem value="less">Kleiner als</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={filters.sizeValue}
              onChange={(e) => updateFilter('sizeValue', e.target.value)}
              placeholder="0"
              className="w-24 h-9"
            />
            <Select
              value={filters.sizeUnit}
              onValueChange={(value: 'MB' | 'KB' | 'Bytes') => updateFilter('sizeUnit', value)}
            >
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MB">MB</SelectItem>
                <SelectItem value="KB">KB</SelectItem>
                <SelectItem value="Bytes">Bytes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Zeitraum */}
        <div className="flex items-center gap-4">
          <Label className="w-40 text-right text-sm text-gray-600 shrink-0">
            Zeitraum
          </Label>
          <div className="flex items-center gap-2 flex-1">
            <Select
              value={filters.dateWithin}
              onValueChange={(value: SearchFilters['dateWithin']) => updateFilter('dateWithin', value)}
            >
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">1 Tag</SelectItem>
                <SelectItem value="3days">3 Tage</SelectItem>
                <SelectItem value="1week">1 Woche</SelectItem>
                <SelectItem value="2weeks">2 Wochen</SelectItem>
                <SelectItem value="1month">1 Monat</SelectItem>
                <SelectItem value="3months">3 Monate</SelectItem>
                <SelectItem value="6months">6 Monate</SelectItem>
                <SelectItem value="1year">1 Jahr</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-40 h-9 justify-start text-left font-normal',
                    !filters.date && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {filters.date ? format(filters.date, 'dd.MM.yyyy', { locale: de }) : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.date}
                  onSelect={(date) => {
                    updateFilter('date', date);
                    setShowDatePicker(false);
                  }}
                  locale={de}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Suchen in */}
        <div className="flex items-center gap-4">
          <Label className="w-40 text-right text-sm text-gray-600 shrink-0">
            Suchen in
          </Label>
          <Select
            value={filters.searchIn}
            onValueChange={(value: SearchFilters['searchIn']) => updateFilter('searchIn', value)}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Nachrichten</SelectItem>
              <SelectItem value="inbox">Posteingang</SelectItem>
              <SelectItem value="sent">Gesendet</SelectItem>
              <SelectItem value="drafts">Entwürfe</SelectItem>
              <SelectItem value="trash">Papierkorb</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              {mailboxes.map((mailbox) => (
                <SelectItem key={mailbox.path} value={mailbox.path}>
                  {mailbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-4">
          <div className="w-40 shrink-0" />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-attachment"
                checked={filters.hasAttachment}
                onCheckedChange={(checked) => updateFilter('hasAttachment', checked === true)}
              />
              <Label htmlFor="filter-attachment" className="text-sm text-gray-600 cursor-pointer">
                Mit Anhang
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-excludeChats"
                checked={filters.excludeChats}
                onCheckedChange={(checked) => updateFilter('excludeChats', checked === true)}
              />
              <Label htmlFor="filter-excludeChats" className="text-sm text-gray-600 cursor-pointer">
                Chats ausklammern
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleCreateFilter}
          className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors"
        >
          Filter erstellen
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-600"
          >
            Zurücksetzen
          </Button>
          <Button
            size="sm"
            onClick={handleSearch}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6"
          >
            Suchen
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function to build IMAP search criteria from filters
export function buildSearchCriteria(filters: SearchFilters): string[] {
  const criteria: string[] = [];

  if (filters.from) {
    criteria.push(`FROM "${filters.from}"`);
  }

  if (filters.to) {
    criteria.push(`TO "${filters.to}"`);
  }

  if (filters.subject) {
    criteria.push(`SUBJECT "${filters.subject}"`);
  }

  if (filters.hasWords) {
    // Split words and search in body
    const words = filters.hasWords.split(/\s+/).filter(Boolean);
    words.forEach(word => {
      criteria.push(`TEXT "${word}"`);
    });
  }

  if (filters.doesNotHave) {
    const words = filters.doesNotHave.split(/\s+/).filter(Boolean);
    words.forEach(word => {
      criteria.push(`NOT TEXT "${word}"`);
    });
  }

  if (filters.sizeValue) {
    const size = parseInt(filters.sizeValue, 10);
    if (!isNaN(size)) {
      let sizeInBytes = size;
      if (filters.sizeUnit === 'KB') sizeInBytes = size * 1024;
      if (filters.sizeUnit === 'MB') sizeInBytes = size * 1024 * 1024;

      if (filters.sizeOperator === 'greater') {
        criteria.push(`LARGER ${sizeInBytes}`);
      } else {
        criteria.push(`SMALLER ${sizeInBytes}`);
      }
    }
  }

  if (filters.date) {
    const dateStr = format(filters.date, 'dd-MMM-yyyy', { locale: de });
    
    // Calculate date range based on dateWithin
    const daysMap: Record<string, number> = {
      '1day': 1,
      '3days': 3,
      '1week': 7,
      '2weeks': 14,
      '1month': 30,
      '3months': 90,
      '6months': 180,
      '1year': 365,
    };

    const days = daysMap[filters.dateWithin] || 1;
    const startDate = new Date(filters.date);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = format(startDate, 'dd-MMM-yyyy', { locale: de });

    criteria.push(`SINCE ${startDateStr}`);
    criteria.push(`BEFORE ${dateStr}`);
  }

  if (filters.hasAttachment) {
    // IMAP doesn't have direct attachment search, but we can use HEADER
    criteria.push('HEADER Content-Type "multipart/mixed"');
  }

  return criteria;
}

// Helper function to filter messages client-side
export function filterMessagesClientSide(
  messages: Array<{
    uid: number;
    subject: string;
    from: Array<{ name?: string; address: string }>;
    to?: Array<{ name?: string; address: string }>;
    date: string;
    size?: number;
    hasAttachment?: boolean;
    text?: string;
  }>,
  filters: SearchFilters
): typeof messages {
  return messages.filter(msg => {
    // From filter
    if (filters.from) {
      const fromMatch = msg.from.some(
        f => 
          f.address.toLowerCase().includes(filters.from.toLowerCase()) ||
          f.name?.toLowerCase().includes(filters.from.toLowerCase())
      );
      if (!fromMatch) return false;
    }

    // To filter
    if (filters.to && msg.to) {
      const toMatch = msg.to.some(
        t => 
          t.address.toLowerCase().includes(filters.to.toLowerCase()) ||
          t.name?.toLowerCase().includes(filters.to.toLowerCase())
      );
      if (!toMatch) return false;
    }

    // Subject filter
    if (filters.subject) {
      if (!msg.subject.toLowerCase().includes(filters.subject.toLowerCase())) {
        return false;
      }
    }

    // Has words filter (search in subject and text)
    if (filters.hasWords) {
      const words = filters.hasWords.toLowerCase().split(/\s+/).filter(Boolean);
      const searchText = `${msg.subject} ${msg.text || ''}`.toLowerCase();
      const hasAllWords = words.every(word => searchText.includes(word));
      if (!hasAllWords) return false;
    }

    // Does not have filter
    if (filters.doesNotHave) {
      const words = filters.doesNotHave.toLowerCase().split(/\s+/).filter(Boolean);
      const searchText = `${msg.subject} ${msg.text || ''}`.toLowerCase();
      const hasAnyWord = words.some(word => searchText.includes(word));
      if (hasAnyWord) return false;
    }

    // Size filter
    if (filters.sizeValue && msg.size) {
      const size = parseInt(filters.sizeValue, 10);
      if (!isNaN(size)) {
        let sizeInBytes = size;
        if (filters.sizeUnit === 'KB') sizeInBytes = size * 1024;
        if (filters.sizeUnit === 'MB') sizeInBytes = size * 1024 * 1024;

        if (filters.sizeOperator === 'greater' && msg.size <= sizeInBytes) {
          return false;
        }
        if (filters.sizeOperator === 'less' && msg.size >= sizeInBytes) {
          return false;
        }
      }
    }

    // Date filter - use selected date or today as reference
    if (filters.dateWithin !== '1day' || filters.date) {
      const msgDate = new Date(msg.date);
      const filterDate = filters.date ? new Date(filters.date) : new Date();
      
      const daysMap: Record<string, number> = {
        '1day': 1,
        '3days': 3,
        '1week': 7,
        '2weeks': 14,
        '1month': 30,
        '3months': 90,
        '6months': 180,
        '1year': 365,
      };

      const days = daysMap[filters.dateWithin] || 1;
      const startDate = new Date(filterDate);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      
      // Set filter date to end of day
      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);

      if (msgDate < startDate || msgDate > endDate) {
        return false;
      }
    }

    // Has attachment filter
    if (filters.hasAttachment && !msg.hasAttachment) {
      return false;
    }

    // Exclude chats filter - filter out messages that look like chat/instant messages
    if (filters.excludeChats) {
      const chatIndicators = [
        'chat@',
        'hangouts',
        'gchat',
        'slack',
        'teams',
        'whatsapp',
        'telegram',
        'messenger'
      ];
      const fromAddress = msg.from[0]?.address?.toLowerCase() || '';
      const subject = msg.subject.toLowerCase();
      
      const isChat = chatIndicators.some(indicator => 
        fromAddress.includes(indicator) || subject.includes(indicator)
      );
      
      if (isChat) return false;
    }

    return true;
  });
}
