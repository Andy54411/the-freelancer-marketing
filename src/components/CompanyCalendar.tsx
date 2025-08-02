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

interface CompanyCalendarProps {
  companyUid: string;
  selectedOrderId?: string | null; // Die ID des Auftrags, der hervorgehoben werden soll
}

// NEU: Hilfsfunktion, um Farben basierend auf dem Auftragsstatus oder Projektstatus zu bestimmen
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

    default:
      return { backgroundColor: '#a1a1aa', borderColor: '#a1a1aa' }; // Standard-Grau
  }
};

export default function CompanyCalendar({ companyUid, selectedOrderId }: CompanyCalendarProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [allOrders, setAllOrders] = useState<OrderData[]>([]); // Speichert die Rohdaten der Aufträge
  const [allProjects, setAllProjects] = useState<ProjectData[]>([]); // Speichert die Rohdaten der Projekte
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effekt zum einmaligen Laden der Auftrags- und Projektdaten
  useEffect(() => {
    if (authLoading || !user || user.uid !== companyUid) {
      if (!authLoading) {
        setError('Zugriff verweigert.');
        setLoading(false);
      }
      return; // Warten auf Authentifizierung oder bei fehlender Berechtigung abbrechen
    }

    const fetchOrdersAndProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        // Aufträge laden
        const orderResult = await callHttpsFunction(
          'getProviderOrders',
          { providerId: companyUid },
          'GET'
        );
        console.log('[CompanyCalendar] Rohdaten vom Backend erhalten:', orderResult.orders);

        // KORREKTUR: Aufträge filtern, die im Kalender angezeigt werden sollen (AKTIV, IN BEARBEITUNG, ABGESCHLOSSEN)
        // und sicherstellen, dass sie ein Startdatum haben.
        const relevantOrders = orderResult.orders.filter((order: any) => {
          const hasValidStatus = ['AKTIV', 'IN BEARBEITUNG', 'ABGESCHLOSSEN'].includes(
            order.status
          );
          const hasStartDate = !!order.jobDateFrom;
          if (!hasValidStatus || !hasStartDate) {
            console.log(
              `[CompanyCalendar] Auftrag ${order.id} wird herausgefiltert. Grund: Status OK? ${hasValidStatus}, Startdatum vorhanden? ${hasStartDate}`
            );
          }
          return hasValidStatus && hasStartDate;
        });
        console.log('[CompanyCalendar] Relevante, gefilterte Aufträge:', relevantOrders);

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

        console.log('[CompanyCalendar] Geladene Projekte:', loadedProjects);

        setAllOrders(relevantOrders);
        setAllProjects(loadedProjects);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Aufträge und Projekte.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndProjects();
  }, [user, authLoading, companyUid]);

  // Effekt zum Erstellen der Kalender-Events, wenn sich die Aufträge, Projekte oder die Auswahl ändern
  useEffect(() => {
    console.log(
      '[CompanyCalendar] Erstelle Kalender-Events aus allOrders und allProjects:',
      allOrders,
      allProjects
    );

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

      console.log(`[CompanyCalendar] Erstelle Event für Auftrag ${order.id}:`, {
        title: eventObject.title,
        start: eventObject.start,
        end: eventObject.end,
        allDay: eventObject.allDay,
      });

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

      console.log(`[CompanyCalendar] Erstelle Event für Projekt ${project.id}:`, {
        title: eventObject.title,
        start: eventObject.start,
        end: eventObject.end,
        allDay: eventObject.allDay,
      });

      return eventObject;
    });

    // Alle Events kombinieren
    const calendarEvents = [...orderEvents, ...projectEvents];
    console.log('[CompanyCalendar] Finales Array von Kalender-Events:', calendarEvents);
    setEvents(calendarEvents);
  }, [allOrders, allProjects, selectedOrderId, companyUid]);

  // NEU: Funktion zum Rendern des Event-Inhalts mit Tooltip
  const renderEventContent = (eventInfo: EventContentArg) => {
    const { status, customerName, type } = eventInfo.event.extendedProps;

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
      };
      return statusLabels[status] || status;
    };

    const typeLabel = type === 'project' ? 'Projekt' : 'Auftrag';

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
      `}</style>
    </Suspense>
  );
}
