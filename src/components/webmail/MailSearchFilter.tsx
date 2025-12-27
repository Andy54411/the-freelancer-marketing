'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

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
  const { isDark } = useWebmailTheme();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking on Select dropdown content (rendered in portal)
      if (target.closest('[data-radix-select-content]') || 
          target.closest('[data-radix-popper-content-wrapper]') ||
          target.closest('[role="listbox"]')) {
        return;
      }
      
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
      className={cn(
        "absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl border z-50 overflow-hidden max-h-[85vh] md:max-h-none overflow-y-auto",
        isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200"
      )}
      style={{ maxWidth: '720px' }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b sticky top-0 z-10",
        isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
      )}>
        <span className={cn("text-xs md:text-sm font-medium", isDark ? "text-white" : "text-gray-700")}>Erweiterte Suche</span>
        <button
          onClick={onClose}
          className={cn(
            "p-1 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
          )}
          aria-label="Schliessen"
        >
          <X className={cn("h-4 w-4", isDark ? "text-white" : "text-gray-500")} />
        </button>
      </div>

      {/* Filter Form - Mobile optimized with stacked layout */}
      <div className="p-3 md:p-4 space-y-2.5 md:space-y-3">
        {/* Von */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label htmlFor="filter-from" className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Von
          </Label>
          <Input
            id="filter-from"
            type="text"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            placeholder="Absender"
            className={cn("flex-1 h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
          />
        </div>

        {/* An */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label htmlFor="filter-to" className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            An
          </Label>
          <Input
            id="filter-to"
            type="text"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            placeholder="Empfänger"
            className={cn("flex-1 h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
          />
        </div>

        {/* Betreff */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label htmlFor="filter-subject" className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Betreff
          </Label>
          <Input
            id="filter-subject"
            type="text"
            value={filters.subject}
            onChange={(e) => updateFilter('subject', e.target.value)}
            placeholder="Betreff"
            className={cn("flex-1 h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
          />
        </div>

        {/* Enthält die Wörter */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label htmlFor="filter-hasWords" className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Enthält
          </Label>
          <Input
            id="filter-hasWords"
            type="text"
            value={filters.hasWords}
            onChange={(e) => updateFilter('hasWords', e.target.value)}
            placeholder="Wörter"
            className={cn("flex-1 h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
          />
        </div>

        {/* Enthält nicht */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label htmlFor="filter-doesNotHave" className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Ohne
          </Label>
          <Input
            id="filter-doesNotHave"
            type="text"
            value={filters.doesNotHave}
            onChange={(e) => updateFilter('doesNotHave', e.target.value)}
            placeholder="Ausgeschlossen"
            className={cn("flex-1 h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
          />
        </div>

        {/* Größe */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Größe
          </Label>
          <div className="grid grid-cols-3 gap-2 w-full">
            <Select
              value={filters.sizeOperator}
              onValueChange={(value: 'greater' | 'less') => updateFilter('sizeOperator', value)}
            >
              <SelectTrigger size="sm" className={cn("w-full text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                <SelectItem value="greater" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Größer</SelectItem>
                <SelectItem value="less" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Kleiner</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={filters.sizeValue}
              onChange={(e) => updateFilter('sizeValue', e.target.value)}
              placeholder="0"
              style={{ height: '32px' }}
              className={cn("w-full text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-white" : "")}
            />
            <Select
              value={filters.sizeUnit}
              onValueChange={(value: 'MB' | 'KB' | 'Bytes') => updateFilter('sizeUnit', value)}
            >
              <SelectTrigger size="sm" className={cn("w-full text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                <SelectItem value="MB" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>MB</SelectItem>
                <SelectItem value="KB" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>KB</SelectItem>
                <SelectItem value="Bytes" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Zeitraum */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Zeitraum
          </Label>
          <div className="flex items-center gap-2 w-full">
            <Select
              value={filters.dateWithin}
              onValueChange={(value: SearchFilters['dateWithin']) => updateFilter('dateWithin', value)}
            >
              <SelectTrigger className={cn("w-[100px] h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
                <SelectItem value="1day" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>1 Tag</SelectItem>
                <SelectItem value="3days" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>3 Tage</SelectItem>
                <SelectItem value="1week" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>1 Woche</SelectItem>
                <SelectItem value="2weeks" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>2 Wochen</SelectItem>
                <SelectItem value="1month" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>1 Monat</SelectItem>
                <SelectItem value="3months" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>3 Monate</SelectItem>
                <SelectItem value="6months" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>6 Monate</SelectItem>
                <SelectItem value="1year" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>1 Jahr</SelectItem>
                <SelectItem value="custom" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Datum</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[120px] h-8 justify-start text-left font-normal text-xs',
                    !filters.date && 'text-muted-foreground',
                    isDark ? 'bg-[#3c4043] border-[#5f6368] text-white hover:bg-[#4c4f53]' : ''
                  )}
                >
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {filters.date ? format(filters.date, 'dd.MM.yy', { locale: de }) : 'Datum'}
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
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <Label className={cn("md:w-32 text-xs md:text-right md:shrink-0", isDark ? "text-white" : "text-gray-600")}>
            Ordner
          </Label>
          <Select
            value={filters.searchIn}
            onValueChange={(value: SearchFilters['searchIn']) => updateFilter('searchIn', value)}
          >
            <SelectTrigger className={cn("w-full h-8 text-xs", isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={cn(isDark && "bg-[#2d2e30] border-[#5f6368]")}>
              <SelectItem value="all" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Alle</SelectItem>
              <SelectItem value="inbox" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Posteingang</SelectItem>
              <SelectItem value="sent" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Gesendet</SelectItem>
              <SelectItem value="drafts" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Entwürfe</SelectItem>
              <SelectItem value="trash" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Papierkorb</SelectItem>
              <SelectItem value="spam" className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>Spam</SelectItem>
              {mailboxes.map((mailbox) => (
                <SelectItem key={mailbox.path} value={mailbox.path} className={cn(isDark && "text-white hover:bg-[#3c4043] focus:bg-[#3c4043]")}>
                  {mailbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div className="hidden md:block md:w-32 md:shrink-0" />
          <div className="flex items-center gap-4 md:gap-6">
            <label htmlFor="filter-attachment" className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="filter-attachment"
                checked={filters.hasAttachment}
                onChange={(e) => updateFilter('hasAttachment', e.target.checked)}
                className={cn(
                  "h-4 w-4 rounded text-teal-600 focus:ring-teal-500",
                  isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-300"
                )}
              />
              <span className={cn("text-xs", isDark ? "text-white" : "text-gray-600")}>Anhang</span>
            </label>
            <label htmlFor="filter-excludeChats" className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="filter-excludeChats"
                checked={filters.excludeChats}
                onChange={(e) => updateFilter('excludeChats', e.target.checked)}
                className={cn(
                  "h-4 w-4 rounded text-teal-600 focus:ring-teal-500",
                  isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-300"
                )}
              />
              <span className={cn("text-xs", isDark ? "text-white" : "text-gray-600")}>Ohne Chats</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        "flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-t sticky bottom-0",
        isDark ? "border-[#5f6368] bg-[#3c4043]" : "border-gray-200 bg-gray-50"
      )}>
        <button
          onClick={handleCreateFilter}
          className={cn(
            "text-xs hover:underline transition-colors",
            isDark ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700"
          )}
        >
          Filter erstellen
        </button>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className={cn("text-xs h-8 px-3", isDark ? "text-white hover:bg-white/10" : "text-gray-600")}
          >
            Zurücksetzen
          </Button>
          <Button
            size="sm"
            onClick={handleSearch}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 text-xs h-8"
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
