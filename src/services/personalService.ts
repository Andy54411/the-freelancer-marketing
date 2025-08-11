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

  // Grundlegende Personaldaten
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  numberOfChildren?: number;
  nationality?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Identifikationsdokumente
  personalId?: string;
  employeeNumber?: string;
  socialSecurityNumber?: string;
  taxId?: string;
  pensionInsuranceNumber?: string;
  healthInsurance?: {
    provider: string;
    memberNumber: string;
  };

  // Arbeitsplatz-bezogene Daten
  position: string;
  department: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN';
  contractType: 'PERMANENT' | 'TEMPORARY' | 'PROJECT_BASED';
  startDate: string;
  endDate?: string;
  probationPeriodEnd?: string;

  // Gehalts- und Leistungsdaten
  grossSalary: number;
  hourlyRate?: number;
  bankAccount?: {
    iban: string;
    bic: string;
    bankName: string;
  };
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

  // Qualifikationen und Bildung
  education?: {
    degree: string;
    institution: string;
    graduationYear: string;
  }[];
  certifications?: {
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expirationDate?: string;
  }[];
  languages?: {
    language: string;
    level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE';
  }[];

  // Qualifikationen für erweiterte Personalakte
  qualifications?: {
    education: {
      id: string;
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string;
      grade?: string;
    }[];
    certifications: {
      id: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate?: string;
      credentialId?: string;
    }[];
    languages: {
      id: string;
      language: string;
      level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
    }[];
    skills: {
      id: string;
      name: string;
      level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
      category: 'Technical' | 'Soft Skills' | 'Industry' | 'Other';
    }[];
  };

  // Compliance & Rechtliche Dokumente
  compliance?: {
    workPermit: {
      type: 'WORK_PERMIT';
      status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
      issueDate?: string;
      expiryDate?: string;
      documentNumber?: string;
      issuingAuthority?: string;
      notes?: string;
    };
    healthCertificate: {
      type: 'HEALTH_CERTIFICATE';
      status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
      issueDate?: string;
      expiryDate?: string;
      documentNumber?: string;
      issuingAuthority?: string;
      notes?: string;
    };
    criminalRecord: {
      type: 'CRIMINAL_RECORD';
      status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
      issueDate?: string;
      expiryDate?: string;
      documentNumber?: string;
      issuingAuthority?: string;
      notes?: string;
    };
    dataProtection: {
      type: 'DATA_PROTECTION';
      status: 'VALID' | 'EXPIRED' | 'PENDING' | 'NOT_REQUIRED';
      issueDate?: string;
      expiryDate?: string;
      documentNumber?: string;
      issuingAuthority?: string;
      notes?: string;
    };
    companyAgreements: string[];
    safetyTrainings: {
      name: string;
      completedDate: string;
      validUntil?: string;
      trainer: string;
    }[];
  };

  // Disziplinarverfahren & Arbeitsrechtliche Maßnahmen
  disciplinary?: {
    actions: {
      id: string;
      type: 'WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION' | 'TERMINATION';
      date: string;
      reason: string;
      description: string;
      issuedBy: string;
      witnessedBy?: string;
      employeeResponse?: string;
      followUpDate?: string;
      resolved: boolean;
      resolutionDate?: string;
      resolutionNotes?: string;
    }[];
    incidents: {
      id: string;
      date: string;
      type: 'ACCIDENT' | 'MISCONDUCT' | 'POLICY_VIOLATION' | 'PERFORMANCE_ISSUE' | 'OTHER';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      location?: string;
      witnesses?: string[];
      actionTaken?: string;
      preventiveMeasures?: string;
      reportedBy: string;
      followUpRequired: boolean;
    }[];
  };

  // Verträge & Vereinbarungen
  contracts?: {
    contracts: {
      id: string;
      type:
        | 'EMPLOYMENT'
        | 'AMENDMENT'
        | 'NON_DISCLOSURE'
        | 'NON_COMPETE'
        | 'BONUS'
        | 'COMMISSION'
        | 'OTHER';
      title: string;
      description?: string;
      signedDate: string;
      effectiveDate: string;
      expiryDate?: string;
      status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
      version: string;
      documentUrl?: string;
      signedBy: string[];
      terms?: {
        key: string;
        value: string;
      }[];
      renewalTerms?: string;
      terminationClause?: string;
    }[];
    amendments: {
      id: string;
      contractId: string;
      date: string;
      description: string;
      changedFields: {
        field: string;
        oldValue: string;
        newValue: string;
      }[];
      reason: string;
      authorizedBy: string;
    }[];
  };

  // Arbeitsschutz und Gesundheit
  healthAndSafety?: {
    lastMedicalCheckup?: string;
    workAccidents?: {
      date: string;
      description: string;
      severity: 'MINOR' | 'MODERATE' | 'SEVERE';
    }[];
    safetyTrainings?: {
      title: string;
      date: string;
      validUntil?: string;
    }[];
  };

  // Ausrüstung und Zugänge
  companyAssets?: {
    item: string;
    serialNumber?: string;
    assignedDate: string;
    returnDate?: string;
    condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  }[];

  // Berechnete Daten
  calculatedData?: {
    totalMonthlyCost: number;
    effectiveHourlyRate: number;
    yearlyTotalCost: number;
  };

  // Metadaten
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
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
    yearStart: string; // YYYY-MM-DD format for vacation year start
    settings: {
      annualVacationDays: number;
      carryOverDays: number;
      maxCarryOverDays: number;
      carryOverExpiry: string; // YYYY-MM-DD when carry-over expires
      allowNegativeBalance: boolean;
      requireManagerApproval: boolean;
      minimumAdvanceDays: number;
      maximumConsecutiveDays: number;
      allowWeekends: boolean;
      allowHolidays: boolean;
      autoApproveAfterDays: number;
    };
    requests: VacationRequest[];
    history: {
      year: number;
      totalDaysGranted: number;
      carryOverFromPreviousYear: number;
      usedDays: number;
      plannedDays: number;
      lostDays: number;
      adjustments: {
        date: string;
        amount: number;
        reason: string;
        adjustedBy: string;
      }[];
    }[];
  };
  notes?: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Vacation-related interfaces
