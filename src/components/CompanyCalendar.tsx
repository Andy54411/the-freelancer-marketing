'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { type EventInput, type EventClickArg, type EventContentArg } from '@fullcalendar/core';
import deLocale from '@fullcalendar/core/locales/de';
import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Wiederverwendbarer OrderData-Typ
type OrderData = {
  id: string;
  selectedSubcategory: string;
  customerName: string;
  status: string;
  jobDateFrom?: string;
  jobDateTo?: string;
  uid: string; // Provider UID
};

// Project-Typ für Kalenderanzeige
type ProjectData = {
  id: string;
  name: string;
  client: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  companyId: string;
};

// Invoice-Typ für Kalenderanzeige
type InvoiceData = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  companyId: string;
};

interface CompanyCalendarProps {
  companyUid: string;
  selectedOrderId?: string | null; // Die ID des Auftrags, der hervorgehoben werden soll
}

// NEU: Hilfsfunktion, um Farben basierend auf dem Auftragsstatus, Projektstatus oder Rechnungsstatus zu bestimmen
const getStatusColor = (status: string) => {
  switch (status) {
    // Order statuses
    case 'AKTIV':
      return { backgroundColor: '#14ad9f', borderColor: '#14ad9f' }; // Teal
    case 'IN BEARBEITUNG':
      return { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }; // Amber/Gelb
    case 'ABGESCHLOSSEN':
      return { backgroundColor: '#6b7280', borderColor: '#6b7280' }; // Grau

    // Project statuses
    case 'planning':
      return { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }; // Blau
    case 'active':
      return { backgroundColor: '#10b981', borderColor: '#10b981' }; // Grün
    case 'on-hold':
      return { backgroundColor: '#f59e0b', borderColor: '#f59e0b' }; // Amber/Gelb
    case 'completed':
      return { backgroundColor: '#6b7280', borderColor: '#6b7280' }; // Grau
    case 'cancelled':
      return { backgroundColor: '#ef4444', borderColor: '#ef4444' }; // Rot

    // Invoice statuses
    case 'draft':
      return { backgroundColor: '#a1a1aa', borderColor: '#a1a1aa' }; // Grau
    case 'sent':
      return { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }; // Blau
    case 'paid':
      return { backgroundColor: '#10b981', borderColor: '#10b981' }; // Grün
    case 'overdue':
      return { backgroundColor: '#ef4444', borderColor: '#ef4444' }; // Rot
    case 'cancelled':
      return { backgroundColor: '#6b7280', borderColor: '#6b7280' }; // Grau

    default:
      return { backgroundColor: '#a1a1aa', borderColor: '#a1a1aa' }; // Standard-Grau
  }
};

