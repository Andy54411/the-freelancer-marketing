'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { applyForJob } from '@/app/actions/career';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

interface Props {
  jobId: string;
  userId: string;
  hasApplied: boolean;
}

export function JobApplicationButton({ jobId, userId, hasApplied }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applied, setApplied] = useState(hasApplied);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const result = await applyForJob(jobId, userId, coverLetter);
      if (result.success) {
        setApplied(true);
        setIsOpen(false);
        toast.success('Bewerbung erfolgreich versendet!');
      } else {
        toast.error(result.error || 'Fehler bei der Bewerbung');
      }
    } catch (error) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (applied) {
    return (
      <Button disabled variant="outline" className="w-full md:w-auto bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="mr-2 h-4 w-4" />
        Bereits beworben
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full md:w-auto">Jetzt bewerben</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bewerbung absenden</DialogTitle>
          <DialogDescription>
            Ihr Profil wird automatisch an das Unternehmen gesendet. Sie können optional ein Anschreiben hinzufügen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="coverLetter">Anschreiben (Optional)</Label>
            <Textarea
              id="coverLetter"
              placeholder="Warum sind Sie der/die Richtige für diesen Job?"
              className="min-h-[150px]"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Abbrechen</Button>
          <Button onClick={handleApply} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bewerbung absenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
