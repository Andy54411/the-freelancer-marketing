'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  Ticket,
  TicketStats,
  TicketFilters,
  CreateTicketForm,
  TicketStatus,
} from '@/types/ticket';
import { Plus, Filter } from 'lucide-react';
import { TicketTable } from './components/TicketTable';
import { TicketFilters as TicketFiltersComponent } from './components/TicketFilters';
import { CreateTicketDialog } from './components/CreateTicketDialog';
import { TicketStatsCards } from './components/TicketStatsCards';
import { TicketEmailService } from '@/lib/ticket-email-service';
import { db } from '@/firebase/clients';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  where,
} from 'firebase/firestore';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Firestore Realtime Listener für Tickets
  useEffect(() => {
    setIsLoading(true);

    const ticketsQuery = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(ticketsQuery, snapshot => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
      })) as Ticket[];

      setTickets(ticketsData);
      setIsLoading(false);

      // Statistiken berechnen
      const stats: TicketStats = {
        total: ticketsData.length,
        open: ticketsData.filter(t => t.status === 'open').length,
        inProgress: ticketsData.filter(t => t.status === 'in-progress').length,
        resolved: ticketsData.filter(t => t.status === 'resolved').length,
        byPriority: {
          low: ticketsData.filter(t => t.priority === 'low').length,
          medium: ticketsData.filter(t => t.priority === 'medium').length,
          high: ticketsData.filter(t => t.priority === 'high').length,
        },
        byCategory: {
          general: ticketsData.filter(t => t.category === 'general').length,
          payment: ticketsData.filter(t => t.category === 'payment').length,
          authentication: ticketsData.filter(t => t.category === 'authentication').length,
          email: ticketsData.filter(t => t.category === 'email').length,
          technical: ticketsData.filter(t => t.category === 'technical').length,
          feedback: ticketsData.filter(t => t.category === 'feedback').length,
          other: ticketsData.filter(t => t.category === 'other').length,
        },
        overdue: ticketsData.filter(t => t.dueDate && t.dueDate < new Date()).length,
      };
      setTicketStats(stats);
    });

    return () => unsubscribe();
  }, []);

  // Mock-Daten für Entwicklung (später durch echte API ersetzen)
  useEffect(() => {
    const mockTickets: Ticket[] = [
      {
        id: 'ticket-1',
        title: 'Zahlungsproblem bei Stripe-Integration',
        description: 'Kunde kann keine Zahlung abschließen. Fehlermeldung beim Checkout.',
        status: 'open',
        priority: 'high',
        category: 'payment',
        reportedBy: 'kunde@beispiel.de',
        assignedTo: 'andy.staudinger@taskilo.de',
        createdAt: new Date('2025-08-10T10:30:00'),
        updatedAt: new Date('2025-08-10T14:20:00'),
        dueDate: new Date('2025-08-13T18:00:00'),
        tags: ['stripe', 'payment', 'checkout'],
        comments: [
          {
            id: 'comment-1',
            ticketId: 'ticket-1',
            userId: 'admin-1',
            userDisplayName: 'Andy Staudinger',
            userRole: 'admin',
            content: 'Schaue mir das Problem mit der Stripe-Integration an.',
            createdAt: new Date('2025-08-10T14:20:00'),
            isInternal: true,
          },
        ],
      },
      {
        id: 'ticket-2',
        title: 'Feature-Request: Dashboard Verbesserungen',
        description: 'Anbieter wünscht sich bessere Übersicht über ihre Aufträge im Dashboard.',
        status: 'in-progress',
        priority: 'medium',
        category: 'feature',
        reportedBy: 'anbieter@taskilo.de',
        assignedTo: 'andy.staudinger@taskilo.de',
        createdAt: new Date('2025-08-09T09:15:00'),
        updatedAt: new Date('2025-08-11T16:30:00'),
        tags: ['dashboard', 'ux', 'anbieter'],
        comments: [],
      },
      {
        id: 'ticket-3',
        title: 'Bug: E-Mail-Benachrichtigungen werden nicht versendet',
        description: 'Kunden erhalten keine E-Mail-Bestätigungen nach Buchungen.',
        status: 'resolved',
        priority: 'urgent',
        category: 'bug',
        reportedBy: 'support@taskilo.de',
        assignedTo: 'andy.staudinger@taskilo.de',
        createdAt: new Date('2025-08-08T11:00:00'),
        updatedAt: new Date('2025-08-12T10:45:00'),
        tags: ['email', 'notifications', 'booking'],
        comments: [],
      },
    ];

    const mockStats: TicketStats = {
      total: mockTickets.length,
      open: mockTickets.filter(t => t.status === 'open').length,
      inProgress: mockTickets.filter(t => t.status === 'in-progress').length,
      resolved: mockTickets.filter(t => t.status === 'resolved').length,
      byPriority: {
        low: 0,
        medium: 1,
        high: 1,
        urgent: 1,
      },
      byCategory: {
        bug: 1,
        feature: 1,
        support: 0,
        billing: 0,
        payment: 1,
        account: 0,
        technical: 0,
        feedback: 0,
        other: 0,
      },
      avgResolutionTime: 24.5,
      ticketsCreatedToday: 1,
      ticketsResolvedToday: 1,
    };

    setTimeout(() => {
      setTickets(mockTickets);
      setFilteredTickets(mockTickets);
      setTicketStats(mockStats);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Filter-Anwendung
  useEffect(() => {
    let filtered = [...tickets];

    // Status-Filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(ticket => filters.status!.includes(ticket.status));
    }

    // Priority-Filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(ticket => filters.priority!.includes(ticket.priority));
    }

    // Category-Filter
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(ticket => filters.category!.includes(ticket.category));
    }

    // Suchbegriff-Filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        ticket =>
          ticket.title.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.reportedBy.toLowerCase().includes(searchLower) ||
          ticket.assignedTo?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, filters]);

  const handleCreateTicket = async (ticketData: CreateTicketForm) => {
    try {
      // Ticket in Firestore erstellen
      const ticketDoc = {
        title: ticketData.title,
        description: ticketData.description,
        status: 'open' as TicketStatus,
        priority: ticketData.priority,
        category: ticketData.category,
        assignedTo: ticketData.assignedTo || null,
        reportedBy: 'admin@taskilo.de', // TODO: Aktuellen User verwenden
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dueDate: ticketData.dueDate || null,
        tags: ticketData.tags || [],
        comments: [],
      };

      const docRef = await addDoc(collection(db, 'tickets'), ticketDoc);

      console.log('🎫 Neues Ticket in Firestore erstellt:', docRef.id);

      // E-Mail-Benachrichtigungen über API senden
      try {
        const response = await fetch('/api/tickets/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: docRef.id,
            title: ticketData.title,
            reportedBy: ticketDoc.reportedBy,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log('✅ E-Mail-Benachrichtigungen erfolgreich gesendet:', result.emailId);
        } else {
          console.error('❌ Fehler beim Senden der E-Mail-Benachrichtigungen:', result.error);
        }
      } catch (emailError) {
        console.error('❌ E-Mail-Fehler:', emailError);
        // Ticket wird trotzdem erstellt, auch wenn E-Mail fehlschlägt
      }

      setShowCreateDialog(false);
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Tickets:', error);
    }
  };
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ticket-System</h1>
          <p className="text-gray-600 mt-2">Verwalten Sie Support-Anfragen und interne Aufgaben</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#14ad9f] hover:bg-[#129488] flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Neues Ticket
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      {ticketStats && <TicketStatsCards stats={ticketStats} />}

      {/* Filter */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter & Suche</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketFiltersComponent filters={filters} onFiltersChange={setFilters} />
          </CardContent>
        </Card>
      )}

      {/* Tickets-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tickets ({filteredTickets.length})</span>
            <Badge variant="secondary">
              {filteredTickets.filter(t => t.status === 'open').length} offen
            </Badge>
          </CardTitle>
          <CardDescription>Alle Support-Tickets und Aufgaben im Überblick</CardDescription>
        </CardHeader>
        <CardContent>
          <TicketTable tickets={filteredTickets} />
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}
