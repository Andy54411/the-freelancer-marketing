'use client';

import {
  Star,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
  Tag,
  MoreVertical,
  X,
  Copy,
  FileText,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Customer } from '@/components/finance/AddCustomerModal';

interface Contact extends Customer {
  type: 'customer' | 'supplier';
  starred?: boolean;
  labels?: string[];
  lastContacted?: string;
  photoUrl?: string;
  notes?: string;
  jobTitle?: string;
  company?: string;
  birthday?: string;
  website?: string;
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    xing?: string;
  };
}

interface ContactDetailProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  onStar: () => void;
  onClose: () => void;
}

export default function ContactDetail({
  contact,
  onEdit,
  onDelete,
  onStar,
  onClose,
}: ContactDetailProps) {
  const initials = contact.name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopiert`);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatAddress = () => {
    const parts: string[] = [];
    if (contact.street) parts.push(contact.street);
    if (contact.postalCode || contact.city) {
      parts.push([contact.postalCode, contact.city].filter(Boolean).join(' '));
    }
    if (contact.country && contact.country !== 'Deutschland') {
      parts.push(contact.country);
    }
    return parts.join(', ');
  };

  const address = formatAddress();

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bearbeiten</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onStar}>
                <Star className={cn('h-4 w-4', contact.starred && 'fill-yellow-400 text-yellow-400')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{contact.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => window.print()}>
                <FileText className="h-4 w-4 mr-2" />
                Drucken
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Labels bearbeiten
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="hidden lg:flex">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={contact.photoUrl} />
              <AvatarFallback
                className={cn(
                  'text-2xl font-medium',
                  contact.type === 'supplier'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-teal-100 text-teal-700'
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              {contact.name}
            </h1>
            
            {contact.jobTitle && (
              <p className="text-gray-500">{contact.jobTitle}</p>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {contact.customerNumber}
              </Badge>
              {contact.type === 'supplier' && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  Lieferant
                </Badge>
              )}
              {contact.type === 'customer' && (
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200">
                  Kunde
                </Badge>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mt-6">
              {contact.email && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `mailto:${contact.email}`}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      E-Mail
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{contact.email}</TooltipContent>
                </Tooltip>
              )}
              
              {contact.phone && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `tel:${contact.phone}`}
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      Anrufen
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{contact.phone}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Contact Details */}
          <div className="space-y-6">
            {/* Contact Information */}
            <section>
              <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                Kontaktdaten
              </h3>
              <div className="space-y-4">
                {contact.email && (
                  <DetailRow
                    icon={Mail}
                    label="E-Mail"
                    value={contact.email}
                    onCopy={() => copyToClipboard(contact.email, 'E-Mail')}
                    onClick={() => window.location.href = `mailto:${contact.email}`}
                  />
                )}
                
                {contact.phone && (
                  <DetailRow
                    icon={Phone}
                    label="Telefon"
                    value={contact.phone}
                    onCopy={() => copyToClipboard(contact.phone!, 'Telefonnummer')}
                    onClick={() => window.location.href = `tel:${contact.phone}`}
                  />
                )}

                {address && (
                  <DetailRow
                    icon={MapPin}
                    label="Adresse"
                    value={address}
                    onCopy={() => copyToClipboard(address, 'Adresse')}
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')}
                  />
                )}

                {contact.website && (
                  <DetailRow
                    icon={Globe}
                    label="Website"
                    value={contact.website}
                    onCopy={() => copyToClipboard(contact.website!, 'Website')}
                    onClick={() => window.open(contact.website?.startsWith('http') ? contact.website : `https://${contact.website}`, '_blank')}
                  />
                )}
              </div>
            </section>

            {/* Company Information */}
            {(contact.company || contact.vatId || contact.taxNumber) && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                    Unternehmensdaten
                  </h3>
                  <div className="space-y-4">
                    {contact.company && (
                      <DetailRow
                        icon={Building2}
                        label="Unternehmen"
                        value={contact.company}
                        onCopy={() => copyToClipboard(contact.company!, 'Unternehmen')}
                      />
                    )}
                    
                    {contact.vatId && (
                      <DetailRow
                        icon={FileText}
                        label="USt-IdNr."
                        value={contact.vatId}
                        onCopy={() => copyToClipboard(contact.vatId!, 'USt-IdNr.')}
                        validated={contact.vatValidated}
                      />
                    )}
                    
                    {contact.taxNumber && (
                      <DetailRow
                        icon={FileText}
                        label="Steuernummer"
                        value={contact.taxNumber}
                        onCopy={() => copyToClipboard(contact.taxNumber!, 'Steuernummer')}
                      />
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Social Profiles */}
            {contact.socialProfiles && Object.values(contact.socialProfiles).some(Boolean) && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                    Social Media
                  </h3>
                  <div className="space-y-4">
                    {contact.socialProfiles.linkedin && (
                      <DetailRow
                        icon={Link2}
                        label="LinkedIn"
                        value={contact.socialProfiles.linkedin}
                        onClick={() => window.open(contact.socialProfiles!.linkedin, '_blank')}
                      />
                    )}
                    {contact.socialProfiles.xing && (
                      <DetailRow
                        icon={Link2}
                        label="XING"
                        value={contact.socialProfiles.xing}
                        onClick={() => window.open(contact.socialProfiles!.xing, '_blank')}
                      />
                    )}
                    {contact.socialProfiles.twitter && (
                      <DetailRow
                        icon={Link2}
                        label="Twitter/X"
                        value={contact.socialProfiles.twitter}
                        onClick={() => window.open(contact.socialProfiles!.twitter, '_blank')}
                      />
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Statistics */}
            {(contact.totalInvoices > 0 || contact.totalAmount > 0) && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                    Statistiken
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {contact.totalInvoices}
                      </p>
                      <p className="text-sm text-gray-500">
                        {contact.type === 'supplier' ? 'Ausgaben' : 'Rechnungen'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(contact.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {contact.type === 'supplier' ? 'Ausgaben' : 'Umsatz'}
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Notes */}
            {contact.notes && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                    Notizen
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                </section>
              </>
            )}

            {/* Labels */}
            {contact.labels && contact.labels.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
                    Labels
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.labels.map(label => (
                      <Badge key={label} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {label}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <section className="text-sm text-gray-400">
              <p>Erstellt am: {formatDate(contact.createdAt)}</p>
              {contact.lastContacted && (
                <p>Letzter Kontakt: {formatDate(contact.lastContacted)}</p>
              )}
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Detail Row Component
function DetailRow({
  icon: Icon,
  label,
  value,
  onCopy,
  onClick,
  validated,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onCopy?: () => void;
  onClick?: () => void;
  validated?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-gray-900',
              onClick && 'text-teal-600 hover:underline cursor-pointer'
            )}
            onClick={onClick}
          >
            {value}
          </p>
          {validated !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                validated
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              )}
            >
              {validated ? 'Validiert' : 'Nicht validiert'}
            </Badge>
          )}
        </div>
      </div>
      {onCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4 text-gray-400" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kopieren</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