export interface VacationRequest {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  requestedDays: number;
  type: 'annual' | 'sick' | 'personal' | 'unpaid' | 'other';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewComment?: string;
}

export interface VacationSettings {
  annualVacationDays: number;
  carryOverDays: number;
  maxCarryOverDays: number;
  carryOverExpiry: string; // YYYY-MM-DD when carry-over expires
  allowNegativeBalance: boolean;
  requireManagerApproval: boolean;
  minimumAdvanceDays: number;
  maximumConsecutiveDays: number;
  allowWeekends: boolean;
  allowHolidays: boolean;
  autoApproveAfterDays: number;
}

export interface EmployeeFeedback {
  id?: string;
  companyId: string;
  employeeId: string;
  date: string;
  rating: number;
  notes: string;
  goals: string[];
  achievements: string[];
  developmentAreas: string[];
  reviewer: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Erweiterte Dokumentenverwaltung für digitale Personalakte
export interface EmployeeDocument {
  id?: string;
  companyId: string;
  employeeId: string;
  category:
    | 'CONTRACT'
    | 'CERTIFICATE'
    | 'IDENTITY'
    | 'MEDICAL'
    | 'TRAINING'
    | 'PERFORMANCE'
    | 'DISCIPLINARY'
    | 'OTHER';
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDate: string;
  expirationDate?: string;
  isConfidential: boolean;
  accessLevel: 'PUBLIC' | 'HR_ONLY' | 'MANAGEMENT_ONLY' | 'EMPLOYEE_SELF';
  tags?: string[];
  version: number;
  replacesDocumentId?: string;
  uploadedBy: string;
  lastModifiedBy?: string;
  retentionPeriod?: number; // Jahre
  legalBasis?: string; // DSGVO Rechtsgrundlage
  downloadURL?: string; // Firebase Storage Download URL
  storagePath?: string; // Firebase Storage Path für Verwaltungszwecke
  createdAt?: Date;
  updatedAt?: Date;
}

// Urlaubs- und Abwesenheitsverwaltung
export interface EmployeeLeave {
  id?: string;
  companyId: string;
  employeeId: string;
  type: 'VACATION' | 'SICK_LEAVE' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'TRAINING' | 'OTHER';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason?: string;
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  medicalCertificate?: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Arbeitszeit und Zeiterfassung
export interface TimeTracking {
  id?: string;
  companyId: string;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  breakDuration?: number; // Minuten
  totalHours?: number;
  overtimeHours?: number;
  location?: string;
  project?: string;
  notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REVIEWED';
  approvedBy?: string;
  approvalDate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Leistungsbeurteilungen und Entwicklung
export interface PerformanceReview {
  id?: string;
  companyId: string;
  employeeId: string;
  reviewPeriod: {
    start: string;
    end: string;
  };
  reviewer: string;
  reviewType: 'ANNUAL' | 'QUARTERLY' | 'PROBATION' | 'PROJECT' | 'SPECIAL';
  overallRating: number; // 1-5
  competencies: {
    name: string;
    rating: number;
    comments?: string;
  }[];
  goals: {
    description: string;
    deadline: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
  achievements: string[];
  improvementAreas: string[];
  careerDevelopment: {
    interests: string[];
    skillsToImprove: string[];
    trainingNeeds: string[];
  };
  salaryRecommendation?: {
    currentSalary: number;
    recommendedSalary: number;
    effectiveDate?: string;
    justification: string;
  };
  nextReviewDate: string;
  employeeComments?: string;
  hrComments?: string;
  status: 'DRAFT' | 'EMPLOYEE_REVIEW' | 'COMPLETED' | 'APPROVED';
  createdAt?: Date;
  updatedAt?: Date;
}

// Disziplinarmaßnahmen
export interface DisciplinaryAction {
  id?: string;
  companyId: string;
  employeeId: string;
  type: 'VERBAL_WARNING' | 'WRITTEN_WARNING' | 'FINAL_WARNING' | 'SUSPENSION' | 'TERMINATION';
  date: string;
  incident: {
    date: string;
    description: string;
    witnesses?: string[];
    location?: string;
  };
  violation: {
    category: 'ATTENDANCE' | 'PERFORMANCE' | 'CONDUCT' | 'POLICY' | 'SAFETY' | 'OTHER';
    severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'GROSS_MISCONDUCT';
    details: string;
  };
  action: {
    description: string;
    consequences: string;
    improvementPlan?: string;
    followUpDate?: string;
  };
  employeeResponse?: string;
  employeeSignature?: {
    signed: boolean;
    date: string;
    method: 'DIGITAL' | 'PHYSICAL' | 'REFUSED';
  };
  issuedBy: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'APPEALED';
  expirationDate?: string;
  appealDetails?: {
    appealed: boolean;
    appealDate?: string;
    outcome?: 'UPHELD' | 'OVERTURNED' | 'MODIFIED';
  };
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

