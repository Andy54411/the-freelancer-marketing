'use client';

import { ArrowLeft, Star, Trash2, Mail, Phone, MapPin, Calendar, Link, MessageSquare, Video, MoreVertical, Copy, Printer, Plus, Tag, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Avatar colors like Google
const AVATAR_COLORS = [
  'bg-red-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500',
  'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500',
  'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-amber-500',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export interface ContactData {
  id: string;
  email: string;
  name: string;
  lastContacted: string;
  contactCount: number;
  source: 'sent' | 'received' | 'both';
  starred?: boolean;
  company?: string;
  jobTitle?: string;
  phones?: { value: string; label: string }[];
  phone?: string;
  address?: string;
  birthday?: string;
  website?: string;
  notes?: string;
  labels?: string[];
}

interface ViewContactPanelProps {
  isOpen: boolean;
  contact: ContactData | null;
  onClose: () => void;
  onEdit: (contact: ContactData) => void;
  onDelete: (contact: ContactData) => void;
  onStar: (contact: ContactData) => void;
}

export function ViewContactPanel({ 
  isOpen, 
  contact, 
  onClose, 
  onEdit, 
  onDelete, 
  onStar 
}: ViewContactPanelProps) {
  if (!isOpen || !contact) return null;

  const displayName = contact.name || contact.email.split('@')[0];
  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert`);
  };

  // Get phones array (support both old and new format)
  const phones = contact.phones || (contact.phone ? [{ value: contact.phone, label: 'Mobil' }] : []);

  return (
    <div className="flex-1 bg-white flex flex-col h-full">
      {/* Header - wie Google */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
              onClick={onClose}
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zurück</TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
                onClick={() => onStar(contact)}
              >
                <Star className={cn(
                  'h-5 w-5',
                  contact.starred 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-gray-400'
                )} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {contact.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            </TooltipContent>
          </Tooltip>
          
          <Button 
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 h-9 rounded-full font-medium"
            onClick={() => onEdit(contact)}
          >
            Bearbeiten
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 rounded-full hover:bg-gray-100"
                onClick={() => onDelete(contact)}
              >
                <Trash2 className="h-5 w-5 text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Löschen</TooltipContent>
          </Tooltip>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full hover:bg-gray-100">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyToClipboard(JSON.stringify(contact, null, 2), 'Kontaktdaten')}>
                <Copy className="h-4 w-4 mr-2" />
                Exportieren
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(contact)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-8 py-6">
          {/* Profile Section - Avatar links, Name rechts */}
          <div className="flex items-start gap-6 mb-8">
            {/* Avatar mit Plus-Button */}
            <div className="relative">
              <Avatar className={cn('h-[120px] w-[120px]', getAvatarColor(displayName))}>
                <AvatarFallback className="text-white text-5xl font-light">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Plus Button für Foto */}
              <button
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center shadow-md"
              >
                <Plus className="h-5 w-5 text-white" />
              </button>
            </div>
            
            {/* Name */}
            <div className="pt-8">
              <h1 className="text-2xl font-normal text-gray-900">
                {displayName}
              </h1>
            </div>
          </div>

          {/* Action Buttons - wie Google */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
            <button 
              className="flex flex-col items-center gap-2 group"
              onClick={() => window.location.href = `/webmail?compose=true&to=${contact.email}`}
            >
              <div className="h-12 w-12 rounded-full border border-gray-300 flex items-center justify-center group-hover:bg-gray-50">
                <Mail className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">E-Mail verfassen</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-full border border-gray-300 flex items-center justify-center group-hover:bg-gray-50">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">Termin</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-full border border-gray-300 flex items-center justify-center group-hover:bg-gray-50">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">Chat</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 group">
              <div className="h-12 w-12 rounded-full border border-gray-300 flex items-center justify-center group-hover:bg-gray-50 opacity-50">
                <Video className="h-5 w-5 text-gray-400" />
              </div>
              <span className="text-xs text-gray-400">Video</span>
            </button>
          </div>

          {/* Label Button */}
          <div className="mb-6">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Plus className="h-4 w-4" />
              Label
            </button>
          </div>

          {/* Kontaktdaten Section */}
          <div className="bg-[#f8fafc] rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Kontaktdaten
            </h3>
            
            {/* E-Mail */}
            {contact.email ? (
              <div 
                className="flex items-center gap-4 py-2 cursor-pointer hover:bg-gray-100 rounded -mx-2 px-2"
                onClick={() => window.location.href = `mailto:${contact.email}`}
              >
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-teal-600">{contact.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-teal-600 cursor-pointer hover:underline">
                  E-Mail-Adresse hinzufügen
                </span>
              </div>
            )}

            {/* Telefonnummern */}
            {phones.length > 0 ? (
              phones.map((phone, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 py-2 cursor-pointer hover:bg-gray-100 rounded -mx-2 px-2"
                  onClick={() => window.location.href = `tel:${phone.value}`}
                >
                  <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-teal-600">{phone.value}</span>
                    <span className="text-sm text-gray-500">
                      {phone.label}
                    </span>
                  </div>
                </div>
              ))
            ) : null}

            {/* Adresse */}
            {contact.address && (
              <div 
                className="flex items-center gap-4 py-2 cursor-pointer hover:bg-gray-100 rounded -mx-2 px-2"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(contact.address!)}`, '_blank')}
              >
                <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-teal-600">{contact.address}</span>
              </div>
            )}

            {/* Website */}
            {contact.website && (
              <div 
                className="flex items-center gap-4 py-2 cursor-pointer hover:bg-gray-100 rounded -mx-2 px-2"
                onClick={() => window.open(contact.website!.startsWith('http') ? contact.website : `https://${contact.website}`, '_blank')}
              >
                <Link className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-teal-600">{contact.website}</span>
              </div>
            )}

            {/* Geburtstag */}
            {contact.birthday ? (
              <div className="flex items-center gap-4 py-2">
                <Cake className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-900">{contact.birthday}</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <Cake className="h-5 w-5 text-gray-400 shrink-0" />
                <span className="text-sm text-teal-600 cursor-pointer hover:underline">
                  Geburtsdatum hinzufügen
                </span>
              </div>
            )}
          </div>

          {/* Labels Section */}
          {contact.labels && contact.labels.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {contact.labels.map((label, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
