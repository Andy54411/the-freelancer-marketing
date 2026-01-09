/**
 * QuickReplies Component
 * 
 * Zeigt Schnellantworten im Chat-Composer an
 */
'use client';

import React from 'react';
import { Search, Plus, Zap, X } from 'lucide-react';

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  usageCount?: number;
}

interface QuickRepliesProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (quickReply: QuickReply) => void;
  searchQuery?: string;
}

export function QuickReplies({ companyId, isOpen, onClose, onSelect, searchQuery = '' }: QuickRepliesProps) {
  const [quickReplies, setQuickReplies] = React.useState<QuickReply[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  const [isLoading, setIsLoading] = React.useState(false);

  // Lade Schnellantworten
  React.useEffect(() => {
    const loadQuickReplies = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/whatsapp/quick-replies?companyId=${companyId}`);
        const data = await response.json();
        
        if (data.success) {
          setQuickReplies(data.quickReplies);
          setCategories(data.categories || []);
        }
      } catch {
        // Fehler beim Laden
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && companyId) {
      loadQuickReplies();
    }
  }, [isOpen, companyId]);

  // Aktualisiere lokale Suche wenn extern geändert
  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Filtere Schnellantworten
  const filteredReplies = React.useMemo(() => {
    let filtered = quickReplies;
    
    if (selectedCategory) {
      filtered = filtered.filter(qr => qr.category === selectedCategory);
    }
    
    if (localSearch) {
      const searchLower = localSearch.toLowerCase();
      filtered = filtered.filter(qr => 
        qr.shortcut.toLowerCase().includes(searchLower) ||
        qr.title.toLowerCase().includes(searchLower) ||
        qr.content.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [quickReplies, selectedCategory, localSearch]);

  // Ermittle ob Suche ein Shortcut ist (beginnt mit /)
  const isShortcutSearch = localSearch.startsWith('/');
  const shortcutMatch = isShortcutSearch 
    ? quickReplies.find(qr => qr.shortcut.toLowerCase() === localSearch.toLowerCase())
    : null;

  const handleSelect = async (quickReply: QuickReply) => {
    // Nutzungszähler erhöhen
    try {
      await fetch('/api/whatsapp/quick-replies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          quickReplyId: quickReply.id,
        }),
      });
    } catch {
      // Ignoriere Fehler beim Zähler
    }
    
    onSelect(quickReply);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-[400px] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#14ad9f]" />
            <span className="font-medium text-sm">Schnellantworten</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        {/* Suchfeld */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Suchen oder /shortcut eingeben..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
            autoFocus
          />
        </div>

        {/* Kategorie-Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mt-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                !selectedCategory 
                  ? 'bg-[#14ad9f] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  selectedCategory === category 
                    ? 'bg-[#14ad9f] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Shortcut-Match (Hervorhebung) */}
      {shortcutMatch && (
        <div 
          className="p-3 bg-[#14ad9f]/5 border-b border-[#14ad9f]/10 cursor-pointer hover:bg-[#14ad9f]/10"
          onClick={() => handleSelect(shortcutMatch)}
        >
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#14ad9f] text-white text-xs rounded font-mono">
              {shortcutMatch.shortcut}
            </span>
            <span className="font-medium text-sm">{shortcutMatch.title}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{shortcutMatch.content}</p>
        </div>
      )}

      {/* Liste */}
      <div className="overflow-y-auto max-h-[280px]">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin w-5 h-5 border-2 border-[#14ad9f] border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">Keine Schnellantworten gefunden</p>
            <button className="mt-2 text-[#14ad9f] text-sm flex items-center gap-1 mx-auto">
              <Plus className="w-4 h-4" />
              Neue erstellen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReplies.map(qr => (
              <div
                key={qr.id}
                onClick={() => handleSelect(qr)}
                className="p-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                    {qr.shortcut}
                  </span>
                  <span className="font-medium text-sm flex-1 truncate">{qr.title}</span>
                  {qr.usageCount && qr.usageCount > 0 && (
                    <span className="text-xs text-gray-400">{qr.usageCount}x</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{qr.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
