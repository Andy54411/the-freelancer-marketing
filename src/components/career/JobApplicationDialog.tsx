'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface JobApplicationDialogProps {
  jobId: string;
  companyId: string;
  userId: string;
  jobTitle: string;
  hasProfile: boolean;
}

export function JobApplicationDialog({ 
  jobId, 
  companyId, 
  userId, 
  jobTitle,
  hasProfile 
}: JobApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const router = useRouter();

  async function handleApply() {
    if (!hasProfile) {
      toast.error('Bitte füllen Sie zuerst Ihr Profil aus, bevor Sie sich bewerben.');
      router.push(`/dashboard/user/${userId}/career/profile`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/career/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          companyId,
          userId,
          coverLetter,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bewerbung fehlgeschlagen');
      }

      toast.success('Bewerbung erfolgreich versendet!');
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Fehler beim Senden der Bewerbung.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full md:w-auto">
          Jetzt bewerben
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bewerbung für {jobTitle}</DialogTitle>
          <DialogDescription>
            Ihr Kandidatenprofil wird automatisch an das Unternehmen gesendet.
            Sie können optional ein Anschreiben hinzufügen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cover-letter">Anschreiben (Optional)</Label>
            <Textarea
              id="cover-letter"
              placeholder="Warum sind Sie der/die Richtige für diesen Job?"
              className="min-h-[150px]"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleApply} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bewerbung absenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
