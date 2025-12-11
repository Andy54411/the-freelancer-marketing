'use client';

import React, { useState, useEffect, Suspense, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { type EventInput, type EventClickArg, type EventContentArg } from '@fullcalendar/core';
import { type DateClickArg } from '@fullcalendar/interaction';
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

// Calendar Event-Typ für Kalenderanzeige
type CalendarEventData = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  eventType: 'meeting' | 'appointment' | 'task' | 'reminder' | 'call' | 'interview';
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId?: string;
  applicantId?: string;
  companyId: string;
};

interface CompanyCalendarProps {
  companyUid: string;
  selectedOrderId?: string | null; // Die ID des Auftrags, der hervorgehoben werden soll
  onDateClick?: (dateInfo: { date: Date, dateStr: string }) => void; // NEU: Callback für Datum-Klicks
  onEventClick?: (eventInfo: EventClickArg) => void; // NEU: Callback für Event-Klicks
}

export interface CompanyCalendarRef {
  refreshEvents: () => void;
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

    // Calendar Event statuses
    case 'planned':
      return { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }; // Blau
    case 'confirmed':
      return { backgroundColor: '#10b981', borderColor: '#10b981' }; // Grün
    case 'completed':
      return { backgroundColor: '#6b7280', borderColor: '#6b7280' }; // Grau

    // Interview statuses
    case 'interview':
      return { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }; // Purple für Interviews

    default:
      return { backgroundColor: '#a1a1aa', borderColor: '#a1a1aa' }; // Standard-Grau
  }
};

