'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { clientEmailService, EmailMessage, EmailTemplate } from '@/lib/client-email-service';
import {
  Mail,
  Send,
  Inbox,
  FileText,
  Settings,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  MessageSquare,
  BarChart,
} from 'lucide-react';

interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number;
}

interface Contact {
  id: string;
  email: string;
  name: string;
  tags: string[];
  status: 'active' | 'bounced' | 'unsubscribed';
  createdAt: Date;
  lastEmailSent?: Date;
}

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    deliveryRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Compose Email Form
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlContent: '',
    templateId: '',
  });

  // Template Form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load templates - erstmal mit Mock-Daten
      setTemplates([
        {
          id: 'welcome',
          name: 'Willkommens-E-Mail',
          subject: 'Willkommen bei Taskilo, {{name}}!',
          htmlContent: '<p>Hallo {{name}}, willkommen bei Taskilo!</p>',
          variables: ['name']
        },
        {
          id: 'support-ticket',
          name: 'Support-Ticket',
          subject: 'Ihr Support-Ticket #{{ticketId}}',
          htmlContent: '<p>Ticket erstellt: {{subject}}</p>',
          variables: ['ticketId', 'subject']
        }
      ]);

      // Mock data für Demo-Zwecke
      setEmails([
        {
          id: '1',
          to: ['kunde@example.com'],
          from: 'noreply@taskilo.de',
          subject: 'Willkommen bei Taskilo',
          htmlContent: '<p>Willkommen!</p>',
          status: 'delivered',
          sentAt: new Date('2024-01-15T10:30:00'),
          deliveredAt: new Date('2024-01-15T10:31:00'),
        },
        {
          id: '2',
          to: ['support@example.com'],
          from: 'noreply@taskilo.de',
          subject: 'Support-Anfrage bearbeitet',
          htmlContent: '<p>Ihre Anfrage wurde bearbeitet.</p>',
          status: 'sent',
          sentAt: new Date('2024-01-15T14:20:00'),
        },
      ]);

      setContacts([
        {
          id: '1',
          email: 'kunde@example.com',
          name: 'Max Mustermann',
          tags: ['kunde', 'vip'],
          status: 'active',
          createdAt: new Date('2024-01-10'),
          lastEmailSent: new Date('2024-01-15'),
        },
        {
          id: '2',
          email: 'support@example.com',
          name: 'Support Team',
          tags: ['internal'],
          status: 'active',
          createdAt: new Date('2024-01-05'),
        },
      ]);

      setStats({
        totalSent: 156,
        totalDelivered: 148,
        totalBounced: 3,
        totalComplaints: 1,
        deliveryRate: 94.9,
      });
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Fehler beim Laden der E-Mail-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.htmlContent) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setLoading(true);
    try {
      const result = await clientEmailService.sendEmail({
        to: composeForm.to.split(',').map(email => email.trim()),
        cc: composeForm.cc ? composeForm.cc.split(',').map(email => email.trim()) : undefined,
        bcc: composeForm.bcc ? composeForm.bcc.split(',').map(email => email.trim()) : undefined,
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent,
      });

      if (result.success) {
        toast.success('E-Mail erfolgreich gesendet');
        setComposeDialogOpen(false);
        setComposeForm({
          to: '',
          cc: '',
          bcc: '',
          subject: '',
          htmlContent: '',
          templateId: '',
        });
        loadData();
      } else {
        toast.error(`Fehler beim Senden: ${result.error}`);
      }
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      toast.error('Unerwarteter Fehler beim Senden der E-Mail');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!composeForm.subject || !composeForm.htmlContent) {
      toast.error('Bitte füllen Sie Betreff und Inhalt aus');
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
        to: [contact.email],
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent.replace('{{name}}', contact.name),
      }));

      const result = await clientEmailService.sendBulkEmails(messages);
      
      if (result.success) {
        toast.success(`${result.successCount} von ${messages.length} E-Mails erfolgreich gesendet`);
        setComposeDialogOpen(false);
        loadData();
      } else {
        toast.error('Fehler beim Bulk-Versand');
      }
    } catch (error) {
      console.error('Fehler beim Bulk-Versand:', error);
      toast.error('Unerwarteter Fehler beim Bulk-Versand');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject,
        htmlContent: template.htmlContent,
        templateId: template.id,
      }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Mail-Verwaltung</h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie E-Mails, Templates und Kontakte über Resend
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Dialog open={composeDialogOpen} onOpenChange={setComposeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#14ad9f] hover:bg-[#129488]">
                <Plus className="h-4 w-4 mr-2" />
                E-Mail verfassen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Neue E-Mail verfassen</DialogTitle>
                <DialogDescription>
                  Senden Sie eine E-Mail über Resend
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-select">Template wählen (optional)</Label>
                    <Select value={composeForm.templateId} onValueChange={loadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Template auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
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
                    onChange={(e) => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="empfaenger@example.com, empfaenger2@example.com"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cc">CC</Label>
                    <Input
                      id="cc"
                      value={composeForm.cc}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, cc: e.target.value }))}
                      placeholder="cc@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bcc">BCC</Label>
                    <Input
                      id="bcc"
                      value={composeForm.bcc}
                      onChange={(e) => setComposeForm(prev => ({ ...prev, bcc: e.target.value }))}
                      placeholder="bcc@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="subject">Betreff *</Label>
                  <Input
                    id="subject"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="E-Mail Betreff"
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">HTML-Inhalt *</Label>
                  <Textarea
                    id="content"
                    value={composeForm.htmlContent}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                    placeholder="<p>Ihr E-Mail-Inhalt hier...</p>"
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSendEmail}
                    disabled={loading}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    E-Mail senden
                  </Button>
                  <Button
                    onClick={handleSendBulkEmail}
                    disabled={loading}
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    An alle Kontakte senden
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inbox">Posteingang</TabsTrigger>
          <TabsTrigger value="sent">Gesendet</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="contacts">Kontakte</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* E-Mail-Statistiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gesendete E-Mails</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSent}</div>
                <p className="text-xs text-muted-foreground">Insgesamt versendet</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zugestellt</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalDelivered}</div>
                <p className="text-xs text-muted-foreground">Erfolgreich zugestellt</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounced</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.totalBounced}</div>
                <p className="text-xs text-muted-foreground">Nicht zustellbar</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beschwerden</CardTitle>
                <XCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.totalComplaints}</div>
                <p className="text-xs text-muted-foreground">Als Spam markiert</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Zustellrate</CardTitle>
                <BarChart className="h-4 w-4 text-[#14ad9f]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#14ad9f]">{stats.deliveryRate}%</div>
                <p className="text-xs text-muted-foreground">Erfolgsquote</p>
              </CardContent>
            </Card>
          </div>

          {/* Letzte E-Mails */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte E-Mails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emails.slice(0, 5).map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{email.subject}</p>
                        <p className="text-sm text-gray-600">An: {email.to.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge variant={
                        email.status === 'delivered' ? 'default' :
                        email.status === 'sent' ? 'secondary' :
                        email.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {email.status === 'delivered' ? 'Zugestellt' :
                         email.status === 'sent' ? 'Gesendet' :
                         email.status === 'failed' ? 'Fehler' : 'Entwurf'}
                      </Badge>
                      <p className="text-sm text-gray-500">
                        {email.sentAt?.toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gesendete E-Mails</CardTitle>
              <p className="text-sm text-gray-600">Übersicht aller versendeten E-Mails</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {emails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{email.subject}</p>
                        <p className="text-sm text-gray-600">An: {email.to.join(', ')}</p>
                        {email.sentAt && (
                          <p className="text-xs text-gray-500">
                            Gesendet: {email.sentAt.toLocaleString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        email.status === 'delivered' ? 'default' :
                        email.status === 'sent' ? 'secondary' :
                        email.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {email.status === 'delivered' ? 'Zugestellt' :
                         email.status === 'sent' ? 'Gesendet' :
                         email.status === 'failed' ? 'Fehler' : 'Entwurf'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">E-Mail Templates</h2>
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#14ad9f] hover:bg-[#129488]">
                  <Plus className="h-4 w-4 mr-2" />
                  Template erstellen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues E-Mail Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Template Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-subject">Betreff</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="E-Mail Betreff"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-content">HTML-Inhalt</Label>
                    <Textarea
                      id="template-content"
                      value={templateForm.htmlContent}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, htmlContent: e.target.value }))}
                      placeholder="<p>Template-Inhalt hier...</p>"
                      className="min-h-[200px]"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      // Template speichern würde hier implementiert
                      toast.success('Template erstellt');
                      setTemplateDialogOpen(false);
                    }}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    Template speichern
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {template.name}
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">Betreff: {template.subject}</p>
                  <p className="text-xs text-gray-500">
                    Variablen: {template.variables.join(', ')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => loadTemplate(template.id)}
                  >
                    Verwenden
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Kontakte</h2>
            <Button className="bg-[#14ad9f] hover:bg-[#129488]">
              <Plus className="h-4 w-4 mr-2" />
              Kontakt hinzufügen
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {contacts.map((contact, index) => (
                  <div key={contact.id}>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-8 w-8 bg-[#14ad9f] rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex gap-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Badge variant={
                          contact.status === 'active' ? 'default' :
                          contact.status === 'bounced' ? 'destructive' : 'secondary'
                        }>
                          {contact.status === 'active' ? 'Aktiv' :
                           contact.status === 'bounced' ? 'Bounced' : 'Abgemeldet'}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index < contacts.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Posteingang</CardTitle>
              <p className="text-sm text-gray-600">
                Eingehende E-Mails (Webhook-Integration erforderlich)
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Der Posteingang erfordert eine Webhook-Integration mit Resend.
                  Eingehende E-Mails werden hier angezeigt, sobald die Webhook-Konfiguration abgeschlossen ist.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
