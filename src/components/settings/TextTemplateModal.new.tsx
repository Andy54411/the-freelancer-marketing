'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Loader2, Copy } from 'lucide-react';
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
  template?: TextTemplate | null;
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

  useEffect(() => {
    if (isOpen) {
      if (template) {
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
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14ad9f] to-teal-600 px-6 py-5 shrink-0">
          <DialogTitle className="text-2xl font-bold text-white">
            {template ? 'Textvorlage bearbeiten' : 'Neue Textvorlage'}
          </DialogTitle>
          <DialogDescription className="text-teal-50">
            Erstellen Sie wiederverwendbare Textbausteine für Ihre Dokumente und E-Mails
          </DialogDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Linke Spalte - Formular */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basis-Informationen */}
              <Card className="border-teal-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-[#14ad9f]">
                    Basis-Informationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Vorlagen-Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="z.B. Angebot Kopf-Text"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="focus-visible:ring-[#14ad9f]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Typ</Label>
                      <Select
                        value={formData.category}
                        onValueChange={value => {
                          const category = value as TextTemplateCategory;
                          setFormData(prev => ({
                            ...prev,
                            category: category,
                            textType: category === 'DOCUMENT' ? 'HEAD' : category === 'EMAIL' ? 'BODY' : 'HEAD',
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Verwenden für</Label>
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

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Position</Label>
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
                </CardContent>
              </Card>

              {/* Text-Inhalt */}
              <Card className="border-teal-100">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-[#14ad9f]">
                      Text-Inhalt
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                      className="text-xs border-[#14ad9f] text-[#14ad9f] hover:bg-teal-50"
                    >
                      {showPlaceholders ? 'Platzhalter ausblenden' : 'Platzhalter anzeigen'}
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    HTML-Formatierung und Platzhalter wie [%KUNDENNAME%] sind möglich
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.text}
                    onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Geben Sie hier Ihren Text ein... 

Tipp: Verwenden Sie Platzhalter wie [%KUNDENNAME%], [%RECHNUNGSNUMMER%] etc."
                    className="min-h-[200px] max-h-[400px] resize-y text-sm"
                    rows={10}
                  />
                </CardContent>
              </Card>

              {/* Einstellungen */}
              <Card className="border-teal-100">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base text-[#14ad9f]">
                    Einstellungen
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Legen Sie Sichtbarkeit und Standard-Vorlage fest
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f] transition-colors">
                    <Checkbox
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onCheckedChange={checked =>
                        setFormData(prev => ({ ...prev, isPrivate: !!checked }))
                      }
                      className="mt-0.5 data-[state=checked]:bg-[#14ad9f] data-[state=checked]:border-[#14ad9f]"
                    />
                    <div className="flex-1">
                      <Label htmlFor="isPrivate" className="text-sm font-medium cursor-pointer">
                        Nur für mich sichtbar
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Diese Vorlage ist nur für Sie sichtbar und nutzbar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-[#14ad9f] transition-colors">
                    <Checkbox
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={checked =>
                        setFormData(prev => ({ ...prev, isDefault: !!checked }))
                      }
                      className="mt-0.5 data-[state=checked]:bg-[#14ad9f] data-[state=checked]:border-[#14ad9f]"
                    />
                    <div className="flex-1">
                      <Label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">
                        Als Standard festlegen
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Diese Vorlage wird automatisch vorausgewählt
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="border-gray-300 hover:bg-gray-50"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-gradient-to-r from-[#14ad9f] to-teal-600 hover:from-teal-600 hover:to-[#14ad9f] text-white shadow-md"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {template ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
