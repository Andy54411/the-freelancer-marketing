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
      const headers = lines[0].split(',');
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
}
