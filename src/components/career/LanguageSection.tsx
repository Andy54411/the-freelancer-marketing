'use client';

import { useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { ApplicantProfile } from '@/types/career';
import { Button } from '@/components/ui/button';
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
import { Loader2, Pencil, Languages } from 'lucide-react';

interface LanguageSectionProps {
  form: UseFormReturn<ApplicantProfile>;
  onSave: () => void;
  isSubmitting?: boolean;
}

const LANGUAGES = [
  'Deutsch',
  'Englisch',
  'Französisch',
  'Polnisch',
  'Albanisch',
  'Arabisch',
  'Bulgarisch',
  'Chinesisch',
  'Dänisch',
  'Finnisch',
  'Griechisch',
  'Indisch',
  'Italienisch',
  'Japanisch',
  'Koreanisch',
  'Kroatisch',
  'Luxemburgisch',
  'Niederländisch',
  'Norwegisch',
  'Portugiesisch',
  'Rumänisch',
  'Russisch',
  'Schwedisch',
  'Schweizerdeutsch',
  'Serbisch',
  'Spanisch',
  'Thai',
  'Türkisch',
  'Tschechisch',
  'Ukrainisch',
  'Ungarisch',
];

const LEVELS = [
  'Muttersprache',
  'fließend gesprochen und geschrieben',
  'fließend gesprochen oder geschrieben',
  'gute Kenntnisse',
  'verbesserungsfähig',
];

export function LanguageSection({ form, onSave, isSubmitting }: LanguageSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'languages',
  });

  const toggleEdit = () => {
    if (isEditing) {
      onSave();
    } else {
      if (fields.length === 0) {
        append({
          language: '',
          level: '',
        });
      }
    }
    setIsEditing(!isEditing);
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-xl font-semibold">Sprachkenntnisse</CardTitle>
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
              <p className="text-muted-foreground text-sm italic">Keine Sprachkenntnisse angegeben.</p>
            ) : (
              fields.map((field, index) => {
                const values = form.getValues(`languages.${index}`);
                if (!values) return null;
                return (
                  <div key={field.id} className="flex gap-4 border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="w-[180px] shrink-0 text-sm font-medium text-gray-700 pt-0.5">
                      {values.language}
                    </div>
                    <div className="font-medium text-base text-gray-900">
                      {values.level}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // EDIT MODE
          <div className="space-y-8">
            {fields.map((field, index) => (
              <div key={field.id} className="relative bg-white p-6 rounded-lg border-b border-gray-200 last:border-0">
                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-6 items-start">
                  
                  {/* Language (Sprache) */}
                  <FormLabel className="text-sm font-medium text-gray-700 pt-3">Sprache *</FormLabel>
                  <FormField
                    control={form.control}
                    name={`languages.${index}.language`}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white w-full">
                              <SelectValue placeholder="--- keine Auswahl ---" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="--- keine Auswahl ---">--- keine Auswahl ---</SelectItem>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang} value={lang}>
                                {lang}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Level (Kenntnisstand) */}
                  <FormLabel className="text-sm font-medium text-gray-700 pt-3">Kenntnisstand *</FormLabel>
                  <FormField
                    control={form.control}
                    name={`languages.${index}.level`}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white w-full">
                              <SelectValue placeholder="--- keine Auswahl ---" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="--- keine Auswahl ---">--- keine Auswahl ---</SelectItem>
                            {LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
            ))}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => append({
                  language: '',
                  level: '',
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
