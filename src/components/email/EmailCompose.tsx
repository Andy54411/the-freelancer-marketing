'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Users, Eye, Code, Type } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EmailTemplate, Contact } from './types';

interface EmailComposeProps {
  templates: EmailTemplate[];
  contacts: Contact[];
  onEmailSent?: () => void;
}

export function EmailCompose({ templates, contacts, onEmailSent }: EmailComposeProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Verfügbare Sender-E-Mail-Adressen von der verifizierten Domain taskilo.de
  const senderEmails = [
    'andy.staudinger@taskilo.de',
    'info@taskilo.de',
    'noreply@taskilo.de',
    'admin@taskilo.de',
    'marketing@taskilo.de',
    'support@taskilo.de',
    'hello@taskilo.de',
  ];

  const [selectedSenderEmail, setSelectedSenderEmail] = useState(senderEmails[0]); // Initialisiere mit erstem Wert
  const [contentMode, setContentMode] = useState<'rich' | 'html'>('rich');

  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlContent: '',
    textContent: '', // Hinzugefügt für Rich-Text-Modus
    templateId: '', // Leerer String als Standardwert für kontrollierten Zustand
  });

  const loadTemplate = (templateId: string) => {
    if (templateId === 'none') {
      // Reset the form when "Kein Template" is selected
      setComposeForm(prev => ({
        ...prev,
        subject: '',
        htmlContent: '',
        textContent: '',
        templateId: '',
      }));
      return;
    }

    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject || '',
        htmlContent: template.htmlContent || '',
        textContent: htmlToText(template.htmlContent || ''),
        templateId,
      }));
    }
  };

  // Konvertiert einfachen Text in HTML
  const textToHtml = (text: string): string => {
    return text
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  };

  // Konvertiert HTML zu einfachem Text (vereinfacht)
  const htmlToText = (html: string): string => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  // Behandelt Änderungen im Text-Modus
  const handleTextContentChange = (text: string) => {
    setComposeForm(prev => ({
      ...prev,
      textContent: text,
      htmlContent: textToHtml(text),
    }));
  };

  // Behandelt Änderungen im HTML-Modus
  const handleHtmlContentChange = (html: string) => {
    setComposeForm(prev => ({
      ...prev,
      htmlContent: html,
      textContent: htmlToText(html),
    }));
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedSenderEmail ||
      !composeForm.to.trim() ||
      !composeForm.subject.trim() ||
      !composeForm.htmlContent.trim()
    ) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    // Validiere E-Mail-Adressen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toEmails = composeForm.to
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (toEmails.length === 0) {
      toast.error('Mindestens eine gültige Empfänger-E-Mail-Adresse erforderlich');
      return;
    }

    for (const email of toEmails) {
      if (!emailRegex.test(email)) {
        toast.error(`Ungültige E-Mail-Adresse: ${email}`);
        return;
      }
    }

    setLoading(true);
    try {
      const emailData = {
        from: selectedSenderEmail,
        to: composeForm.to
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0),
        cc: composeForm.cc
          ? composeForm.cc
              .split(',')
              .map(email => email.trim())
              .filter(email => email.length > 0)
          : [],
        bcc: composeForm.bcc
          ? composeForm.bcc
              .split(',')
              .map(email => email.trim())
              .filter(email => email.length > 0)
          : [],
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent,
        textContent: composeForm.textContent || undefined,
      };

      console.log('Sende E-Mail mit Daten:', emailData);
      console.log('Request URL:', '/api/admin/emails/send-aws');
      console.log('Request Method:', 'POST');
      console.log('Request Headers:', { 'Content-Type': 'application/json' });
      console.log('Request Body:', JSON.stringify(emailData, null, 2));

      // Verwende AWS SES API-Route
      const response = await fetch('/api/admin/emails/send-aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      console.log('API Response Status:', response.status, response.statusText);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorData;
        let errorText = '';
        try {
          const responseText = await response.text();
          console.log('Raw Response Text:', responseText);
          errorText = responseText;
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.log('Error parsing response JSON:', parseError);
          errorData = {
            error: `Server-Fehler: ${response.status} ${response.statusText}`,
            rawResponse: errorText,
          };
        }

        console.error('AWS SES API Fehler:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        });

        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('AWS SES Erfolgreiche Antwort:', result);
      toast.success('E-Mail erfolgreich gesendet');
      setComposeForm({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        templateId: '',
      });
      // selectedSenderEmail nicht zurücksetzen, da es einen Standardwert hat

      onEmailSent?.();
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);

      // Detaillierte Fehlerbehandlung
      if (error instanceof Error) {
        if (error.message.includes('AWS SES')) {
          toast.error(`AWS SES Fehler: ${error.message}`);
        } else if (error.message.includes('HTTP 500')) {
          toast.error('Server-Fehler: Bitte prüfen Sie die Serverlogdateien');
        } else if (error.message.includes('HTTP 400')) {
          toast.error('Ungültige Eingabedaten: Bitte prüfen Sie alle Felder');
        } else {
          toast.error(`Fehler beim Senden: ${error.message}`);
        }
      } else {
        toast.error('Unbekannter Fehler beim Senden der E-Mail');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!selectedSenderEmail || !composeForm.subject || !composeForm.htmlContent) {
      toast.error('Bitte füllen Sie Absender, Betreff und Inhalt aus');
      return;
    }

    const activeContacts = contacts.filter(c => c.status === 'active');
    if (activeContacts.length === 0) {
      toast.error('Keine aktiven Kontakte gefunden');
      return;
    }

    setLoading(true);
    try {
      const messages = activeContacts.map(contact => ({
        from: selectedSenderEmail,
        to: [contact.email],
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent.replace('{{name}}', contact.name),
      }));

      // Verwende AWS SES API-Route für Bulk-Versand
      const response = await fetch('/api/admin/emails/bulk-send-aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk-E-Mail-Versand fehlgeschlagen');
      }

      const result = await response.json();
      toast.success(`E-Mail an ${activeContacts.length} Kontakte gesendet`);
      onEmailSent?.();
    } catch (error) {
      console.error('Fehler beim Senden der Bulk-E-Mail:', error);
      toast.error('Fehler beim Senden der Bulk-E-Mail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">E-Mail verfassen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="template-select">Template wählen (optional)</Label>
              <Select value={composeForm.templateId || 'none'} onValueChange={loadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Template auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Template</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.templateId} value={template.templateId}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="from-select">Absender-E-Mail *</Label>
              <Select value={selectedSenderEmail} onValueChange={setSelectedSenderEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Absender auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {senderEmails.map(email => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="to">An *</Label>
            <Input
              id="to"
              value={composeForm.to}
              onChange={e => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
              placeholder="email@example.com, email2@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cc">CC</Label>
              <Input
                id="cc"
                value={composeForm.cc}
                onChange={e => setComposeForm(prev => ({ ...prev, cc: e.target.value }))}
                placeholder="cc@example.com"
              />
            </div>
            <div>
              <Label htmlFor="bcc">BCC</Label>
              <Input
                id="bcc"
                value={composeForm.bcc}
                onChange={e => setComposeForm(prev => ({ ...prev, bcc: e.target.value }))}
                placeholder="bcc@example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Betreff *</Label>
            <Input
              id="subject"
              value={composeForm.subject}
              onChange={e => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="E-Mail Betreff"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">E-Mail-Inhalt *</Label>
            <Tabs defaultValue="rich" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rich" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text-Editor
                </TabsTrigger>
                <TabsTrigger value="html" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  HTML-Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vorschau
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rich" className="mt-4">
                <Textarea
                  id="content-text"
                  value={composeForm.textContent}
                  onChange={e => handleTextContentChange(e.target.value)}
                  placeholder="Schreiben Sie hier Ihren E-Mail-Inhalt...

Verwenden Sie:
- Leere Zeilen für neue Absätze
- Einfache Formatierung wird automatisch in HTML konvertiert"
                  className="min-h-[200px]"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  💡 Tipp: Schreiben Sie natürlich - der Text wird automatisch in HTML formatiert
                </p>
              </TabsContent>

              <TabsContent value="html" className="mt-4">
                <Textarea
                  id="content-html"
                  value={composeForm.htmlContent}
                  onChange={e => handleHtmlContentChange(e.target.value)}
                  placeholder="<p>Ihr HTML-Inhalt hier...</p>"
                  className="min-h-[200px] font-mono text-sm"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  ⚠️ Für Fortgeschrittene: Direkter HTML-Code
                </p>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div
                  className="min-h-[200px] p-4 border rounded-md bg-white"
                  dangerouslySetInnerHTML={{
                    __html:
                      composeForm.htmlContent ||
                      '<p class="text-gray-400">Keine Vorschau verfügbar</p>',
                  }}
                />
                <p className="text-sm text-gray-500 mt-2">👁️ So wird Ihre E-Mail aussehen</p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="bg-[#14ad9f] hover:bg-[#129488]">
              <Send className="h-4 w-4 mr-2" />
              E-Mail senden
            </Button>
            <Button
              onClick={handleSendBulkEmail}
              disabled={loading}
              variant="outline"
              type="button"
            >
              <Users className="h-4 w-4 mr-2" />
              An alle Kontakte senden
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