      // Firebase-konforme Daten mit serverTimestamp
      const employeeData = {
        ...employee,
        calculatedData,
        // Verwende serverTimestamp() für Firestore Rules Compliance
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
   * Aktualisiert die Urlaubseinstellungen eines Mitarbeiters
   */
  static async updateVacationSettings(
    companyId: string,
    employeeId: string,
    vacationSettings: VacationSettings
  ): Promise<void> {
    try {
      console.log(
        '🔄 PersonalService: Aktualisiere Urlaubseinstellungen für Mitarbeiter:',
        employeeId
      );

      const updateData = {
        'vacation.settings': {
          ...vacationSettings,
          updatedAt: new Date(),
        },
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);

      console.log('✅ PersonalService: Urlaubseinstellungen aktualisiert');
    } catch (error) {
      console.error(
        '❌ PersonalService: Fehler beim Aktualisieren der Urlaubseinstellungen:',
        error
      );
      throw error;
    }
  }

  /**
   * Speichert einen neuen Urlaubsantrag
   */
  static async saveVacationRequest(
    companyId: string,
    employeeId: string,
    vacationRequest: Omit<VacationRequest, 'id'>
  ): Promise<string> {
    try {
      console.log('🔄 PersonalService: Speichere Urlaubsantrag für Mitarbeiter:', employeeId);

      const requestId = Date.now().toString();
      const newRequest: VacationRequest = {
        ...vacationRequest,
        id: requestId,
        submittedAt: new Date(),
      };

      // Aktueller Mitarbeiter
      const employee = await this.getEmployee(companyId, employeeId);
      const currentRequests = employee.vacation?.requests || [];

      const updateData = {
        'vacation.requests': [...currentRequests, newRequest],
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);

      console.log('✅ PersonalService: Urlaubsantrag gespeichert mit ID:', requestId);
      return requestId;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Speichern des Urlaubsantrags:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert den Status eines Urlaubsantrags
   */
  static async updateVacationRequestStatus(
    companyId: string,
    employeeId: string,
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewComment?: string
  ): Promise<void> {
    try {
      console.log(
        '🔄 PersonalService: Aktualisiere Urlaubsantrag Status:',
        requestId,
        'zu',
        status
      );

      const employee = await this.getEmployee(companyId, employeeId);
      const requests = employee.vacation?.requests || [];

      const updatedRequests = requests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            status,
            reviewedBy,
            reviewedAt: new Date(),
            reviewComment,
          };
        }
        return req;
      });

      const updateData = {
        'vacation.requests': updatedRequests,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);

      console.log('✅ PersonalService: Urlaubsantrag Status aktualisiert');
    } catch (error) {
      console.error(
        '❌ PersonalService: Fehler beim Aktualisieren des Urlaubsantrag Status:',
        error
      );
      throw error;
    }
  }

