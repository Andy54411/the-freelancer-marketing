'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Clock, Calendar, Upload, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { JobPosting, ApplicantProfile } from '@/types/career';

interface ApplicationFormProps {
  job: JobPosting;
  profile: ApplicantProfile | null;
  userId: string;
}

export function ApplicationForm({ job, profile, userId }: ApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [salutation, setSalutation] = useState(profile?.salutation || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [message, setMessage] = useState('');
  
  // Document State
  const [selectedCv, setSelectedCv] = useState<string>('');
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);

  // Derive documents from profile
  const existingAttachments = profile?.qualifications?.map((q, index) => ({
    id: `qual-${index}`,
    name: q.fileName || q.name,
    date: q.date
  })) || [];

  // Currently no dedicated CV storage in profile, so empty list
  // TODO: Add dedicated CV storage to ApplicantProfile
  const existingCvs: { id: string, name: string, date?: string }[] = [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call actual API here
      /*
      await fetch('/api/career/apply', {
        method: 'POST',
        body: JSON.stringify({ ... })
      });
      */

      toast.success('Bewerbung erfolgreich versendet!');
      router.push(`/dashboard/user/${userId}/career/jobs`);
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Senden der Bewerbung');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Company & Job Header */}
      <Card className="overflow-hidden border-l-4 border-l-teal-600">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
              {/* Placeholder for Logo - in real app use job.companyLogoUrl */}
              <span className="text-2xl font-bold text-gray-300">{job.companyName.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">{job.companyName}</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{job.title}</h1>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {job.type}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(job.postedAt).toLocaleDateString('de-DE')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Data */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Persönliche Daten</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Anrede</Label>
              <Select value={salutation} onValueChange={setSalutation}>
                <SelectTrigger>
                  <SelectValue placeholder="--- bitte auswählen ---" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Herr">Herr</SelectItem>
                  <SelectItem value="Frau">Frau</SelectItem>
                  <SelectItem value="Divers">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Vorname</Label>
              <Input value={profile?.firstName || ''} disabled className="bg-gray-50" />
            </div>
            
            <div className="space-y-2">
              <Label>Nachname</Label>
              <Input value={profile?.lastName || ''} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Telefon <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CV Selection */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Lebenslauf</h2>
          <p className="text-sm text-gray-500">Nutze deinen gespeicherten Lebenslauf</p>

          <RadioGroup value={selectedCv} onValueChange={setSelectedCv} className="space-y-3">
            {existingCvs.length > 0 ? existingCvs.map((cv) => (
              <div key={cv.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={cv.id} id={cv.id} />
                  <Label htmlFor={cv.id} className="font-medium cursor-pointer flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {cv.name}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-gray-400 hover:text-teal-600">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500 italic">Keine gespeicherten Lebensläufe gefunden.</div>
            )}
          </RadioGroup>

          <div className="mt-4">
            <Button variant="outline" type="button" className="w-full border-dashed border-2 h-24 flex flex-col gap-2 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600">
              <Upload className="w-6 h-6" />
              <span>Neuen Lebenslauf hochladen</span>
              <span className="text-xs text-gray-400 font-normal">PDF, DOC, DOCX (max. 5MB)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-baseline border-b pb-2">
            <h2 className="text-lg font-semibold">Digitale Anhänge</h2>
            <span className="text-sm text-gray-400">optional</span>
          </div>
          <p className="text-sm text-gray-500">Nutze deine gespeicherten Dokumente</p>

          <div className="space-y-3">
            {existingAttachments.length > 0 ? existingAttachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={att.id} 
                    checked={selectedAttachments.includes(att.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedAttachments([...selectedAttachments, att.id]);
                      else setSelectedAttachments(selectedAttachments.filter(id => id !== att.id));
                    }}
                  />
                  <Label htmlFor={att.id} className="font-medium cursor-pointer flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {att.name}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-gray-400 hover:text-teal-600">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500 italic">Keine gespeicherten Anhänge gefunden.</div>
            )}
          </div>

          <div className="mt-4">
            <Button variant="outline" type="button" className="w-full border-dashed border-2 h-24 flex flex-col gap-2 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600">
              <Upload className="w-6 h-6" />
              <span>Weitere Dateien hochladen</span>
              <span className="text-xs text-gray-400 font-normal">Zeugnisse, Zertifikate, etc.</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personal Message */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-baseline border-b pb-2">
            <h2 className="text-lg font-semibold">Persönliche Nachricht</h2>
            <span className="text-sm text-gray-400">optional</span>
          </div>
          
          <Textarea 
            placeholder="Schreiben Sie hier Ihre Nachricht an das Unternehmen..." 
            className="min-h-[150px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Footer / Submit */}
      <div className="space-y-4">
        <p className="text-xs text-gray-500 text-center">
          Es gilt unsere <a href="#" className="underline hover:text-teal-600">Datenschutzerklärung</a>. 
          Deine Bewerbung wird mit {job.companyName} geteilt.
        </p>
        
        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Abbrechen
          </Button>
          <Button type="submit" size="lg" className="bg-teal-600 hover:bg-teal-700 min-w-[200px]" disabled={isSubmitting}>
            {isSubmitting ? 'Wird gesendet...' : 'Bewerbung senden'}
          </Button>
        </div>
      </div>

    </form>
  );
}
