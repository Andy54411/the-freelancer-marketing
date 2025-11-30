'use client';

import { useState } from 'react';
import { ApplicantProfile, JobPosting } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileText, Upload, Trash2, Paperclip, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface JobApplicationFormProps {
  job: JobPosting;
  profile: ApplicantProfile;
  userId: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'cv' | 'document';
  selected: boolean;
  source: 'profile' | 'upload';
}

export function JobApplicationForm({ job, profile, userId }: JobApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [salutation, setSalutation] = useState(profile.salutation || 'Herr');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [message, setMessage] = useState('');

  // Attachments State
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    const initial: Attachment[] = [];

    // Add Profile CV if exists
    if (profile.cvUrl) {
      initial.push({
        id: 'profile-cv',
        name: profile.cvName || 'Mein Lebenslauf',
        url: profile.cvUrl,
        type: 'cv',
        selected: true,
        source: 'profile',
      });
    }

    // Add Profile Cover Letter if exists
    if (profile.coverLetterUrl) {
      initial.push({
        id: 'profile-cover-letter',
        name: profile.coverLetterName || 'Mein Anschreiben',
        url: profile.coverLetterUrl,
        type: 'document',
        selected: false,
        source: 'profile',
      });
    }

    // Add Certificates from Experience
    profile.experience?.forEach((exp, index) => {
      if (exp.certificateUrl) {
        initial.push({
          id: `exp-${index}`,
          name: exp.fileName || `Zeugnis - ${exp.company}`,
          url: exp.certificateUrl,
          type: 'document',
          selected: false,
          source: 'profile',
        });
      }
    });

    // Add Certificates from Education
    profile.education?.forEach((edu, index) => {
      if (edu.certificateUrl) {
        initial.push({
          id: `edu-${index}`,
          name: edu.fileName || `Zeugnis - ${edu.institution}`,
          url: edu.certificateUrl,
          type: 'document',
          selected: false,
          source: 'profile',
        });
      }
    });

    // Add Qualifications
    profile.qualifications?.forEach((qual, index) => {
      if (qual.certificateUrl) {
        initial.push({
          id: `qual-${index}`,
          name: qual.fileName || `Zertifikat - ${qual.name}`,
          url: qual.certificateUrl,
          type: 'document',
          selected: false,
          source: 'profile',
        });
      }
    });

    return initial;
  });

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cv' | 'document'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei ist zu groß (Max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const folder = type === 'cv' ? 'application_cvs' : 'application_docs';
      const storageRef = ref(storage, `users/${userId}/${folder}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const newAttachment: Attachment = {
        id: `upload-${Date.now()}`,
        name: file.name,
        url: url,
        type: type,
        selected: true,
        source: 'upload',
      };

      setAttachments(prev => [...prev, newAttachment]);
      toast.success('Datei hochgeladen');
    } catch (error) {
      console.error(error);
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const toggleAttachment = (id: string) => {
    setAttachments(prev =>
      prev.map(att => (att.id === id ? { ...att, selected: !att.selected } : att))
    );
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleSubmit = async () => {
    const selectedCVs = attachments.filter(a => a.type === 'cv' && a.selected);

    if (selectedCVs.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Lebenslauf aus.');
      return;
    }

    if (!email) {
      toast.error('E-Mail Adresse ist erforderlich.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock Submission
      await new Promise(resolve => setTimeout(resolve, 1500));

      const applicationData = {
        jobId: job.id,
        userId,
        personalData: {
          salutation,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email,
          phone,
        },
        attachments: attachments.filter(a => a.selected),
        message,
        submittedAt: new Date().toISOString(),
      };

      console.log('Application Submitted:', applicationData);
      toast.success('Bewerbung erfolgreich versendet!');

      // Redirect to success page or job list
      router.push(`/dashboard/user/${userId}/career/jobs`);
    } catch (error) {
      toast.error('Fehler beim Senden der Bewerbung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cvAttachments = attachments.filter(a => a.type === 'cv');
  const docAttachments = attachments.filter(a => a.type === 'document');

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Bewerbung als {job.title}</h1>
        <p className="text-gray-500">
          {job.companyName} • {job.location}
        </p>
      </div>

      {/* Personal Data */}
      <Card>
        <CardHeader>
          <CardTitle>Persönliche Daten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Anrede</Label>
              <Select value={salutation} onValueChange={setSalutation}>
                <SelectTrigger>
                  <SelectValue />
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
              <Input value={profile.firstName} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Nachname</Label>
              <Input value={profile.lastName} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>
                Telefon <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CV Section */}
      <Card>
        <CardHeader>
          <CardTitle>Lebenslauf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Nutze deinen gespeicherten Lebenslauf oder lade einen neuen hoch.
          </p>

          <div className="space-y-2">
            {cvAttachments.map(att => (
              <div
                key={att.id}
                className={`flex items-center justify-between p-3 border rounded-md ${att.selected ? 'bg-teal-50 border-teal-200' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={att.selected}
                    onCheckedChange={() => toggleAttachment(att.id)}
                    id={`cv-${att.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    <label
                      htmlFor={`cv-${att.id}`}
                      className="text-sm font-medium cursor-pointer hover:underline"
                    >
                      {att.name}
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ansehen
                  </a>
                  {att.source === 'upload' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(att.id)}
                      className="h-8 w-8 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              id="cv-upload-apply"
              onChange={e => handleFileUpload(e, 'cv')}
              disabled={uploading}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('cv-upload-apply')?.click()}
              disabled={uploading}
              className="w-full border-dashed"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Weiteren Lebenslauf hochladen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attachments Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Digitale Anhänge <span className="text-gray-400 font-normal text-base">(optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Nutze deine gespeicherten Dokumente (Zeugnisse, Zertifikate).
          </p>

          <div className="space-y-2">
            {docAttachments.map(att => (
              <div
                key={att.id}
                className={`flex items-center justify-between p-3 border rounded-md ${att.selected ? 'bg-teal-50 border-teal-200' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={att.selected}
                    onCheckedChange={() => toggleAttachment(att.id)}
                    id={`doc-${att.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    <label
                      htmlFor={`doc-${att.id}`}
                      className="text-sm font-medium cursor-pointer hover:underline"
                    >
                      {att.name}
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ansehen
                  </a>
                  {att.source === 'upload' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(att.id)}
                      className="h-8 w-8 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {docAttachments.length === 0 && (
              <div className="text-sm text-gray-400 italic p-2">
                Keine gespeicherten Dokumente gefunden.
              </div>
            )}
          </div>

          <div className="pt-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.png"
              className="hidden"
              id="doc-upload-apply"
              onChange={e => handleFileUpload(e, 'document')}
              disabled={uploading}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('doc-upload-apply')?.click()}
              disabled={uploading}
              className="w-full border-dashed"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Weitere Datei hochladen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Persönliche Nachricht{' '}
            <span className="text-gray-400 font-normal text-base">(optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Schreiben Sie hier Ihre Nachricht an das Unternehmen..."
            className="min-h-[150px]"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="space-y-4">
        <div className="text-xs text-gray-500">
          Es gilt unsere{' '}
          <Link href="/privacy" className="text-teal-600 hover:underline">
            Datenschutzerklärung
          </Link>
          . Deine Bewerbung wird mit {job.companyName} geteilt.
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            className="bg-teal-600 hover:bg-teal-700 text-white w-full md:w-auto"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Bewerbung senden
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
