'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { CreateTicketForm } from '@/types/ticket';
import { X, Plus } from 'lucide-react';

// Validation Schema
// Zod-Schema für Formular-Validierung
const createTicketSchema = z.object({
  title: z
    .string()
    .min(1, 'Titel ist erforderlich')
    .min(5, 'Titel muss mindestens 5 Zeichen haben'),
  description: z
    .string()
    .min(1, 'Beschreibung ist erforderlich')
    .min(10, 'Beschreibung muss mindestens 10 Zeichen haben'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum([
    'bug',
    'feature',
    'support',
    'billing',
    'payment',
    'account',
    'technical',
    'feedback',
    'other',
  ]),
  assignedTo: z.string().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof createTicketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTicketForm) => void;
}

export function CreateTicketDialog({ open, onOpenChange, onSubmit }: CreateTicketDialogProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      priority: 'medium',
      category: 'support',
      tags: [],
    },
  });

  const priority = watch('priority');
  const category = watch('category');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setValue('tags', updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    setValue('tags', updatedTags);
  };

  const handleFormSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Konvertiere FormData zu CreateTicketForm
      const ticketData: CreateTicketForm = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate,
        tags: data.tags || [],
      };

      await onSubmit(ticketData);
      reset();
      setTags([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Fehler beim Erstellen des Tickets:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setTags([]);
    setNewTag('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neues Ticket erstellen</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein neues Support-Ticket oder eine interne Aufgabe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Titel */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Kurze Beschreibung des Problems/der Aufgabe"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Detaillierte Beschreibung des Problems, Schritte zur Reproduktion, gewünschtes Verhalten..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Priorität und Kategorie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorität *</Label>
              <Select
                value={priority}
                onValueChange={value => setValue('priority', value as CreateTicketForm['priority'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Niedrig</SelectItem>
                  <SelectItem value="medium">🟡 Mittel</SelectItem>
                  <SelectItem value="high">🟠 Hoch</SelectItem>
                  <SelectItem value="urgent">🔴 Dringend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategorie *</Label>
              <Select
                value={category}
                onValueChange={value => setValue('category', value as CreateTicketForm['category'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">🐛 Bug/Fehler</SelectItem>
                  <SelectItem value="feature">✨ Feature</SelectItem>
                  <SelectItem value="support">🤝 Support</SelectItem>
                  <SelectItem value="billing">💰 Abrechnung</SelectItem>
                  <SelectItem value="payment">💳 Zahlung</SelectItem>
                  <SelectItem value="account">👤 Account</SelectItem>
                  <SelectItem value="technical">⚙️ Technisch</SelectItem>
                  <SelectItem value="feedback">💬 Feedback</SelectItem>
                  <SelectItem value="other">📋 Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Zugewiesen an */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Zugewiesen an</Label>
            <Input
              id="assignedTo"
              {...register('assignedTo')}
              type="email"
              placeholder="andy.staudinger@taskilo.de"
              className={errors.assignedTo ? 'border-red-500' : ''}
            />
            {errors.assignedTo && (
              <p className="text-sm text-red-600">{errors.assignedTo.message}</p>
            )}
          </div>

          {/* Fälligkeitsdatum */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
            <Input
              id="dueDate"
              {...register('dueDate', { valueAsDate: true })}
              type="datetime-local"
              className={errors.dueDate ? 'border-red-500' : ''}
            />
            {errors.dueDate && <p className="text-sm text-red-600">{errors.dueDate.message}</p>}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                placeholder="Neuen Tag hinzufügen"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              {isSubmitting ? 'Erstelle...' : 'Ticket erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
