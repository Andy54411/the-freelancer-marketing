'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import TicketDetailView from '@/components/support/TicketDetailView';
import {
  MessageSquare,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Ticket,
  User,
  Calendar,
  Eye,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  category: string;
  createdAt: string;
  updatedAt: string;
  customerEmail: string;
  customerName: string;
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    authorType: 'user' | 'admin';
    timestamp: string;
  }>;
}

const statusConfig = {
  open: { label: 'Offen', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'in-progress': { label: 'In Bearbeitung', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  resolved: { label: 'Gelöst', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

const priorityConfig = {
  low: { label: 'Niedrig', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Hoch', color: 'bg-red-100 text-red-800' },
};

export default function CompanySupportPage({ params }: { params: Promise<{ uid: string }> }) {
  const { user } = useAuth();
  const resolvedParams = useParams();
  const uid = resolvedParams?.uid as string;

  const [userEmail, setUserEmail] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form-Daten für neues Ticket
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    category: 'general',
  });

  // Benutzer-E-Mail anhand der UID ermitteln
  const fetchUserEmail = async () => {
    if (!uid) return;

    try {
      // Erst versuchen, die E-Mail aus dem Auth-Context zu nehmen, falls es der gleiche User ist
      if (user?.uid === uid && user?.email) {
        setUserEmail(user.email);
        return;
      }

      // Ansonsten aus der Firebase/AWS-Datenbank laden
      // Für jetzt verwenden wir eine einfache Zuordnung - später über API
      // TODO: Erstelle eine API-Route um User-Details per UID zu holen

      // Temporäre Zuordnung basierend auf bekannten UIDs
      const uidToEmailMap: Record<string, string> = {
        '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1': 'a.staudinger32@icloud.com',
      };

      const email = uidToEmailMap[uid];
      if (email) {
        setUserEmail(email);
      } else {
      }
    } catch (error) {}
  };

  // Tickets laden
  const loadTickets = async () => {
    if (!userEmail) return;

    try {
      const response = await fetch(
        `/api/company/tickets?customerEmail=${encodeURIComponent(userEmail)}`
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserEmail();
  }, [uid, user]);

  useEffect(() => {
    loadTickets();
  }, [userEmail]);

  // Neues Ticket erstellen
  const createTicket = async () => {
    if (!userEmail || !newTicket.title.trim() || !newTicket.description.trim()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/company/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTicket.title,
          description: newTicket.description,
          priority: newTicket.priority,
          category: newTicket.category,
          customerEmail: userEmail,
          customerName: user?.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : 'Firma',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Support-Ticket erfolgreich erstellt');
        setNewTicket({ title: '', description: '', priority: 'medium', category: 'general' });
        setShowCreateForm(false);
        loadTickets(); // Tickets neu laden
      } else {
        toast.error('Fehler beim Erstellen des Tickets');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Tickets');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler für Ticket-Detail-Ansicht
  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setSelectedTicketId(null);
    loadTickets(); // Refresh to get updated ticket data
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Conditional Rendering: Ticket Detail View or List View */}
      {selectedTicket ? (
        <TicketDetailView
          ticketId={selectedTicket.id}
          onBack={handleBackToList}
          user_type="kunde"
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#14ad9f]" />
                Support Center
              </h1>
              <p className="text-gray-600 mt-1">Erstellen und verwalten Sie Support-Anfragen</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#14ad9f] hover:bg-[#129488]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neues Ticket
              </Button>
            </div>
          </div>

          {/* Neues Ticket Formular */}
          {showCreateForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Neues Support-Ticket erstellen
                </CardTitle>
                <CardDescription>
                  Beschreiben Sie Ihr Anliegen so detailliert wie möglich
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Betreff *</Label>
                    <Input
                      id="title"
                      value={newTicket.title}
                      onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                      placeholder="Kurze Beschreibung des Problems"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priorität</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={value =>
                        setNewTicket({ ...newTicket, priority: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Normal</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select
                    value={newTicket.category}
                    onValueChange={value => setNewTicket({ ...newTicket, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Allgemein</SelectItem>
                      <SelectItem value="technical">Technisch</SelectItem>
                      <SelectItem value="billing">Abrechnung</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="feature">Feature-Anfrage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Beschreibung *</Label>
                  <Textarea
                    id="description"
                    value={newTicket.description}
                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Detaillierte Beschreibung Ihres Anliegens..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={createTicket}
                    disabled={submitting}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Ticket erstellen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={submitting}
                  >
                    Abbrechen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tickets Liste */}
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Noch keine Support-Tickets
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Erstellen Sie Ihr erstes Support-Ticket, um Hilfe zu erhalten
                  </p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-[#14ad9f] hover:bg-[#129488]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Erstes Ticket erstellen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tickets.map(ticket => {
                const StatusIcon = statusConfig[ticket.status].icon;
                return (
                  <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{ticket.title}</h3>
                            <Badge className={statusConfig[ticket.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[ticket.status].label}
                            </Badge>
                            <Badge className={priorityConfig[ticket.priority].color}>
                              {priorityConfig[ticket.priority].label}
                            </Badge>
                          </div>

                          <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>

                          <div className="flex items-center justify-between gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                Ticket #{ticket.id.slice(-8)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                              </span>
                              {ticket.comments && ticket.comments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {ticket.comments.length} Antworten
                                </span>
                              )}
                            </div>
                            <Button
                              onClick={() => handleTicketSelect(ticket)}
                              variant="outline"
                              size="sm"
                              className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Details anzeigen
                            </Button>
                          </div>
                        </div>
                      </div>

                      {ticket.comments && ticket.comments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Letzte Antwort:
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700">
                              {ticket.comments[ticket.comments.length - 1].content}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {ticket.comments[ticket.comments.length - 1].authorType === 'admin'
                                ? 'Support Team'
                                : 'Sie'}{' '}
                              -{' '}
                              {new Date(
                                ticket.comments[ticket.comments.length - 1].timestamp
                              ).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
