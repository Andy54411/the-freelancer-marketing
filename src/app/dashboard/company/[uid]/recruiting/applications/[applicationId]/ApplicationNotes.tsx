'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StickyNote, Save, Loader2, Check } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { toast } from 'sonner';

interface ApplicationNotesProps {
  applicationId: string;
  companyId: string;
  initialNotes?: string;
}

export function ApplicationNotes({ applicationId, companyId, initialNotes = '' }: ApplicationNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setHasChanges(notes !== savedNotes);
  }, [notes, savedNotes]);

  // Auto-save nach 2 Sekunden Inaktivität
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveNotes();
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes, hasChanges]);

  const saveNotes = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      // Versuche camelCase Subcollection
      const docRef = doc(db, 'companies', companyId, 'jobApplications', applicationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          internalNotes: notes,
          notesUpdatedAt: new Date().toISOString(),
        });
      } else {
        // Fallback: snake_case Subcollection
        const snakeDocRef = doc(db, 'companies', companyId, 'job_applications', applicationId);
        await updateDoc(snakeDocRef, {
          internalNotes: notes,
          notesUpdatedAt: new Date().toISOString(),
        });
      }

      setSavedNotes(notes);
      setLastSaved(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Notizen:', error);
      toast.error('Fehler beim Speichern der Notizen');
    } finally {
      setIsSaving(false);
    }
  }, [notes, hasChanges, isSaving, applicationId, companyId]);

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[#14ad9f]" />
            Interne Notizen
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Speichern...
              </span>
            )}
            {!isSaving && lastSaved && !hasChanges && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Gespeichert
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Notizen zum Bewerber eingeben... (z.B. Eindrücke aus dem Gespräch, Bewertungen, etc.)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[120px] resize-y"
        />
        {hasChanges && (
          <Button
            onClick={saveNotes}
            disabled={isSaving}
            size="sm"
            className="w-full bg-[#14ad9f] hover:bg-[#129a8f]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Notizen speichern
              </>
            )}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Notizen werden automatisch gespeichert und sind nur für Ihr Unternehmen sichtbar.
        </p>
      </CardContent>
    </Card>
  );
}