  /**
   * Berechnet die verfügbaren Urlaubstage für einen Mitarbeiter
   */
  static calculateAvailableVacationDays(employee: Employee): number {
    if (!employee.vacation?.settings) return 0;

    const settings = employee.vacation.settings;
    const currentYear = new Date().getFullYear();

    // Basis Urlaubstage
    let availableDays = settings.annualVacationDays;

    // Übertragung vom Vorjahr
    if (settings.carryOverDays && settings.carryOverDays > 0) {
      const maxCarryOver = settings.maxCarryOverDays || 0;
      const carryOverAmount = Math.min(settings.carryOverDays, maxCarryOver);

      // Prüfe ob Übertragung noch gültig ist
      if (settings.carryOverExpiry) {
        const expiryDate = new Date(settings.carryOverExpiry);
        if (expiryDate > new Date()) {
          availableDays += carryOverAmount;
        }
      } else {
        availableDays += carryOverAmount;
      }
    }

    // Abzug der bereits genehmigten Urlaubstage
    const approvedRequests =
      employee.vacation?.requests?.filter(
        req => req.status === 'approved' && req.startDate.startsWith(currentYear.toString())
      ) || [];

    const usedDays = approvedRequests.reduce((total, req) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    return Math.max(0, availableDays - usedDays);
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
            status: 'ACTIVE',
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

  /**
   * Prüft ob ein Mitarbeiter an einem bestimmten Datum verfügbar ist
   * (nicht im Urlaub, krank oder anderweitig abwesend)
   */
  static async isEmployeeAvailable(
    companyId: string, 
    employeeId: string, 
    date: string
  ): Promise<boolean> {
    try {
      console.log('🔍 PersonalService: Prüfe Verfügbarkeit für Mitarbeiter:', employeeId, 'am', date);

      // Prüfe genehmigte Abwesenheitsanträge
      const absenceRequests = await this.getAbsenceRequests(companyId);
      const employeeAbsences = absenceRequests.filter(req => 
        req.employeeId === employeeId && 
        req.status === 'APPROVED' &&
        date >= req.startDate && 
        date <= req.endDate
      );

      if (employeeAbsences.length > 0) {
        console.log('❌ PersonalService: Mitarbeiter ist abwesend:', employeeAbsences[0].type);
        return false;
      }

      // Prüfe Schichten mit ABSENT oder SICK Status
      const shifts = await this.getShifts(companyId, new Date(date), new Date(date));
      const employeeShift = shifts.find(shift => 
        shift.employeeId === employeeId && 
        shift.date === date &&
        (shift.status === 'ABSENT' || shift.status === 'SICK')
      );

      if (employeeShift) {
        console.log('❌ PersonalService: Mitarbeiter hat Abwesenheits-Schicht:', employeeShift.status);
        return false;
      }

      console.log('✅ PersonalService: Mitarbeiter ist verfügbar');
      return true;
    } catch (error) {
      console.error('❌ PersonalService: Fehler bei Verfügbarkeitsprüfung:', error);
      throw error;
    }
  }

  /**
   * Holt alle verfügbaren Mitarbeiter für einen bestimmten Tag
   */
  static async getAvailableEmployees(
    companyId: string, 
    date: string
  ): Promise<Employee[]> {
    try {
      console.log('🔍 PersonalService: Lade verfügbare Mitarbeiter für:', date);

      const allEmployees = await this.getEmployees(companyId);
      const availableEmployees: Employee[] = [];

      for (const employee of allEmployees) {
        if (employee.id && await this.isEmployeeAvailable(companyId, employee.id, date)) {
          availableEmployees.push(employee);
        }
      }

      console.log(`✅ PersonalService: ${availableEmployees.length} verfügbare Mitarbeiter gefunden`);
      return availableEmployees;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden verfügbarer Mitarbeiter:', error);
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

  // Einzelnen Mitarbeiter abrufen
  static async getEmployee(companyId: string, employeeId: string): Promise<Employee> {
    try {
      const employees = await this.getEmployees(companyId);
      const employee = employees.find(emp => emp.id === employeeId);

      if (!employee) {
        throw new Error(`Mitarbeiter mit ID ${employeeId} nicht gefunden`);
      }

      return employee;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden des Mitarbeiters:', error);
      throw error;
    }
  }

  // Feedback speichern
  static async saveFeedback(
    companyId: string,
    feedback: Omit<EmployeeFeedback, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log('💾 PersonalService: Speichere Feedback für Mitarbeiter:', feedback.employeeId);

      const feedbackData: EmployeeFeedback = {
        ...feedback,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, `companies/${companyId}/employee_feedback`),
        feedbackData
      );
      console.log('✅ PersonalService: Feedback gespeichert mit ID:', docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Speichern des Feedbacks:', error);
      throw error;
    }
  }

  // Feedback für einen Mitarbeiter abrufen
  static async getEmployeeFeedback(
    companyId: string,
    employeeId: string
  ): Promise<EmployeeFeedback[]> {
    try {
      console.log('🔄 PersonalService: Lade Feedback für Mitarbeiter:', employeeId);

      const feedbackRef = collection(db, `companies/${companyId}/employee_feedback`);
      const q = query(feedbackRef, where('employeeId', '==', employeeId), orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      const feedback: EmployeeFeedback[] = [];

      querySnapshot.forEach(doc => {
        feedback.push({
          id: doc.id,
          ...doc.data(),
        } as EmployeeFeedback);
      });

      console.log(`✅ PersonalService: ${feedback.length} Feedback-Einträge geladen`);
      return feedback;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden des Feedbacks:', error);
      throw error;
    }
  }

  // Feedback aktualisieren
  static async updateFeedback(
    companyId: string,
    feedbackId: string,
    updates: Partial<EmployeeFeedback>
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Feedback:', feedbackId);

      const feedbackDoc = doc(db, `companies/${companyId}/employee_feedback`, feedbackId);
      await updateDoc(feedbackDoc, {
        ...updates,
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Feedback aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren des Feedbacks:', error);
      throw error;
    }
  }

  // Feedback löschen
  static async deleteFeedback(companyId: string, feedbackId: string): Promise<void> {
    try {
      console.log('🗑️ PersonalService: Lösche Feedback:', feedbackId);

      const feedbackDoc = doc(db, `companies/${companyId}/employee_feedback`, feedbackId);
      await deleteDoc(feedbackDoc);

      console.log('✅ PersonalService: Feedback gelöscht');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen des Feedbacks:', error);
      throw error;
    }
  }

  // ===== DOKUMENTENVERWALTUNG =====

  // Dokument zur Personalakte hinzufügen
  static async addEmployeeDocument(
    companyId: string,
    document: Omit<EmployeeDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log('📄 PersonalService: Füge Dokument hinzu für Mitarbeiter:', document.employeeId);

      const documentsRef = collection(db, `companies/${companyId}/employee_documents`);
      const docRef = await addDoc(documentsRef, {
        ...document,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Dokument hinzugefügt');
      return docRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen des Dokuments:', error);
      throw error;
    }
  }

  // Dokumente für einen Mitarbeiter abrufen
  static async getEmployeeDocuments(
    companyId: string,
    employeeId: string
  ): Promise<EmployeeDocument[]> {
    try {
      console.log('🔄 PersonalService: Lade Dokumente für Mitarbeiter:', employeeId);

      const documentsRef = collection(db, `companies/${companyId}/employee_documents`);
      const q = query(
        documentsRef,
        where('employeeId', '==', employeeId),
        orderBy('uploadDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const documents: EmployeeDocument[] = [];

      querySnapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data(),
        } as EmployeeDocument);
      });

      console.log(`✅ PersonalService: ${documents.length} Dokumente geladen`);
      return documents;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Dokumente:', error);
      throw error;
    }
  }

  // Dokument löschen
  static async deleteEmployeeDocument(companyId: string, documentId: string): Promise<void> {
    try {
      console.log('🗑️ PersonalService: Lösche Dokument:', documentId);

      const documentDoc = doc(db, `companies/${companyId}/employee_documents`, documentId);
      await deleteDoc(documentDoc);

      console.log('✅ PersonalService: Dokument gelöscht');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen des Dokuments:', error);
      throw error;
    }
  }

  // ===== URLAUBS- UND ABWESENHEITSVERWALTUNG =====

  // Urlaub/Abwesenheit beantragen
  static async addEmployeeLeave(
    companyId: string,
    leave: Omit<EmployeeLeave, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(
        '🏖️ PersonalService: Füge Urlaubsantrag hinzu für Mitarbeiter:',
        leave.employeeId
      );

      const leavesRef = collection(db, `companies/${companyId}/employee_leaves`);
      const leaveRef = await addDoc(leavesRef, {
        ...leave,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Urlaubsantrag hinzugefügt');
      return leaveRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen des Urlaubsantrags:', error);
      throw error;
    }
  }

  // Urlaub/Abwesenheiten für einen Mitarbeiter abrufen
  static async getEmployeeLeaves(companyId: string, employeeId: string): Promise<EmployeeLeave[]> {
    try {
      console.log('🔄 PersonalService: Lade Urlaube für Mitarbeiter:', employeeId);

      const leavesRef = collection(db, `companies/${companyId}/employee_leaves`);
      const q = query(
        leavesRef,
        where('employeeId', '==', employeeId),
        orderBy('startDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const leaves: EmployeeLeave[] = [];

      querySnapshot.forEach(doc => {
        leaves.push({
          id: doc.id,
          ...doc.data(),
        } as EmployeeLeave);
      });

      console.log(`✅ PersonalService: ${leaves.length} Urlaube geladen`);
      return leaves;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Urlaube:', error);
      throw error;
    }
  }

  // Urlaubsstatus aktualisieren
  static async updateLeaveStatus(
    companyId: string,
    leaveId: string,
    status: EmployeeLeave['status'],
    approvedBy?: string
  ): Promise<void> {
    try {
      console.log('🔄 PersonalService: Aktualisiere Urlaubsstatus:', leaveId, status);

      const leaveDoc = doc(db, `companies/${companyId}/employee_leaves`, leaveId);
      await updateDoc(leaveDoc, {
        status,
        approvedBy: approvedBy || null,
        approvalDate: status === 'APPROVED' ? new Date().toISOString() : null,
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Urlaubsstatus aktualisiert');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Aktualisieren des Urlaubsstatus:', error);
      throw error;
    }
  }

  // ===== ZEITERFASSUNG =====

  // Zeiterfassung hinzufügen
  static async addTimeTracking(
    companyId: string,
    timeEntry: Omit<TimeTracking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(
        '⏰ PersonalService: Füge Zeiterfassung hinzu für Mitarbeiter:',
        timeEntry.employeeId
      );

      const timeRef = collection(db, `companies/${companyId}/time_tracking`);
      const entryRef = await addDoc(timeRef, {
        ...timeEntry,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Zeiterfassung hinzugefügt');
      return entryRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen der Zeiterfassung:', error);
      throw error;
    }
  }

  // Zeiterfassungen für einen Mitarbeiter abrufen
  static async getEmployeeTimeTracking(
    companyId: string,
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeTracking[]> {
    try {
      console.log('🔄 PersonalService: Lade Zeiterfassungen für Mitarbeiter:', employeeId);

      const timeRef = collection(db, `companies/${companyId}/time_tracking`);
      const q = query(timeRef, where('employeeId', '==', employeeId), orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      const timeEntries: TimeTracking[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Optionale Datumsfilterung
        if (startDate && endDate) {
          if (data.date >= startDate && data.date <= endDate) {
            timeEntries.push({
              id: doc.id,
              ...data,
            } as TimeTracking);
          }
        } else {
          timeEntries.push({
            id: doc.id,
            ...data,
          } as TimeTracking);
        }
      });

      console.log(`✅ PersonalService: ${timeEntries.length} Zeiterfassungen geladen`);
      return timeEntries;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Zeiterfassungen:', error);
      throw error;
    }
  }

  // Zeiterfassung löschen
  static async deleteTimeTracking(companyId: string, timeTrackingId: string): Promise<void> {
    try {
      console.log('🗑️ PersonalService: Lösche Zeiterfassung:', timeTrackingId);

      await deleteDoc(doc(db, `companies/${companyId}/time_tracking`, timeTrackingId));

      console.log('✅ PersonalService: Zeiterfassung gelöscht');
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Löschen der Zeiterfassung:', error);
      throw error;
    }
  }

  // ===== LEISTUNGSBEURTEILUNGEN =====

  // Leistungsbeurteilung hinzufügen
  static async addPerformanceReview(
    companyId: string,
    review: Omit<PerformanceReview, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(
        '📊 PersonalService: Füge Leistungsbeurteilung hinzu für Mitarbeiter:',
        review.employeeId
      );

      const reviewsRef = collection(db, `companies/${companyId}/performance_reviews`);
      const reviewRef = await addDoc(reviewsRef, {
        ...review,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Leistungsbeurteilung hinzugefügt');
      return reviewRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen der Leistungsbeurteilung:', error);
      throw error;
    }
  }

  // Leistungsbeurteilungen für einen Mitarbeiter abrufen
  static async getEmployeePerformanceReviews(
    companyId: string,
    employeeId: string
  ): Promise<PerformanceReview[]> {
    try {
      console.log('🔄 PersonalService: Lade Leistungsbeurteilungen für Mitarbeiter:', employeeId);

      const reviewsRef = collection(db, `companies/${companyId}/performance_reviews`);
      const q = query(
        reviewsRef,
        where('employeeId', '==', employeeId),
        orderBy('reviewPeriod.start', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reviews: PerformanceReview[] = [];

      querySnapshot.forEach(doc => {
        reviews.push({
          id: doc.id,
          ...doc.data(),
        } as PerformanceReview);
      });

      console.log(`✅ PersonalService: ${reviews.length} Leistungsbeurteilungen geladen`);
      return reviews;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Leistungsbeurteilungen:', error);
      throw error;
    }
  }

  // ===== DISZIPLINARMASNAHMEN =====

  // Disziplinarmaßnahme hinzufügen
  static async addDisciplinaryAction(
    companyId: string,
    action: Omit<DisciplinaryAction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(
        '⚠️ PersonalService: Füge Disziplinarmaßnahme hinzu für Mitarbeiter:',
        action.employeeId
      );

      const actionsRef = collection(db, `companies/${companyId}/disciplinary_actions`);
      const actionRef = await addDoc(actionsRef, {
        ...action,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ PersonalService: Disziplinarmaßnahme hinzugefügt');
      return actionRef.id;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Hinzufügen der Disziplinarmaßnahme:', error);
      throw error;
    }
  }

  // Disziplinarmaßnahmen für einen Mitarbeiter abrufen
  static async getEmployeeDisciplinaryActions(
    companyId: string,
    employeeId: string
  ): Promise<DisciplinaryAction[]> {
    try {
      console.log('🔄 PersonalService: Lade Disziplinarmaßnahmen für Mitarbeiter:', employeeId);

      const actionsRef = collection(db, `companies/${companyId}/disciplinary_actions`);
      const q = query(actionsRef, where('employeeId', '==', employeeId), orderBy('date', 'desc'));

      const querySnapshot = await getDocs(q);
      const actions: DisciplinaryAction[] = [];

      querySnapshot.forEach(doc => {
        actions.push({
          id: doc.id,
          ...doc.data(),
        } as DisciplinaryAction);
      });

      console.log(`✅ PersonalService: ${actions.length} Disziplinarmaßnahmen geladen`);
      return actions;
    } catch (error) {
      console.error('❌ PersonalService: Fehler beim Laden der Disziplinarmaßnahmen:', error);
      throw error;
    }
  }
}
