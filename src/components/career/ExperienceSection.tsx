'use client';

import { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Trash2, Briefcase, Upload, FileText } from 'lucide-react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

interface ExperienceSectionProps {
  form: UseFormReturn<ApplicantProfile>;
  onSave: () => void;
  isSubmitting?: boolean;
}

const MONTHS = [
  { value: '01', label: 'Januar' },
  { value: '02', label: 'Februar' },
  { value: '03', label: 'März' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

const YEARS = Array.from({ length: 60 }, (_, i) => (new Date().getFullYear() - i).toString());

export function ExperienceSection({ form, onSave, isSubmitting }: ExperienceSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'experience',
  });

  const toggleEdit = () => {
    if (isEditing) {
      onSave();
    }
    setIsEditing(!isEditing);
  };

  // Helper to parse YYYY-MM-DD or YYYY-MM to { month, year }
  const parseDate = (dateStr?: string) => {
    if (!dateStr) return { month: '', year: '' };
    const parts = dateStr.split('-');
    return {
      year: parts[0] || '',
      month: parts[1] || '',
    };
  };

  // Helper to format date for display
  const formatDateDisplay = (start?: string, end?: string) => {
    const s = parseDate(start);
    const e = parseDate(end);

    const startStr = s.year ? `${s.month}/${s.year}` : '';
    const endStr = end ? `${e.month}/${e.year}` : 'jetzt';

    if (!startStr) return '';
    return `${startStr} - ${endStr}`;
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;

    // Validation
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      toast.error('Nur PDF, JPG, PNG und HEIC Dateien sind erlaubt.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      toast.error('Die Datei darf maximal 5MB groß sein.');
      return;
    }

    setUploadingIndex(index);
    try {
      const userId = form.getValues('userId');
      const storageRef = ref(storage, `users/${userId}/certificates/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      form.setValue(`experience.${index}.certificateUrl`, downloadURL, { shouldDirty: true });
      form.setValue(`experience.${index}.fileName`, file.name, { shouldDirty: true });
      toast.success('Zertifikat erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen des Zertifikats');
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-xl font-semibold">Berufserfahrung</CardTitle>
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
              <p className="text-muted-foreground text-sm italic">
                Keine Berufserfahrung angegeben.
              </p>
            ) : (
              fields.map((field, index) => {
                const values = form.getValues(`experience.${index}`);
                if (!values) return null;
                return (
                  <div
                    key={field.id}
                    className="flex gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="w-[180px] shrink-0 text-sm font-medium text-gray-700 pt-0.5">
                      {formatDateDisplay(values.startDate, values.endDate)}
                    </div>
                    <div className="font-medium text-base text-gray-900">
                      {values.title} , {values.company}
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
              // Watch values for conditional rendering (e.g. "bis heute")
              const endDate = form.watch(`experience.${index}.endDate`);
              const isCurrent = !endDate;

              return (
                <div
                  key={field.id}
                  className="relative bg-white p-6 rounded-lg border-b border-gray-200 last:border-0"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-6 items-start">
                    {/* Date Range Label */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-2">
                      Beginn / Ende *
                    </FormLabel>

                    {/* Date Range Inputs */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Start Date */}
                        <FormField
                          control={form.control}
                          name={`experience.${index}.startDate`}
                          render={({ field }) => {
                            const { month, year } = parseDate(field.value);
                            return (
                              <div className="flex gap-2">
                                <Select
                                  value={month}
                                  onValueChange={m => {
                                    const y = year || new Date().getFullYear().toString();
                                    field.onChange(`${y}-${m}-01`);
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Monat" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MONTHS.map(m => (
                                      <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={year}
                                  onValueChange={y => {
                                    const m = month || '01';
                                    field.onChange(`${y}-${m}-01`);
                                  }}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Jahr" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {YEARS.map(y => (
                                      <SelectItem key={y} value={y}>
                                        {y}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          }}
                        />

                        {/* Separator */}
                        {!isCurrent && <span className="text-gray-400 px-1">/</span>}

                        {/* End Date */}
                        {!isCurrent && (
                          <FormField
                            control={form.control}
                            name={`experience.${index}.endDate`}
                            render={({ field }) => {
                              const { month, year } = parseDate(field.value);
                              return (
                                <div className="flex gap-2">
                                  <Select
                                    value={month}
                                    onValueChange={m => {
                                      const y = year || new Date().getFullYear().toString();
                                      field.onChange(`${y}-${m}-01`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue placeholder="Monat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTHS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>
                                          {m.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={year}
                                    onValueChange={y => {
                                      const m = month || '01';
                                      field.onChange(`${y}-${m}-01`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[100px]">
                                      <SelectValue placeholder="Jahr" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {YEARS.map(y => (
                                        <SelectItem key={y} value={y}>
                                          {y}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            }}
                          />
                        )}
                      </div>

                      {/* Current Checkbox */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`current-${index}`}
                          checked={isCurrent}
                          onCheckedChange={checked => {
                            if (checked) {
                              form.setValue(`experience.${index}.endDate`, undefined);
                            } else {
                              const now = new Date();
                              const m = (now.getMonth() + 1).toString().padStart(2, '0');
                              const y = now.getFullYear().toString();
                              form.setValue(`experience.${index}.endDate`, `${y}-${m}-01`);
                            }
                          }}
                          className="border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`current-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700"
                        >
                          bis heute
                        </label>
                      </div>
                    </div>

                    {/* Position */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">
                      Position *
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name={`experience.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Company */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">
                      Unternehmen *
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name={`experience.${index}.company`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Ort *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`experience.${index}.location`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">
                      Tätigkeitsbeschreibung
                    </FormLabel>
                    <FormField
                      control={form.control}
                      name={`experience.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Textarea {...field} rows={6} className="bg-white resize-y" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Certificate Upload */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">
                      Arbeitszeugnis / Zertifikat
                    </FormLabel>
                    <div className="w-full">
                      {uploadingIndex === index ? (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md bg-gray-50 h-24">
                          <Loader2 className="h-6 w-6 animate-spin text-teal-600 mb-2" />
                          <span className="text-sm text-gray-500">Wird hochgeladen...</span>
                        </div>
                      ) : form.watch(`experience.${index}.certificateUrl`) ? (
                        <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                            <span className="text-sm truncate">
                              {form.watch(`experience.${index}.fileName`) || 'Dokument'}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              form.setValue(`experience.${index}.certificateUrl`, undefined, {
                                shouldDirty: true,
                              });
                              form.setValue(`experience.${index}.fileName`, undefined, {
                                shouldDirty: true,
                              });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic"
                            className="hidden"
                            id={`file-upload-${index}`}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(index, file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById(`file-upload-${index}`)?.click()}
                            className="w-full border-dashed border-2 h-24 flex flex-col gap-2 hover:bg-gray-50 hover:border-teal-500 hover:text-teal-600"
                          >
                            <Upload className="w-6 h-6" />
                            <span>Datei hochladen</span>
                            <span className="text-xs text-gray-400 font-normal">
                              PDF, JPG, PNG (max. 5MB)
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Delete Button (Right aligned under textarea) */}
                    <div className="md:col-start-2 flex justify-end">
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
                onClick={() =>
                  append({
                    title: '',
                    company: '',
                    location: '',
                    startDate: '',
                    description: '',
                  })
                }
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
                  className="bg-teal-600 hover:bg-teal-700 text-white min-w-[100px]"
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
