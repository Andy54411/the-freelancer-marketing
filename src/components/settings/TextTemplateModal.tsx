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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, Copy, Info, FileText, Mail, FileEdit, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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

// Info-Tooltip Komponente
function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-gray-400 hover:text-[#14ad9f] cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white text-xs p-2">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Kategorie-Icon
function CategoryIcon({ category }: { category: TextTemplateCategory }) {
  switch (category) {
    case 'DOCUMENT':
      return <FileText className="w-4 h-4" />;
    case 'EMAIL':
      return <Mail className="w-4 h-4" />;
    case 'LETTER':
      return <FileEdit className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

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
    toast.info('handleSave aufgerufen - Debug');
    
    if (!formData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen für die Textvorlage ein.');
      return;
    }

    if (!formData.text.trim()) {
      toast.error('Bitte geben Sie einen Text für die Vorlage ein.');
      return;
    }

    toast.info(`Speichere Template: ${formData.name} - companyId: ${companyId}, userId: ${userId}`);

    try {
      setLoading(true);
      const templateData = {
        ...formData,
        companyId,
        createdBy: userId,
      };
      await onSave(templateData);
      toast.success(
        template ? 'Textvorlage erfolgreich aktualisiert!' : 'Textvorlage erfolgreich erstellt!'
      );
      onClose();
    } catch (error) {
      toast.error(`Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header - Kompakt */}
        <div className="bg-linear-to-r from-[#14ad9f] to-teal-600 px-6 py-4 shrink-0 rounded-t-lg">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {template ? 'Textvorlage bearbeiten' : 'Neue Textvorlage'}
          </DialogTitle>
          <DialogDescription className="text-teal-100 text-sm mt-1">
            Wiederverwendbare Textbausteine für Dokumente und E-Mails
          </DialogDescription>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="space-y-6">
            
            {/* Abschnitt 1: Name & Typ (wichtigste Felder oben) */}
            <div className="space-y-4">
              {/* Name - Prominentes Feld */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
                    Vorlagen-Name
                  </Label>
                  <span className="text-red-500 text-xs">*</span>
                  <InfoTooltip content="Geben Sie einen eindeutigen Namen für die Vorlage ein, z.B. 'Angebot Kopftext Standard' oder 'Mahnung Stufe 1'." />
                </div>
                <Input
                  id="name"
                  placeholder="z.B. Angebot Standardtext, Mahnung Stufe 1..."
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 text-base focus-visible:ring-[#14ad9f] border-gray-300"
                />
              </div>

              {/* Typ-Auswahl als Buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-gray-900">Vorlagen-Typ</Label>
                  <InfoTooltip content="Wählen Sie den Typ: Dokument (Rechnungen, Angebote), E-Mail (Versand-Mails) oder Brief (Geschäftsbriefe)." />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const category = option.value as TextTemplateCategory;
                        setFormData(prev => ({
                          ...prev,
                          category: category,
                          textType: category === 'DOCUMENT' ? 'HEAD' : category === 'EMAIL' ? 'BODY' : 'HEAD',
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        formData.category === option.value
                          ? 'border-[#14ad9f] bg-teal-50 text-[#14ad9f] font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <CategoryIcon category={option.value as TextTemplateCategory} />
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="bg-gray-100" />

            {/* Abschnitt 2: Verwendung & Position (nebeneinander) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-gray-900">Verwenden für</Label>
                  <InfoTooltip content="Legen Sie fest, für welche Dokumentart diese Vorlage verwendet werden soll." />
                </div>
                {formData.category === 'DOCUMENT' ? (
                  <Select
                    value={formData.objectType}
                    onValueChange={value => setFormData(prev => ({ ...prev, objectType: value as ObjectType }))}
                  >
                    <SelectTrigger className="h-10 focus:ring-[#14ad9f]">
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
                ) : (
                  <div className="h-10 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md flex items-center text-sm text-gray-500">
                    {formData.category === 'EMAIL' ? 'E-Mail Template' : 'Brief Template'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-gray-900">Position</Label>
                  <InfoTooltip content="Kopf-Text erscheint oben im Dokument, Fuß-Text unten. Bei E-Mails: Betreff, Text oder Signatur." />
                </div>
                <Select
                  value={formData.textType}
                  onValueChange={value => setFormData(prev => ({ ...prev, textType: value as TextTemplateType }))}
                >
                  <SelectTrigger className="h-10 focus:ring-[#14ad9f]">
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

            <Separator className="bg-gray-100" />

            {/* Abschnitt 3: Text-Eingabe */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold text-gray-900">Text-Inhalt</Label>
                  <span className="text-red-500 text-xs">*</span>
                  <InfoTooltip content="Geben Sie den gewünschten Text ein. Verwenden Sie Platzhalter wie [%KUNDENNAME%] für dynamische Inhalte." />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlaceholders(!showPlaceholders)}
                  className="text-xs text-[#14ad9f] hover:text-teal-700 hover:bg-teal-50 h-7 px-2"
                >
                  {showPlaceholders ? (
                    <>Platzhalter ausblenden <ChevronUp className="w-3 h-3 ml-1" /></>
                  ) : (
                    <>Platzhalter anzeigen <ChevronDown className="w-3 h-3 ml-1" /></>
                  )}
                </Button>
              </div>
              
              <Textarea
                value={formData.text}
                onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Sehr geehrte/r [%ANREDE%] [%KUNDENNAME%],

vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot..."
                className="min-h-40 max-h-[300px] resize-y text-sm focus-visible:ring-[#14ad9f] border-gray-300"
              />
              
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Tipp: HTML-Formatierung und Platzhalter wie [%KUNDENNAME%] werden unterstützt
              </p>
            </div>

            {/* Platzhalter-Bereich (ausklappbar) */}
            {showPlaceholders && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Copy className="w-4 h-4 text-[#14ad9f]" />
                  Verfügbare Platzhalter
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-3 pr-4">
                    {Object.entries(PLACEHOLDER_CATEGORIES).map(([categoryKey, category]) => (
                      <div key={categoryKey}>
                        <h5 className="text-xs font-medium text-gray-600 mb-2">{category.label}</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(category.placeholders).map(([placeholder, info]) => (
                            <TooltipProvider key={placeholder} delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs cursor-pointer hover:bg-[#14ad9f] hover:text-white hover:border-[#14ad9f] transition-colors"
                                    onClick={() => insertPlaceholder(placeholder)}
                                  >
                                    {placeholder}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="font-medium">{info.description}</p>
                                  <p className="text-gray-400 mt-1">Beispiel: {info.example}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Separator className="bg-gray-100" />

            {/* Abschnitt 4: Einstellungen - Kompakte Switches */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900">Einstellungen</Label>
              
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Nur für mich sichtbar</span>
                    <p className="text-xs text-gray-500">Private Vorlage, andere Teammitglieder sehen sie nicht</p>
                  </div>
                  <InfoTooltip content="Aktivieren Sie diese Option, wenn nur Sie diese Vorlage verwenden können sollen. Andere Benutzer Ihres Unternehmens sehen sie dann nicht." />
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                  className="data-[state=checked]:bg-[#14ad9f]"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Als Standard festlegen</span>
                    <p className="text-xs text-gray-500">Wird automatisch in neuen Dokumenten vorausgewählt</p>
                  </div>
                  <InfoTooltip content="Wenn aktiviert, wird diese Vorlage automatisch ausgewählt, wenn Sie ein neues Dokument des entsprechenden Typs erstellen." />
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, isDefault: checked }))}
                  className="data-[state=checked]:bg-[#14ad9f]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Kompakt */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50 shrink-0 rounded-b-lg">
          <div className="flex justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="border-gray-300 hover:bg-gray-100"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !formData.name.trim() || !formData.text.trim()}
              className="bg-[#14ad9f] hover:bg-teal-700 text-white min-w-[120px]"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {template ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
