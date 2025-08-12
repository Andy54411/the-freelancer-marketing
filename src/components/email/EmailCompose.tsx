'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AWS_EMAIL_API, callEmailAPI } from '@/lib/aws-email-api';
import { EmailTemplate, Contact } from './types';

interface EmailComposeProps {
  templates: EmailTemplate[];
  contacts: Contact[];
  onEmailSent?: () => void;
}

export function EmailCompose({ templates, contacts, onEmailSent }: EmailComposeProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedSenderEmail, setSelectedSenderEmail] = useState('');

  // Verfügbare Sender-E-Mail-Adressen von der verifizierten Domain taskilo.de
  const senderEmails = [
    'info@taskilo.de',
    'noreply@taskilo.de',
    'admin@taskilo.de',
    'marketing@taskilo.de',
    'support@taskilo.de',
    'hello@taskilo.de',
  ];

  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlContent: '',
    templateId: '',
  });

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject || '',
        htmlContent: template.htmlContent || '',
        templateId,
      }));
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedSenderEmail ||
      !composeForm.to ||
      !composeForm.subject ||
      !composeForm.htmlContent
    ) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setLoading(true);
    try {
      const emailData = {
        from: selectedSenderEmail,
        to: composeForm.to.split(',').map(email => email.trim()),
        cc: composeForm.cc ? composeForm.cc.split(',').map(email => email.trim()) : undefined,
        bcc: composeForm.bcc ? composeForm.bcc.split(',').map(email => email.trim()) : undefined,
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent,
      };

      await callEmailAPI(AWS_EMAIL_API.endpoints.sendEmail, 'POST', emailData);

      toast.success('E-Mail erfolgreich gesendet');
      setComposeForm({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        htmlContent: '',
        templateId: '',
      });
      setSelectedSenderEmail('');

      onEmailSent?.();
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      toast.error('Fehler beim Senden der E-Mail');
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

      await callEmailAPI(AWS_EMAIL_API.endpoints.sendBulkEmails, 'POST', { messages });

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
              <Select value={composeForm.templateId} onValueChange={loadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Template auswählen..." />
                </SelectTrigger>
                <SelectContent>
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
            <Label htmlFor="content">HTML-Inhalt *</Label>
            <Textarea
              id="content"
              value={composeForm.htmlContent}
              onChange={e => setComposeForm(prev => ({ ...prev, htmlContent: e.target.value }))}
              placeholder="<p>Ihr E-Mail-Inhalt hier...</p>"
              className="min-h-[200px]"
              required
            />
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
