'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Eye, 
  Plus, 
  Bold, 
  Italic, 
  Smile, 
  Shield, 
  Loader2,
  ShoppingCart,
  Receipt,
  Calendar,
  FileCheck,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { DsgvoSettingsDialog } from '@/components/whatsapp/DsgvoSettingsDialog';
import { toast } from 'sonner';

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  companyId: string;
}

// Vordefinierte Vorlagen für Automatisierungen - zweisprachig
const predefinedTemplates = {
  de: [
    {
      id: 'order_confirmation',
      name: 'auftragsbestaetigung',
      label: 'Auftragsbestätigung',
      description: 'Automatische Bestätigung nach Bestelleingang',
      icon: ShoppingCart,
      color: 'bg-green-100 text-green-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

vielen Dank für deine Bestellung bei [%FIRMENNAME%]!

Wir haben deine Bestellung erhalten und werden sie schnellstmöglich bearbeiten.

Bei Fragen stehen wir dir gerne zur Verfügung.

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'invoice_sent',
      name: 'rechnung_versendet',
      label: 'Rechnung versendet',
      description: 'Benachrichtigung bei neuer Rechnung',
      icon: Receipt,
      color: 'bg-blue-100 text-blue-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

deine Rechnung [%RECHNUNGSNUMMER%] über [%GESAMTSUMME%] wurde erstellt.

Zahlbar bis: [%FAELLIGKEITSDATUM%]

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'payment_received',
      name: 'zahlung_eingegangen',
      label: 'Zahlung eingegangen',
      description: 'Bestätigung bei Zahlungseingang',
      icon: MessageSquare,
      color: 'bg-emerald-100 text-emerald-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

vielen Dank! Deine Zahlung für Rechnung [%RECHNUNGSNUMMER%] über [%GESAMTSUMME%] ist bei uns eingegangen.

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'payment_reminder',
      name: 'zahlungserinnerung',
      label: 'Zahlungserinnerung',
      description: 'Freundliche Erinnerung bei überfälligen Rechnungen',
      icon: Clock,
      color: 'bg-amber-100 text-amber-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

wir möchten dich freundlich an die offene Rechnung [%RECHNUNGSNUMMER%] über [%GESAMTSUMME%] erinnern.

Die Rechnung war fällig am [%FAELLIGKEITSDATUM%].

Bitte überweise den Betrag zeitnah.

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'appointment_reminder',
      name: 'terminerinnerung',
      label: 'Terminerinnerung',
      description: 'Erinnerung vor einem Termin',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

dies ist eine Erinnerung an deinen Termin:

[%TERMINTITEL%]
Datum: [%TERMINDATUM%]
Uhrzeit: [%TERMINUHRZEIT%]
Ort: [%TERMINORT%]

Wir freuen uns auf dich!

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'quote_sent',
      name: 'angebot_versendet',
      label: 'Angebot versendet',
      description: 'Benachrichtigung bei neuem Angebot',
      icon: FileCheck,
      color: 'bg-indigo-100 text-indigo-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

dein Angebot [%ANGEBOTSNUMMER%] über [%ANGEBOTSSUMME%] wurde erstellt.

Gültig bis: [%GUELTIGBIS%]

Bei Fragen stehen wir dir gerne zur Verfügung.

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
    {
      id: 'quote_expiring',
      name: 'angebot_laeuft_ab',
      label: 'Angebot läuft ab',
      description: 'Erinnerung vor Ablauf eines Angebots',
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
      category: 'UTILITY' as const,
      body: `Hallo [%KUNDENNAME%],

dein Angebot [%ANGEBOTSNUMMER%] über [%ANGEBOTSSUMME%] läuft am [%GUELTIGBIS%] ab.

Möchtest du das Angebot annehmen? Wir beraten dich gerne.

Mit freundlichen Grüßen
[%FIRMENNAME%]`,
    },
  ],
  en: [
    {
      id: 'order_confirmation',
      name: 'order_confirmation',
      label: 'Order Confirmation',
      description: 'Automatic confirmation after order received',
      icon: ShoppingCart,
      color: 'bg-green-100 text-green-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

Thank you for your order at [%FIRMENNAME%]!

We have received your order and will process it as soon as possible.

If you have any questions, please don't hesitate to contact us.

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'invoice_sent',
      name: 'invoice_sent',
      label: 'Invoice Sent',
      description: 'Notification for new invoice',
      icon: Receipt,
      color: 'bg-blue-100 text-blue-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

Your invoice [%RECHNUNGSNUMMER%] for [%GESAMTSUMME%] has been created.

Due date: [%FAELLIGKEITSDATUM%]

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'payment_received',
      name: 'payment_received',
      label: 'Payment Received',
      description: 'Confirmation when payment is received',
      icon: MessageSquare,
      color: 'bg-emerald-100 text-emerald-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

Thank you! Your payment for invoice [%RECHNUNGSNUMMER%] of [%GESAMTSUMME%] has been received.

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'payment_reminder',
      name: 'payment_reminder',
      label: 'Payment Reminder',
      description: 'Friendly reminder for overdue invoices',
      icon: Clock,
      color: 'bg-amber-100 text-amber-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

We would like to kindly remind you about the outstanding invoice [%RECHNUNGSNUMMER%] for [%GESAMTSUMME%].

The invoice was due on [%FAELLIGKEITSDATUM%].

Please transfer the amount at your earliest convenience.

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'appointment_reminder',
      name: 'appointment_reminder',
      label: 'Appointment Reminder',
      description: 'Reminder before an appointment',
      icon: Calendar,
      color: 'bg-purple-100 text-purple-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

This is a reminder about your appointment:

[%TERMINTITEL%]
Date: [%TERMINDATUM%]
Time: [%TERMINUHRZEIT%]
Location: [%TERMINORT%]

We look forward to seeing you!

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'quote_sent',
      name: 'quote_sent',
      label: 'Quote Sent',
      description: 'Notification for new quote',
      icon: FileCheck,
      color: 'bg-indigo-100 text-indigo-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

Your quote [%ANGEBOTSNUMMER%] for [%ANGEBOTSSUMME%] has been created.

Valid until: [%GUELTIGBIS%]

If you have any questions, please don't hesitate to contact us.

Best regards
[%FIRMENNAME%]`,
    },
    {
      id: 'quote_expiring',
      name: 'quote_expiring',
      label: 'Quote Expiring',
      description: 'Reminder before quote expires',
      icon: Clock,
      color: 'bg-orange-100 text-orange-600',
      category: 'UTILITY' as const,
      body: `Hello [%KUNDENNAME%],

Your quote [%ANGEBOTSNUMMER%] for [%ANGEBOTSSUMME%] expires on [%GUELTIGBIS%].

Would you like to accept the quote? We're happy to assist you.

Best regards
[%FIRMENNAME%]`,
    },
  ],
};

type TemplateType = typeof predefinedTemplates.de[0];

const MAX_CHARS = 1000;

export function CreateTemplateDialog({
  open,
  onClose,
  onSuccess,
  companyId,
}: CreateTemplateDialogProps) {
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('de');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [bodyText, setBodyText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDsgvoTemplate, setIsDsgvoTemplate] = useState(false);
  const [showDsgvoDialog, setShowDsgvoDialog] = useState(false);
  const [showPlaceholderMenu, setShowPlaceholderMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = [
    '😊',
    '👍',
    '❤️',
    '🎉',
    '✅',
    '🔥',
    '💪',
    '🙏',
    '😀',
    '😃',
    '😄',
    '😁',
    '🤗',
    '💯',
    '⭐',
    '✨',
    '👏',
    '🎊',
    '💼',
    '📱',
    '💡',
    '🚀',
    '⏰',
    '📅',
  ];

  const placeholders = [
    { label: 'Kundenname', value: '[%KUNDENNAME%]', category: 'Kunde' },
    { label: 'Kundenfirma', value: '[%KUNDENFIRMA%]', category: 'Kunde' },
    { label: 'Kundentelefon', value: '[%KUNDENTELEFON%]', category: 'Kunde' },
    { label: 'Kundenemail', value: '[%KUNDENEMAIL%]', category: 'Kunde' },
    { label: 'Firmenname', value: '[%FIRMENNAME%]', category: 'Firma' },
    { label: 'Firmenemail', value: '[%FIRMENEMAIL%]', category: 'Firma' },
    { label: 'Firmentelefon', value: '[%FIRMENTELEFON%]', category: 'Firma' },
    { label: 'Rechnungsnummer', value: '[%RECHNUNGSNUMMER%]', category: 'Rechnung' },
    { label: 'Dokumentdatum', value: '[%DOKUMENTDATUM%]', category: 'Rechnung' },
    { label: 'Fälligkeitsdatum', value: '[%FAELLIGKEITSDATUM%]', category: 'Rechnung' },
    { label: 'Angebotsnummer', value: '[%ANGEBOTSNUMMER%]', category: 'Angebot' },
    { label: 'Angebotsdatum', value: '[%ANGEBOTSDATUM%]', category: 'Angebot' },
    { label: 'Gültig bis', value: '[%GUELTIGBIS%]', category: 'Angebot' },
    { label: 'Angebotssumme', value: '[%ANGEBOTSSUMME%]', category: 'Angebot' },
    { label: 'Angebotsnetto', value: '[%ANGEBOTSNETTO%]', category: 'Angebot' },
    { label: 'Gesamtsumme', value: '[%GESAMTSUMME%]', category: 'Beträge' },
    { label: 'Nettobetrag', value: '[%NETTOBETRAG%]', category: 'Beträge' },
    { label: 'Kontaktperson', value: '[%KONTAKTPERSON%]', category: 'Allgemein' },
    { label: 'Vorname', value: '[%VORNAME%]', category: 'Allgemein' },
    { label: 'Nachname', value: '[%NACHNAME%]', category: 'Allgemein' },
  ];

  useEffect(() => {
    setCharCount(bodyText.length);
  }, [bodyText]);

  // Reset beim Schließen
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedTemplateId(null);
      setName('');
      setBodyText('');
      setCategory('UTILITY');
      setLanguage('de');
    }
  }, [open]);

  // Aktualisiere Text bei Sprachwechsel
  useEffect(() => {
    if (selectedTemplateId) {
      const templates = language === 'en' ? predefinedTemplates.en : predefinedTemplates.de;
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setName(template.name);
        setBodyText(template.body);
      }
    }
  }, [language, selectedTemplateId]);

  // Hole aktuelle Vorlagen basierend auf Sprache
  const currentTemplates = language === 'en' ? predefinedTemplates.en : predefinedTemplates.de;
  const selectedTemplate = selectedTemplateId 
    ? currentTemplates.find(t => t.id === selectedTemplateId) || null 
    : null;

  const handleSelectTemplate = (template: TemplateType | null) => {
    if (template) {
      setSelectedTemplateId(template.id);
      setName(template.name);
      setBodyText(template.body);
      setCategory(template.category);
    } else {
      setSelectedTemplateId(null);
      setName('');
      setBodyText('');
      setCategory('MARKETING');
    }
    setStep('edit');
  };

  const handleSubmit = async () => {
    if (!name || !bodyText || charCount > MAX_CHARS) return;
    setIsSubmitting(true);
    try {
      // Konvertiere [%PLACEHOLDER%] zu {{1}}, {{2}}, etc. für Meta API
      const placeholderRegex = /\[%[A-Z_]+%\]/g;
      const foundPlaceholders = bodyText.match(placeholderRegex) || [];
      const uniquePlaceholders = [...new Set(foundPlaceholders)];
      
      let convertedBody = bodyText;
      const variableMapping: Record<string, string> = {};
      
      uniquePlaceholders.forEach((placeholder, index) => {
        const metaVariable = `{{${index + 1}}}`;
        convertedBody = convertedBody.split(placeholder).join(metaVariable);
        variableMapping[metaVariable] = placeholder;
      });

      const response = await fetch('/api/whatsapp/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          language,
          category,
          bodyText: convertedBody,
          variableMapping,
          originalBodyText: bodyText,
          isDsgvoTemplate,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Vorlage erstellt und zur Prüfung eingereicht');
        onClose();
        setName('');
        setBodyText('');
        setCharCount(0);
        setCategory('MARKETING');
        onSuccess?.();
      } else {
        toast.error(data.error || 'Fehler beim Erstellen der Vorlage');
      }
    } catch {
      toast.error('Netzwerkfehler beim Erstellen der Vorlage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertVariable = () => {
    setShowPlaceholderMenu(!showPlaceholderMenu);
  };

  const insertPlaceholder = (placeholder: string) => {
    setBodyText(bodyText + placeholder);
    setShowPlaceholderMenu(false);
  };

  const applyFormatting = (format: 'bold' | 'italic') => {
    const textarea = document.getElementById('body') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = bodyText.substring(start, end);

    if (!selectedText) return; // Nichts ausgewählt

    let formattedText = '';
    if (format === 'bold') {
      formattedText = `*${selectedText}*`;
    } else if (format === 'italic') {
      formattedText = `_${selectedText}_`;
    }

    const newText = bodyText.substring(0, start) + formattedText + bodyText.substring(end);
    setBodyText(newText);

    // Cursor-Position nach der Formatierung setzen
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = document.getElementById('body') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newText = bodyText.substring(0, start) + emoji + bodyText.substring(end);
    setBodyText(newText);
    setShowEmojiPicker(false);

    // Cursor-Position nach dem Emoji setzen
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const getPreviewText = () => {
    if (!bodyText) return '...';

    // Ersetze Platzhalter mit Beispielwerten für die Vorschau
    let preview = bodyText;
    const replacements: Record<string, string> = {
      '[%KUNDENNAME%]': 'Max Mustermann',
      '[%KUNDENFIRMA%]': 'Musterfirma GmbH',
      '[%KUNDENTELEFON%]': '+49 123 456789',
      '[%KUNDENEMAIL%]': 'max@beispiel.de',
      '[%FIRMENNAME%]': 'Ihre Firma',
      '[%FIRMENEMAIL%]': 'info@ihrefirma.de',
      '[%FIRMENTELEFON%]': '+49 987 654321',
      '[%RECHNUNGSNUMMER%]': 'RE-2024-001',
      '[%DOKUMENTDATUM%]': new Date().toLocaleDateString('de-DE'),
      '[%FAELLIGKEITSDATUM%]': new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(
        'de-DE'
      ),
      '[%GESAMTSUMME%]': '1.190,00 €',
      '[%NETTOBETRAG%]': '1.000,00 €',
      '[%KONTAKTPERSON%]': 'Anna Schmidt',
      '[%VORNAME%]': 'Anna',
      '[%NACHNAME%]': 'Schmidt',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      preview = preview.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value
      );
    });

    return preview;
  };

  const renderFormattedPreview = () => {
    const text = getPreviewText();

    // WhatsApp Formatierung: *bold* und _italic_
    const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g);

    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        // Bold
        return <strong key={index}>{part.slice(1, -1)}</strong>;
      } else if (part.startsWith('_') && part.endsWith('_')) {
        // Italic
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Vorlage erstellen</DialogTitle>
        
        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-3 bg-white border-b">
          {step === 'edit' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('select')}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            {step === 'select' ? (
              <Sparkles className="w-5 h-5 text-[#25D366]" />
            ) : selectedTemplate ? (
              <selectedTemplate.icon className="w-5 h-5 text-gray-600" />
            ) : (
              <Plus className="w-5 h-5 text-gray-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'select' ? 'Vorlage auswählen' : selectedTemplate ? selectedTemplate.label : 'Eigene Vorlage'}
            </h2>
            {step === 'select' && (
              <p className="text-sm text-gray-500">Wähle eine vordefinierte Vorlage oder erstelle eine eigene</p>
            )}
          </div>
        </div>

        {/* Step 1: Template Selection */}
        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Vordefinierte Vorlagen für Automatisierungen */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#25D366]" />
                Vorlagen für Automatisierungen
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedTemplates.de.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center mb-3`}>
                      <template.icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-medium text-gray-900 group-hover:text-[#25D366] mb-1">
                      {template.label}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Eigene Vorlage erstellen */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Oder eigene Vorlage erstellen</h3>
              <button
                onClick={() => handleSelectTemplate(null)}
                className="w-full p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all group flex items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-[#25D366]/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400 group-hover:text-[#25D366]" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900 group-hover:text-[#25D366]">
                    Eigene Vorlage
                  </h4>
                  <p className="text-sm text-gray-500">
                    Erstelle eine komplett individuelle Nachrichtenvorlage
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Edit Template */}
        {step === 'edit' && (
          <div className="flex h-full overflow-hidden">
            <div className="w-[38%] bg-gray-50 p-8 overflow-y-auto">
              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-medium">Vorschau</span>
              </div>
              <div className="bg-white rounded-lg p-6">
                <div className="inline-block bg-[#dcf8c6] rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap text-gray-900 max-w-[85%]">
                  {renderFormattedPreview()}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">
                      Name der Vorlage
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="z.B. bestellbestaetigung"
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben und Unterstriche</p>
                  </div>
                  <div>
                    <Label
                      htmlFor="category"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Kategorie
                    </Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION')}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">
                          Marketing
                        </SelectItem>
                        <SelectItem value="UTILITY">
                          Dienstprogramm
                        </SelectItem>
                        <SelectItem value="AUTHENTICATION">
                          Authentifizierung
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Beeinflusst Kosten und Limits</p>
                  </div>
                  <div>
                    <Label
                      htmlFor="language"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Sprache
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="h-11">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <span>🇩🇪</span>
                            <span>Deutsch</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">
                        <div className="flex items-center gap-2">
                          <span>🇩🇪</span>
                          <span>Deutsch</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <span>🇬🇧</span>
                          <span>English</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="body" className="text-sm font-medium text-gray-700">
                    Nachricht
                  </Label>
                  <span
                    className={`text-sm font-medium ${charCount > MAX_CHARS ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {charCount} / {MAX_CHARS}
                  </span>
                </div>
                <div className="flex gap-3 items-start mb-3 relative">
                  <Textarea
                    id="body"
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    placeholder="..."
                    rows={10}
                    className="flex-1 resize-none text-sm leading-normal"
                    style={{ height: '240px' }}
                  />
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={insertVariable}
                      className="h-auto py-2 px-3 text-sm whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Variable hinzufügen
                    </Button>
                    {showPlaceholderMenu && (
                      <div className="absolute top-full right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                        <div className="p-2">
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1">Kunde</div>
                          {placeholders
                            .filter(p => p.category === 'Kunde')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">
                            Firma
                          </div>
                          {placeholders
                            .filter(p => p.category === 'Firma')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">
                            Rechnung
                          </div>
                          {placeholders
                            .filter(p => p.category === 'Rechnung')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">
                            Angebot
                          </div>
                          {placeholders
                            .filter(p => p.category === 'Angebot')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">
                            Beträge
                          </div>
                          {placeholders
                            .filter(p => p.category === 'Beträge')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                          <div className="text-xs font-semibold text-gray-500 px-2 py-1 mt-2">
                            Allgemein
                          </div>
                          {placeholders
                            .filter(p => p.category === 'Allgemein')
                            .map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => insertPlaceholder(p.value)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                              >
                                {p.label}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyFormatting('bold')}
                    className="h-9 w-9 p-0"
                  >
                    <Bold className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyFormatting('italic')}
                    className="h-9 w-9 p-0"
                  >
                    <Italic className="w-4 h-4 text-gray-600" />
                  </Button>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-9 w-9 p-0"
                    >
                      <Smile className="w-4 h-4 text-gray-600" />
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-3">
                        <div className="grid grid-cols-6 gap-2" style={{ width: '240px' }}>
                          {commonEmojis.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded transition-colors text-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDsgvoDialog(true)}
                    className="text-sm px-3 h-9 text-gray-700"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    DSGVO Einstellungen
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-8 py-5 flex items-center justify-end gap-3 bg-white">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('select')}
                disabled={isSubmitting}
                className="font-medium text-gray-700 hover:bg-gray-100"
              >
                Zurück
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!name || !bodyText || charCount > MAX_CHARS || isSubmitting}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white font-medium disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  'Vorlage erstellen'
                )}
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>

      <DsgvoSettingsDialog
        open={showDsgvoDialog}
        onClose={() => setShowDsgvoDialog(false)}
        isDsgvoTemplate={isDsgvoTemplate}
        onToggle={setIsDsgvoTemplate}
      />
    </Dialog>
  );
}
