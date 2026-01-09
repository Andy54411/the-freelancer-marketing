'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageCircle,
  Shield,
  Eye,
  Archive,
  UserPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TicketData, TicketComment } from '@/services/admin/FirebaseTicketService';
import { getAvailableAgents, AdminAgent } from '@/lib/admin-agents';

interface AdminTicketDetailProps {
  ticketId?: string;
  ticket?: TicketData;
  onBack?: () => void;
  onTicketUpdate?: () => void;
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
  high: { label: 'Hoch', color: 'bg-red-100 text-red-800' },
  urgent: { label: 'Kritisch', color: 'bg-red-500 text-white' },
};

export default function AdminTicketDetail({
  ticketId,
  ticket: propTicket,
  onBack,
  onTicketUpdate,
}: AdminTicketDetailProps) {
  const [ticket, setTicket] = useState<TicketData | null>(propTicket || null);
  const [replies, setReplies] = useState<TicketComment[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [availableAgents, setAvailableAgents] = useState<AdminAgent[]>([]);

  // Verfügbare Agenten laden
  useEffect(() => {
    setAvailableAgents(getAvailableAgents());
  }, []);

  // Ticket laden wenn nur ID übergeben wurde
  const loadTicket = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/tickets?id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
      } else {
        toast.error('Fehler beim Laden des Tickets');
      }
    } catch {
      toast.error('Fehler beim Laden des Tickets');
    }
  };

  // Antworten laden
  const loadReplies = async () => {
    if (!ticket?.id && !ticketId) return;

    const id = ticket?.id || ticketId;
    try {
      const response = await fetch(`/api/admin/tickets/reply?ticketId=${id}`);

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      } else {
        toast.error('Fehler beim Laden der Antworten');
      }
    } catch {
      toast.error('Fehler beim Laden der Antworten');
    } finally {
      setLoading(false);
    }
  };

  // Ticket laden wenn nur ID übergeben wurde
  useEffect(() => {
    if (ticketId && !propTicket) {
      loadTicket(ticketId);
    }
  }, [ticketId, propTicket]);

  // Antworten laden
  useEffect(() => {
    if (ticket?.id) {
      loadReplies();
      setLoading(false);
    }
  }, [ticket?.id]);

  // Antwort senden
  const sendReply = async () => {
    if (!newReply.trim()) {
      toast.error('Bitte geben Sie eine Antwort ein');
      return;
    }

    if (!ticket?.id) {
      toast.error('Ticket-ID nicht gefunden');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/tickets/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: ticket.id,
          message: newReply.trim(),
          isInternal: isInternal,
        }),
      });

      if (response.ok) {
        toast.success('Antwort erfolgreich gesendet');
        setNewReply('');
        setIsInternal(false);
        loadReplies(); // Antworten neu laden
        onTicketUpdate?.(); // Ticket-Liste aktualisieren
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Senden der Antwort');
      }
    } catch {
      toast.error('Fehler beim Senden der Antwort');
    } finally {
      setSending(false);
    }
  };

  // Ticket-Status aktualisieren
  const updateTicketStatus = async (newStatus: string) => {
    if (!ticket?.id) return;

    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticket.id,
          status: newStatus,
        }),
      });

      if (response.ok) {
        const updatedTicket = { ...ticket, status: newStatus as any };
        setTicket(updatedTicket);
        toast.success(
          `Ticket als ${statusConfig[newStatus as keyof typeof statusConfig]?.label.toLowerCase()} markiert`
        );
        onTicketUpdate?.();
      } else {
        toast.error('Fehler beim Aktualisieren des Status');
      }
    } catch {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  // Ticket zuweisen
  const assignTicket = async () => {
    if (!ticket?.id || !selectedAssignee) return;

    try {
      const assignee = availableAgents.find(agent => agent.id === selectedAssignee);

      const response = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticket.id,
          assignedTo: assignee?.name || selectedAssignee,
        }),
      });

      if (response.ok) {
        const updatedTicket = { ...ticket, assignedTo: assignee?.name || selectedAssignee };
        setTicket(updatedTicket);
        setShowAssignDialog(false);
        setSelectedAssignee('');
        toast.success(`Ticket an ${assignee?.name} zugewiesen`);
        onTicketUpdate?.();
      } else {
        toast.error('Fehler beim Zuweisen des Tickets');
      }
    } catch {
      toast.error('Fehler beim Zuweisen des Tickets');
    } finally {
      setShowAssignDialog(false);
      setSelectedAssignee('');
    }
  };

  // Datum formatieren
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Ticket nicht gefunden</div>
        </CardContent>
      </Card>
    );
  }

  // Autor-Icon bestimmen
  const getAuthorIcon = (authorType: string) => {
    switch (authorType) {
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'customer':
        return <User className="w-4 h-4 text-green-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const StatusIcon = statusConfig[ticket.status]?.icon || AlertCircle;

  return (
    <div className="space-y-6">
      {/* Header mit Zurück-Button und Aktionen */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </Button>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Ticket #{ticket.id.split('_')[1]?.substring(0, 8)}
            </h1>
            <p className="text-gray-600">{ticket.title}</p>
          </div>
        </div>

        {/* Ticket-Aktionen */}
        <div className="flex items-center gap-2">
          {ticket.status !== 'closed' && (
            <>
              {ticket.status !== 'resolved' && (
                <Button
                  onClick={() => updateTicketStatus('resolved')}
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Als gelöst markieren
                </Button>
              )}
              <Button
                onClick={() => updateTicketStatus('closed')}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Archive className="w-4 h-4 mr-1" />
                Schließen
              </Button>
              <Button
                onClick={() => setShowAssignDialog(true)}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Zuweisen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Ticket-Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <div className="flex items-center gap-4">
                <Badge className={statusConfig[ticket.status]?.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[ticket.status]?.label}
                </Badge>
                <Badge className={priorityConfig[ticket.priority]?.color}>
                  {priorityConfig[ticket.priority]?.label}
                </Badge>
                <Badge variant="outline">{ticket.category}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Beschreibung</Label>
            <p className="mt-1 text-gray-900">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Kunde</Label>
              <p className="font-medium">{ticket.customerName || 'Unbekannt'}</p>
              <p className="text-gray-500">{ticket.customerEmail}</p>
            </div>
            <div>
              <Label className="text-gray-600">Zugewiesen an</Label>
              <p className="font-medium">{ticket.assignedTo || 'Nicht zugewiesen'}</p>
            </div>
            <div>
              <Label className="text-gray-600">Erstellt</Label>
              <p className="font-medium">{formatDate(ticket.createdAt)}</p>
            </div>
            <div>
              <Label className="text-gray-600">Letzte Aktualisierung</Label>
              <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
            </div>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div>
              <Label className="text-gray-600">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gesprächsverlauf */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Gesprächsverlauf ({replies.length} Nachrichten)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Lade Gesprächsverlauf...</div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Noch keine Antworten vorhanden</div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`flex gap-3 p-4 rounded-lg border ${
                    reply.authorType === 'admin'
                      ? 'bg-blue-50 border-blue-200'
                      : reply.authorType === 'system'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="shrink-0 mt-1">{getAuthorIcon(reply.authorType)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{reply.author}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            reply.authorType === 'admin'
                              ? 'border-blue-300 text-blue-700'
                              : reply.authorType === 'system'
                                ? 'border-gray-300 text-gray-700'
                                : 'border-green-300 text-green-700'
                          }`}
                        >
                          {reply.authorType === 'admin'
                            ? 'Admin'
                            : reply.authorType === 'system'
                              ? 'System'
                              : 'Kunde'}
                        </Badge>
                        {reply.isInternal && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Intern
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(reply.timestamp)}</span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Antwort-Formular */}
      <Card>
        <CardHeader>
          <CardTitle>Antwort verfassen</CardTitle>
          <CardDescription>
            Antworten Sie dem Kunden oder fügen Sie interne Notizen hinzu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reply">Nachricht</Label>
            <Textarea
              id="reply"
              placeholder="Ihre Antwort..."
              value={newReply}
              onChange={e => setNewReply(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="internal"
              checked={isInternal}
              onCheckedChange={checked => setIsInternal(checked === true)}
            />
            <Label htmlFor="internal" className="text-sm">
              Interne Notiz (nur für Admins sichtbar)
            </Label>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={sendReply}
              disabled={sending || !newReply.trim()}
              className="bg-[#14ad9f] hover:bg-taskilo-hover"
            >
              {sending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isInternal ? 'Interne Notiz hinzufügen' : 'Antwort senden'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zuweisungs-Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ticket zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie einen Mitarbeiter aus, dem dieses Ticket zugewiesen werden soll.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Mitarbeiter auswählen</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitarbeiter auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-sm text-gray-500">{agent.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={assignTicket}
              disabled={!selectedAssignee}
              className="bg-[#14ad9f] hover:bg-taskilo-hover"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Zuweisen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
