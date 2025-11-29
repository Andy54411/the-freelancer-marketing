'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApplicantProfileSchema, type ApplicantProfile } from '@/types/career';
import { saveApplicantProfile } from '@/app/actions/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  uid: string;
  initialData?: any;
}

export function ApplicantProfileForm({ uid, initialData }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ApplicantProfile>({
    resolver: zodResolver(ApplicantProfileSchema),
    defaultValues: initialData || {
      userId: uid,
      firstName: '',
      lastName: '',
      email: '',
      location: '',
      skills: [],
      experience: [],
      education: [],
    },
  });

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
    control: form.control,
    name: 'experience',
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control: form.control,
    name: 'education',
  });

  // Helper for skills (comma separated string <-> array)
  const [skillsInput, setSkillsInput] = useState(initialData?.skills?.join(', ') || '');

  const onSubmit = async (data: ApplicantProfile) => {
    setIsSaving(true);
    try {
      // Parse skills from string
      const skillsArray = skillsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      data.skills = skillsArray;
      data.userId = uid;
      data.updatedAt = new Date().toISOString();

      const result = await saveApplicantProfile(data);
      if (result.success) {
        toast.success('Profil erfolgreich gespeichert');
      } else {
        toast.error(result.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input id="firstName" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input id="lastName" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (Optional)</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Standort (Stadt, Land)</Label>
            <Input id="location" {...form.register('location')} placeholder="z.B. Berlin, Deutschland" />
            {form.formState.errors.location && (
              <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Über mich (Kurzprofil)</Label>
            <Textarea id="bio" {...form.register('bio')} placeholder="Beschreiben Sie sich kurz..." />
            {form.formState.errors.bio && (
              <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Fähigkeiten (Kommagetrennt)</Label>
            <Input 
              id="skills" 
              value={skillsInput} 
              onChange={(e) => setSkillsInput(e.target.value)} 
              placeholder="z.B. React, TypeScript, Project Management" 
            />
            <p className="text-xs text-gray-500">Trennen Sie Fähigkeiten mit einem Komma.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Berufserfahrung</CardTitle>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => appendExp({ title: '', company: '', location: '', startDate: '', description: '' })}
          >
            <Plus className="mr-2 h-4 w-4" /> Hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {expFields.map((field, index) => (
            <div key={field.id} className="relative space-y-4 border p-4 rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                onClick={() => removeExp(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jobtitel</Label>
                  <Input {...form.register(`experience.${index}.title`)} placeholder="z.B. Senior Developer" />
                  {form.formState.errors.experience?.[index]?.title && (
                    <p className="text-sm text-red-500">{form.formState.errors.experience[index]?.title?.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Unternehmen</Label>
                  <Input {...form.register(`experience.${index}.company`)} placeholder="z.B. Tech Corp GmbH" />
                  {form.formState.errors.experience?.[index]?.company && (
                    <p className="text-sm text-red-500">{form.formState.errors.experience[index]?.company?.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ort</Label>
                <Input {...form.register(`experience.${index}.location`)} placeholder="z.B. Berlin" />
                {form.formState.errors.experience?.[index]?.location && (
                  <p className="text-sm text-red-500">{form.formState.errors.experience[index]?.location?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  <Input type="date" {...form.register(`experience.${index}.startDate`)} />
                </div>
                <div className="space-y-2">
                  <Label>Enddatum (Leer lassen für "Aktuell")</Label>
                  <Input type="date" {...form.register(`experience.${index}.endDate`)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea {...form.register(`experience.${index}.description`)} placeholder="Ihre Aufgaben und Erfolge..." />
              </div>
            </div>
          ))}
          {expFields.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4">Keine Berufserfahrung eingetragen.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ausbildung</CardTitle>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => appendEdu({ degree: '', institution: '', location: '', startDate: '', endDate: '', description: '' })}
          >
            <Plus className="mr-2 h-4 w-4" /> Hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {eduFields.map((field, index) => (
            <div key={field.id} className="relative space-y-4 border p-4 rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                onClick={() => removeEdu(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Abschluss / Zertifikat</Label>
                  <Input {...form.register(`education.${index}.degree`)} placeholder="z.B. B.Sc. Informatik" />
                  {form.formState.errors.education?.[index]?.degree && (
                    <p className="text-sm text-red-500">{form.formState.errors.education[index]?.degree?.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Input {...form.register(`education.${index}.institution`)} placeholder="z.B. TU Berlin" />
                  {form.formState.errors.education?.[index]?.institution && (
                    <p className="text-sm text-red-500">{form.formState.errors.education[index]?.institution?.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ort</Label>
                <Input {...form.register(`education.${index}.location`)} placeholder="z.B. Berlin" />
                {form.formState.errors.education?.[index]?.location && (
                  <p className="text-sm text-red-500">{form.formState.errors.education[index]?.location?.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Startdatum</Label>
                  <Input type="date" {...form.register(`education.${index}.startDate`)} />
                  {form.formState.errors.education?.[index]?.startDate && (
                    <p className="text-sm text-red-500">{form.formState.errors.education[index]?.startDate?.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Enddatum (Optional)</Label>
                  <Input type="date" {...form.register(`education.${index}.endDate`)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschreibung (Optional)</Label>
                <Textarea {...form.register(`education.${index}.description`)} placeholder="Schwerpunkte, Abschlussarbeit..." />
              </div>
            </div>
          ))}
          {eduFields.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-4">Keine Ausbildung eingetragen.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links & Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profil URL</Label>
            <Input id="linkedinUrl" {...form.register('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
            {form.formState.errors.linkedinUrl && (
              <p className="text-sm text-red-500">{form.formState.errors.linkedinUrl.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolioUrl">Portfolio / Website URL</Label>
            <Input id="portfolioUrl" {...form.register('portfolioUrl')} placeholder="https://..." />
            {form.formState.errors.portfolioUrl && (
              <p className="text-sm text-red-500">{form.formState.errors.portfolioUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Profil speichern
        </Button>
      </div>
    </form>
  );
}
