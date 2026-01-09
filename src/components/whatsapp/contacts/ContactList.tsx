/**
 * ContactList Component
 * 
 * Liste von Kontakten
 */
'use client';

import React from 'react';
import Image from 'next/image';
import { Search, Plus, User, Phone, Building2, Loader2 } from 'lucide-react';
import { type Contact } from './ContactCard';

export type { Contact };

interface ContactListProps {
  contacts: Contact[];
  isLoading?: boolean;
  onSelect?: (contact: Contact) => void;
  onAdd?: () => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  selectedId?: string;
  searchable?: boolean;
  selectable?: boolean;
  variant?: 'default' | 'compact';
}

export function ContactList({
  contacts,
  isLoading,
  onSelect,
  onAdd,
  onEdit: _onEdit,
  onDelete: _onDelete,
  selectedId,
  searchable = true,
  selectable = false,
  variant: _variant = 'default',
}: ContactListProps) {
  const [search, setSearch] = React.useState('');

  const filteredContacts = React.useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  // Gruppiere nach Anfangsbuchstaben
  const groupedContacts = React.useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    
    filteredContacts.forEach(contact => {
      const firstLetter = (contact.name || contact.phone || '#').charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredContacts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#14ad9f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Kontakte</h2>
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          )}
        </div>

        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kontakte suchen..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
            />
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            {search ? (
              <>
                <p className="font-medium">Keine Ergebnisse</p>
                <p className="text-sm">Für &ldquo;{search}&rdquo; wurden keine Kontakte gefunden</p>
              </>
            ) : (
              <>
                <p className="font-medium">Keine Kontakte</p>
                <p className="text-sm">Fügen Sie Ihren ersten Kontakt hinzu</p>
              </>
            )}
          </div>
        ) : (
          <div>
            {groupedContacts.map(([letter, contactGroup]) => (
              <div key={letter}>
                <div className="sticky top-0 px-4 py-1 bg-gray-50 text-xs font-semibold text-gray-500">
                  {letter}
                </div>
                <div>
                  {contactGroup.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => onSelect?.(contact)}
                      className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedId === contact.id 
                          ? 'bg-[#14ad9f]/10' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium relative overflow-hidden">
                          {contact.avatarUrl ? (
                            <Image 
                              src={contact.avatarUrl} 
                              alt={contact.name || ''} 
                              fill
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            (contact.name || contact.phone || '?').charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {contact.name || contact.phone}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </span>
                            )}
                            {contact.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {contact.company}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checkbox for selection */}
                        {selectable && (
                          <input
                            type="checkbox"
                            checked={selectedId === contact.id}
                            onChange={() => onSelect?.(contact)}
                            className="w-4 h-4 text-[#14ad9f] rounded"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 text-center">
        {filteredContacts.length} Kontakt{filteredContacts.length !== 1 ? 'e' : ''}
      </div>
    </div>
  );
}
