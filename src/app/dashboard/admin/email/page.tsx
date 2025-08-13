// E-Mail Verwaltung mit AWS SES
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Inbox, Archive, Settings, Plus, Trash2, Eye, CheckCircle } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: string;
  createdAt: string;
}

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: string;
  templateId?: string;
}

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState('compose');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    htmlContent: '',
    textContent: '',
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    category: 'notification',
  });

  useEffect(() => {
    loadTemplates();
    loadSentEmails();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadSentEmails = async () => {
    try {
      const response = await fetch('/api/admin/email/sent');
      if (response.ok) {
        const data = await response.json();
        setSentEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Failed to load sent emails:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeForm),
      });

      if (response.ok) {
        alert('E-Mail erfolgreich versendet!');
        setComposeForm({ to: '', subject: '', htmlContent: '', textContent: '' });
        loadSentEmails();
      } else {
        const error = await response.json();
        alert(`Fehler beim Versenden: ${error.message}`);
      }
    } catch (error) {
      console.error('Send email error:', error);
      alert('Fehler beim Versenden der E-Mail');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (response.ok) {
        alert('Template erfolgreich gespeichert!');
        setTemplateForm({
          name: '',
          subject: '',
          htmlContent: '',
          textContent: '',
          category: 'notification',
        });
        loadTemplates();
      } else {
        const error = await response.json();
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    } catch (error) {
      console.error('Save template error:', error);
      alert('Fehler beim Speichern des Templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setComposeForm({
      to: '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
    });
    setActiveTab('compose');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="text-blue-600">
            Gesendet
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="outline" className="text-green-600">
            Zugestellt
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="text-red-600">
            Fehler
          </Badge>
        );
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Mail Verwaltung</h1>
          <p className="text-gray-600">AWS SES E-Mail System</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <CheckCircle className="h-4 w-4 mr-1" />
            AWS SES Aktiv
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Verfassen
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Gesendet
          </TabsTrigger>
          <TabsTrigger value="create-template" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Template erstellen
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Einstellungen
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="h-5 w-5 mr-2 text-[#14ad9f]" />
                E-Mail verfassen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Empfänger *</label>
                <Input
                  type="email"
                  placeholder="empfaenger@beispiel.de"
                  value={composeForm.to}
                  onChange={e => setComposeForm({ ...composeForm, to: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Betreff *</label>
                <Input
                  placeholder="E-Mail Betreff"
                  value={composeForm.subject}
                  onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">HTML Inhalt</label>
                <Textarea
                  placeholder="<h1>HTML Inhalt</h1>"
                  value={composeForm.htmlContent}
                  onChange={e => setComposeForm({ ...composeForm, htmlContent: e.target.value })}
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Text Inhalt</label>
                <Textarea
                  placeholder="Text Version der E-Mail"
                  value={composeForm.textContent}
                  onChange={e => setComposeForm({ ...composeForm, textContent: e.target.value })}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={loading}
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {loading ? 'Wird gesendet...' : 'E-Mail senden'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Archive className="h-5 w-5 mr-2 text-[#14ad9f]" />
                E-Mail Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <div className="grid gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleUseTemplate(template)}
                          size="sm"
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Verwenden
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Keine Templates verfügbar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Emails Tab */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Inbox className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Gesendete E-Mails
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentEmails.length > 0 ? (
                <div className="space-y-4">
                  {sentEmails.map(email => (
                    <div key={email.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{email.subject}</h3>
                          <p className="text-sm text-gray-600">An: {email.to}</p>
                        </div>
                        {getStatusBadge(email.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(email.sentAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Keine gesendeten E-Mails</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Template Tab */}
        <TabsContent value="create-template">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="h-5 w-5 mr-2 text-[#14ad9f]" />
                Neues Template erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name *</label>
                <Input
                  placeholder="z.B. Willkommens-E-Mail"
                  value={templateForm.name}
                  onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Betreff *</label>
                <Input
                  placeholder="Template Betreff"
                  value={templateForm.subject}
                  onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">HTML Inhalt</label>
                <Textarea
                  placeholder="<h1>Template HTML</h1>"
                  value={templateForm.htmlContent}
                  onChange={e => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Text Inhalt</label>
                <Textarea
                  placeholder="Template Text Version"
                  value={templateForm.textContent}
                  onChange={e => setTemplateForm({ ...templateForm, textContent: e.target.value })}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSaveTemplate}
                disabled={loading}
                className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {loading ? 'Wird gespeichert...' : 'Template speichern'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-[#14ad9f]" />
                E-Mail Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service:</label>
                    <p className="text-gray-900">AWS SES (eu-central-1)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <p className="text-green-600">Aktiv</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Verifizierte Domain:
                    </label>
                    <p className="text-gray-900">taskilo.de</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Standard Absender:</label>
                    <p className="text-gray-900">admin@taskilo.de</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">AWS SES Status</h3>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-600">Alle Services verfügbar</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
