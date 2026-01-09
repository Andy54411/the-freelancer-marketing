/**
 * ContactCard Component
 * 
 * Detailkarte für einen Kontakt
 */
'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  Star,
  Copy,
  Check
} from 'lucide-react';

export interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  position?: string;
  address?: string;
  notes?: string;
  avatar?: string;
  avatarUrl?: string;
  isStarred?: boolean;
  isBlocked?: boolean;
  tags?: string[];
  createdAt?: Date | string;
  lastContactedAt?: Date | string;
  lastMessage?: string;
}

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  onMessage?: (contact: Contact) => void;
  onCall?: (contact: Contact) => void;
  onBlock?: (contact: Contact) => void;
  onToggleStar?: (contact: Contact) => void;
  compact?: boolean;
  variant?: 'compact' | 'full';
}

export function ContactCard({ 
  contact, 
  onEdit, 
  onDelete, 
  onMessage,
  onCall: _onCall,
  onBlock,
  onToggleStar,
  compact = false,
  variant = 'compact',
}: ContactCardProps) {
  const isFullVariant = variant === 'full' || !compact;
  const [copied, setCopied] = React.useState<string | null>(null);
  
  // Hilfsfunktion für Avatar-Initial
  const getInitial = (): string => {
    const displayName = contact.name || contact.phone || '?';
    return displayName.charAt(0).toUpperCase();
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium shrink-0 relative overflow-hidden">
          {contact.avatarUrl ? (
            <Image src={contact.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
          ) : (
            getInitial()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{contact.name || contact.phone}</p>
          {contact.company && (
            <p className="text-sm text-gray-500 truncate">{contact.company}</p>
          )}
        </div>
        {onMessage && (
          <button
            onClick={() => onMessage(contact)}
            className="p-2 text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded-full"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (!isFullVariant) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium shrink-0 relative overflow-hidden">
          {contact.avatarUrl || contact.avatar ? (
            <Image src={contact.avatarUrl || contact.avatar || ''} alt="" fill className="rounded-full object-cover" unoptimized />
          ) : (
            getInitial()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{contact.name || contact.phone}</p>
          {contact.company && (
            <p className="text-sm text-gray-500 truncate">{contact.company}</p>
          )}
        </div>
        {onMessage && (
          <button
            onClick={() => onMessage(contact)}
            className="p-2 text-[#14ad9f] hover:bg-[#14ad9f]/10 rounded-full"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative bg-linear-to-r from-[#14ad9f] to-teal-600 px-6 py-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold relative overflow-hidden">
              {contact.avatarUrl ? (
                <Image src={contact.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
              ) : (
                getInitial()
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{contact.name || contact.phone}</h2>
              {contact.position && (
                <p className="text-white/80">{contact.position}</p>
              )}
              {contact.company && (
                <p className="text-white/80 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {contact.company}
                </p>
              )}
            </div>
          </div>
          {onToggleStar && (
            <button
              onClick={() => onToggleStar(contact)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <Star className={`w-5 h-5 ${contact.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white/60'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Phone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Telefon</p>
              <p className="font-medium">{contact.phone}</p>
            </div>
          </div>
          <button
            onClick={() => contact.phone && copyToClipboard(contact.phone, 'phone')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            {copied === 'phone' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Email */}
        {contact.email && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">E-Mail</p>
                <p className="font-medium">{contact.email}</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(contact.email!, 'email')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Address */}
        {contact.address && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Adresse</p>
              <p className="font-medium">{contact.address}</p>
            </div>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {contact.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Notizen</p>
            <p className="text-sm text-gray-700">{contact.notes}</p>
          </div>
        )}

        {/* Timestamps */}
        {(contact.createdAt || contact.lastContactedAt) && (
          <div className="pt-2 border-t text-xs text-gray-400 space-y-1">
            {contact.createdAt && (
              <p className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Erstellt: {formatDate(contact.createdAt)}
              </p>
            )}
            {contact.lastContactedAt && (
              <p className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Letzter Kontakt: {formatDate(contact.lastContactedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {(onEdit || onDelete || onMessage || onBlock) && (
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(contact)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
                Bearbeiten
              </button>
            )}
            {onBlock && (
              <button
                onClick={() => onBlock(contact)}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${
                  contact.isBlocked 
                    ? 'text-green-600 hover:bg-green-50' 
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                {contact.isBlocked ? 'Entsperren' : 'Blockieren'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(contact)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </button>
            )}
          </div>
          {onMessage && (
            <button
              onClick={() => onMessage(contact)}
              className="flex items-center gap-1 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600"
            >
              <MessageSquare className="w-4 h-4" />
              Nachricht
            </button>
          )}
        </div>
      )}
    </div>
  );
}