export default function CompanyCalendar({ companyUid, selectedOrderId }: CompanyCalendarProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [allOrders, setAllOrders] = useState<OrderData[]>([]); // Speichert die Rohdaten der Aufträge
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]); // Speichert die Rohdaten der Projekte
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]); // Speichert die Rohdaten der Rechnungen
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effekt zum einmaligen Laden der Auftrags-, Projekt- und Rechnungsdaten
  useEffect(() => {
    if (authLoading) {
      return; // Warten auf Authentifizierung
    }

    if (!user) {
      setError('Benutzer nicht authentifiziert.');
      setLoading(false);
      return;
    }

    // Berechtigungsprüfung: Benutzer muss entweder die Company UID haben ODER master/support sein
    const hasAccess = user.uid === companyUid || user.role === 'master' || user.role === 'support';

    if (!hasAccess) {
      setError('Zugriff verweigert. Keine Berechtigung für diese Firma.');
      setLoading(false);
      return;
    }

    const fetchOrdersProjectsAndInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        // Aufträge laden
        const orderResult = await callHttpsFunction(
          'getProviderOrders',
          { providerId: companyUid },
          'GET'
        );

        // KORREKTUR: Aufträge filtern, die im Kalender angezeigt werden sollen (AKTIV, IN BEARBEITUNG, ABGESCHLOSSEN)
        // und sicherstellen, dass sie ein Startdatum haben.
        const relevantOrders = orderResult.orders.filter((order: any) => {
          const hasValidStatus = ['AKTIV', 'IN BEARBEITUNG', 'ABGESCHLOSSEN'].includes(
            order.status
          );
          const hasStartDate = !!order.jobDateFrom;
          if (!hasValidStatus || !hasStartDate) {

          }
          return hasValidStatus && hasStartDate;
        });

        // Projekte aus Firebase laden
        const projectsQuery = query(
          collection(db, 'projects'),
          where('companyId', '==', companyUid),
          orderBy('createdAt', 'desc')
        );

        const projectSnapshot = await getDocs(projectsQuery);
        const loadedProjects: ProjectData[] = [];

        projectSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.startDate && data.endDate) {
            loadedProjects.push({
              id: doc.id,
              name: data.name || '',
              client: data.client || '',
              status: data.status || 'planning',
              startDate: data.startDate,
              endDate: data.endDate,
              companyId: data.companyId || companyUid,
            });
          }
        });

        // Rechnungen aus Firebase laden
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('companyId', '==', companyUid),
          orderBy('createdAt', 'desc')
        );

        const invoiceSnapshot = await getDocs(invoicesQuery);
        const loadedInvoices: InvoiceData[] = [];

        invoiceSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.dueDate && data.status !== 'paid' && data.status !== 'cancelled') {
            // Automatisch prüfen ob Rechnung überfällig ist
            const dueDate = new Date(data.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Zeit auf 00:00 setzen für korrekte Vergleiche

            let actualStatus = data.status;
            if (dueDate < today && data.status === 'sent') {
              actualStatus = 'overdue';
            }

            loadedInvoices.push({
              id: doc.id,
              invoiceNumber: data.invoiceNumber || data.number || '',
              customerName: data.customerName || '',
              total: data.total || 0,
              dueDate: data.dueDate,
              status: actualStatus,
              companyId: data.companyId || companyUid,
            });
          }
        });

        setAllOrders(relevantOrders);
        setAllProjects(loadedProjects);
        setAllInvoices(loadedInvoices);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Aufträge, Projekte und Rechnungen.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersProjectsAndInvoices();
  }, [user, authLoading, companyUid]);

  // Effekt zum Erstellen der Kalender-Events, wenn sich die Aufträge, Projekte, Rechnungen oder die Auswahl ändern
  useEffect(() => {

    // Events für Aufträge erstellen
    const orderEvents = allOrders.map(order => {
      const isSelected = order.id === selectedOrderId;
      const colors = getStatusColor(order.status);

      // KORREKTUR: End-Datum für ganztägige/mehrtägige Events anpassen.
      // FullCalendar behandelt das End-Datum als exklusiv. Um einen Auftrag
      // bis einschließlich zum 10.08. anzuzeigen, muss das End-Datum der 11.08. sein.
      let inclusiveEndDate;
      if (order.jobDateTo) {
        const d = new Date(order.jobDateTo);
        d.setDate(d.getDate() + 1); // Einen Tag hinzufügen
        inclusiveEndDate = d;
      }

      const eventObject = {
        id: order.id,
        title: `📋 ${order.selectedSubcategory}`,
        start: order.jobDateFrom ? new Date(order.jobDateFrom) : undefined,
        end: inclusiveEndDate, // Korrigiertes End-Datum verwenden
        allDay: true, // Behandle alle Aufträge mit Datum als "allDay" für eine saubere Monatsansicht
        url: `/dashboard/company/${companyUid}/orders/${order.id}`,
        extendedProps: {
          customerName: order.customerName,
          status: order.status,
          type: 'order',
        },
        // Visuelle Hervorhebung für ausgewählte Aufträge
        className: isSelected ? 'border-2 border-white ring-2 ring-teal-500 z-10' : '',
        ...colors,
      };

      return eventObject;
    });

    // Events für Projekte erstellen
    const projectEvents = allProjects.map(project => {
      const colors = getStatusColor(project.status);

      // End-Datum für FullCalendar anpassen (exklusiv)
      let inclusiveEndDate;
      if (project.endDate) {
        const d = new Date(project.endDate);
        d.setDate(d.getDate() + 1); // Einen Tag hinzufügen
        inclusiveEndDate = d;
      }

      const eventObject = {
        id: `project-${project.id}`,
        title: `🚀 ${project.name}`,
        start: project.startDate ? new Date(project.startDate) : undefined,
        end: inclusiveEndDate,
        allDay: true,
        url: `/dashboard/company/${companyUid}/finance/projects`,
        extendedProps: {
          customerName: project.client,
          status: project.status,
          type: 'project',
        },
        ...colors,
      };

      return eventObject;
    });

    // Events für Rechnungen erstellen (Fälligkeitsdatum)
    const invoiceEvents = allInvoices.map(invoice => {
      const colors = getStatusColor(invoice.status);

      // Emoji basierend auf Status wählen
      const getInvoiceEmoji = (status: string) => {
        switch (status) {
          case 'overdue':
            return '🚨'; // Überfällig
          case 'sent':
            return '📄'; // Versendet
          case 'draft':
            return '📝'; // Entwurf
          default:
            return '💰'; // Standard
        }
      };

      const eventObject = {
        id: `invoice-${invoice.id}`,
        title: `${getInvoiceEmoji(invoice.status)} Rechnung ${invoice.invoiceNumber}`,
        start: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        allDay: true,
        url: `/dashboard/company/${companyUid}/finance/invoices`,
        extendedProps: {
          customerName: invoice.customerName,
          status: invoice.status,
          type: 'invoice',
          total: invoice.total,
          invoiceNumber: invoice.invoiceNumber,
        },
        // Überfällige Rechnungen besonders hervorheben
        className: invoice.status === 'overdue' ? 'invoice-overdue' : '',
        ...colors,
      };

      return eventObject;
    });

    // Alle Events kombinieren
    const calendarEvents = [...orderEvents, ...projectEvents, ...invoiceEvents];

    setEvents(calendarEvents);
  }, [allOrders, allProjects, allInvoices, selectedOrderId, companyUid]);

  // NEU: Funktion zum Rendern des Event-Inhalts mit Tooltip
  const renderEventContent = (eventInfo: EventContentArg) => {
    const { status, customerName, type, total, invoiceNumber } = eventInfo.event.extendedProps;

    // Deutsche Status-Labels
    const getStatusLabel = (status: string) => {
      const statusLabels: { [key: string]: string } = {
        // Order statuses
        AKTIV: 'Aktiv',
        'IN BEARBEITUNG': 'In Bearbeitung',
        ABGESCHLOSSEN: 'Abgeschlossen',
        // Project statuses
        planning: 'Planung',
        active: 'Aktiv',
        'on-hold': 'Pausiert',
        completed: 'Abgeschlossen',
        cancelled: 'Abgebrochen',
        // Invoice statuses
        draft: 'Entwurf',
        sent: 'Versendet',
        paid: 'Bezahlt',
        overdue: 'Überfällig',
      };
      return statusLabels[status] || status;
    };

    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'project':
          return 'Projekt';
        case 'invoice':
          return 'Rechnung';
        default:
          return 'Auftrag';
      }
    };

    const typeLabel = getTypeLabel(type);

    // Formatierung für Rechnungsbeträge
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };

    return (
      <Tooltip>
        <TooltipTrigger className="w-full h-full text-left flex items-center">
          <div className="fc-event-title-container w-full overflow-hidden">
            <div className="fc-event-title fc-sticky truncate">{eventInfo.event.title}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{eventInfo.event.title}</p>
          <p>{typeLabel}</p>
          <p>Kunde: {customerName}</p>
          <p>Status: {getStatusLabel(status)}</p>
          {type === 'invoice' && total && (
            <>
              <p>Betrag: {formatCurrency(total)}</p>
              {status === 'overdue' && <p className="text-red-600 font-semibold">⚠️ Überfällig!</p>}
            </>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  if (loading || authLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-64">
        <FiAlertCircle className="mr-2" /> {error}
      </div>
    );

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
        </div>
      }
    >
      {/* Das Design wurde an das restliche Dashboard angepasst, um sich besser in die shadcn/ui-Optik einzufügen. */}
      <TooltipProvider>
        <div className="rounded-lg border bg-background text-foreground">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'today dayGridMonth,timeGridWeek',
            }}
            // Wir entfernen den inneren Rand des Kalenders und steuern das Padding hier,
            // da unser neuer Container bereits einen Rahmen hat.
            viewClassNames="!border-0 p-2 md:p-4"
            events={events}
            eventClick={info => {
              info.jsEvent.preventDefault();
              if (info.event.url) {
                router.push(info.event.url);
              }
            }}
            eventContent={renderEventContent} // NEU: Tooltip-Rendering
            locale={deLocale}
            buttonText={{
              today: 'Heute',
              month: 'Monat',
              week: 'Woche',
              // 'day' wird nicht benötigt, da die Tagesansicht in der Toolbar nicht aktiviert ist.
            }}
            height="auto" // Passt die Höhe an den Inhalt an
          />
        </div>
      </TooltipProvider>
      {/*
              Dieser globale CSS-Block passt die Farben der FullCalendar-Buttons an das Seitendesign an.
              Er überschreibt die Standard-Stile von FullCalendar für eine konsistente Optik.
            */}
      <style jsx global>{`
        /* Standard-Button (z.B. prev, next, month, week) */
        .fc .fc-button {
          background-color: #f4f4f5; /* Helles Grau, passend zu shadcn/ui "secondary" */
          color: #18181b; /* Dunkler Text für Kontrast */
          border-color: #e4e4e7;
          font-weight: 500;
        }
        .fc .fc-button:hover {
          background-color: #e4e4e7;
        }

        /* Primärer Button (z.B. "Heute") und aktive Ansicht */
        .fc .fc-button-primary,
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #14ad9f;
          border-color: #14ad9f;
          color: white;
        }
        .fc .fc-button-primary:hover {
          background-color: #129a8f; /* Etwas dunklerer Hover-Effekt */
          border-color: #129a8f;
        }

        /* Überfällige Rechnungen - besondere Hervorhebung */
        .fc-event.invoice-overdue {
          animation: blink 2s linear infinite;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5) !important;
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0.7;
          }
        }
      `}</style>
    </Suspense>
  );
}
