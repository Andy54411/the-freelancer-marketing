'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AWS_EMAIL_API, callEmailAPI } from '@/lib/aws-email-api';
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
import { useAuth } from '@/contexts/AuthContext';

// AWS Lambda Email Types (ersetzt Firebase Types)
interface AdminEmail {
  emailId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
  attachments?: any[];
  rawHeaders?: any;
}

interface EmailMessage {
  emailId: string;
  to: string | string[];
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

interface EmailTemplate {
  templateId: string;
  name: string;
  subject: string;
  htmlContent: string;
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Contact {
  contactId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  status: 'active' | 'inactive' | 'bounced';
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}
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
  Star,
  Archive,
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal,
  Filter,
  Search,
  Paperclip,
  AlertTriangle,
} from 'lucide-react';

interface InboxEmail {
  id: string;
  messageId: string;
  from: string;
  to: string[] | string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  receivedAt?: Date;
  timestamp?: any; // Firebase timestamp
  isRead?: boolean;
  read?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  labels?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  headers?: Record<string, string>;
  source?: string; // AWS SES, Resend, etc.
  preview?: string;
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
    id: string;
  }>;
  rawEmail?: string;
  threadId?: string;
  references?: string[];
  inReplyTo?: string;
  spamScore: number;
  isSpam: boolean;
  metadata: {
    resendId?: string;
    webhookReceivedAt: string;
    source: string;
  };
}

interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number;
}

