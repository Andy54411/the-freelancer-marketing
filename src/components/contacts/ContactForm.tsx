'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Briefcase,
  Calendar,
  Link2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

// Zod Schema for contact validation
const contactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse').or(z.literal('')),
  phone: z.string().optional(),
  type: z.enum(['customer', 'supplier']),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  vatId: z.string().optional(),
  taxNumber: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  birthday: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  xing: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  contact?: Contact;
  onSave: (data: Partial<Contact>) => Promise<void>;
  onCancel: () => void;
  companyId: string;
}

export default function ContactForm({
  contact,
  onSave,
  onCancel,
  companyId: _companyId,
}: ContactFormProps) {
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [photoUrl, _setPhotoUrl] = useState(contact?.photoUrl || '');

  const isEditing = !!contact;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      type: contact?.type || 'customer',
      street: contact?.street || '',
      city: contact?.city || '',
      postalCode: contact?.postalCode || '',
      country: contact?.country || 'Deutschland',
      vatId: contact?.vatId || '',
      taxNumber: contact?.taxNumber || '',
      jobTitle: contact?.jobTitle || '',
      company: contact?.company || '',
      birthday: contact?.birthday || '',
      website: contact?.website || '',
      notes: contact?.notes || '',
      linkedin: contact?.socialProfiles?.linkedin || '',
      twitter: contact?.socialProfiles?.twitter || '',
      xing: contact?.socialProfiles?.xing || '',
    },
  });

  const contactType = watch('type');
  const name = watch('name');

  const initials = name
    ?.split(' ')
    .map(n => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || '';

  const onSubmit = async (data: ContactFormData) => {
    setSaving(true);
    try {
      const contactData: Partial<Contact> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        type: data.type,
        street: data.street,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        vatId: data.vatId,
        taxNumber: data.taxNumber,
        jobTitle: data.jobTitle,
        company: data.company,
        birthday: data.birthday,
        website: data.website,
        notes: data.notes,
        photoUrl: photoUrl,
        socialProfiles: {
          linkedin: data.linkedin,
          twitter: data.twitter,
          xing: data.xing,
        },
        isSupplier: data.type === 'supplier',
      };

      await onSave(contactData);
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
        </h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            disabled={saving || (!isDirty && isEditing)}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Photo & Name Section */}
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-24 w-24">
                <AvatarImage src={photoUrl} />
                <AvatarFallback
                  className={cn(
                    'text-2xl font-medium',
                    contactType === 'supplier'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-teal-100 text-teal-700'
                  )}
                >
                  {initials || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <Button type="button" variant="link" size="sm" className="text-xs">
                Foto ändern
              </Button>
            </div>

            <div className="flex-1 space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Vor- und Nachname oder Firmenname"
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Contact Type */}
              <div>
                <Label>Kontakttyp</Label>
                <Select
                  value={contactType}
                  onValueChange={(value: 'customer' | 'supplier') => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Kunde</SelectItem>
                    <SelectItem value="supplier">Lieferant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Contact Info */}
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Kontaktdaten
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="E-Mail-Adresse"
                    className={cn(errors.email && 'border-red-500')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('phone')}
                  placeholder="Telefonnummer"
                />
              </div>

              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    {...register('jobTitle')}
                    placeholder="Position"
                  />
                  <Input
                    {...register('company')}
                    placeholder="Unternehmen"
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Address */}
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Adresse
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('street')}
                  placeholder="Strasse und Hausnummer"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5" />
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    {...register('postalCode')}
                    placeholder="PLZ"
                  />
                  <Input
                    {...register('city')}
                    placeholder="Stadt"
                    className="col-span-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5" />
                <Select
                  value={watch('country')}
                  onValueChange={(value) => setValue('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Land auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deutschland">Deutschland</SelectItem>
                    <SelectItem value="Österreich">Österreich</SelectItem>
                    <SelectItem value="Schweiz">Schweiz</SelectItem>
                    <SelectItem value="Frankreich">Frankreich</SelectItem>
                    <SelectItem value="Niederlande">Niederlande</SelectItem>
                    <SelectItem value="Belgien">Belgien</SelectItem>
                    <SelectItem value="Luxemburg">Luxemburg</SelectItem>
                    <SelectItem value="Polen">Polen</SelectItem>
                    <SelectItem value="Tschechien">Tschechien</SelectItem>
                    <SelectItem value="Italien">Italien</SelectItem>
                    <SelectItem value="Spanien">Spanien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Advanced Fields (Collapsible) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-0 h-auto font-medium text-gray-500"
              >
                <span className="text-sm uppercase tracking-wider">
                  Geschäftsdaten
                </span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('vatId')}
                  placeholder="USt-IdNr. (z.B. DE123456789)"
                />
              </div>

              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('taxNumber')}
                  placeholder="Steuernummer"
                />
              </div>

              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('website')}
                  placeholder="Website"
                />
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('birthday')}
                  type="date"
                  placeholder="Geburtstag"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Social Profiles (Collapsible) */}
          <Collapsible open={showSocial} onOpenChange={setShowSocial}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-0 h-auto font-medium text-gray-500"
              >
                <span className="text-sm uppercase tracking-wider">
                  Social Media
                </span>
                {showSocial ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('linkedin')}
                  placeholder="LinkedIn Profil-URL"
                />
              </div>

              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('xing')}
                  placeholder="XING Profil-URL"
                />
              </div>

              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-gray-400 shrink-0" />
                <Input
                  {...register('twitter')}
                  placeholder="Twitter/X Profil-URL"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">
              Notizen
            </h3>
            <Textarea
              {...register('notes')}
              placeholder="Zusätzliche Informationen zum Kontakt..."
              rows={4}
            />
          </section>
        </div>
      </ScrollArea>
    </form>
  );
}
