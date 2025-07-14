'use client';

import React, { useState } from 'react'; // Import useState
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookingChatModal } from './BookingChatModal'; // Importiere die neue Komponente

// Define a more specific type for auftrag if possible
interface Auftrag {
  id: string;
  selectedSubcategory?: string;
  customerFirstName?: string;
  customerLastName?: string;
  status?: string;
  jobDateFrom?: string; // Consider using Date type if parsed
  jobDateTo?: string; // Consider using Date type if parsed
  jobCity?: string;
  totalPriceInCents?: number;
  description?: string;
  selectedCategory?: string;
  jobDurationString?: string;
  jobTotalCalculatedHours?: number;
}
// Erwartet einen Auftrag und ein "Trigger"-Element (z.B. den Button, der den Drawer öffnet)
interface BookingDetailsDrawerProps {
  auftrag: Auftrag;
  children: React.ReactNode;
}

export function BookingDetailsDrawer({ auftrag, children }: BookingDetailsDrawerProps) {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false); // State to control chat modal visibility

  const formattedPrice = auftrag.totalPriceInCents
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
        auftrag.totalPriceInCents / 100
      )
    : 'N/A';

  // Erweiterte Datums- und Zeitformatierung
  const formattedDateTime = auftrag.jobDateFrom
    ? `Am ${new Date(auftrag.jobDateFrom).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' })} um ${new Date(auftrag.jobDateFrom).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
    : 'N/A';

  const customerFullName =
    `${auftrag.customerFirstName || ''} ${auftrag.customerLastName || ''}`.trim();

  const calculateTotalHours = (currentAuftrag: Auftrag): string => {
    const { jobDateFrom, jobDateTo, jobDurationString, jobTotalCalculatedHours } = currentAuftrag;

    let parsedDailyOrTotalHours: number | null = null;
    if (jobDurationString) {
      const duration = parseFloat(jobDurationString);
      if (!isNaN(duration) && duration > 0) {
        parsedDailyOrTotalHours = duration;
      }
    }

    if (jobDateFrom && jobDateTo) {
      try {
        const dateFromInstance = new Date(jobDateFrom);
        const dateToInstance = new Date(jobDateTo);

        if (!isNaN(dateFromInstance.getTime()) && !isNaN(dateToInstance.getTime())) {
          const dayStartFrom = new Date(
            dateFromInstance.getFullYear(),
            dateFromInstance.getMonth(),
            dateFromInstance.getDate()
          );
          const dayStartTo = new Date(
            dateToInstance.getFullYear(),
            dateToInstance.getMonth(),
            dateToInstance.getDate()
          );

          if (dayStartTo.getTime() < dayStartFrom.getTime()) {
            return 'Enddatum liegt vor Startdatum';
          }

          const numberOfDays =
            Math.round((dayStartTo.getTime() - dayStartFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          // Priorität 1: Wenn parsedDailyOrTotalHours (aus jobDurationString) vorhanden ist,
          // und es sich um einen oder mehrere Tage handelt.
          if (parsedDailyOrTotalHours !== null && numberOfDays >= 1) {
            const totalHours = numberOfDays * parsedDailyOrTotalHours;
            return `${totalHours.toFixed(1)} Stunden`;
          }

          // Priorität 2: Wenn keine täglichen Stunden aus jobDurationString, aber jobTotalCalculatedHours vorhanden ist.
          if (typeof jobTotalCalculatedHours === 'number' && jobTotalCalculatedHours > 0) {
            return `${jobTotalCalculatedHours.toFixed(1)} Stunden`;
          }

          // Priorität 3: Rohe Zeitdifferenz, falls keine der obigen Logiken zutraf.
          // Nützlich für genaue Zeitangaben (z.B. 09:00-17:00) oder als Fallback.
          if (parsedDailyOrTotalHours === null) {
            // Nur wenn jobDurationString nicht für tägliche Rate verwendet wurde
            const diffMilliseconds = dateToInstance.getTime() - dateFromInstance.getTime();
            if (diffMilliseconds >= 0) {
              const diffHours = diffMilliseconds / (1000 * 60 * 60);
              // Verhindere "0.0 Stunden" für identische Daten ohne Zeit, es sei denn, es ist wirklich 0 Dauer.
              if (
                diffHours > 0 ||
                (diffHours === 0 &&
                  numberOfDays === 1 &&
                  dateFromInstance.getTime() === dateToInstance.getTime())
              ) {
                return `${diffHours.toFixed(1)} Stunden`;
              }
            }
          }
        }
      } catch (e) {
        console.error('Fehler bei der Berechnung der Gesamtstunden (Datumsblock):', e);
      }
    }

    // Allgemeine Fallbacks, falls Daten fehlen/ungültig waren oder die Datumslogik kein Ergebnis lieferte
    if (typeof jobTotalCalculatedHours === 'number' && jobTotalCalculatedHours > 0) {
      return `${jobTotalCalculatedHours.toFixed(1)} Stunden`;
    }
    if (parsedDailyOrTotalHours !== null) {
      // Aus jobDurationString
      return `${parsedDailyOrTotalHours.toFixed(1)} Stunden`;
    }
    return 'N/A';
  };

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="h-full w-full max-w-lg">
        <DrawerHeader className="gap-1 p-6">
          <DrawerTitle className="text-2xl">{auftrag.selectedSubcategory}</DrawerTitle>
          <DrawerDescription>Auftragsdetails für ID: {auftrag.id}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-6 text-sm">
          {/* Angepasster Block für die von dir gewünschte Darstellung */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <p className="font-semibold">
              {auftrag.selectedSubcategory || 'Dienstleistung'}
              {customerFullName && ` (${customerFullName})`}
            </p>
            <p className="font-semibold">{formattedDateTime}</p>
            <p className="font-semibold">Preis: {formattedPrice}</p>
            <p>
              <Badge variant="outline">{auftrag.status || 'N/A'}</Badge>
            </p>
          </div>
          {/* Bestehende Detail-Sektionen bleiben erhalten */}
          <div className="space-y-4">
            {' '}
            {/* Optional: Füge space-y-4 hinzu, um Abstand zwischen den Abschnitten zu schaffen */}
            <p className="text-muted-foreground">Beschreibung</p>
            <p className="mt-1">{auftrag.description || 'Keine Beschreibung vorhanden.'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Anbieter</p>
            <p className="mt-1">{auftrag.selectedCategory || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Beginn Ihres Auftrags</p>
              <p className="mt-1">{auftrag.jobDateFrom || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ende Ihres Auftrag</p>
              <p className="mt-1">{auftrag.jobDateTo || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Mindeststunden am Tag</p>
            <p className="mt-1">{auftrag.jobDurationString || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gesamtanzahl der Arbeitsstunden</p>
            <p className="mt-1">{calculateTotalHours(auftrag)}</p>
          </div>
          {/* Chat-Bereich */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-3">Kommunikation</h3>
            {/* Hier könnte die Chat-Komponente oder ein Button zum Öffnen des Chats platziert werden */}
            <Button variant="default" className="w-full" onClick={() => setIsChatModalOpen(true)}>
              {' '}
              {/* <-- Updated onClick */}
              Nachricht an {auftrag.customerFirstName || 'Kunden'} senden
            </Button>
          </div>{' '}
          {/* Schließt den "Chat-Bereich" div */}
        </div>{' '}
        {/* Schließt den Haupt-Inhalts-Div "flex flex-col gap-6..." */}
        <DrawerFooter className="mt-auto p-6">
          {' '}
          {/* DrawerFooter als direkter Child von DrawerContent */}
          <DrawerClose asChild>
            <Button variant="outline">Schließen</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>

      {/* Render the Chat Modal (conceptual placeholder) */}
      {/* You would replace this with your actual chat modal component */}
      {isChatModalOpen && (
        <BookingChatModal auftrag={auftrag} onClose={() => setIsChatModalOpen(false)} />
      )}
    </Drawer>
  );
}
