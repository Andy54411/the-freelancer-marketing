'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Upload, Trash2, File } from 'lucide-react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface DocumentsSectionProps {
  form: UseFormReturn<ApplicantProfile>;
  onSave: () => void;
  isSubmitting?: boolean;
}

export function DocumentsSection({ form, onSave, isSubmitting }: DocumentsSectionProps) {
  const [uploadingType, setUploadingType] = useState<'cv' | 'coverLetter' | null>(null);

  const handleFileUpload = async (type: 'cv' | 'coverLetter', file: File) => {
    if (!file) return;

    // Validation
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Nur PDF und Word Dokumente sind erlaubt.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      toast.error('Die Datei darf maximal 5MB groß sein.');
      return;
    }

    setUploadingType(type);
    try {
      const userId = form.getValues('userId');
      const folder = type === 'cv' ? 'cv' : 'cover_letters';
      const storageRef = ref(storage, `users/${userId}/${folder}/${Date.now()}_${file.name}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      if (type === 'cv') {
        form.setValue('cvUrl', downloadURL, { shouldDirty: true });
        form.setValue('cvName', file.name, { shouldDirty: true });
      } else {
        form.setValue('coverLetterUrl', downloadURL, { shouldDirty: true });
        form.setValue('coverLetterName', file.name, { shouldDirty: true });
      }

      toast.success('Dokument erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Dokuments');
    } finally {
      setUploadingType(null);
    }
  };

  const removeFile = (type: 'cv' | 'coverLetter') => {
    if (type === 'cv') {
      form.setValue('cvUrl', undefined, { shouldDirty: true });
      form.setValue('cvName', undefined, { shouldDirty: true });
    } else {
      form.setValue('coverLetterUrl', undefined, { shouldDirty: true });
      form.setValue('coverLetterName', undefined, { shouldDirty: true });
    }
  };

  const cvUrl = form.watch('cvUrl');
  const cvName = form.watch('cvName');
  const coverLetterUrl = form.watch('coverLetterUrl');
  const coverLetterName = form.watch('coverLetterName');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <File className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-xl font-semibold">Dokumente</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* CV Upload */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Lebenslauf</h3>
          <div className="w-full">
            {uploadingType === 'cv' ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md bg-gray-50 h-32">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                <span className="text-sm text-gray-500">Wird hochgeladen...</span>
              </div>
            ) : cvUrl ? (
              <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-white p-2 rounded border">
                    <FileText className="h-6 w-6 text-teal-600 shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{cvName || 'Lebenslauf'}</span>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ansehen
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile('cv')}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="cv-upload"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('cv', file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('cv-upload')?.click()}
                  className="w-full border-dashed border-2 h-32 flex flex-col gap-2 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="font-medium">Lebenslauf hochladen</span>
                  <span className="text-xs text-gray-400 font-normal">
                    PDF, DOC, DOCX (max. 5MB)
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Cover Letter Upload */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Anschreiben</h3>
          <div className="w-full">
            {uploadingType === 'coverLetter' ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md bg-gray-50 h-32">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                <span className="text-sm text-gray-500">Wird hochgeladen...</span>
              </div>
            ) : coverLetterUrl ? (
              <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-white p-2 rounded border">
                    <FileText className="h-6 w-6 text-teal-600 shrink-0" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {coverLetterName || 'Anschreiben'}
                    </span>
                    <a
                      href={coverLetterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ansehen
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile('coverLetter')}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="cover-letter-upload"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('coverLetter', file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('cover-letter-upload')?.click()}
                  className="w-full border-dashed border-2 h-32 flex flex-col gap-2 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="font-medium">Anschreiben hochladen</span>
                  <span className="text-xs text-gray-400 font-normal">
                    PDF, DOC, DOCX (max. 5MB)
                  </span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
