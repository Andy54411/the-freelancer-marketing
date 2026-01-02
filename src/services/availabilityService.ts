/**
 * AvailabilityService - Verfügbarkeitsverwaltung für Unternehmen
 * 
 * Verwaltet blockierte Tage, Arbeitszeiten und Verfügbarkeitsprüfungen
 */

import { db } from '@/firebase/clients';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  BlockedDate, 
  CompanyAvailability, 
  AvailabilityResponse,
  BlockDateRequest,
  CalendarBlockedDay
} from '@/types/availability';
import { format, addDays, isBefore, isAfter, parseISO, eachDayOfInterval } from 'date-fns';

export class AvailabilityService {
  
  /**
   * Holt alle blockierten Tage eines Unternehmens
   */
  static async getBlockedDates(companyId: string): Promise<BlockedDate[]> {
    const blockedRef = collection(db, 'companies', companyId, 'blockedDates');
    const q = query(
      blockedRef,
      where('isActive', '==', true),
      orderBy('date', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const blockedDates: BlockedDate[] = [];
    
    snapshot.forEach(docSnap => {
      blockedDates.push({
        id: docSnap.id,
        ...docSnap.data()
      } as BlockedDate);
    });
    
    return blockedDates;
  }

  /**
   * Holt die Verfügbarkeitseinstellungen eines Unternehmens
   */
  static async getCompanyAvailability(companyId: string): Promise<CompanyAvailability> {
    const companyRef = doc(db, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      // Standardwerte zurückgeben wenn Company nicht gefunden
      return {
        availabilityType: 'flexible',
        advanceBookingHours: 24,
        workingDays: [1, 2, 3, 4, 5], // Mo-Fr
        workingHours: { start: '08:00', end: '18:00' }
      };
    }
    
    const data = companyDoc.data();
    
    return {
      availabilityType: data.availabilityType || 'flexible',
      advanceBookingHours: data.advanceBookingHours || 24,
      maxTravelDistance: data.maxTravelDistance,
      workingDays: data.workingDays || [1, 2, 3, 4, 5],
      workingHours: data.workingHours || { start: '08:00', end: '18:00' }
    };
  }

  /**
   * Prüft ob ein bestimmtes Datum verfügbar ist
   */
  static async isDateAvailable(
    companyId: string, 
    dateStr: string,
    timeStr?: string
  ): Promise<{ available: boolean; reason?: string }> {
    const date = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Prüfe ob Datum in der Vergangenheit
    if (isBefore(date, today)) {
      return { available: false, reason: 'Datum liegt in der Vergangenheit' };
    }
    
    // Hole Verfügbarkeitseinstellungen
    const availability = await this.getCompanyAvailability(companyId);
    
    // Prüfe Mindestvorlaufzeit
    const minBookingDate = addDays(today, Math.ceil(availability.advanceBookingHours / 24));
    if (isBefore(date, minBookingDate)) {
      return { 
        available: false, 
        reason: `Mindestens ${availability.advanceBookingHours} Stunden Vorlaufzeit erforderlich` 
      };
    }
    
    // Prüfe Arbeitstage (0=Sonntag, 1=Montag, etc.)
    const dayOfWeek = date.getDay();
    if (!availability.workingDays.includes(dayOfWeek)) {
      return { available: false, reason: 'Kein Arbeitstag' };
    }
    
    // Prüfe blockierte Tage
    const blockedDates = await this.getBlockedDates(companyId);
    const isBlocked = blockedDates.some(blocked => {
      if (blocked.date === dateStr) {
        if (blocked.blockType === 'full_day') {
          return true;
        }
        // Bei Zeitfenster-Blockierung: Prüfe ob gewünschte Zeit betroffen
        if (timeStr && blocked.startTime && blocked.endTime) {
          return timeStr >= blocked.startTime && timeStr <= blocked.endTime;
        }
        return true;
      }
      
      // Prüfe wiederkehrende Blockierungen
      if (blocked.recurring && blocked.recurringPattern) {
        const pattern = blocked.recurringPattern;
        if (pattern.type === 'weekly' && pattern.dayOfWeek === dayOfWeek) {
          return true;
        }
        if (pattern.type === 'monthly' && pattern.dayOfMonth === date.getDate()) {
          return true;
        }
        if (pattern.type === 'yearly' && 
            pattern.monthOfYear === (date.getMonth() + 1) && 
            pattern.dayOfMonth === date.getDate()) {
          return true;
        }
      }
      
      return false;
    });
    
    if (isBlocked) {
      const blockedEntry = blockedDates.find(b => b.date === dateStr);
      return { 
        available: false, 
        reason: blockedEntry?.reason || 'Tag ist blockiert' 
      };
    }
    
    return { available: true };
  }

  /**
   * Blockiert ein Datum oder einen Datumsbereich
   */
  static async blockDate(
    companyId: string, 
    request: BlockDateRequest,
    userId: string
  ): Promise<string> {
    const blockedRef = collection(db, 'companies', companyId, 'blockedDates');
    
    const blockedDate: Omit<BlockedDate, 'id'> = {
      date: request.date,
      reason: request.reason,
      blockType: request.blockType,
      startTime: request.startTime,
      endTime: request.endTime,
      recurring: request.recurring || false,
      recurringPattern: request.recurringPattern,
      createdAt: Timestamp.now(),
      createdBy: userId,
      isActive: true
    };
    
    const docRef = await addDoc(blockedRef, blockedDate);
    return docRef.id;
  }

  /**
   * Blockiert einen Datumsbereich (z.B. für Urlaub)
   */
  static async blockDateRange(
    companyId: string,
    startDate: string,
    endDate: string,
    reason: string,
    userId: string
  ): Promise<string[]> {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    const dates = eachDayOfInterval({ start, end });
    const createdIds: string[] = [];
    
    for (const date of dates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const id = await this.blockDate(
        companyId,
        {
          date: dateStr,
          reason,
          blockType: 'full_day'
        },
        userId
      );
      createdIds.push(id);
    }
    
    return createdIds;
  }

  /**
   * Gibt ein blockiertes Datum frei (Soft Delete)
   */
  static async unblockDate(companyId: string, blockedDateId: string): Promise<void> {
    const blockedRef = doc(db, 'companies', companyId, 'blockedDates', blockedDateId);
    await updateDoc(blockedRef, {
      isActive: false,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Holt alle blockierten Tage als einfache String-Liste (für Kalender-UI)
   */
  static async getBlockedDateStrings(companyId: string): Promise<string[]> {
    const blockedDates = await this.getBlockedDates(companyId);
    const today = new Date();
    const blockedStrings: string[] = [];
    
    for (const blocked of blockedDates) {
      if (blocked.blockType === 'full_day') {
        blockedStrings.push(blocked.date);
      }
      
      // Wiederkehrende Blockierungen für die nächsten 365 Tage berechnen
      if (blocked.recurring && blocked.recurringPattern) {
        for (let i = 0; i < 365; i++) {
          const checkDate = addDays(today, i);
          const pattern = blocked.recurringPattern;
          
          if (pattern.type === 'weekly' && pattern.dayOfWeek === checkDate.getDay()) {
            blockedStrings.push(format(checkDate, 'yyyy-MM-dd'));
          }
          if (pattern.type === 'monthly' && pattern.dayOfMonth === checkDate.getDate()) {
            blockedStrings.push(format(checkDate, 'yyyy-MM-dd'));
          }
          if (pattern.type === 'yearly' && 
              pattern.monthOfYear === (checkDate.getMonth() + 1) && 
              pattern.dayOfMonth === checkDate.getDate()) {
            blockedStrings.push(format(checkDate, 'yyyy-MM-dd'));
          }
        }
      }
    }
    
    return [...new Set(blockedStrings)]; // Duplikate entfernen
  }

  /**
   * Holt vollständige Verfügbarkeitsdaten für API Response
   */
  static async getFullAvailability(companyId: string): Promise<AvailabilityResponse> {
    const [blockedDates, availability] = await Promise.all([
      this.getBlockedDateStrings(companyId),
      this.getCompanyAvailability(companyId)
    ]);
    
    return {
      blockedDates,
      workingDays: availability.workingDays,
      workingHours: availability.workingHours,
      advanceBookingHours: availability.advanceBookingHours,
      availabilityType: availability.availabilityType
    };
  }

  /**
   * Holt blockierte Tage für die Kalenderansicht (mit Details)
   */
  static async getCalendarBlockedDays(companyId: string): Promise<CalendarBlockedDay[]> {
    const blockedDates = await this.getBlockedDates(companyId);
    const calendarDays: CalendarBlockedDay[] = [];
    
    for (const blocked of blockedDates) {
      let displayText = blocked.reason || 'Blockiert';
      if (blocked.blockType === 'time_range' && blocked.startTime && blocked.endTime) {
        displayText = `${displayText} (${blocked.startTime}-${blocked.endTime})`;
      }
      
      calendarDays.push({
        date: blocked.date,
        reason: blocked.reason,
        isRecurring: blocked.recurring,
        displayText
      });
    }
    
    return calendarDays;
  }
}
