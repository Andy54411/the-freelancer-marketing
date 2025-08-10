'use client';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface Employee {
  id?: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN';
  contractType: 'PERMANENT' | 'TEMPORARY' | 'PROJECT_BASED';
  startDate: string;
  endDate?: string;
  grossSalary: number;
  hourlyRate?: number;
  workingHours: {
    weekly: number;
    daily: number;
  };
  socialSecurity: {
    employerContribution: number;
    employeeContribution: number;
    taxClass?: string;
  };
  additionalCosts: {
    healthInsurance: number;
    benefits: number;
    training: number;
    equipment: number;
  };
  calculatedData?: {
    totalMonthlyCost: number;
    effectiveHourlyRate: number;
    yearlyTotalCost: number;
  };
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  benefits?: string[];
  skills?: string[];
  performance?: {
    rating: number;
    goals: string[];
    lastReview: string;
  };
  vacation?: {
    totalDays: number;
    usedDays: number;
    remainingDays: number;
  };
  notes?: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PersonalStats {
  totalEmployees: number;
  activeEmployees: number;
  totalMonthlyCosts: number;
  totalYearlyCosts: number;
  averageHourlyRate: number;
  departmentBreakdown: Array<{
    department: string;
    count: number;
    totalCosts: number;
  }>;
  employmentTypeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

// Zusätzliche Interfaces für erweiterte Funktionalität
export interface Shift {
  id?: string;
  companyId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  department: string;
  notes?: string;
  status: 'PLANNED' | 'CONFIRMED' | 'ABSENT' | 'SICK';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimeEntry {
  id?: string;
  companyId: string;
  employeeId: string;
  projectId?: string;
  projectName?: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  breakTime: number; // in minutes
  description: string;
  category: 'WORK' | 'OVERTIME' | 'BREAK' | 'SICK' | 'VACATION';
  status: 'ACTIVE' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  isManual: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Payroll {
  id?: string;
  companyId: string;
  employeeId: string;
  period: {
    year: number;
    month: number;
  };
  grossSalary: number;
  workingHours: number;
  overtime: number;
  deductions: {
    taxClass: string;
    incomeTax: number;
    churchTax: number;
    solidarityTax: number;
    socialSecurity: {
      pension: number;
      unemployment: number;
      health: number;
      care: number;
    };
  };
  additions: {
    bonuses: number;
    benefits: number;
    expenses: number;
  };
  netSalary: number;
  employerCosts: {
    socialSecurity: number;
    other: number;
  };
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'SENT' | 'PAID';
  createdAt?: Date;
  updatedAt?: Date;
  paidAt?: Date;
}

export interface AbsenceRequest {
  id?: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'TRAINING' | 'OTHER';
  startDate: string;
  endDate: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  notes?: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export class PersonalService {
  /**
   * Lädt alle Mitarbeiter für ein Unternehmen
   */
  static async getEmployees(companyId: string): Promise<Employee[]> {
    try {
      console.log('🔄 PersonalService: Lade Mitarbeiter für Company:', companyId);

      const employeesQuery = query(
        collection(db, 'companies', companyId, 'employees'),
        orderBy('lastName', 'asc')
      );

      const employeesSnap = await getDocs(employeesQuery);
      const employees: Employee[] = [];

      employeesSnap.forEach(doc => {
        const data = doc.data();
        employees.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Employee);
      });

      console.log(`✅ PersonalService: ${employees.length} Mitarbeiter geladen`);
      return employees;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Mitarbeiter:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Mitarbeiter
   */
  static async createEmployee(
    employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(
        '🔄 PersonalService: Erstelle neuen Mitarbeiter:',
        employee.firstName,
        employee.lastName
      );

      // Berechne automatisch Zusatzdaten
      const calculatedData = this.calculateEmployeeCosts(employee);

      const employeeData = {
        ...employee,
        calculatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', employee.companyId, 'employees'),
        employeeData
      );

      console.log('✅ PersonalService: Mitarbeiter erstellt mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Erstellen des Mitarbeiters:', error);
      throw error;
    }
  }

  /**
   * Fügt einen neuen Mitarbeiter hinzu (Alias für createEmployee mit besserer Rückgabe)
   */
  static async addEmployee(
    companyId: string,
    employeeData: Omit<Employee, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
  ): Promise<Employee> {
    try {
      const employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
        ...employeeData,
        companyId,
        contractType: employeeData.contractType || 'PERMANENT',
        workingHours: employeeData.workingHours || { weekly: 40, daily: 8 },
        socialSecurity: employeeData.socialSecurity || {
          employerContribution: 0,
          employeeContribution: 0,
        },
        additionalCosts: employeeData.additionalCosts || {
          healthInsurance: 0,
          benefits: 0,
          training: 0,
          equipment: 0,
        },
      };

      const employeeId = await this.createEmployee(employee);

      // Lade den erstellten Mitarbeiter zurück
      const employees = await this.getEmployees(companyId);
      const newEmployee = employees.find(emp => emp.id === employeeId);

      if (!newEmployee) {
        throw new Error('Mitarbeiter konnte nicht gefunden werden');
      }

      return newEmployee;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen des Mitarbeiters:', error);
      throw error;
    }
  }

  /**
   * Löscht einen Mitarbeiter
   */
  static async deleteEmployee(companyId: string, employeeId: string): Promise<void> {
    try {
      console.log('🔄 PersonalService: Lösche Mitarbeiter:', employeeId);

      const employeeRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await deleteDoc(employeeRef);

      console.log('✅ PersonalService: Mitarbeiter gelöscht:', employeeId);
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen des Mitarbeiters:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Mitarbeiter
   */
  static async updateEmployee(
    companyId: string,
    employeeId: string,
    updates: Partial<Employee>
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Mitarbeiter:', employeeId);

      // Berechne Kosten neu wenn relevante Felder geändert wurden
      if (
        updates.grossSalary ||
        updates.workingHours ||
        updates.socialSecurity ||
        updates.additionalCosts
      ) {
        const fullEmployee = { ...updates } as Employee; // Vereinfacht für Demo
        updates.calculatedData = this.calculateEmployeeCosts(fullEmployee);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);

      console.log('✅ PersonalService: Mitarbeiter aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren des Mitarbeiters:', error);
      throw error;
    }
  }

  /**
   * Deaktiviert einen Mitarbeiter (statt zu löschen)
   */
  static async deactivateEmployee(companyId: string, employeeId: string): Promise<void> {
    try {
      console.log('🔄 PersonalService: Deaktiviere Mitarbeiter:', employeeId);

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), {
        isActive: false,
        endDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Mitarbeiter deaktiviert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Deaktivieren des Mitarbeiters:', error);
      throw error;
    }
  }

  /**
   * Berechnet Personal-Statistiken
   */
  static async getPersonalStats(companyId: string): Promise<PersonalStats> {
    try {
      console.log('🔄 PersonalService: Berechne Personal-Statistiken für Company:', companyId);

      const employees = await this.getEmployees(companyId);

      const activeEmployees = employees.filter(emp => emp.isActive);
      const totalMonthlyCosts = activeEmployees.reduce(
        (sum, emp) => sum + (emp.calculatedData?.totalMonthlyCost || emp.grossSalary),
        0
      );

      // Abteilungs-Breakdown
      const departmentMap = new Map<string, { count: number; totalCosts: number }>();
      activeEmployees.forEach(emp => {
        const existing = departmentMap.get(emp.department) || { count: 0, totalCosts: 0 };
        departmentMap.set(emp.department, {
          count: existing.count + 1,
          totalCosts:
            existing.totalCosts + (emp.calculatedData?.totalMonthlyCost || emp.grossSalary),
        });
      });

      const departmentBreakdown = Array.from(departmentMap.entries()).map(([department, data]) => ({
        department,
        count: data.count,
        totalCosts: data.totalCosts,
      }));

      // Employment Type Breakdown
      const typeMap = new Map<string, number>();
      activeEmployees.forEach(emp => {
        typeMap.set(emp.employmentType, (typeMap.get(emp.employmentType) || 0) + 1);
      });

      const employmentTypeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
        type,
        count,
        percentage: (count / activeEmployees.length) * 100,
      }));

      const stats: PersonalStats = {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalMonthlyCosts,
        totalYearlyCosts: totalMonthlyCosts * 12,
        averageHourlyRate:
          activeEmployees.reduce(
            (sum, emp) => sum + (emp.calculatedData?.effectiveHourlyRate || 0),
            0
          ) / (activeEmployees.length || 1),
        departmentBreakdown,
        employmentTypeBreakdown,
      };

      console.log('✅ PersonalService: Statistiken berechnet:', stats);
      return stats;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Berechnen der Statistiken:', error);
      throw error;
    }
  }

  /**
   * Berechnet Kosten und KPIs für einen Mitarbeiter
   */
  static calculateEmployeeCosts(employee: Employee): {
    totalMonthlyCost: number;
    effectiveHourlyRate: number;
    yearlyTotalCost: number;
  } {
    const grossSalary = employee.grossSalary || 0;
    const employerSV = employee.socialSecurity?.employerContribution || 0;
    const healthInsurance = employee.additionalCosts?.healthInsurance || 0;
    const benefits = employee.additionalCosts?.benefits || 0;
    const training = employee.additionalCosts?.training || 0;
    const equipment = employee.additionalCosts?.equipment || 0;

    const totalMonthlyCost =
      grossSalary + employerSV + healthInsurance + benefits + training + equipment;
    const yearlyTotalCost = totalMonthlyCost * 12;

    // Effektive Stundensatz-Berechnung
    const weeklyHours = employee.workingHours?.weekly || 40;
    const monthlyHours = (weeklyHours * 52) / 12; // Jahresstunden / 12 Monate
    const effectiveHourlyRate = monthlyHours > 0 ? totalMonthlyCost / monthlyHours : 0;

    return {
      totalMonthlyCost,
      effectiveHourlyRate,
      yearlyTotalCost,
    };
  }

  /**
   * Exportiert Mitarbeiterdaten als CSV
   */
  static async exportEmployeesCSV(companyId: string): Promise<string> {
    try {
      const employees = await this.getEmployees(companyId);

      const headers = [
        'Vorname',
        'Nachname',
        'E-Mail',
        'Position',
        'Abteilung',
        'Beschäftigungsart',
        'Bruttogehalt',
        'Gesamtkosten',
        'Stundensatz',
        'Wochenstunden',
        'Startdatum',
        'Status',
      ];

      const csvRows = [headers.join(',')];

      employees.forEach(emp => {
        const row = [
          emp.firstName,
          emp.lastName,
          emp.email,
          emp.position,
          emp.department,
          emp.employmentType,
          emp.grossSalary.toString(),
          (emp.calculatedData?.totalMonthlyCost || emp.grossSalary).toString(),
          (emp.calculatedData?.effectiveHourlyRate || 0).toFixed(2),
          (emp.workingHours?.weekly || 0).toString(),
          emp.startDate,
          emp.isActive ? 'Aktiv' : 'Inaktiv',
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim CSV-Export:', error);
      throw error;
    }
  }

  /**
   * Importiert Mitarbeiterdaten aus CSV
   */
  static async importEmployeesCSV(companyId: string, csvData: string): Promise<number> {
    try {
      console.log('🔄 PersonalService: Importiere CSV-Daten für Company:', companyId);

      const lines = csvData.trim().split('\n');
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');

        if (values.length >= 6) {
          // Mindestanforderungen
          const employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
            companyId,
            firstName: values[0] || '',
            lastName: values[1] || '',
            email: values[2] || '',
            position: values[3] || '',
            department: values[4] || '',
            employmentType: (values[5] as any) || 'FULL_TIME',
            contractType: 'PERMANENT',
            startDate: values[10] || new Date().toISOString().split('T')[0],
            grossSalary: parseFloat(values[6]) || 0,
            workingHours: {
              weekly: parseInt(values[9]) || 40,
              daily: 8,
            },
            socialSecurity: {
              employerContribution: 0,
              employeeContribution: 0,
            },
            additionalCosts: {
              healthInsurance: 0,
              benefits: 0,
              training: 0,
              equipment: 0,
            },
            isActive: values[11] === 'Aktiv',
          };

          await this.createEmployee(employee);
          importedCount++;
        }
      }

      console.log(`✅ PersonalService: ${importedCount} Mitarbeiter importiert`);
      return importedCount;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim CSV-Import:', error);
      throw error;
    }
  }

  // ===== DIENSTPLAN / SCHEDULE SERVICES =====

  /**
   * Lädt alle Schichten für ein Unternehmen
   */
  static async getShifts(companyId: string, startDate?: Date, endDate?: Date): Promise<Shift[]> {
    try {
      console.log('🔄 PersonalService: Lade Schichten für Company:', companyId);

      let shiftsQuery = query(
        collection(db, 'companies', companyId, 'shifts'),
        orderBy('date', 'asc')
      );

      if (startDate && endDate) {
        shiftsQuery = query(
          collection(db, 'companies', companyId, 'shifts'),
          where('date', '>=', startDate.toISOString().split('T')[0]),
          where('date', '<=', endDate.toISOString().split('T')[0]),
          orderBy('date', 'asc')
        );
      }

      const shiftsSnap = await getDocs(shiftsQuery);
      const shifts: Shift[] = [];

      shiftsSnap.forEach(doc => {
        const data = doc.data();
        shifts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Shift);
      });

      console.log(`✅ PersonalService: ${shifts.length} Schichten geladen`);
      return shifts;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Schichten:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Schicht
   */
  static async createShift(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('🔄 PersonalService: Erstelle neue Schicht');

      const shiftData = {
        ...shift,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', shift.companyId, 'shifts'),
        shiftData
      );

      console.log('✅ PersonalService: Schicht erstellt mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Erstellen der Schicht:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert eine Schicht
   */
  static async updateShift(
    companyId: string,
    shiftId: string,
    updates: Partial<Shift>
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Schicht:', shiftId);

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'shifts', shiftId), updateData);

      console.log('✅ PersonalService: Schicht aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren der Schicht:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Schicht
   */
  static async deleteShift(companyId: string, shiftId: string): Promise<void> {
    try {
      console.log('🔄 PersonalService: Lösche Schicht:', shiftId);

      await deleteDoc(doc(db, 'companies', companyId, 'shifts', shiftId));

      console.log('✅ PersonalService: Schicht gelöscht');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen der Schicht:', error);
      throw error;
    }
  }

  // ===== ZEITERFASSUNG / TIMESHEET SERVICES =====

  /**
   * Lädt alle Zeiteinträge für ein Unternehmen
   */
  static async getTimeEntries(
    companyId: string,
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeEntry[]> {
    try {
      console.log('🔄 PersonalService: Lade Zeiteinträge für Company:', companyId);

      let timeQuery = query(
        collection(db, 'companies', companyId, 'timeEntries'),
        orderBy('date', 'desc')
      );

      if (employeeId) {
        timeQuery = query(
          collection(db, 'companies', companyId, 'timeEntries'),
          where('employeeId', '==', employeeId),
          orderBy('date', 'desc')
        );
      }

      const timeSnap = await getDocs(timeQuery);
      const timeEntries: TimeEntry[] = [];

      timeSnap.forEach(doc => {
        const data = doc.data();
        const entry = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as TimeEntry;

        // Filter nach Datum wenn angegeben
        if (startDate && endDate) {
          const entryDate = new Date(entry.date);
          if (entryDate >= startDate && entryDate <= endDate) {
            timeEntries.push(entry);
          }
        } else {
          timeEntries.push(entry);
        }
      });

      console.log(`✅ PersonalService: ${timeEntries.length} Zeiteinträge geladen`);
      return timeEntries;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Zeiteinträge:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Zeiteintrag
   */
  static async createTimeEntry(
    timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log('🔄 PersonalService: Erstelle neuen Zeiteintrag');

      const entryData = {
        ...timeEntry,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', timeEntry.companyId, 'timeEntries'),
        entryData
      );

      console.log('✅ PersonalService: Zeiteintrag erstellt mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Erstellen des Zeiteintrags:', error);
      throw error;
    }
  }

  /**
   * Startet einen Timer für einen Mitarbeiter
   */
  static async startTimer(
    companyId: string,
    employeeId: string,
    description: string = 'Arbeitszeit'
  ): Promise<string> {
    try {
      console.log('🔄 PersonalService: Starte Timer für Mitarbeiter:', employeeId);

      // Prüfe ob bereits ein aktiver Timer läuft
      const activeTimerQuery = query(
        collection(db, 'companies', companyId, 'timeEntries'),
        where('employeeId', '==', employeeId),
        where('status', '==', 'ACTIVE')
      );

      const activeTimerSnap = await getDocs(activeTimerQuery);
      if (!activeTimerSnap.empty) {
        throw new Error('Es läuft bereits ein Timer für diesen Mitarbeiter');
      }

      const now = new Date();
      const timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        employeeId,
        date: now.toISOString().split('T')[0],
        startTime: now.toTimeString().split(' ')[0].slice(0, 5),
        breakTime: 0,
        description,
        category: 'WORK',
        status: 'ACTIVE',
        isManual: false,
      };

      const timerId = await this.createTimeEntry(timeEntry);
      console.log('✅ PersonalService: Timer gestartet mit ID:', timerId);
      return timerId;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Starten des Timers:', error);
      throw error;
    }
  }

  /**
   * Stoppt einen Timer für einen Mitarbeiter
   */
  static async stopTimer(companyId: string, employeeId: string): Promise<void> {
    try {
      console.log('🔄 PersonalService: Stoppe Timer für Mitarbeiter:', employeeId);

      // Finde aktiven Timer
      const activeTimerQuery = query(
        collection(db, 'companies', companyId, 'timeEntries'),
        where('employeeId', '==', employeeId),
        where('status', '==', 'ACTIVE')
      );

      const activeTimerSnap = await getDocs(activeTimerQuery);
      if (activeTimerSnap.empty) {
        throw new Error('Kein aktiver Timer für diesen Mitarbeiter gefunden');
      }

      const timerDoc = activeTimerSnap.docs[0];
      const timerData = timerDoc.data();

      const now = new Date();
      const endTime = now.toTimeString().split(' ')[0].slice(0, 5);

      // Berechne Dauer
      const startTime = new Date(`2000-01-01T${timerData.startTime}`);
      const endTimeObj = new Date(`2000-01-01T${endTime}`);
      const duration = Math.floor((endTimeObj.getTime() - startTime.getTime()) / (1000 * 60)); // Minuten

      await updateDoc(doc(db, 'companies', companyId, 'timeEntries', timerDoc.id), {
        endTime,
        duration,
        status: 'COMPLETED',
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Timer gestoppt');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Stoppen des Timers:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Zeiteintrag
   */
  static async updateTimeEntry(
    companyId: string,
    entryId: string,
    updates: Partial<TimeEntry>
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Zeiteintrag:', entryId);

      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'timeEntries', entryId), updateData);

      console.log('✅ PersonalService: Zeiteintrag aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren des Zeiteintrags:', error);
      throw error;
    }
  }

  /**
   * Löscht einen Zeiteintrag
   */
  static async deleteTimeEntry(companyId: string, entryId: string): Promise<void> {
    try {
      console.log('🔄 PersonalService: Lösche Zeiteintrag:', entryId);

      await deleteDoc(doc(db, 'companies', companyId, 'timeEntries', entryId));

      console.log('✅ PersonalService: Zeiteintrag gelöscht');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen des Zeiteintrags:', error);
      throw error;
    }
  }

  // ===== GEHALTSABRECHNUNG / PAYROLL SERVICES =====

  /**
   * Lädt alle Gehaltsabrechnungen für ein Unternehmen
   */
  static async getPayrolls(
    companyId: string,
    period?: { year: number; month: number }
  ): Promise<Payroll[]> {
    try {
      console.log('🔄 PersonalService: Lade Gehaltsabrechnungen für Company:', companyId);

      let payrollQuery = query(
        collection(db, 'companies', companyId, 'payrolls'),
        orderBy('period.year', 'desc'),
        orderBy('period.month', 'desc')
      );

      if (period) {
        payrollQuery = query(
          collection(db, 'companies', companyId, 'payrolls'),
          where('period.year', '==', period.year),
          where('period.month', '==', period.month)
        );
      }

      const payrollSnap = await getDocs(payrollQuery);
      const payrolls: Payroll[] = [];

      payrollSnap.forEach(doc => {
        const data = doc.data();
        payrolls.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          paidAt: data.paidAt?.toDate(),
        } as Payroll);
      });

      console.log(`✅ PersonalService: ${payrolls.length} Gehaltsabrechnungen geladen`);
      return payrolls;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Gehaltsabrechnungen:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Gehaltsabrechnung
   */
  static async createPayroll(
    companyId: string,
    employeeId: string,
    period: { year: number; month: number }
  ): Promise<string> {
    try {
      console.log('🔄 PersonalService: Erstelle Gehaltsabrechnung für:', employeeId);

      // Lade Mitarbeiterdaten
      const employees = await this.getEmployees(companyId);
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) {
        throw new Error('Mitarbeiter nicht gefunden');
      }

      // Berechne Gehaltsabrechnung
      const grossSalary = employee.grossSalary;
      const workingHours = employee.workingHours.weekly * 4; // Monatsstunden

      // Deutsche Steuersätze (vereinfacht)
      const taxRate = 0.25; // 25% Steuern
      const socialSecurityRate = 0.195; // 19.5% SV-Beiträge

      const incomeTax = grossSalary * taxRate;
      const socialSecurityEmployee = grossSalary * (socialSecurityRate / 2);
      const socialSecurityEmployer = grossSalary * (socialSecurityRate / 2);

      const netSalary = grossSalary - incomeTax - socialSecurityEmployee;

      const payroll: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        employeeId,
        period,
        grossSalary,
        workingHours,
        overtime: 0,
        deductions: {
          taxClass: employee.socialSecurity?.taxClass || '1',
          incomeTax,
          churchTax: incomeTax * 0.08, // 8% Kirchensteuer
          solidarityTax: incomeTax * 0.055, // 5.5% Soli
          socialSecurity: {
            pension: socialSecurityEmployee * 0.5,
            unemployment: socialSecurityEmployee * 0.13,
            health: socialSecurityEmployee * 0.37,
            care: socialSecurityEmployee * 0.1,
          },
        },
        additions: {
          bonuses: 0,
          benefits: employee.additionalCosts?.benefits || 0,
          expenses: 0,
        },
        netSalary,
        employerCosts: {
          socialSecurity: socialSecurityEmployer,
          other: employee.additionalCosts?.healthInsurance || 0,
        },
        status: 'CALCULATED',
      };

      const payrollData = {
        ...payroll,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'companies', companyId, 'payrolls'), payrollData);

      console.log('✅ PersonalService: Gehaltsabrechnung erstellt mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Erstellen der Gehaltsabrechnung:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert den Status einer Gehaltsabrechnung
   */
  static async updatePayrollStatus(
    companyId: string,
    payrollId: string,
    status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'SENT' | 'PAID'
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Payroll Status:', payrollId, status);

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'PAID') {
        updateData.paidAt = new Date();
      }

      await updateDoc(doc(db, 'companies', companyId, 'payrolls', payrollId), updateData);

      console.log('✅ PersonalService: Payroll Status aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren des Payroll Status:', error);
      throw error;
    }
  }

  // ===== ABWESENHEIT / ABSENCE SERVICES =====

  /**
   * Lädt alle Abwesenheitsanträge für ein Unternehmen
   */
  static async getAbsenceRequests(companyId: string): Promise<AbsenceRequest[]> {
    try {
      console.log('🔄 PersonalService: Lade Abwesenheitsanträge für Company:', companyId);

      const requestsQuery = query(
        collection(db, 'companies', companyId, 'absenceRequests'),
        orderBy('requestedAt', 'desc')
      );

      const requestsSnap = await getDocs(requestsQuery);
      const requests: AbsenceRequest[] = [];

      requestsSnap.forEach(doc => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
        } as AbsenceRequest);
      });

      console.log(`✅ PersonalService: ${requests.length} Abwesenheitsanträge geladen`);
      return requests;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Abwesenheitsanträge:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Abwesenheitsantrag
   */
  static async createAbsenceRequest(request: Omit<AbsenceRequest, 'id'>): Promise<string> {
    try {
      console.log('🔄 PersonalService: Erstelle Abwesenheitsantrag');

      const docRef = await addDoc(
        collection(db, 'companies', request.companyId, 'absenceRequests'),
        request
      );

      console.log('✅ PersonalService: Abwesenheitsantrag erstellt mit ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Erstellen des Abwesenheitsantrags:', error);
      throw error;
    }
  }

  /**
   * Genehmigt oder lehnt einen Abwesenheitsantrag ab
   */
  static async processAbsenceRequest(
    companyId: string,
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    approvedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Bearbeite Abwesenheitsantrag:', requestId, status);

      const updateData = {
        status,
        approvedBy,
        approvedAt: new Date().toISOString(),
        notes: notes || undefined,
      };

      await updateDoc(doc(db, 'companies', companyId, 'absenceRequests', requestId), updateData);

      console.log('✅ PersonalService: Abwesenheitsantrag bearbeitet');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Bearbeiten des Abwesenheitsantrags:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einen Abwesenheitsantrag (alias für processAbsenceRequest)
   */
  static async updateAbsenceRequest(
    companyId: string,
    requestId: string,
    updates: Partial<{
      status: 'APPROVED' | 'REJECTED';
      notes: string;
      approvedBy: string;
      approvedAt: string;
    }>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'absenceRequests', requestId), updateData);

      console.log('✅ PersonalService: Abwesenheitsantrag aktualisiert:', requestId);
    } catch (error) {
      console.error(
        '❌ PersonalService: Fehler beim Aktualisieren des Abwesenheitsantrags:',
        error
      );
      throw error;
    }
  }

  /**
   * Exportiert Abwesenheitsanträge als CSV
   */
  static async exportAbsenceRequestsCSV(companyId: string): Promise<string> {
    try {
      const requests = await this.getAbsenceRequests(companyId);

      const headers = [
        'Mitarbeiter',
        'Typ',
        'Startdatum',
        'Enddatum',
        'Tage',
        'Status',
        'Grund',
        'Notizen',
        'Beantragt am',
        'Genehmigt von',
        'Genehmigt am',
      ];

      const csvRows = [headers.join(',')];

      requests.forEach(request => {
        const typeLabels = {
          VACATION: 'Urlaub',
          SICK: 'Krankheit',
          PERSONAL: 'Persönlich',
          TRAINING: 'Weiterbildung',
          OTHER: 'Sonstiges',
        };

        const statusLabels = {
          PENDING: 'Wartend',
          APPROVED: 'Genehmigt',
          REJECTED: 'Abgelehnt',
        };

        const row = [
          `"${request.employeeName}"`,
          `"${typeLabels[request.type] || request.type}"`,
          request.startDate,
          request.endDate,
          request.days.toString(),
          `"${statusLabels[request.status] || request.status}"`,
          `"${request.reason || ''}"`,
          `"${request.notes || ''}"`,
          request.requestedAt,
          `"${request.approvedBy || ''}"`,
          request.approvedAt || '',
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Abwesenheits-Export:', error);
      throw error;
    }
  }

  // ===== EXPORT SERVICES =====

  /**
   * Exportiert Zeiterfassungsdaten als CSV
   */
  static async exportTimeEntriesCSV(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      const timeEntries = await this.getTimeEntries(companyId, undefined, startDate, endDate);
      const employees = await this.getEmployees(companyId);

      const headers = [
        'Mitarbeiter',
        'Datum',
        'Startzeit',
        'Endzeit',
        'Dauer (Std)',
        'Pause (Min)',
        'Beschreibung',
        'Kategorie',
        'Status',
      ];

      const csvRows = [headers.join(',')];

      timeEntries.forEach(entry => {
        const employee = employees.find(emp => emp.id === entry.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt';

        const duration = entry.duration ? (entry.duration / 60).toFixed(2) : '0';

        const row = [
          employeeName,
          entry.date,
          entry.startTime,
          entry.endTime || '',
          duration,
          entry.breakTime.toString(),
          entry.description,
          entry.category,
          entry.status,
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Zeiterfassung-Export:', error);
      throw error;
    }
  }

  /**
   * Exportiert Dienstplandaten als CSV
   */
  static async exportScheduleCSV(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<string> {
    try {
      const shifts = await this.getShifts(companyId, startDate, endDate);
      const employees = await this.getEmployees(companyId);

      const headers = [
        'Mitarbeiter',
        'Datum',
        'Startzeit',
        'Endzeit',
        'Position',
        'Abteilung',
        'Status',
        'Notizen',
      ];

      const csvRows = [headers.join(',')];

      shifts.forEach(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unbekannt';

        const row = [
          employeeName,
          shift.date,
          shift.startTime,
          shift.endTime,
          shift.position,
          shift.department,
          shift.status,
          shift.notes || '',
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Dienstplan-Export:', error);
      throw error;
    }
  }
}
