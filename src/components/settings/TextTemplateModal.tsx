'use client';

import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Plus, Copy, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
  TextTemplate,
  TextTemplateCategory,
  TextTemplateType,
  ObjectType,
  DOCUMENT_USAGE_OPTIONS,
  CATEGORY_OPTIONS,
  DOCUMENT_POSITION_OPTIONS,
  EMAIL_POSITION_OPTIONS,
  LETTER_POSITION_OPTIONS,
  PLACEHOLDER_CATEGORIES,
} from '@/types/textTemplates';

interface TextTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  template?: TextTemplate | null; // Für Bearbeitung
  companyId: string;
  userId: string;
}

export default function TextTemplateModal({
  isOpen,
  onClose,
  onSave,
  template,
  companyId,
  userId,
}: TextTemplateModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    category: TextTemplateCategory;
    objectType: ObjectType;
    textType: TextTemplateType;
    text: string;
    isDefault: boolean;
    isPrivate: boolean;
  }>({
    name: '',
    category: 'DOCUMENT',
    objectType: 'QUOTE',
    textType: 'HEAD',
    text: '',
    isDefault: false,
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Bearbeitung
        setFormData({
          name: template.name,
          category: template.category,
          objectType: template.objectType,
          textType: template.textType,
          text: template.text,
          isDefault: template.isDefault,
          isPrivate: template.isPrivate,
        });
      } else {
        // Neue Vorlage
        setFormData({
          name: '',
          category: 'DOCUMENT',
          objectType: 'QUOTE',
          textType: 'HEAD',
          text: '',
          isDefault: false,
          isPrivate: false,
        });
      }
    }
  }, [isOpen, template]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Textvorlage ein.');
      return;
    }

    if (!formData.text.trim()) {
      toast.error('Bitte geben Sie einen Text für die Vorlage ein.');
      return;
    }

    try {
      setLoading(true);

      const templateData = {
        ...formData,
        companyId,
        createdBy: userId,
      };

      await onSave(templateData);
      onClose();
      toast.success(
        template ? 'Textvorlage erfolgreich aktualisiert!' : 'Textvorlage erfolgreich erstellt!'
      );
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Textvorlage.');
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const currentText = formData.text;
    const newText = currentText + placeholder;
    setFormData(prev => ({ ...prev, text: newText }));
  };

  const getPositionOptions = () => {
    if (formData.category === 'DOCUMENT') return DOCUMENT_POSITION_OPTIONS;
    if (formData.category === 'EMAIL') return EMAIL_POSITION_OPTIONS;
    if (formData.category === 'LETTER') return LETTER_POSITION_OPTIONS;
    return DOCUMENT_POSITION_OPTIONS;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Textvorlage bearbeiten' : 'Textvorlage erstellen'}</DialogTitle>
          <DialogDescription>
            Erstellen Sie wiederverwendbare Textbausteine für Ihre Dokumente und E-Mails.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 overflow-y-auto">
          {/* Linke Spalte - Formular */}
          <div className="lg:col-span-2 space-y-4">
            {/* Erste Zeile - Name und Typ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="z.B. Angebot Kopf-Text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Typ */}
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => {
                    const category = value as TextTemplateCategory;
                    setFormData(prev => ({
                      ...prev,
                      category: category,
                      textType:
                        category === 'DOCUMENT' ? 'HEAD' : category === 'EMAIL' ? 'BODY' : 'HEAD', // Brief
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Zweite Zeile - Verwenden für und Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Verwenden für */}
              <div className="space-y-2">
                <Label>Verwenden für:</Label>
                {formData.category === 'DOCUMENT' ? (
                  <Select
                    value={formData.objectType}
                    onValueChange={value =>
                      setFormData(prev => ({ ...prev, objectType: value as ObjectType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_USAGE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : formData.category === 'EMAIL' ? (
                  <div className="h-10 px-3 py-2 border border-input bg-muted rounded-md flex items-center text-sm text-muted-foreground">
                    E-Mail Template
                  </div>
                ) : (
                  <div className="h-10 px-3 py-2 border border-input bg-muted rounded-md flex items-center text-sm text-muted-foreground">
                    Brief Template
                  </div>
                )}
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={formData.textType}
                  onValueChange={value =>
                    setFormData(prev => ({ ...prev, textType: value as TextTemplateType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getPositionOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rich Text Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Textvorlage <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPlaceholders(!showPlaceholders)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Platzhalter
                </Button>
              </div>

              {/* Text Editor */}
              <div className="border rounded-lg">
                <Textarea
                  value={formData.text}
                  onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Geben Sie hier Ihren Text ein..."
                  className="min-h-[120px] border-0 resize-none focus-visible:ring-0"
                  rows={5}
                />
              </div>
            </div>

            {/* Checkboxen */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onCheckedChange={checked =>
                    setFormData(prev => ({ ...prev, isPrivate: !!checked }))
                  }
                />
                <Label htmlFor="isPrivate" className="text-sm">
                  Nur für mich sichtbar
                </Label>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={checked =>
                    setFormData(prev => ({ ...prev, isDefault: !!checked }))
                  }
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Als Standard festlegen
                </Label>
              </div>
            </div>
          </div>

          {/* Rechte Spalte - Platzhalter */}
          {showPlaceholders && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Platzhalter</CardTitle>
                  <CardDescription>
                    Klicken Sie auf einen Platzhalter, um ihn einzufügen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {Object.entries(PLACEHOLDER_CATEGORIES).map(([categoryKey, category]) => (
                        <div key={categoryKey}>
                          <h4 className="font-medium text-sm text-gray-900 mb-2">
                            {category.label}
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(category.placeholders).map(([placeholder, info]) => (
                              <div
                                key={placeholder}
                                className="group cursor-pointer border rounded-lg p-2 hover:bg-gray-50 transition-colors"
                                onClick={() => insertPlaceholder(placeholder)}
                              >
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {placeholder}
                                  </Badge>
                                  <Copy className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{info.description}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Beispiel: {info.example}
                                </p>
                              </div>
                            ))}
                          </div>
                          <Separator className="mt-3" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {template ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
