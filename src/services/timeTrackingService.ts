/**
 * Time Tracking Service - sevdesk Zeiterfassung & Projektmanagement
 * Erfasst Arbeitszeiten, ordnet sie Projekten zu und erstellt automatisch Rechnungen
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface TimeEntry {
  id?: string;
  companyId: string;
  userId: string;

  // Projekt & Kunde
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;

  // Zeiterfassung
  description: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in Minuten
  hourlyRate?: number;

  // Status
  status: 'running' | 'stopped' | 'paused' | 'billed' | 'cancelled';
  isBreak?: boolean;

  // Kategorisierung
  category?: string;
  tags?: string[];
  isInternal?: boolean; // Interne vs. billable Zeit

  // Abrechnung
  billable: boolean;
  billingRate?: number;
  billableAmount?: number;
  invoiceId?: string;
  billedAt?: Date;

  // Metadaten
  notes?: string;
  location?: string;
  deviceInfo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id?: string;
  companyId: string;
  customerId: string;
  customerName: string;

  // Projekt-Details
  name: string;
  description?: string;
  code?: string; // Projekt-Kürzel

  // Status & Zeitraum
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;

  // Budget & Abrechnung
  budgetType: 'hourly' | 'fixed' | 'mixed';
  budgetHours?: number;
  budgetAmount?: number;
  hourlyRate?: number;

  // Team & Berechtigung
  teamMembers?: string[];
  projectManager?: string;

  // Statistiken
  totalHours?: number;
  billedHours?: number;
  totalAmount?: number;
  billedAmount?: number;

  // Einstellungen
  autoInvoice?: boolean;
  invoiceInterval?: 'weekly' | 'monthly' | 'project-end';

  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id?: string;
  projectId: string;
  companyId: string;

  // Task-Details
  name: string;
  description?: string;

  // Status & Priorität
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Zeitschätzung
  estimatedHours?: number;
  actualHours?: number;

  // Zuordnung
  assignedTo?: string;

  // Termine
  dueDate?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface TimeTrackingReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalHours: number;
    billableHours: number;
    totalAmount: number;
    billableAmount: number;
    averageHourlyRate: number;
  };
  byCustomer: {
    customerId: string;
    customerName: string;
    totalHours: number;
    billableHours: number;
    totalAmount: number;
  }[];
  byProject: {
    projectId: string;
    projectName: string;
    totalHours: number;
    billableHours: number;
    totalAmount: number;
  }[];
  byDay: {
    date: string;
    totalHours: number;
    billableHours: number;
    totalAmount: number;
  }[];
}

export interface TimeTrackingSettings {
  companyId: string;

  // Standardwerte
  defaultHourlyRate: number;
  defaultBillable: boolean;

  // Arbeitszeiten
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    workingDays: number[]; // 0=Sonntag, 1=Montag, ...
  };

  // Rundungsregeln
  roundingRules: {
    enabled: boolean;
    interval: 5 | 10 | 15 | 30; // Minuten
    method: 'up' | 'down' | 'nearest';
  };

  // Erinnerungen
  reminders: {
    dailyReminder: boolean;
    reminderTime: string; // HH:MM
    weeklyReport: boolean;
    reportDay: number; // 0=Sonntag, 1=Montag, ...
  };

  // Abrechnung
  billing: {
    autoCreateInvoices: boolean;
    invoiceInterval: 'weekly' | 'monthly';
    invoiceTemplate?: string;
    includeTimeDetails: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

export class TimeTrackingService {
  private static readonly TIME_ENTRIES_COLLECTION = 'timeEntries';
  private static readonly PROJECTS_COLLECTION = 'projects';
  private static readonly TASKS_COLLECTION = 'tasks';
  private static readonly SETTINGS_COLLECTION = 'timeTrackingSettings';

  /**
   * Filtert undefined Werte aus einem Objekt heraus
   * Firestore unterstützt keine undefined Werte
   */
  private static cleanDataForFirestore(data: Record<string, any>): Record<string, any> {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => {
        // Filtere undefined und null Werte heraus
        if (value === undefined || value === null) return false;
        // Filtere leere Strings heraus (optional)
        if (value === '') return false;
        return true;
      })
    );

    return cleaned;
  }

  /**
   * Startet eine neue Zeiterfassung
   */
  static async startTimeEntry(
    entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<string> {
    try {
      // Zuerst alle laufenden Einträge des Benutzers stoppen
      await this.stopAllRunningEntries(entryData.companyId, entryData.userId);

      // Filtere undefined Werte heraus, da Firestore diese nicht unterstützt
      const cleanedData = this.cleanDataForFirestore({
        ...entryData,
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await addDoc(collection(db, this.TIME_ENTRIES_COLLECTION), cleanedData);

      return docRef.id;
    } catch (error) {
      throw error;
    }
  } /**
   * Stoppt eine laufende Zeiterfassung
   */
  static async stopTimeEntry(entryId: string): Promise<void> {
    try {
      const entry = await this.getTimeEntry(entryId);
      if (!entry || entry.status !== 'running') {
        throw new Error('Keine laufende Zeiterfassung gefunden');
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / (1000 * 60)); // Minuten

      // Rundungsregeln anwenden
      const settings = await this.getSettings(entry.companyId);
      const roundedDuration = this.applyRoundingRules(duration, settings?.roundingRules);

      const billableAmount =
        entry.billable && entry.hourlyRate ? (roundedDuration / 60) * entry.hourlyRate : 0;

      const updateData = this.cleanDataForFirestore({
        status: 'stopped',
        endTime,
        duration: roundedDuration,
        billableAmount,
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, this.TIME_ENTRIES_COLLECTION, entryId), updateData);
    } catch (error) {
      throw new Error('Zeiterfassung konnte nicht gestoppt werden');
    }
  }

  /**
   * Pausiert eine laufende Zeiterfassung
   */
  static async pauseTimeEntry(entryId: string): Promise<void> {
    try {
      const updateData = this.cleanDataForFirestore({
        status: 'paused',
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, this.TIME_ENTRIES_COLLECTION, entryId), updateData);
    } catch (error) {
      throw new Error('Zeiterfassung konnte nicht pausiert werden');
    }
  }

  /**
   * Setzt eine pausierte Zeiterfassung fort
   */
  static async resumeTimeEntry(entryId: string): Promise<void> {
    try {
      const updateData = this.cleanDataForFirestore({
        status: 'running',
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, this.TIME_ENTRIES_COLLECTION, entryId), updateData);
    } catch (error) {
      throw new Error('Zeiterfassung konnte nicht fortgesetzt werden');
    }
  }

  /**
   * Stoppt alle laufenden Zeiterfassungen eines Benutzers
   */
  static async stopAllRunningEntries(companyId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.TIME_ENTRIES_COLLECTION),
        where('companyId', '==', companyId),
        where('userId', '==', userId),
        where('status', '==', 'running')
      );

      const querySnapshot = await getDocs(q);
      const promises = querySnapshot.docs.map(doc => this.stopTimeEntry(doc.id));
      await Promise.all(promises);
    } catch (error) {}
  }

  /**
   * Erstellt manuellen Zeiteintrag
   */
  static async createManualTimeEntry(
    entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<string> {
    try {
      if (!entryData.endTime || !entryData.startTime) {
        throw new Error('Start- und Endzeit sind erforderlich');
      }

      const duration = Math.round(
        (entryData.endTime.getTime() - entryData.startTime.getTime()) / (1000 * 60)
      );
      const billableAmount =
        entryData.billable && entryData.hourlyRate ? (duration / 60) * entryData.hourlyRate : 0;

      // Filtere undefined Werte heraus, da Firestore diese nicht unterstützt
      const cleanedData = this.cleanDataForFirestore({
        ...entryData,
        status: 'stopped',
        duration,
        billableAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await addDoc(collection(db, this.TIME_ENTRIES_COLLECTION), cleanedData);

      return docRef.id;
    } catch (error) {
      console.error('❌ Firestore Error beim Erstellen des Zeiteintrags:', error);
      throw new Error(
        `Zeiteintrag konnte nicht erstellt werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    }
  }

  /**
   * Lädt Zeiteinträge für ein Unternehmen
   */
  static async getTimeEntriesByCompany(
    companyId: string,
    filters?: {
      userId?: string;
      projectId?: string;
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    }
  ): Promise<TimeEntry[]> {
    try {
      let q = query(
        collection(db, this.TIME_ENTRIES_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('startTime', 'desc')
      );

      // Filter anwenden
      if (filters?.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }
      if (filters?.projectId) {
        q = query(q, where('projectId', '==', filters.projectId));
      }
      if (filters?.customerId) {
        q = query(q, where('customerId', '==', filters.customerId));
      }
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }

      const querySnapshot = await getDocs(q);
      let entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate(),
        billedAt: doc.data().billedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as TimeEntry[];

      // Datumsfilter anwenden (clientseitig, da Firestore Limits hat)
      if (filters?.startDate || filters?.endDate) {
        entries = entries.filter(entry => {
          const entryDate = entry.startTime;
          if (filters.startDate && entryDate < filters.startDate) return false;
          if (filters.endDate && entryDate > filters.endDate) return false;
          return true;
        });
      }

      return entries;
    } catch (error) {
      throw new Error('Zeiteinträge konnten nicht geladen werden');
    }
  }

  /**
   * Lädt einen spezifischen Zeiteintrag
   */
  static async getTimeEntry(id: string): Promise<TimeEntry | null> {
    try {
      const docRef = doc(db, this.TIME_ENTRIES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          billedAt: data.billedAt?.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as TimeEntry;
      }

      return null;
    } catch (error) {
      throw new Error('Zeiteintrag konnte nicht geladen werden');
    }
  }

  /**
   * Aktualisiert einen Zeiteintrag
   */
  static async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<void> {
    try {
      const updateData = this.cleanDataForFirestore({
        ...updates,
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, this.TIME_ENTRIES_COLLECTION, id), updateData);
    } catch (error) {
      throw new Error('Zeiteintrag konnte nicht aktualisiert werden');
    }
  }

  /**
   * Löscht einen Zeiteintrag
   */
  static async deleteTimeEntry(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.TIME_ENTRIES_COLLECTION, id));
    } catch (error) {
      throw new Error('Zeiteintrag konnte nicht gelöscht werden');
    }
  }

  /**
   * Erstellt ein neues Projekt
   */
  static async createProject(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Filtere undefined Werte heraus, da Firestore diese nicht unterstützt
      const cleanedData = this.cleanDataForFirestore({
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const docRef = await addDoc(collection(db, this.PROJECTS_COLLECTION), cleanedData);

      return docRef.id;
    } catch (error) {
      throw new Error('Projekt konnte nicht erstellt werden');
    }
  }

  /**
   * Lädt Projekte für ein Unternehmen
   */
  static async getProjectsByCompany(companyId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, this.PROJECTS_COLLECTION),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate
            ? data.startDate.toDate()
            : data.startDate
              ? new Date(data.startDate)
              : undefined,
          endDate: data.endDate?.toDate
            ? data.endDate.toDate()
            : data.endDate
              ? new Date(data.endDate)
              : undefined,
          deadline: data.deadline?.toDate
            ? data.deadline.toDate()
            : data.deadline
              ? new Date(data.deadline)
              : undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        } as Project;
      });
    } catch (error) {
      throw new Error('Projekte konnten nicht geladen werden');
    }
  }

  /**
   * Generiert Zeiterfassungs-Report
   */
  static async generateTimeReport(
    companyId: string,
    startDate: Date,
    endDate: Date,
    filters?: {
      userId?: string;
      projectId?: string;
      customerId?: string;
    }
  ): Promise<TimeTrackingReport> {
    try {
      const timeEntries = await this.getTimeEntriesByCompany(companyId, {
        ...filters,
        startDate,
        endDate,
        status: 'stopped',
      });

      // Summary berechnen
      const summary = {
        totalHours: timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        billableHours:
          timeEntries
            .filter(e => e.billable)
            .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        totalAmount: timeEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0),
        billableAmount: timeEntries
          .filter(e => e.billable)
          .reduce((sum, entry) => sum + (entry.billableAmount || 0), 0),
        averageHourlyRate: 0,
      };

      if (summary.billableHours > 0) {
        summary.averageHourlyRate = summary.billableAmount / summary.billableHours;
      }

      // Gruppierung nach Kunde
      const customerMap = new Map();
      timeEntries.forEach(entry => {
        if (!entry.customerId) return;

        const key = entry.customerId;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customerId: entry.customerId,
            customerName: entry.customerName || 'Unbekannter Kunde',
            totalHours: 0,
            billableHours: 0,
            totalAmount: 0,
          });
        }

        const customer = customerMap.get(key);
        customer.totalHours += (entry.duration || 0) / 60;
        if (entry.billable) {
          customer.billableHours += (entry.duration || 0) / 60;
          customer.totalAmount += entry.billableAmount || 0;
        }
      });

      // Gruppierung nach Projekt
      const projectMap = new Map();
      timeEntries.forEach(entry => {
        if (!entry.projectId) return;

        const key = entry.projectId;
        if (!projectMap.has(key)) {
          projectMap.set(key, {
            projectId: entry.projectId,
            projectName: entry.projectName || 'Unbekanntes Projekt',
            totalHours: 0,
            billableHours: 0,
            totalAmount: 0,
          });
        }

        const project = projectMap.get(key);
        project.totalHours += (entry.duration || 0) / 60;
        if (entry.billable) {
          project.billableHours += (entry.duration || 0) / 60;
          project.totalAmount += entry.billableAmount || 0;
        }
      });

      // Gruppierung nach Tag
      const dayMap = new Map();
      timeEntries.forEach(entry => {
        const dateKey = entry.startTime.toISOString().split('T')[0];

        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            date: dateKey,
            totalHours: 0,
            billableHours: 0,
            totalAmount: 0,
          });
        }

        const day = dayMap.get(dateKey);
        day.totalHours += (entry.duration || 0) / 60;
        if (entry.billable) {
          day.billableHours += (entry.duration || 0) / 60;
          day.totalAmount += entry.billableAmount || 0;
        }
      });

      return {
        period: { start: startDate, end: endDate },
        summary,
        byCustomer: Array.from(customerMap.values()),
        byProject: Array.from(projectMap.values()),
        byDay: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      };
    } catch (error) {
      throw new Error('Report konnte nicht generiert werden');
    }
  }

  /**
   * Lädt laufende Zeiterfassung eines Benutzers
   */
  static async getRunningTimeEntry(companyId: string, userId: string): Promise<TimeEntry | null> {
    try {
      const q = query(
        collection(db, this.TIME_ENTRIES_COLLECTION),
        where('companyId', '==', companyId),
        where('userId', '==', userId),
        where('status', '==', 'running'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate(),
        billedAt: data.billedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TimeEntry;
    } catch (error) {
      return null;
    }
  }

  /**
   * Wendet Rundungsregeln an
   */
  private static applyRoundingRules(
    minutes: number,
    rules?: TimeTrackingSettings['roundingRules']
  ): number {
    if (!rules?.enabled) {
      return minutes;
    }

    const interval = rules.interval;
    const remainder = minutes % interval;

    switch (rules.method) {
      case 'up':
        return remainder > 0 ? minutes + (interval - remainder) : minutes;
      case 'down':
        return minutes - remainder;
      case 'nearest':
        return remainder >= interval / 2 ? minutes + (interval - remainder) : minutes - remainder;
      default:
        return minutes;
    }
  }

  /**
   * Lädt Einstellungen
   */
  static async getSettings(companyId: string): Promise<TimeTrackingSettings | null> {
    try {
      const q = query(
        collection(db, this.SETTINGS_COLLECTION),
        where('companyId', '==', companyId)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as TimeTrackingSettings;
    } catch (error) {
      return null;
    }
  }

  /**
   * Statistiken für Dashboard
   */
  static async getTimeTrackingStats(companyId: string): Promise<{
    todayHours: number;
    weekHours: number;
    monthHours: number;
    billableThisMonth: number;
    activeProjects: number;
    runningTimers: number;
  }> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayEntries, weekEntries, monthEntries, projects, runningEntries] = await Promise.all(
        [
          this.getTimeEntriesByCompany(companyId, { startDate: startOfDay }),
          this.getTimeEntriesByCompany(companyId, { startDate: startOfWeek }),
          this.getTimeEntriesByCompany(companyId, { startDate: startOfMonth }),
          this.getProjectsByCompany(companyId),
          this.getTimeEntriesByCompany(companyId, { status: 'running' }),
        ]
      );

      return {
        todayHours: todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        weekHours: weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        monthHours: monthEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
        billableThisMonth: monthEntries
          .filter(e => e.billable)
          .reduce((sum, entry) => sum + (entry.billableAmount || 0), 0),
        activeProjects: projects.filter(p => p.status === 'active').length,
        runningTimers: runningEntries.length,
      };
    } catch (error) {
      return {
        todayHours: 0,
        weekHours: 0,
        monthHours: 0,
        billableThisMonth: 0,
        activeProjects: 0,
        runningTimers: 0,
      };
    }
  }
}
