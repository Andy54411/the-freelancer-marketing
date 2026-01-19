'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X,
  Search,
  UserPlus,
  Check,
  Users,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMembers?: (members: Contact[]) => void;
  spaceName?: string;
  existingMemberIds?: string[];
}

// Leeres Array außerhalb der Komponente für stabile Referenz
const EMPTY_MEMBER_IDS: string[] = [];

export function AddMembersModal({
  isOpen,
  onClose,
  onAddMembers,
  spaceName = 'Gruppenbereich',
  existingMemberIds,
}: AddMembersModalProps) {
  const { isDark } = useWebmailTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Stabile Referenz für existingMemberIds
  const stableExistingMemberIds = useMemo(
    () => existingMemberIds ?? EMPTY_MEMBER_IDS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingMemberIds?.join(',')]
  );

  // Kontakte beim Öffnen laden
  useEffect(() => {
    if (!isOpen) return;
    
    const loadContacts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/webmail/contacts');
        if (response.ok) {
          const data = await response.json();
          const loadedContacts: Contact[] = (data.contacts || []).map((c: { 
            id?: string; 
            resourceName?: string; 
            names?: Array<{ displayName?: string }>; 
            emailAddresses?: Array<{ value?: string }>; 
            photos?: Array<{ url?: string }>;
          }) => ({
            id: c.id || c.resourceName || '',
            name: c.names?.[0]?.displayName || '',
            email: c.emailAddresses?.[0]?.value || '',
            avatar: c.photos?.[0]?.url,
          })).filter((c: Contact) => c.email && !stableExistingMemberIds.includes(c.id));
          setContacts(loadedContacts);
          setFilteredContacts(loadedContacts);
        }
      } catch {
        // Fehler beim Laden ignorieren
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContacts();
    setSearchQuery('');
    setSelectedContacts([]);
  }, [isOpen, stableExistingMemberIds]);

  // Fokus auf Input setzen wenn Modal öffnet
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Schließen bei Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  // Kontakte filtern
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (contact) =>
            contact.name.toLowerCase().includes(query) ||
            contact.email.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const toggleContact = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleAddMembers = () => {
    if (selectedContacts.length > 0 && onAddMembers) {
      onAddMembers(selectedContacts);
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            "w-full max-w-lg rounded-xl shadow-2xl overflow-hidden",
            isDark ? "bg-[#292a2d]" : "bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isDark ? "bg-[#8ab4f8]/20" : "bg-teal-50"
              )}>
                <UserPlus className={cn(
                  "h-5 w-5",
                  isDark ? "text-[#8ab4f8]" : "text-teal-600"
                )} />
              </div>
              <div>
                <h2 className={cn(
                  "text-lg font-medium",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Mitglieder hinzufügen
                </h2>
                <p className={cn(
                  "text-sm",
                  isDark ? "text-gray-400" : "text-gray-500"
                )}>
                  zu {spaceName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
              )}
            >
              <X className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
            </button>
          </div>

          {/* Suchleiste */}
          <div className={cn(
            "px-6 py-4 border-b",
            isDark ? "border-white/10" : "border-gray-100"
          )}>
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg",
              isDark ? "bg-[#3c4043]" : "bg-gray-100"
            )}>
              <Search className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name oder E-Mail-Adresse eingeben"
                className={cn(
                  "flex-1 bg-transparent text-base outline-none",
                  isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                )}
              />
            </div>
          </div>

          {/* Ausgewählte Kontakte */}
          {selectedContacts.length > 0 && (
            <div className={cn(
              "px-6 py-3 border-b flex flex-wrap gap-2",
              isDark ? "border-white/10 bg-[#202124]" : "border-gray-100 bg-gray-50"
            )}>
              {selectedContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                    isDark 
                      ? "bg-[#8ab4f8]/20 text-[#8ab4f8] hover:bg-[#8ab4f8]/30" 
                      : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                  )}
                >
                  <span>{contact.name || contact.email}</span>
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* Kontaktliste */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className={cn(
                "flex items-center justify-center py-12",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                  <span>Kontakte werden geladen...</span>
                </div>
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="py-2">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.some(c => c.id === contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleContact(contact)}
                      className={cn(
                        "w-full flex items-center gap-4 px-6 py-3 transition-colors",
                        isSelected
                          ? isDark ? "bg-[#8ab4f8]/10" : "bg-teal-50"
                          : isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        {contact.avatar ? (
                          <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium",
                            getAvatarColor(contact.name || contact.email)
                          )}>
                            {getInitials(contact.name || contact.email)}
                          </div>
                        )}
                        {isSelected && (
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                            isDark ? "bg-[#8ab4f8]" : "bg-teal-500"
                          )}>
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <div className={cn(
                          "font-medium",
                          isDark ? "text-white" : "text-gray-900"
                        )}>
                          {contact.name || 'Kein Name'}
                        </div>
                        <div className={cn(
                          "text-sm flex items-center gap-1",
                          isDark ? "text-gray-400" : "text-gray-500"
                        )}>
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </div>
                      </div>

                      {/* Checkbox Indikator */}
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? isDark ? "border-[#8ab4f8] bg-[#8ab4f8]" : "border-teal-500 bg-teal-500"
                          : isDark ? "border-gray-500" : "border-gray-300"
                      )}>
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : contacts.length === 0 ? (
              <div className={cn(
                "flex flex-col items-center justify-center py-12",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">Keine Kontakte vorhanden</p>
                <p className="text-sm mt-1">Füge zuerst Kontakte hinzu</p>
              </div>
            ) : (
              <div className={cn(
                "flex flex-col items-center justify-center py-12",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                <Search className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">Keine Ergebnisse</p>
                <p className="text-sm mt-1">Versuche einen anderen Suchbegriff</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-t",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <span className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              {selectedContacts.length} {selectedContacts.length === 1 ? 'Person' : 'Personen'} ausgewählt
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-colors",
                  isDark 
                    ? "text-[#8ab4f8] hover:bg-[#8ab4f8]/10" 
                    : "text-teal-600 hover:bg-teal-50"
                )}
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedContacts.length === 0}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedContacts.length > 0
                    ? isDark
                      ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                      : "bg-teal-600 text-white hover:bg-teal-700"
                    : isDark
                      ? "bg-[#3c4043] text-gray-500 cursor-not-allowed"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
