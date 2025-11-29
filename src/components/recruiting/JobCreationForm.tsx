'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Schema based on JobPostingSchema but for creation (no ID, dates, etc.)
const JobCreationSchema = z.object({
  title: z.string().min(3, 'Titel muss mindestens 3 Zeichen lang sein'),
  description: z.string().min(50, 'Beschreibung muss mindestens 50 Zeichen lang sein'),
  location: z.string().min(2, 'Standort ist erforderlich'),
  type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']),
  salaryMin: z.string().optional(), // Input as string, convert to number
  salaryMax: z.string().optional(),
  requirements: z.string(), // Textarea, split by newline
});

type JobCreationValues = z.infer<typeof JobCreationSchema>;

interface JobCreationFormProps {
  companyId: string;
  companyName: string; // Passed from server to avoid extra fetch
}

export function JobCreationForm({ companyId, companyName }: JobCreationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JobCreationValues>({
    resolver: zodResolver(JobCreationSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      type: 'full-time',
      salaryMin: '',
      salaryMax: '',
      requirements: '',
    },
  });

  async function onSubmit(data: JobCreationValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/recruiting/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId,
          companyName,
          // Convert salary strings to numbers if present
          salaryRange: {
            min: data.salaryMin ? parseInt(data.salaryMin) : undefined,
            max: data.salaryMax ? parseInt(data.salaryMax) : undefined,
            currency: 'EUR',
          },
          // Split requirements by newline and filter empty
          requirements: data.requirements.split('\n').filter(line => line.trim().length > 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Erstellen der Stellenanzeige');
      }

      const result = await response.json();
      toast.success('Stellenanzeige erfolgreich erstellt');
      router.push(`/dashboard/company/${companyId}/recruiting`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jobtitel</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Senior Frontend Developer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Standort</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Berlin, Remote" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anstellungsart</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wählen Sie eine Art" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Vollzeit</SelectItem>
                        <SelectItem value="part-time">Teilzeit</SelectItem>
                        <SelectItem value="contract">Vertrag / Freelance</SelectItem>
                        <SelectItem value="internship">Praktikum</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="salaryMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gehalt Min (Jährlich €)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="z.B. 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salaryMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gehalt Max (Jährlich €)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="z.B. 70000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschreibung</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Beschreiben Sie die Rolle, Aufgaben und das Team..." 
                      className="min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anforderungen (eine pro Zeile)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="- 3+ Jahre Erfahrung mit React&#10;- Teamplayer&#10;- Gute Deutschkenntnisse" 
                      className="min-h-[150px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Listen Sie die wichtigsten Anforderungen auf, jede in einer neuen Zeile.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stelle veröffentlichen
          </Button>
        </div>
      </form>
    </Form>
  );
}
