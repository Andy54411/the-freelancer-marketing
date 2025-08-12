'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AWS_EMAIL_API, callEmailAPI } from '@/lib/aws-email-api';
import { RefreshCw, Mail, Send, FileText, Users } from 'lucide-react';

// Import der neuen Komponenten
import { EmailCompose } from '@/components/email/EmailCompose';
import { EmailList } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';
import { AdminEmail, EmailTemplate, EmailMessage, Contact } from '@/components/email/types';

export default function EmailManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('compose');

  // State
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailMessage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);

  // Daten laden
  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await callEmailAPI(AWS_EMAIL_API.endpoints.getEmails, 'GET');
      setEmails(response.emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      toast.error('Fehler beim Laden der E-Mails');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await callEmailAPI(AWS_EMAIL_API.endpoints.getTemplates, 'GET');
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await callEmailAPI(AWS_EMAIL_API.endpoints.getContacts, 'GET');
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Initial laden
  useEffect(() => {
    loadEmails();
    loadTemplates();
    loadContacts();
  }, []);

  // Event Handler
  const handleEmailSent = () => {
    loadEmails();
    toast.success('E-Mail erfolgreich gesendet');
  };

  const handleEmailSelect = (email: AdminEmail) => {
    setSelectedEmail(email);
    setActiveTab('inbox');
  };

  const handleEmailDelete = async (emailId: string) => {
    try {
      await callEmailAPI(AWS_EMAIL_API.endpoints.deleteEmail, 'DELETE', { emailId });
      setEmails(prev => prev.filter(e => e.emailId !== emailId));
      if (selectedEmail?.emailId === emailId) {
        setSelectedEmail(null);
      }
      toast.success('E-Mail gelöscht');
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Fehler beim Löschen der E-Mail');
    }
  };

  const handleEmailToggleRead = async (emailId: string) => {
    try {
      const email = emails.find(e => e.emailId === emailId);
      if (!email) return;

      await callEmailAPI(AWS_EMAIL_API.endpoints.updateEmail, 'PUT', {
        emailId,
        isRead: !email.isRead,
      });

      setEmails(prev => prev.map(e => (e.emailId === emailId ? { ...e, isRead: !e.isRead } : e)));
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Fehler beim Aktualisieren der E-Mail');
    }
  };

  const refreshData = async () => {
    await Promise.all([loadEmails(), loadTemplates(), loadContacts()]);
    toast.success('Daten aktualisiert');
  };

  // Statistiken
  const unreadCount = emails.filter(e => !e.isRead).length;
  const importantCount = emails.filter(e => e.isImportant).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-Mail Management</h1>
          <p className="text-gray-600">Verwalten Sie E-Mails, Templates und Kontakte</p>
        </div>
        <Button onClick={refreshData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold">{emails.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {unreadCount}
              </Badge>
              <div>
                <p className="text-sm text-gray-600">Ungelesen</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Kontakte</p>
                <p className="text-2xl font-bold">{contacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Haupt-Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">E-Mail verfassen</TabsTrigger>
          <TabsTrigger value="inbox">
            Posteingang {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent">Gesendet</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* E-Mail verfassen */}
        <TabsContent value="compose">
          <EmailCompose templates={templates} contacts={contacts} onEmailSent={handleEmailSent} />
        </TabsContent>

        {/* Posteingang */}
        <TabsContent value="inbox">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onEmailSelect={handleEmailSelect}
              onEmailDelete={handleEmailDelete}
              onEmailToggleRead={handleEmailToggleRead}
            />
            <EmailDetail email={selectedEmail} onDelete={handleEmailDelete} />
          </div>
        </TabsContent>

        {/* Gesendet */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Gesendete E-Mails
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentEmails.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Noch keine E-Mails gesendet</p>
              ) : (
                <div className="space-y-2">
                  {sentEmails.map(email => (
                    <div key={email.emailId} className="p-3 border rounded hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{email.subject}</p>
                          <p className="text-sm text-gray-600">
                            An: {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={email.status === 'delivered' ? 'default' : 'secondary'}>
                            {email.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(email.sentAt).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                E-Mail Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Noch keine Templates erstellt</p>
              ) : (
                <div className="grid gap-4">
                  {templates.map(template => (
                    <Card key={template.templateId}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.subject}</p>
                            <div className="mt-2">
                              <div
                                className="text-xs text-gray-500 line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: template.htmlContent.substring(0, 150) + '...',
                                }}
                              />
                            </div>
                          </div>
                          <Badge variant="outline">
                            {new Date(template.createdAt).toLocaleDateString('de-DE')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
