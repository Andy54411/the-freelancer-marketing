'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Search, MapPin, Bell, Mail, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Kategorien (kompatibel mit Flutter App)
const CATEGORIES = [
  'Hotel & Gastronomie',
  'Küche',
  'Service',
  'Rezeption',
  'Housekeeping',
  'Management',
  'Verwaltung',
  'Technik',
  'Wellness & Spa',
  'Events & Bankett',
  'Sonstiges',
];

// Jobtypen (kompatibel mit Flutter App)
const JOB_TYPES = [
  'Vollzeit',
  'Teilzeit',
  'Aushilfe',
  'Ausbildung',
  'Praktikum',
  'Minijob',
  'Freelance',
];

// Schema für neues Jobfinder-Format
const jobfinderSchema = z.object({
  name: z.string().min(1, 'Bitte gib einen Namen ein'),
  searchTerm: z.string().optional(),
  location: z.string().optional(),
  radiusKm: z.number().min(5).max(200),
  category: z.string().optional(),
  jobType: z.string().optional(),
  pushNotification: z.boolean(),
  emailNotification: z.boolean(),
});

type JobfinderFormValues = z.infer<typeof jobfinderSchema>;

interface Props {
  userEmail?: string;
  userId?: string;
}

export const JobfinderFormSimple = ({ userEmail, userId }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JobfinderFormValues>({
    resolver: zodResolver(jobfinderSchema),
    defaultValues: {
      name: 'Mein Jobfinder',
      searchTerm: '',
      location: '',
      radiusKm: 50,
      category: '',
      jobType: '',
      pushNotification: true,
      emailNotification: !!userEmail,
    },
  });

  const onSubmit = async (data: JobfinderFormValues) => {
    if (!userId) {
      toast.error('Du musst eingeloggt sein, um einen Jobfinder zu erstellen.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Speichere im neuen Format (kompatibel mit Flutter App und Cloud Function)
      await addDoc(collection(db, 'users', userId, 'jobfinder'), {
        ...data,
        userId,
        active: true,
        matchCount: 0,
        lastNotifiedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success('Jobfinder erfolgreich erstellt!');
      
      // Reset form
      form.reset({
        name: 'Mein Jobfinder',
        searchTerm: '',
        location: '',
        radiusKm: 50,
        category: '',
        jobType: '',
        pushNotification: true,
        emailNotification: !!userEmail,
      });
    } catch (error) {
      console.error('Error saving jobfinder:', error);
      toast.error('Fehler beim Speichern des Jobfinders.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name des Jobfinders</Label>
        <Input
          id="name"
          placeholder="z.B. Koch Jobs in Berlin"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Suchbegriff */}
      <div className="space-y-2">
        <Label htmlFor="searchTerm" className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          Suchbegriff (optional)
        </Label>
        <Input
          id="searchTerm"
          placeholder="z.B. Koch, Kellner, Rezeptionist"
          {...form.register('searchTerm')}
        />
      </div>

      {/* Standort und Radius */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            Standort (optional)
          </Label>
          <Input
            id="location"
            placeholder="z.B. Berlin, München"
            {...form.register('location')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="radiusKm">Umkreis (km)</Label>
          <Select
            value={form.watch('radiusKm').toString()}
            onValueChange={(v) => form.setValue('radiusKm', parseInt(v, 10))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
              <SelectItem value="100">100 km</SelectItem>
              <SelectItem value="200">200 km</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kategorie und Jobtyp */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kategorie (optional)</Label>
          <Select
            value={form.watch('category') || ''}
            onValueChange={(v) => form.setValue('category', v === 'alle' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Kategorien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Kategorien</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Jobtyp (optional)</Label>
          <Select
            value={form.watch('jobType') || ''}
            onValueChange={(v) => form.setValue('jobType', v === 'alle' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Alle Jobtypen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Jobtypen</SelectItem>
              {JOB_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Benachrichtigungen */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900">Benachrichtigungen</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#14ad9f]" />
            <Label htmlFor="pushNotification" className="cursor-pointer">
              Push-Benachrichtigungen
            </Label>
          </div>
          <Switch
            id="pushNotification"
            checked={form.watch('pushNotification')}
            onCheckedChange={(checked) => form.setValue('pushNotification', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <Label htmlFor="emailNotification" className="cursor-pointer">
              E-Mail-Benachrichtigungen
            </Label>
          </div>
          <Switch
            id="emailNotification"
            checked={form.watch('emailNotification')}
            onCheckedChange={(checked) => form.setValue('emailNotification', checked)}
          />
        </div>
        
        {form.watch('emailNotification') && (
          <p className="text-xs text-gray-500">
            Benachrichtigungen werden an {userEmail} gesendet.
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-[#14ad9f] hover:bg-[#0d9488]"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Jobfinder erstellen
      </Button>
    </form>
  );
};
