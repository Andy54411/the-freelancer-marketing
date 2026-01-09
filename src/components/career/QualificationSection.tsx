'use client';

import { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Award, UploadCloud, FileText, Eye, X } from 'lucide-react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface QualificationSectionProps {
  form: UseFormReturn<ApplicantProfile>;
  onSave: () => void;
  isSubmitting?: boolean;
}

export function QualificationSection({ form, onSave, isSubmitting }: QualificationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'qualifications',
  });

  const toggleEdit = () => {
    if (isEditing) {
      onSave();
    } else {
      if (fields.length === 0) {
        append({
          name: '',
          issuer: '',
          date: '',
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;

    setUploadingIndex(index);
    try {
      const userId = form.getValues('userId');
      // Create a unique file name
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      // Use a safe path structure
      const storagePath = `users/${userId || 'anonymous'}/qualifications/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update form
      form.setValue(`qualifications.${index}.certificateUrl`, downloadURL, { shouldDirty: true });
      form.setValue(`qualifications.${index}.fileName`, file.name, { shouldDirty: true });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeFile = (index: number) => {
    form.setValue(`qualifications.${index}.certificateUrl`, '', { shouldDirty: true });
    form.setValue(`qualifications.${index}.fileName`, '', { shouldDirty: true });
  };

  const isImage = (fileName?: string) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-xl font-semibold">Fachkenntnisse</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleEdit}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // VIEW MODE
          <div className="space-y-6">
            {fields.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">Keine Fachkenntnisse angegeben.</p>
            ) : (
              fields.map((field, index) => {
                const values = form.getValues(`qualifications.${index}`);
                if (!values) return null;
                return (
                  <div key={field.id} className="flex gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0 items-start">
                    <div className="flex-1">
                      <div className="font-medium text-base text-gray-900">
                        {values.name}
                      </div>
                      {values.certificateUrl && (
                        <div className="mt-2">
                          {isImage(values.fileName) ? (
                            <a href={values.certificateUrl} target="_blank" rel="noopener noreferrer" className="block w-32 h-24 relative border rounded overflow-hidden hover:opacity-90 transition-opacity">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={values.certificateUrl} 
                                alt={values.fileName || 'Zertifikat'} 
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <a href={values.certificateUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                              <FileText className="h-4 w-4" />
                              {values.fileName || 'Zertifikat ansehen'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // EDIT MODE
          <div className="space-y-8">
            {fields.map((field, index) => {
              const certificateUrl = form.watch(`qualifications.${index}.certificateUrl`);
              const fileName = form.watch(`qualifications.${index}.fileName`);

              return (
                <div key={field.id} className="relative bg-white p-6 rounded-lg border-b border-gray-200 last:border-0">
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-6 items-start">
                    
                    {/* Qualification (Qualifikation) */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Qualifikation</FormLabel>
                    <FormField
                      control={form.control}
                      name={`qualifications.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Certificate Upload */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Zertifikat</FormLabel>
                    <div className="w-full">
                      {certificateUrl ? (
                        <div className="flex items-start gap-4 p-3 border rounded-md bg-gray-50">
                          {isImage(fileName) ? (
                            <div className="w-16 h-16 shrink-0 border rounded overflow-hidden bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={certificateUrl} 
                                alt={fileName || 'Preview'} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white border rounded text-gray-400">
                              <FileText className="h-8 w-8" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate" title={fileName}>
                              {fileName}
                            </p>
                            <div className="flex gap-3 mt-1">
                              <a 
                                href={certificateUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" /> Ansehen
                              </a>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1"
                              >
                                <X className="h-3 w-3" /> Entfernen
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id={`file-upload-${index}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(index, file);
                            }}
                          />
                          <label
                            htmlFor={`file-upload-${index}`}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                              uploadingIndex === index ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            {uploadingIndex === index ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UploadCloud className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              {uploadingIndex === index ? 'Wird hochgeladen...' : 'Datei hochladen'}
                            </span>
                          </label>
                          <span className="text-xs text-muted-foreground">
                            PDF, JPG, PNG (max. 5MB)
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Delete Button (Right aligned) */}
                    <div className="md:col-start-2 flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900 hover:bg-transparent font-normal h-auto p-0"
                        onClick={() => remove(index)}
                      >
                        Löschen
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => append({
                  name: '',
                  issuer: '',
                  date: '',
                })}
                className="text-gray-600 hover:text-gray-900 hover:bg-transparent font-normal h-auto p-0"
              >
                Neuer Eintrag
              </Button>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={toggleEdit}
                  className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                >
                  Abbrechen
                </Button>
                <Button 
                  type="button" 
                  onClick={toggleEdit} 
                  disabled={isSubmitting}
                  className="bg-taskilo hover:bg-taskilo-hover text-white min-w-[100px]"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
