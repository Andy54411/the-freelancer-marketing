'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface TicketReply {
  id: string;
  author: string;
  authorType: 'admin' | 'customer' | 'system';
  content: string;
  timestamp: string;
  isInternal: boolean;
}

interface TicketDetails {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  customerEmail: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

interface TicketDetailViewProps {
  ticketId: string;
  onBack: () => void;
  userType?: 'admin' | 'customer';
}

const statusConfig = {
  open: { label: 'Offen', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'in-progress': { label: 'In Bearbeitung', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  resolved: { label: 'Gelöst', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  closed: { label: 'Geschlossen', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
};

const priorityConfig = {
  low: { label: 'Niedrig', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Hoch', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Dringend', color: 'bg-red-100 text-red-800' },
};

export default function TicketDetailView({
  ticketId,
  onBack,
  userType = 'customer',
}: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Ticket-Details und Antworten laden
  const loadTicketDetails = async () => {
    try {
      // Zuerst das Ticket laden
      const ticketResponse = await fetch(`/api/company/tickets?id=${ticketId}`);

      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        if (ticketData.success && ticketData.ticket) {
          setTicket(ticketData.ticket);

          // Dann die Antworten laden
          const repliesResponse = await fetch(`/api/company/tickets/reply?ticketId=${ticketId}`);
          if (repliesResponse.ok) {
            const repliesData = await repliesResponse.json();
            setReplies(repliesData.replies || []);
          }
        } else {
          toast.error('Ticket nicht gefunden');
        }
      } else {
        toast.error('Fehler beim Laden des Tickets');
      }
    } catch (error) {
      toast.error('Fehler beim Laden des Tickets');
    } finally {
      setLoading(false);
    }
  };

  // Antwort senden
  const sendReply = async () => {
    if (!replyMessage.trim()) {
      toast.error('Bitte geben Sie eine Nachricht ein');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/company/tickets/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          message: replyMessage.trim(),
          isInternal: false,
        }),
      });

      if (response.ok) {
        toast.success('Antwort erfolgreich gesendet');
        setReplyMessage('');
        loadTicketDetails(); // Reload um neue Antwort zu sehen
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Senden der Antwort');
      }
    } catch (error) {
      toast.error('Fehler beim Senden der Antwort');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Ticket nicht gefunden</h3>
          <p className="text-gray-600 mt-2">Das angeforderte Ticket konnte nicht geladen werden.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusConfig[ticket.status]?.icon || AlertCircle;

  return (
    <div className="space-y-6">
      {/* Header mit Zurück-Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.id.slice(-8)}</h1>
            <p className="text-gray-600">
              Erstellt am {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={priorityConfig[ticket.priority]?.color}>
            {priorityConfig[ticket.priority]?.label}
          </Badge>
          <Badge className={statusConfig[ticket.status]?.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig[ticket.status]?.label}
          </Badge>
        </div>
      </div>

      {/* Ticket-Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#14ad9f]" />
            <span>{ticket.title}</span>
          </CardTitle>
          <CardDescription>
            Von {ticket.customerName} ({ticket.customerEmail}) • Kategorie: {ticket.category}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Gesprächsverlauf */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#14ad9f]" />
            <span>Gesprächsverlauf</span>
          </CardTitle>
          <CardDescription>
            {replies.length} Antworten • Letzte Aktualisierung:{' '}
            {new Date(ticket.updatedAt).toLocaleString('de-DE')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {replies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Noch keine Antworten auf dieses Ticket</p>
            </div>
          ) : (
            replies.map((reply, index) => (
              <div key={reply.id} className="space-y-3">
                <div
                  className={`flex space-x-3 ${reply.authorType === 'admin' ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={`${reply.authorType === 'admin' ? 'bg-[#14ad9f] text-white' : 'bg-gray-100'}`}
                    >
                      {reply.authorType === 'admin' ? (
                        <Shield className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${reply.authorType === 'admin' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        reply.authorType === 'admin'
                          ? 'bg-[#14ad9f] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{reply.content}</p>
                    </div>
                    <div
                      className={`text-xs text-gray-500 mt-1 ${reply.authorType === 'admin' ? 'text-right' : ''}`}
                    >
                      {reply.author} • {new Date(reply.timestamp).toLocaleString('de-DE')}
                      {reply.isInternal && userType === 'admin' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Intern
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {index < replies.length - 1 && <Separator className="my-4" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Antwort-Formular */}
      {ticket.status !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="w-5 h-5 text-[#14ad9f]" />
              <span>Antwort senden</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ihre Antwort..."
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              rows={4}
              className="min-h-[100px]"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setReplyMessage('')}
                disabled={sending || !replyMessage.trim()}
              >
                Zurücksetzen
              </Button>
              <Button
                onClick={sendReply}
                disabled={sending || !replyMessage.trim()}
                className="bg-[#14ad9f] hover:bg-[#129488]"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Antwort senden
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