export default function EmailManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inboxEmails, setInboxEmails] = useState<AdminEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmail | null>(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlContent: '',
    templateId: '',
  });
  const [inboxStats, setInboxStats] = useState({
    total: 0,
    unread: 0,
    spam: 0,
    starred: 0,
  });
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalDelivered: 0,
    totalBounced: 0,
    totalComplaints: 0,
    deliveryRate: 0,
  });
  const [inboxLoading, setInboxLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [emailDetailDialogOpen, setEmailDetailDialogOpen] = useState(false);

  // Filter states
  const [inboxFilter, setInboxFilter] = useState('all'); // all, unread, starred, spam
  const [searchTerm, setSearchTerm] = useState('');

  // Reply Form
  const [replyForm, setReplyForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    htmlContent: '',
  });

  // Posteingangs-E-Mails laden
  const loadInboxEmails = async () => {
    try {
      setInboxLoading(true);

      const params = new URLSearchParams();
      if (inboxFilter === 'unread') params.append('isRead', 'false');
      if (inboxFilter === 'starred') params.append('label', 'starred');
      if (inboxFilter === 'spam') params.append('label', 'spam');

      const data = await callEmailAPI(
        `${AWS_EMAIL_API.endpoints.getEmails}/inbox?filter=${inboxFilter}`
      );

      if (data.success) {
        setInboxEmails(data.emails || []);
        setInboxStats(data.stats || { total: 0, unread: 0, starred: 0, spam: 0 });
      } else {
        toast.error('Fehler beim Laden der E-Mails');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Posteingangs-E-Mails:', error);
      toast.error('Fehler beim Laden der E-Mails');
    } finally {
      setInboxLoading(false);
    }
  };

  // E-Mail als gelesen/ungelesen markieren
  const toggleEmailRead = async (emailId: string, isRead: boolean) => {
    try {
      const response = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: [emailId],
          action: isRead ? 'markAsUnread' : 'markAsRead',
        }),
      });

      if (response.ok) {
        loadInboxEmails();
        toast.success(isRead ? 'Als ungelesen markiert' : 'Als gelesen markiert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der E-Mail');
    }
  };

  // E-Mail markieren/entmarkieren
  const toggleEmailStar = async (emailId: string, isStarred: boolean) => {
    try {
      const response = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: [emailId],
          action: isStarred ? 'unstar' : 'star',
        }),
      });

      if (response.ok) {
        loadInboxEmails();
        toast.success(isStarred ? 'Markierung entfernt' : 'Als wichtig markiert');
      }
    } catch (error) {
      toast.error('Fehler beim Markieren der E-Mail');
    }
  };

  // E-Mail archivieren
  const archiveEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: [emailId],
          action: 'archive',
        }),
      });

      if (response.ok) {
        loadInboxEmails();
        toast.success('E-Mail archiviert');
      }
    } catch (error) {
      toast.error('Fehler beim Archivieren der E-Mail');
    }
  };

  // E-Mail löschen
  const deleteEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/admin/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: [emailId] }),
      });

      if (response.ok) {
        loadInboxEmails();
        toast.success('E-Mail gelöscht');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen der E-Mail');
    }
  };

  // E-Mail-Details laden
  const loadEmailDetails = async (emailId: string) => {
    try {
      const response = await fetch(`/api/admin/inbox/${emailId}`);
      const data = await response.json();

      if (data.success) {
        const emailData = {
          ...data.data,
          receivedAt: new Date(data.data.receivedAt),
        };
        setSelectedEmail(emailData);
        setEmailDetailDialogOpen(true);
      }
    } catch (error) {
      toast.error('Fehler beim Laden der E-Mail-Details');
    }
  };

  // Antwort vorbereiten
  const prepareReply = (email: AdminEmail, replyAll: boolean = false) => {
    const toArray = Array.isArray(email.to) ? email.to : [email.to];
    const recipients = replyAll
      ? [email.from, ...toArray.filter(addr => addr !== 'noreply@taskilo.de')]
      : [email.from];

    setReplyForm({
      to: recipients.join(', '),
      cc: '',
      bcc: '',
      subject: email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`,
      htmlContent: `<br><br>---<br><p><strong>Von:</strong> ${email.from}</p><p><strong>Gesendet:</strong> ${new Date(email.receivedAt).toLocaleString('de-DE')}</p><p><strong>Betreff:</strong> ${email.subject}</p><br>${email.body}`,
    });
    setSelectedEmail(email);
    setReplyDialogOpen(true);
  };

  // Antwort senden
  const sendReply = async () => {
    if (!selectedEmail) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/inbox/${selectedEmail.emailId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: replyForm.to.split(',').map(email => email.trim()),
          cc: replyForm.cc ? replyForm.cc.split(',').map(email => email.trim()) : [],
          bcc: replyForm.bcc ? replyForm.bcc.split(',').map(email => email.trim()) : [],
          subject: replyForm.subject,
          htmlContent: replyForm.htmlContent,
          textContent: replyForm.htmlContent.replace(/<[^>]*>/g, ''), // Simple HTML to text
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Antwort erfolgreich gesendet');
        setReplyDialogOpen(false);
        setReplyForm({
          to: '',
          cc: '',
          bcc: '',
          subject: '',
          htmlContent: '',
        });
      } else {
        toast.error(result.error || 'Fehler beim Senden der Antwort');
      }
    } catch (error) {
      toast.error('Fehler beim Senden der Antwort');
    } finally {
      setLoading(false);
    }
  };

  // Filtered E-Mails
  const filteredInboxEmails = inboxEmails.filter(email => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        email.subject.toLowerCase().includes(searchLower) ||
        email.from.toLowerCase().includes(searchLower) ||
        email.body.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  useEffect(() => {
    loadInboxEmails();
  }, [inboxFilter]);

  // Template Form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
  });

  useEffect(() => {
    loadData(); // Lädt alle Daten über AWS Lambda APIs
  }, []);

  // AWS Lambda Data Loading Functions (ersetzt Firebase Realtime Listeners)
  const loadData = async () => {
    try {
      await Promise.all([loadInboxEmails(), loadTemplates(), loadContacts(), loadEmailStats()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await callEmailAPI(AWS_EMAIL_API.endpoints.getTemplates);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await callEmailAPI(AWS_EMAIL_API.endpoints.getContacts);
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadEmailStats = async () => {
    try {
      const data = await callEmailAPI(`${AWS_EMAIL_API.endpoints.getEmails}/stats`);
      // setEmailStats wird später definiert oder entfernt
      console.log('Email stats loaded:', data.stats);
    } catch (error) {
      console.error('Error loading email stats:', error);
    }
  };

  // AWS Lambda Functions für Templates, Contacts und Emails
  const createTemplate = async (templateData: any) => {
    try {
      const template = await callEmailAPI(
        AWS_EMAIL_API.endpoints.createTemplate,
        'POST',
        templateData
      );

      setTemplates(prev => [...prev, template]);
      toast.success('Template erfolgreich erstellt');

      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Fehler beim Erstellen des Templates');
      throw error;
    }
  };

  const handleSendEmail = async () => {
    // Debug-Ausgabe
    console.log('Form Daten:', {
      to: composeForm.to,
      subject: composeForm.subject,
      htmlContent: composeForm.htmlContent,
      userEmail: user?.email,
    });

    if (!composeForm.to || !composeForm.subject || !composeForm.htmlContent) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    if (!user?.email) {
      toast.error('Benutzer-E-Mail-Adresse nicht verfügbar');
      return;
    }

    setLoading(true);
    try {
      const emailData = {
        from: user.email, // Verwende die E-Mail-Adresse des eingeloggten Users
        to: composeForm.to.split(',').map(email => email.trim()),
        cc: composeForm.cc ? composeForm.cc.split(',').map(email => email.trim()) : undefined,
        bcc: composeForm.bcc ? composeForm.bcc.split(',').map(email => email.trim()) : undefined,
        subject: composeForm.subject,
        htmlContent: composeForm.htmlContent, // Korrigiert von 'body' zu 'htmlContent'
      };

      const emailResponse = await callEmailAPI(
        AWS_EMAIL_API.endpoints.sendEmail,
        'POST',
        emailData
      );

      // Email zu lokaler Liste hinzufügen
      setEmails(prev => [...prev, emailResponse]);

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

      const responseData = await callEmailAPI(AWS_EMAIL_API.endpoints.sendBulkEmails, 'POST', {
        messages,
      });

      if (responseData.success) {
        toast.success(
          `${responseData.successCount} von ${messages.length} E-Mails erfolgreich gesendet`
        );
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
    const template = templates.find(t => t.templateId === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        subject: template.subject,
        htmlContent: template.htmlContent,
        templateId: template.templateId,
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
          <Button variant="outline" onClick={loadData} disabled={loading}>
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
                <DialogDescription>Senden Sie eine E-Mail über Resend</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  console.log('Form Submit ausgelöst!');
                  handleSendEmail();
                }}
              >
                <div className="space-y-4">
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
                  </div>

                  <div>
                    <Label htmlFor="to">An *</Label>
                    <Input
                      id="to"
                      value={composeForm.to}
                      onChange={e => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
                      placeholder="empfaenger@example.com, empfaenger2@example.com"
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">HTML-Inhalt *</Label>
                    <Textarea
                      id="content"
                      value={composeForm.htmlContent}
                      onChange={e =>
                        setComposeForm(prev => ({ ...prev, htmlContent: e.target.value }))
                      }
                      placeholder="<p>Ihr E-Mail-Inhalt hier...</p>"
                      className="min-h-[200px]"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={false}
                      className="bg-[#14ad9f] hover:bg-[#129488]"
                    >
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
                </div>
              </form>
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
                {emails.slice(0, 5).map(email => (
                  <div
                    key={email.emailId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{email.subject}</p>
                        <p className="text-sm text-gray-600">
                          An: {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={
                          email.status === 'delivered'
                            ? 'default'
                            : email.status === 'sent'
                              ? 'secondary'
                              : email.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {email.status === 'delivered'
                          ? 'Zugestellt'
                          : email.status === 'sent'
                            ? 'Gesendet'
                            : email.status === 'failed'
                              ? 'Fehler'
                              : 'Entwurf'}
                      </Badge>
                      <p className="text-sm text-gray-500">
                        <span className="text-sm text-gray-500">
                          {new Date(email.sentAt).toLocaleDateString('de-DE')}
                        </span>
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
                {emails.map(email => (
                  <div
                    key={email.emailId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{email.subject}</p>
                        <p className="text-sm text-gray-600">
                          An: {Array.isArray(email.to) ? email.to.join(', ') : email.to}
                        </p>
                        {email.sentAt && (
                          <p className="text-xs text-gray-500">
                            Gesendet: {new Date(email.sentAt).toLocaleString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          email.status === 'delivered'
                            ? 'default'
                            : email.status === 'sent'
                              ? 'secondary'
                              : email.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {email.status === 'delivered'
                          ? 'Zugestellt'
                          : email.status === 'sent'
                            ? 'Gesendet'
                            : email.status === 'failed'
                              ? 'Fehler'
                              : 'Entwurf'}
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
                      onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Template Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-subject">Betreff</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={e =>
                        setTemplateForm(prev => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="E-Mail Betreff"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-content">HTML-Inhalt</Label>
                    <Textarea
                      id="template-content"
                      value={templateForm.htmlContent}
                      onChange={e =>
                        setTemplateForm(prev => ({ ...prev, htmlContent: e.target.value }))
                      }
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
            {templates.map(template => (
              <Card key={template.templateId}>
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
                    onClick={() => loadTemplate(template.templateId)}
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
                  <div key={contact.contactId}>
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
                          {contact.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <Badge
                          variant={
                            contact.status === 'active'
                              ? 'default'
                              : contact.status === 'bounced'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {contact.status === 'active'
                            ? 'Aktiv'
                            : contact.status === 'bounced'
                              ? 'Bounced'
                              : 'Abgemeldet'}
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
              <p className="text-sm text-gray-600">Eingehende E-Mails über AWS SES Integration</p>
            </CardHeader>
            <CardContent>
              {inboxEmails.length === 0 ? (
                <Alert>
                  <MessageSquare className="h-4 w-4" />
                  <AlertDescription>
                    Keine E-Mails im Posteingang. AWS SES ist konfiguriert und bereit für
                    E-Mail-Empfang an admin@taskilo.de
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {inboxEmails.map(email => (
                    <Card key={email.emailId} className="border-l-4 border-l-[#14ad9f]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{email.from}</span>
                              <Badge variant="secondary">AWS SES</Badge>
                              {!email.isRead && <Badge className="bg-[#14ad9f]">Neu</Badge>}
                            </div>
                            <h3 className="font-medium mb-1">{email.subject}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              An: {email.to} • {new Date(email.receivedAt).toLocaleString()}
                            </p>
                            {email.body && (
                              <p className="text-sm text-gray-700 line-clamp-2">
                                {email.body.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setComposeForm({
                                to: email.from,
                                cc: '',
                                bcc: '',
                                subject: `Re: ${email.subject}`,
                                htmlContent: `<p></p><hr><p><strong>Original Message:</strong><br>From: ${email.from}<br>Subject: ${email.subject}</p>`,
                                templateId: '',
                              });
                              setActiveTab('compose');
                            }}
                          >
                            Antworten
                          </Button>
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
