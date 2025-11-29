'use client';

import { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, GraduationCap } from 'lucide-react';

interface EducationSectionProps {
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

const YEARS = Array.from({ length: 60 }, (_, i) => (new Date().getFullYear() - i + 5).toString()); // +5 to allow future graduation dates

export function EducationSection({ form, onSave, isSubmitting }: EducationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'education',
  });

  const toggleEdit = () => {
    if (isEditing) {
      onSave();
    } else {
      // If entering edit mode and no fields exist, add one automatically
      if (fields.length === 0) {
        append({
          degree: '',
          institution: '',
          location: '',
          startDate: '',
        });
      }
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

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-xl font-semibold">Bildungsweg</CardTitle>
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
              <p className="text-muted-foreground text-sm italic">Kein Bildungsweg angegeben.</p>
            ) : (
              fields.map((field, index) => {
                const values = form.getValues(`education.${index}`);
                if (!values) return null;
                return (
                  <div key={field.id} className="flex gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="w-[180px] shrink-0 text-sm font-medium text-gray-700 pt-0.5">
                      {formatDateDisplay(values.startDate, values.endDate)}
                    </div>
                    <div className="font-medium text-base text-gray-900">
                      {values.degree} , {values.institution}
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
              const endDate = form.watch(`education.${index}.endDate`);
              const isCurrent = !endDate;

              return (
                <div key={field.id} className="relative bg-white p-6 rounded-lg border-b border-gray-200 last:border-0">
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-6 items-start">
                    
                    {/* Date Range Label */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-2">Beginn / Ende *</FormLabel>
                    
                    {/* Date Range Inputs */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Start Date */}
                        <FormField
                          control={form.control}
                          name={`education.${index}.startDate`}
                          render={({ field }) => {
                            const { month, year } = parseDate(field.value);
                            return (
                              <div className="flex gap-2">
                                <Select
                                  value={month}
                                  onValueChange={(m) => {
                                    const y = year || new Date().getFullYear().toString();
                                    field.onChange(`${y}-${m}-01`);
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="MM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MONTHS.map((m) => (
                                      <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={year}
                                  onValueChange={(y) => {
                                    const m = month || '01';
                                    field.onChange(`${y}-${m}-01`);
                                  }}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="YYYY" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {YEARS.map((y) => (
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
                            name={`education.${index}.endDate`}
                            render={({ field }) => {
                              const { month, year } = parseDate(field.value);
                              return (
                                <div className="flex gap-2">
                                  <Select
                                    value={month}
                                    onValueChange={(m) => {
                                      const y = year || new Date().getFullYear().toString();
                                      field.onChange(`${y}-${m}-01`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTHS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                          {m.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={year}
                                    onValueChange={(y) => {
                                      const m = month || '01';
                                      field.onChange(`${y}-${m}-01`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[100px]">
                                      <SelectValue placeholder="YYYY" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {YEARS.map((y) => (
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
                          id={`edu-current-${index}`}
                          checked={isCurrent}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue(`education.${index}.endDate`, undefined);
                            } else {
                              const now = new Date();
                              const m = (now.getMonth() + 1).toString().padStart(2, '0');
                              const y = now.getFullYear().toString();
                              form.setValue(`education.${index}.endDate`, `${y}-${m}-01`);
                            }
                          }}
                          className="border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`edu-current-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700"
                        >
                          bis heute
                        </label>
                      </div>
                    </div>

                    {/* Degree (Abschluss) */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Abschluss *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`education.${index}.degree`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Institution (Bildungseinrichtung) */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Bildungseinrichtung *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`education.${index}.institution`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location (Ort) */}
                    <FormLabel className="text-sm font-medium text-gray-700 pt-3">Ort *</FormLabel>
                    <FormField
                      control={form.control}
                      name={`education.${index}.location`}
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input {...field} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Delete Button (Right aligned) */}
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
                onClick={() => append({
                  degree: '',
                  institution: '',
                  location: '',
                  startDate: '',
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
