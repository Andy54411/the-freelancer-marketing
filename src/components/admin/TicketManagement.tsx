'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  Search,
  Tag,
  User,
  Calendar,
  MessageCircle,
} from 'lucide-react';

interface TicketComment {
  id: string;
  author: string;
  authorType: 'admin' | 'customer' | 'system';
  content: string;
  timestamp: string;
  isInternal: boolean;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature' | 'support' | 'question' | 'other';
  assignedTo?: string;
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  comments: TicketComment[];
}

interface TicketManagementProps {
  onTicketUpdate?: () => void;
}

const TicketManagement: React.FC<TicketManagementProps> = ({ onTicketUpdate }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    search: '',
  });

  // Neue Ticket-Form
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    customerEmail: '',
    customerName: '',
    assignedTo: '',
    tags: '',
  });

  // Kommentar-Form
  const [newComment, setNewComment] = useState({
    content: '',
    isInternal: false,
  });

  // Tickets laden
  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tickets');
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.error || 'Fehler beim Laden der Tickets');
      }
    } catch (err) {
      setError('Netzwerk-Fehler beim Laden der Tickets');
    } finally {
      setLoading(false);
    }
  };

  // Neues Ticket erstellen
  const createTicket = async () => {
    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTicket,
          tags: newTicket.tags ? newTicket.tags.split(',').map(tag => tag.trim()) : [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateDialog(false);
        setNewTicket({
          title: '',
          description: '',
          priority: 'medium',
          category: 'other',
          customerEmail: '',
          customerName: '',
          assignedTo: '',
          tags: '',
        });
        loadTickets();
        onTicketUpdate?.();
      } else {
        setError(data.error || 'Fehler beim Erstellen des Tickets');
      }
    } catch (err) {
      setError('Fehler beim Erstellen des Tickets');
    }
  };

  // Ticket aktualisieren
  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, ...updates }),
      });

      const data = await response.json();
      if (data.success) {
        loadTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(data.ticket);
        }
        onTicketUpdate?.();
      } else {
        setError(data.error || 'Fehler beim Aktualisieren des Tickets');
      }
    } catch (err) {
      setError('Fehler beim Aktualisieren des Tickets');
    }
  };

  // Kommentar hinzufügen
  const addComment = async () => {
    if (!selectedTicket || !newComment.content.trim()) return;

    try {
      const response = await fetch('/api/admin/tickets/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          content: newComment.content,
          author: 'Admin',
          authorType: 'admin',
          isInternal: newComment.isInternal,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setNewComment({ content: '', isInternal: false });
      } else {
        setError(data.error || 'Fehler beim Hinzufügen des Kommentars');
      }
    } catch (err) {
      setError('Fehler beim Hinzufügen des Kommentars');
    }
  };

  // Ticket löschen
  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Ticket löschen möchten?')) return;

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        loadTickets();
        setShowTicketDialog(false);
        setSelectedTicket(null);
        onTicketUpdate?.();
      } else {
        setError(data.error || 'Fehler beim Löschen des Tickets');
      }
    } catch (err) {
      setError('Fehler beim Löschen des Tickets');
    }
  };

  // Gefilterte Tickets
  const filteredTickets = tickets.filter(ticket => {
    if (filters.status && filters.status !== 'all' && ticket.status !== filters.status)
      return false;
    if (filters.priority && filters.priority !== 'all' && ticket.priority !== filters.priority)
      return false;
    if (filters.category && filters.category !== 'all' && ticket.category !== filters.category)
      return false;
    if (
      filters.search &&
      !ticket.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !ticket.description.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  // Status Badge Styling
  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-red-100 text-red-800 border-red-200',
      'in-progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return styles[status] || styles.open;
  };

  // Priority Badge Styling
  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[priority] || styles.medium;
  };

  useEffect(() => {
    loadTickets();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header mit Filter und Erstellen-Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tickets durchsuchen..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-64"
            />
          </div>
          <Select
            value={filters.status || 'all'}
            onValueChange={value => setFilters(prev => ({ ...prev, status: value || 'all' }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="in-progress">In Bearbeitung</SelectItem>
              <SelectItem value="resolved">Gelöst</SelectItem>
              <SelectItem value="closed">Geschlossen</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.priority || 'all'}
            onValueChange={value => setFilters(prev => ({ ...prev, priority: value || 'all' }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priorität" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
              <SelectItem value="urgent">Dringend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#14ad9f] hover:bg-[#129488] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Neues Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Ticket erstellen</DialogTitle>
              <DialogDescription>
                Erstellen Sie ein neues Support-Ticket für Ihr Admin-System
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Titel</Label>
                  <Input
                    id="title"
                    value={newTicket.title}
                    onChange={e => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ticket-Titel"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priorität</Label>
                  <Select
                    value={newTicket.priority || 'medium'}
                    onValueChange={value =>
                      setNewTicket(prev => ({ ...prev, priority: value || 'medium' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                      <SelectItem value="urgent">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategorie</Label>
                  <Select
                    value={newTicket.category || 'other'}
                    onValueChange={value =>
                      setNewTicket(prev => ({ ...prev, category: value || 'other' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="question">Frage</SelectItem>
                      <SelectItem value="other">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignedTo">Zugewiesen an</Label>
                  <Input
                    id="assignedTo"
                    value={newTicket.assignedTo}
                    onChange={e => setNewTicket(prev => ({ ...prev, assignedTo: e.target.value }))}
                    placeholder="Admin-Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Kundenname</Label>
                  <Input
                    id="customerName"
                    value={newTicket.customerName}
                    onChange={e =>
                      setNewTicket(prev => ({ ...prev, customerName: e.target.value }))
                    }
                    placeholder="Name des Kunden"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Kunden-Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={newTicket.customerEmail}
                    onChange={e =>
                      setNewTicket(prev => ({ ...prev, customerEmail: e.target.value }))
                    }
                    placeholder="kunde@example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={e => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detaillierte Beschreibung des Tickets..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (kommagetrennt)</Label>
                <Input
                  id="tags"
                  value={newTicket.tags}
                  onChange={e => setNewTicket(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button
                onClick={createTicket}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                disabled={!newTicket.title.trim() || !newTicket.description.trim()}
              >
                Ticket erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              Schließen
            </Button>
          </div>
        </div>
      )}

      {/* Tickets Liste */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                {tickets.length === 0 ? 'Noch keine Tickets vorhanden' : 'Keine Tickets gefunden'}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map(ticket => (
            <Card
              key={ticket.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedTicket(ticket);
                setShowTicketDialog(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{ticket.title}</h3>
                      <Badge className={`${getStatusBadge(ticket.status)} border`}>
                        {ticket.status}
                      </Badge>
                      <Badge className={`${getPriorityBadge(ticket.priority)} border`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {ticket.customerName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.customerName}
                        </div>
                      )}
                      {ticket.assignedTo && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {ticket.assignedTo}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                      </div>
                      {ticket.comments && ticket.comments.length > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {ticket.comments.length}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">{selectedTicket.title}</DialogTitle>
                  <div className="flex gap-2">
                    <Badge className={`${getStatusBadge(selectedTicket.status)} border`}>
                      {selectedTicket.status}
                    </Badge>
                    <Badge className={`${getPriorityBadge(selectedTicket.priority)} border`}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
                <DialogDescription>Ticket-ID: {selectedTicket.id}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="comments">
                    Kommentare ({selectedTicket.comments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="actions">Aktionen</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={selectedTicket.status || 'open'}
                        onValueChange={value =>
                          updateTicket(selectedTicket.id, { status: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Offen</SelectItem>
                          <SelectItem value="in-progress">In Bearbeitung</SelectItem>
                          <SelectItem value="resolved">Gelöst</SelectItem>
                          <SelectItem value="closed">Geschlossen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priorität</Label>
                      <Select
                        value={selectedTicket.priority || 'medium'}
                        onValueChange={value =>
                          updateTicket(selectedTicket.id, { priority: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niedrig</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                          <SelectItem value="urgent">Dringend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kategorie</Label>
                      <Select
                        value={selectedTicket.category || 'other'}
                        onValueChange={value =>
                          updateTicket(selectedTicket.id, { category: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="question">Frage</SelectItem>
                          <SelectItem value="other">Sonstiges</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Zugewiesen an</Label>
                      <Input
                        value={selectedTicket.assignedTo || ''}
                        onChange={e =>
                          updateTicket(selectedTicket.id, { assignedTo: e.target.value })
                        }
                        placeholder="Admin-Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Kundenname</Label>
                      <Input value={selectedTicket.customerName || ''} disabled />
                    </div>
                    <div>
                      <Label>Kunden-Email</Label>
                      <Input value={selectedTicket.customerEmail || ''} disabled />
                    </div>
                  </div>

                  <div>
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={selectedTicket.description}
                      onChange={e =>
                        updateTicket(selectedTicket.id, { description: e.target.value })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Erstellt am</Label>
                      <Input
                        value={new Date(selectedTicket.createdAt).toLocaleString('de-DE')}
                        disabled
                      />
                    </div>
                    <div>
                      <Label>Aktualisiert am</Label>
                      <Input
                        value={new Date(selectedTicket.updatedAt).toLocaleString('de-DE')}
                        disabled
                      />
                    </div>
                  </div>

                  {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                    <div>
                      <Label>Tags</Label>
                      <div className="flex gap-2 mt-2">
                        {selectedTicket.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4">
                  {/* Kommentare anzeigen */}
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                      selectedTicket.comments.map(comment => (
                        <div
                          key={comment.id}
                          className={`p-3 rounded-lg border ${comment.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{comment.author}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.authorType}
                              </Badge>
                              {comment.isInternal && (
                                <Badge variant="outline" className="text-xs bg-yellow-100">
                                  Intern
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.timestamp).toLocaleString('de-DE')}
                            </span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Noch keine Kommentare vorhanden
                      </div>
                    )}
                  </div>

                  {/* Neuen Kommentar hinzufügen */}
                  <div className="border-t pt-4">
                    <Label>Neuer Kommentar</Label>
                    <Textarea
                      value={newComment.content}
                      onChange={e => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Kommentar eingeben..."
                      rows={3}
                      className="mt-2"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isInternal"
                          checked={newComment.isInternal}
                          onChange={e =>
                            setNewComment(prev => ({ ...prev, isInternal: e.target.checked }))
                          }
                          className="rounded"
                        />
                        <Label htmlFor="isInternal" className="text-sm">
                          Interner Kommentar (nur für Admins sichtbar)
                        </Label>
                      </div>
                      <Button
                        onClick={addComment}
                        disabled={!newComment.content.trim()}
                        className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                      >
                        Kommentar hinzufügen
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Schnellaktionen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button
                          onClick={() => updateTicket(selectedTicket.id, { status: 'in-progress' })}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                          disabled={selectedTicket.status === 'in-progress'}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          In Bearbeitung setzen
                        </Button>
                        <Button
                          onClick={() => updateTicket(selectedTicket.id, { status: 'resolved' })}
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                          disabled={selectedTicket.status === 'resolved'}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Als gelöst markieren
                        </Button>
                        <Button
                          onClick={() => updateTicket(selectedTicket.id, { status: 'closed' })}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white"
                          disabled={selectedTicket.status === 'closed'}
                        >
                          Ticket schließen
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-red-600">Gefährliche Aktionen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => deleteTicket(selectedTicket.id)}
                          variant="destructive"
                          className="w-full"
                        >
                          Ticket löschen
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagement;
