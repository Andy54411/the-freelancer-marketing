'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X,
  Users,
  UserPlus,
  Search,
  Bot,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (recipients: string[]) => void;
  onCreateSpace?: () => void;
  onSearchSpaces?: () => void;
  onSearchApps?: () => void;
  onMessageRequests?: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | HTMLDivElement | null>;
}

// Mock-Kontakte für Autocomplete (später durch echte Daten ersetzen)
const mockContacts: Array<{
  id: string;
  name: string;
  email: string;
  avatar?: string;
}> = [];

export function NewChatModal({
  isOpen,
  onClose,
  onStartChat,
  onCreateSpace,
  onSearchSpaces,
  onSearchApps,
  onMessageRequests,
  anchorRef,
}: NewChatModalProps) {
  const { isDark } = useWebmailTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [filteredContacts, setFilteredContacts] = useState(mockContacts);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Position berechnen basierend auf Anchor
  useEffect(() => {
    if (isOpen && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [isOpen, anchorRef]);

  // Fokus auf Input setzen wenn Modal öffnet
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Schließen bei Escape oder Klick außerhalb
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        // Prüfen ob Klick auf Anchor war
        if (anchorRef?.current && anchorRef.current.contains(e.target as Node)) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  // Kontakte filtern
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        mockContacts.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredContacts(mockContacts);
    }
  }, [searchQuery]);

  const handleStartChat = () => {
    if (selectedRecipients.length > 0 && onStartChat) {
      onStartChat(selectedRecipients);
      onClose();
    }
  };

  const menuItems = [
    {
      id: 'create-space',
      icon: Users,
      label: 'Gruppenbereich erstellen',
      onClick: () => {
        onCreateSpace?.();
        onClose();
      },
    },
    {
      id: 'search-spaces',
      icon: UserPlus,
      label: 'In Gruppenbereichen suchen',
      onClick: () => {
        onSearchSpaces?.();
        onClose();
      },
    },
    {
      id: 'search-apps',
      icon: Bot,
      label: 'Apps suchen',
      onClick: () => {
        onSearchApps?.();
        onClose();
      },
    },
    {
      id: 'message-requests',
      icon: MessageSquare,
      label: 'Nachrichtenanfragen',
      onClick: () => {
        onMessageRequests?.();
        onClose();
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (transparent, nur für Klick-Erkennung) */}
      <div className="fixed inset-0 z-40" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "fixed z-50 w-[320px] rounded-lg shadow-2xl overflow-hidden",
          isDark ? "bg-[#292a2d]" : "bg-white",
          "border",
          isDark ? "border-white/10" : "border-gray-200"
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Suchfeld */}
        <div className={cn(
          "p-3 border-b",
          isDark ? "border-white/10" : "border-gray-200"
        )}>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            isDark ? "bg-[#3c4043]" : "bg-gray-100"
          )}>
            <Search className={cn(
              "h-4 w-4 shrink-0",
              isDark ? "text-gray-400" : "text-gray-500"
            )} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mindestens eine Person hinzufügen"
              className={cn(
                "flex-1 bg-transparent text-sm outline-none",
                isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-500"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  "p-0.5 rounded-full",
                  isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
                )}
              >
                <X className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
            )}
          </div>
        </div>

        {/* Menüoptionen */}
        <div className="py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  isDark 
                    ? "hover:bg-white/5 text-white" 
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isDark ? "text-gray-400" : "text-gray-500"
                )} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className={cn(
                  "h-4 w-4 opacity-50",
                  isDark ? "text-gray-400" : "text-gray-400"
                )} />
              </button>
            );
          })}
        </div>

        {/* Kontaktliste (wenn Suche aktiv) */}
        {searchQuery && filteredContacts.length > 0 && (
          <div className={cn(
            "border-t py-2 max-h-[200px] overflow-y-auto",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  if (!selectedRecipients.includes(contact.email)) {
                    setSelectedRecipients([...selectedRecipients, contact.email]);
                  }
                  setSearchQuery('');
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                  isDark 
                    ? "hover:bg-white/5 text-white" 
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                  isDark ? "bg-[#3c4043] text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{contact.name}</div>
                  <div className={cn(
                    "text-xs",
                    isDark ? "text-gray-400" : "text-gray-500"
                  )}>
                    {contact.email}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Keine Kontakte gefunden */}
        {searchQuery && filteredContacts.length === 0 && (
          <div className={cn(
            "px-4 py-6 text-center text-sm",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            Keine Kontakte gefunden
          </div>
        )}

        {/* Chat starten Button */}
        <div className={cn(
          "p-3 border-t",
          isDark ? "border-white/10" : "border-gray-200"
        )}>
          <button
            onClick={handleStartChat}
            disabled={selectedRecipients.length === 0 && !searchQuery.includes('@')}
            className={cn(
              "w-full py-2 px-4 rounded-full text-sm font-medium transition-colors",
              selectedRecipients.length > 0 || searchQuery.includes('@')
                ? isDark
                  ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                  : "bg-teal-600 text-white hover:bg-teal-700"
                : isDark
                  ? "bg-[#3c4043] text-gray-500 cursor-not-allowed"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            Chat starten
          </button>
        </div>
      </div>
    </>
  );
}
