/**
 * SearchMessages Component
 * 
 * Suche in Nachrichten einer Konversation
 */
'use client';

import React from 'react';
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

interface SearchResult {
  messageId: string;
  text: string;
  timestamp: Date | string;
  matchIndex: number;
}

interface SearchMessagesProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onNavigateToResult: (messageId: string) => void;
}

export function SearchMessages({ isOpen, onClose, onSearch, onNavigateToResult }: SearchMessagesProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isSearching, setIsSearching] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset when closed
  React.useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
        setCurrentIndex(0);
        
        // Navigate to first result
        if (searchResults.length > 0) {
          onNavigateToResult(searchResults[0].messageId);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onSearch, onNavigateToResult]);

  const navigatePrevious = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    setCurrentIndex(newIndex);
    onNavigateToResult(results[newIndex].messageId);
  };

  const navigateNext = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onNavigateToResult(results[newIndex].messageId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        navigatePrevious();
      } else {
        navigateNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const highlightMatch = (text: string, matchIndex: number) => {
    const queryLen = query.length;
    const before = text.slice(Math.max(0, matchIndex - 20), matchIndex);
    const match = text.slice(matchIndex, matchIndex + queryLen);
    const after = text.slice(matchIndex + queryLen, matchIndex + queryLen + 20);

    return (
      <>
        {matchIndex > 20 && '...'}
        {before}
        <span className="bg-yellow-200 font-medium">{match}</span>
        {after}
        {matchIndex + queryLen + 20 < text.length && '...'}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="In Nachrichten suchen..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Result Counter */}
        {results.length > 0 && (
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {currentIndex + 1} von {results.length}
          </span>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center">
          <button
            onClick={navigatePrevious}
            disabled={results.length === 0}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={navigateNext}
            disabled={results.length === 0}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Results Preview (optional) */}
      {results.length > 0 && query && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-100">
          {results.slice(0, 5).map((result, index) => (
            <button
              key={result.messageId}
              onClick={() => {
                setCurrentIndex(index);
                onNavigateToResult(result.messageId);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                index === currentIndex ? 'bg-[#14ad9f]/5' : ''
              }`}
            >
              <p className="text-gray-700 truncate">
                {highlightMatch(result.text, result.matchIndex)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {typeof result.timestamp === 'string' 
                  ? new Date(result.timestamp).toLocaleString('de-DE')
                  : result.timestamp.toLocaleString('de-DE')
                }
              </p>
            </button>
          ))}
          {results.length > 5 && (
            <p className="px-4 py-2 text-xs text-gray-400 text-center">
              +{results.length - 5} weitere Ergebnisse
            </p>
          )}
        </div>
      )}

      {/* No Results */}
      {query && !isSearching && results.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500 text-center border-t border-gray-100">
          Keine Nachrichten gefunden
        </div>
      )}
    </div>
  );
}