const CompanyCalendar = forwardRef<CompanyCalendarRef, CompanyCalendarProps>(({ companyUid, selectedOrderId, onDateClick, onEventClick }, ref) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [allOrders, setAllOrders] = useState<OrderData[]>([]); // Speichert die Rohdaten der Aufträge
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]); // Speichert die Rohdaten der Projekte
  const [allInvoices, setAllInvoices] = useState<InvoiceData[]>([]); // Speichert die Rohdaten der Rechnungen
  const [allCalendarEvents, setAllCalendarEvents] = useState<CalendarEventData[]>([]); // Speichert die Rohdaten der Kalenderereignisse
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funktion zum Laden aller Daten
  const fetchAllData = async () => {
    if (authLoading || !user) return;

    // Berechtigungsprüfung: Benutzer muss entweder die Company UID haben ODER master/support sein
    const hasAccess = user.uid === companyUid || user.user_type === 'master' || user.user_type === 'support';

    if (!hasAccess) {
      setError('Zugriff verweigert. Keine Berechtigung für diese Firma.');
      setLoading(false);
      return;
    }

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

      // Calendar Events aus Firebase laden
      const calendarEventsQuery = query(
        collection(db, 'companies', companyUid, 'calendar_events'),
        orderBy('createdAt', 'desc')
      );

      const calendarEventsSnapshot = await getDocs(calendarEventsQuery);
      const loadedCalendarEvents: CalendarEventData[] = [];

        calendarEventsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.startDate && data.title) {
            loadedCalendarEvents.push({
              id: doc.id,
              title: data.title,
              description: data.description,
              startDate: data.startDate,
              endDate: data.endDate || data.startDate,
              eventType: data.eventType || 'meeting',
              status: data.status || 'planned',
              priority: data.priority || 'medium',
              customerId: data.customerId,
              companyId: data.companyId || companyUid,
            });
          }
        });

      // Interview-Termine aus jobApplications Subcollection laden
      // jobApplications sind unter /companies/{companyId}/jobApplications/ gespeichert
      const interviewsQuery = query(
        collection(db, 'companies', companyUid, 'jobApplications'),
        where('confirmedInterviewDate', '!=', null)
      );

      const interviewSnapshot = await getDocs(interviewsQuery);
      const loadedInterviews: any[] = [];

      interviewSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.confirmedInterviewDate && data.confirmedInterviewTime) {
          // Kombiniere Datum und Zeit zu einem vollständigen Datum
          const [day, month, year] = data.confirmedInterviewDate.split('.');
          const [hours, minutes] = data.confirmedInterviewTime.split(':');
          const interviewDateTime = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
          );

          loadedInterviews.push({
            id: doc.id,
            title: `Interview: ${data.applicantProfile?.firstName || ''} ${data.applicantProfile?.lastName || ''}`,
            startDate: interviewDateTime.toISOString(),
            endDate: new Date(interviewDateTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 Stunde später
            eventType: 'interview',
            status: 'confirmed',
            priority: 'high',
            companyId: companyUid,
            applicantId: data.applicantId,
            applicantName: `${data.applicantProfile?.firstName || ''} ${data.applicantProfile?.lastName || ''}`.trim(),
            jobTitle: data.jobTitle || 'Offene Position'
          });
        }
      });
        
      setAllOrders(relevantOrders);
      setAllProjects(loadedProjects);
      setAllInvoices(loadedInvoices);
      setAllCalendarEvents([...loadedCalendarEvents, ...loadedInterviews]);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Aufträge, Projekte und Rechnungen.');
    } finally {
      setLoading(false);
    }
  };

  // useImperativeHandle für externe Aktualisierung
  useImperativeHandle(ref, () => ({
    refreshEvents: () => {
      fetchAllData();
    }
  }));

  // Effekt zum einmaligen Laden der Auftrags-, Projekt- und Rechnungsdaten
  useEffect(() => {
    fetchAllData();
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
        title: order.selectedSubcategory,
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
        title: `Projekt: ${project.name}`,
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

      const eventObject = {
        id: `invoice-${invoice.id}`,
        title: `Rechnung ${invoice.invoiceNumber}`,
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

    // Events für Calendar Events erstellen
    const calendarEventEvents = allCalendarEvents.map(calendarEvent => {
      // Spezielle Farbe für Interview-Events
      const colors = calendarEvent.eventType === 'interview' 
        ? getStatusColor('interview')
        : getStatusColor(calendarEvent.status);

      // URL für Interview-Events zur Bewerbungsseite mit Chat setzen
      // calendarEvent.id ist die applicationId für Interviews
      const eventUrl = calendarEvent.eventType === 'interview'
        ? `/dashboard/company/${companyUid}/recruiting/applications/${calendarEvent.id}`
        : undefined;

      const eventObject = {
        id: `calendar-${calendarEvent.id}`,
        title: calendarEvent.title,
        start: calendarEvent.startDate ? new Date(calendarEvent.startDate) : undefined,
        end: calendarEvent.endDate ? new Date(calendarEvent.endDate) : undefined,
        allDay: false, // Calendar Events können spezifische Zeiten haben
        url: eventUrl,
        extendedProps: {
          description: calendarEvent.description,
          status: calendarEvent.status,
          type: 'calendar_event',
          eventType: calendarEvent.eventType,
          priority: calendarEvent.priority,
          customerId: calendarEvent.customerId,
          applicantId: calendarEvent.applicantId,
        },
        // Priorität-basierte Hervorhebung
        className: calendarEvent.priority === 'urgent' ? 'calendar-event-urgent' : '',
        ...colors,
      };

      return eventObject;
    });

    // Alle Events kombinieren
    const calendarEvents = [...orderEvents, ...projectEvents, ...invoiceEvents, ...calendarEventEvents];

    setEvents(calendarEvents);
  }, [allOrders, allProjects, allInvoices, allCalendarEvents, selectedOrderId, companyUid]);

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
        // Calendar Event statuses
        planned: 'Geplant',
        confirmed: 'Bestätigt',
      };
      return statusLabels[status] || status;
    };

    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'project':
          return 'Projekt';
        case 'invoice':
          return 'Rechnung';
        case 'calendar_event':
          return 'Termin';
        default:
          return 'Auftrag';
      }
    };

    const getEventTypeLabel = (eventType: string) => {
      switch (eventType) {
        case 'meeting':
          return 'Besprechung';
        case 'appointment':
          return 'Termin';
        case 'task':
          return 'Aufgabe';
        case 'reminder':
          return 'Erinnerung';
        case 'call':
          return 'Anruf';
        default:
          return 'Termin';
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
            <div className="fc-event-title fc-sticky truncate font-medium text-xs leading-tight">
              {eventInfo.event.title}
              {type === 'calendar_event' && eventInfo.event.extendedProps.priority === 'urgent' && (
                <span className="ml-1 text-red-500 font-bold">!</span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{eventInfo.event.title}</p>
          <p>{typeLabel}</p>
          {type === 'calendar_event' && (
            <>
              <p>Art: {getEventTypeLabel(eventInfo.event.extendedProps.eventType)}</p>
              {eventInfo.event.extendedProps.description && (
                <p>Beschreibung: {eventInfo.event.extendedProps.description}</p>
              )}
            </>
          )}
          {customerName && <p>Kunde: {customerName}</p>}
          <p>Status: {getStatusLabel(status)}</p>
          {type === 'invoice' && total && (
            <>
              <p>Betrag: {formatCurrency(total)}</p>
              {status === 'overdue' && <p className="text-red-600 font-semibold">Überfällig!</p>}
            </>
          )}
          {type === 'calendar_event' && eventInfo.event.extendedProps.priority === 'urgent' && (
            <p className="text-red-600 font-semibold">Dringend!</p>
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
              
              // Wenn onEventClick Callback vorhanden, verwende ihn
              if (onEventClick) {
                onEventClick(info);
              } else if (info.event.url) {
                router.push(info.event.url);
              }
            }}
            dateClick={info => {
              // Wenn onDateClick Callback vorhanden, verwende ihn
              if (onDateClick) {
                onDateClick({
                  date: info.date,
                  dateStr: info.dateStr
                });
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

        /* Dringende Calendar Events - besondere Hervorhebung */
        .fc-event.calendar-event-urgent {
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6) !important;
          border: 2px solid #ef4444 !important;
        }

        /* Marker-Style wie Tilvo - kleine grüne Punkte */
        .fc-event {
          min-height: 20px !important;
          font-size: 0.7rem !important;
          font-weight: 600 !important;
          padding: 2px 6px !important;
          border-radius: 12px !important;
          margin: 1px 2px 2px 0 !important;
          line-height: 1.1 !important;
          border: none !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .fc-event-title {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          width: 100% !important;
          text-align: center !important;
          font-weight: 600 !important;
        }

        /* Spezielle Marker für verschiedene Event-Typen */
        .fc-daygrid-event {
          font-size: 0.65rem !important;
          margin: 1px 1px 2px 0 !important;
          min-height: 18px !important;
          border-radius: 10px !important;
        }

        /* Hover-Effekt für bessere Interaktion */
        .fc-event:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
          cursor: pointer !important;
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
});

CompanyCalendar.displayName = 'CompanyCalendar';

export default CompanyCalendar;
