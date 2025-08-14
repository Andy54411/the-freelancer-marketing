'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AdminQuickNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote?: (note: string) => void;
  workspaceTitle?: string;
}

export function AdminQuickNoteDialog({
  isOpen,
  onClose,
  onAddNote,
  workspaceTitle,
}: AdminQuickNoteDialogProps) {
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (note.trim()) {
      onAddNote?.(note.trim());
      setNote('');
      onClose();
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#14ad9f]" />
            Schnelle Notiz hinzufügen
          </DialogTitle>
          <DialogDescription>
            {workspaceTitle ? (
              <>Füge eine Notiz zu &quot;{workspaceTitle}&quot; hinzu</>
            ) : (
              <>Füge eine schnelle Notiz hinzu</>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Deine Notiz hier eingeben..."
              rows={4}
              className="resize-none"
              autoFocus
            />
            <div className="text-xs text-gray-500 text-right">{note.length} Zeichen</div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-[#14ad9f] hover:bg-[#129488]"
              disabled={!note.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Notiz hinzufügen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
