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
  onSnapshot,
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
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN' | 'MINIJOB' | 'WERKSTUDENT' | 'AUSHILFE';
  contractType: 'PERMANENT' | 'TEMPORARY' | 'PROJECT_BASED';
  startDate: string;
  endDate?: string;
  probationPeriodEnd?: string;

  // Schichtleiter / Rolle in der Abteilung
  isShiftLeader?: boolean; // Ist Schichtleiter/Teamleiter
  roleInDepartment?: 'LEADER' | 'SUPERVISOR' | 'MEMBER'; // Rolle: Leiter, Vorgesetzter, Mitarbeiter

  // Arbeitsbereiche (für Gastromatic-Auswertung)
  workAreas?: string[]; // z.B. ['Küche', 'Service', 'Bar']
  primaryWorkArea?: string; // Hauptarbeitsbereich
  
  // Arbeitszeitkonto (AZK) für Gastromatic-Auswertung
  timeAccount?: {
    balance: number; // Aktueller Stundenstand (positiv = Überstunden, negativ = Minusstunden)
    targetHoursPerMonth: number; // Monatliche Sollstunden
    overtimeLimit: number; // Max. Überstunden die angesammelt werden können
    compensationType: 'PAYOUT' | 'TIME_OFF' | 'MIXED'; // Wie werden Überstunden ausgeglichen
    resetDate?: string; // Wann wird das Konto zurückgesetzt (YYYY-MM-DD)
    carryOverLimit: number; // Max. Stunden die ins nächste Jahr übertragen werden
  };

  // Gehalts- und Leistungsdaten
  grossSalary: number;
  hourlyRate?: number;
  minijobLimit?: number; // 538€ für Minijobber (2024)
  bankAccount?: {
    iban: string;
    bic: string;
    bankName: string;
  };
  workingHours: {
    weekly: number;
    daily: number;
    minDaily?: number; // Minimale tägliche Arbeitszeit
    maxDaily?: number; // Maximale tägliche Arbeitszeit (gesetzlich 10h)
    breakRules?: {
      after6Hours: number; // Pause nach 6h (min. 30 Min)
      after9Hours: number; // Pause nach 9h (min. 45 Min)
    };
  };
  socialSecurity: {
    employerContribution: number;
    employeeContribution: number;
    taxClass?: string;
    churchTax?: boolean; // Kirchensteuer
    childAllowance?: number; // Kinderfreibetrag
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
  
  // Arbeitszeiteinstellungen
  workSettings?: {
    dailyWorkHours: number;
    weeklyWorkHours: number;
    overtimeThreshold: number;
    maxDailyHours: number;
    breakAfterHours: number;
    breakDuration: number;
    overtimeMultiplier: number;
    weekendMultiplier: number;
    holidayMultiplier: number;
  };
  
  notes?: string;
  isActive: boolean;
  avatar?: string;

  // App-Zugang für Mitarbeiter (Mobile App)
  appAccess?: {
    registered: boolean;
    authUid?: string;
    pin?: string;
    registeredAt?: string;
    lastLogin?: string;
    registrationToken?: string;
    registrationTokenExpiry?: string;
    invitedAt?: string;
    permissions: {
      timeTracking: boolean;
      schedule: boolean;
      absenceRequest: boolean;
      documents: boolean;
    };
  };

  // Dashboard-Zugang für Mitarbeiter (Desktop/Web)
  dashboardAccess?: {
    enabled: boolean; // Hat der Mitarbeiter Dashboard-Zugang?
    authUid?: string; // Firebase Auth UID des Mitarbeiter-Accounts
    linkedUserId?: string; // Legacy-Feld für verknüpfte User-ID
    createdAt?: string; // Wann wurde der Zugang erstellt?
    lastLogin?: string;
    // Berechtigungen für Sidebar-Menüpunkte
    permissions: {
      // Übersicht
      overview: boolean;
      // Personal-Bereich
      personal: boolean;
      employees: boolean;
      shiftPlanning: boolean;
      timeTracking: boolean;
      absences: boolean;
      evaluations: boolean;
      // Auftragswesen
      orders: boolean;
      quotes: boolean;
      invoices: boolean;
      // Kunden
      customers: boolean;
      // Kalender
      calendar: boolean;
      // Workspace/Dokumente
      workspace: boolean;
      // Finanzen
      finance: boolean;
      expenses: boolean;
      // Lager
      inventory: boolean;
      // Einstellungen (nur eigenes Profil)
      settings: boolean;
    };
  };

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

export interface WorkSettings {
  dailyWorkHours: number; // Tägliche Regelarbeitszeit (z.B. 8 Stunden)
  weeklyWorkHours: number; // Wöchentliche Regelarbeitszeit (z.B. 40 Stunden)
  overtimeThreshold: number; // Ab wann Überstunden gezählt werden (Stunden pro Tag)
  maxDailyHours: number; // Maximale tägliche Arbeitszeit
  breakAfterHours: number; // Nach wie vielen Stunden Pause Pflicht
  breakDuration: number; // Pausendauer in Minuten
  overtimeMultiplier: number; // Überstunden-Zuschlag (z.B. 1.25 = 25%)
  weekendMultiplier: number; // Wochenend-Zuschlag
  holidayMultiplier: number; // Feiertags-Zuschlag
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
  // Gastromatic-Erweiterungen
  plannedStart?: string; // Geplante Startzeit aus Dienstplan
  plannedEnd?: string; // Geplante Endzeit aus Dienstplan
  conflicts?: TimeConflict[]; // Arbeitszeitverstöße
  surcharges?: SurchargeCalculation; // Berechnete Zuschläge
}

// Gastromatic: Arbeitszeitkonflikte/Verstöße
export interface TimeConflict {
  type: 'MAX_DAILY_HOURS' | 'MIN_REST_TIME' | 'MISSING_BREAK' | 'LATE_START' | 'EARLY_END' | 'OVERTIME_LIMIT' | 'MINIJOB_LIMIT';
  severity: 'WARNING' | 'ERROR';
  message: string;
  details?: string;
}

// Gastromatic: Zuschlagsberechnung
export interface SurchargeCalculation {
  baseHours: number; // Normale Arbeitsstunden
  nightHours: number; // Nachtstunden (22:00-06:00)
  weekendHours: number; // Wochenendstunden
  holidayHours: number; // Feiertagsstunden
  overtimeHours: number; // Überstunden
  nightSurcharge: number; // Nachtzuschlag in EUR
  weekendSurcharge: number; // Wochenendzuschlag in EUR
  holidaySurcharge: number; // Feiertagszuschlag in EUR
  overtimeSurcharge: number; // Überstundenzuschlag in EUR
  totalSurcharge: number; // Gesamtzuschlag in EUR
}

// Gastromatic: Plan-Ist-Abgleich
export interface PlanActualComparison {
  employeeId: string;
  employeeName: string;
  date: string;
  plannedHours: number;
  actualHours: number;
  difference: number; // positiv = mehr gearbeitet, negativ = weniger
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  hasConflict: boolean;
  conflicts: TimeConflict[];
}

// Gastromatic: Auswertungs-Übersicht pro Mitarbeiter
export interface EmployeeEvaluation {
  employeeId: string;
  employeeName: string;
  period: { start: string; end: string };
  // Stunden
  plannedHours: number;
  actualHours: number;
  overtimeHours: number;
  // AZK (Arbeitszeitkonto)
  azkBalance: number;
  azkChange: number; // Änderung in diesem Zeitraum
  // Konflikte
  totalConflicts: number;
  unreviewedEntries: number;
  // Urlaub
  vacationDaysTaken: number;
  vacationDaysRemaining: number;
  // Zuschläge
  totalSurcharges: number;
  // Lohn (geschätzt)
  estimatedGrossPay: number;
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
  absenceRequestId?: string; // Verknüpfung zu Abwesenheitsantrag
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
   * Hilfsfunktion zur Konvertierung von verschiedenen Datumsformaten
   */
  private static toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    // Firestore Timestamp
    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    // Bereits ein Date
    if (value instanceof Date) {
      return value;
    }
    // String oder Number
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  /**
   * Lädt alle Mitarbeiter für ein Unternehmen
   */
  static async getEmployees(companyId: string): Promise<Employee[]> {
    if (!companyId) {
      console.error('[PersonalService] getEmployees: companyId ist leer');
      return [];
    }
    
    try {
      console.log('[PersonalService] getEmployees für companyId:', companyId);
      // HINWEIS: Kein orderBy() verwenden - sortiere client-side (Firestore Best Practice)
      const employeesRef = collection(db, 'companies', companyId, 'employees');
      const employeesSnap = await getDocs(employeesRef);
      console.log('[PersonalService] Gefundene Mitarbeiter:', employeesSnap.size);
      const employees: Employee[] = [];

      employeesSnap.forEach(doc => {
        const data = doc.data();
        employees.push({
          id: doc.id,
          ...data,
          createdAt: this.toDate(data.createdAt),
          updatedAt: this.toDate(data.updatedAt),
        } as Employee);
      });

      // Client-side Sortierung nach Nachname
      employees.sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));

      return employees;
    } catch (error) {
      console.error('[PersonalService] getEmployees Fehler:', error);
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

      return docRef.id;
    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Löscht einen Mitarbeiter
   */
  static async deleteEmployee(companyId: string, employeeId: string): Promise<void> {
    try {
      const employeeRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await deleteDoc(employeeRef);
    } catch (error) {
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deaktiviert einen Mitarbeiter (statt zu löschen)
   */
  static async deactivateEmployee(companyId: string, employeeId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), {
        isActive: false,
        endDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date(),
      });
    } catch (error) {
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
      const updateData = {
        'vacation.settings': {
          ...vacationSettings,
          updatedAt: new Date(),
        },
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Aktualisiert die Arbeitszeiteinstellungen eines Mitarbeiters
   */
  static async updateWorkSettings(
    companyId: string,
    employeeId: string,
    workSettings: WorkSettings
  ): Promise<void> {
    try {
      const updateData = {
        workSettings: {
          ...workSettings,
          updatedAt: new Date(),
        },
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'employees', employeeId), updateData);
    } catch (error) {
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

      return requestId;
    } catch (error) {
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Berechnet die verfügbaren Urlaubstage für einen Mitarbeiter
   */
  static calculateAvailableVacationDays(employee: Employee): number {
    const settings = employee.vacation?.settings;
    const currentYear = new Date().getFullYear();

    // Basis Urlaubstage - Fallback auf totalDays oder 30
    let availableDays = settings?.annualVacationDays || employee.vacation?.totalDays || 30;

    // Übertragung vom Vorjahr (nur wenn settings existiert)
    if (settings?.carryOverDays && settings.carryOverDays > 0) {
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

      return stats;
    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Importiert Mitarbeiterdaten aus CSV
   */
  static async importEmployeesCSV(companyId: string, csvData: string): Promise<number> {
    try {
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

      return importedCount;
    } catch (error) {
      throw error;
    }
  }

  // ===== DIENSTPLAN / SCHEDULE SERVICES =====

  /**
   * Lädt alle Schichten für ein Unternehmen
   */
  static async getShifts(companyId: string, startDate?: Date, endDate?: Date): Promise<Shift[]> {
    try {
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

      return shifts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Erstellt eine neue Schicht
   */
  static async createShift(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const shiftData = {
        ...shift,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', shift.companyId, 'shifts'),
        shiftData
      );

      return docRef.id;
    } catch (error) {
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
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'shifts', shiftId), updateData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Löscht eine Schicht
   */
  static async deleteShift(companyId: string, shiftId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'shifts', shiftId));
    } catch (error) {
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
      // Prüfe genehmigte Abwesenheitsanträge
      const absenceRequests = await this.getAbsenceRequests(companyId);
      const employeeAbsences = absenceRequests.filter(
        req =>
          req.employeeId === employeeId &&
          req.status === 'APPROVED' &&
          date >= req.startDate &&
          date <= req.endDate
      );

      if (employeeAbsences.length > 0) {
        return false;
      }

      // Prüfe Schichten mit ABSENT oder SICK Status
      const shifts = await this.getShifts(companyId, new Date(date), new Date(date));
      const employeeShift = shifts.find(
        shift =>
          shift.employeeId === employeeId &&
          shift.date === date &&
          (shift.status === 'ABSENT' || shift.status === 'SICK')
      );

      if (employeeShift) {
        return false;
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Holt alle verfügbaren Mitarbeiter für einen bestimmten Tag
   */
  static async getAvailableEmployees(companyId: string, date: string): Promise<Employee[]> {
    try {
      const allEmployees = await this.getEmployees(companyId);
      const availableEmployees: Employee[] = [];

      for (const employee of allEmployees) {
        if (employee.id && (await this.isEmployeeAvailable(companyId, employee.id, date))) {
          availableEmployees.push(employee);
        }
      }

      return availableEmployees;
    } catch (error) {
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

      return timeEntries;
    } catch (error) {
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
      const entryData = {
        ...timeEntry,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(
        collection(db, 'companies', timeEntry.companyId, 'timeEntries'),
        entryData
      );

      return docRef.id;
    } catch (error) {
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

      return timerId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stoppt einen Timer für einen Mitarbeiter
   */
  static async stopTimer(companyId: string, employeeId: string): Promise<void> {
    try {
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
    } catch (error) {
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
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'companies', companyId, 'timeEntries', entryId), updateData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Löscht einen Zeiteintrag
   */
  static async deleteTimeEntry(companyId: string, entryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'timeEntries', entryId));
    } catch (error) {
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

      return payrolls;
    } catch (error) {
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

      return docRef.id;
    } catch (error) {
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
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'PAID') {
        updateData.paidAt = new Date();
      }

      await updateDoc(doc(db, 'companies', companyId, 'payrolls', payrollId), updateData);
    } catch (error) {
      throw error;
    }
  }

  // ===== ABWESENHEIT / ABSENCE SERVICES =====

  /**
   * Lädt alle Abwesenheitsanträge für ein Unternehmen
   */
  static async getAbsenceRequests(companyId: string): Promise<AbsenceRequest[]> {
    try {
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

      return requests;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Abwesenheitsantrag
   */
  static async createAbsenceRequest(request: Omit<AbsenceRequest, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'companies', request.companyId, 'absenceRequests'),
        request
      );

      const requestId = docRef.id;

      // Automatisch Dienstplan-Einträge für die Abwesenheit erstellen
      await this.createAbsenceShifts(request, requestId);

      return requestId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Erstellt Dienstplan-Einträge für einen Abwesenheitsantrag
   */
  static async createAbsenceShifts(
    request: Omit<AbsenceRequest, 'id'>,
    requestId: string
  ): Promise<void> {
    try {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      // Iteriere über alle Tage der Abwesenheit
      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // Bestimme den Status und die Bezeichnung basierend auf Antragstyp und Status
        let position: string;
        let status: 'PLANNED' | 'CONFIRMED' | 'ABSENT' | 'SICK';
        let department: string;

        if (request.type === 'VACATION') {
          if (request.status === 'PENDING') {
            position = 'Urlaubsantrag';
            status = 'PLANNED';
            department = 'Urlaubsantrag (ausstehend)';
          } else if (request.status === 'APPROVED') {
            position = 'Urlaubsgenehmigt';
            status = 'ABSENT';
            department = 'Urlaubsgenehmigt';
          } else {
            continue; // Keine Schicht für abgelehnte Anträge
          }
        } else if (request.type === 'SICK') {
          position = 'Krankheit';
          status = 'SICK';
          department = 'Krankheit';
        } else {
          position = 'Abwesend';
          status = 'ABSENT';
          department = this.getAbsenceTypeLabel(request.type);
        }

        // Erstelle Schicht für diesen Tag
        await this.createShift({
          companyId: request.companyId,
          employeeId: request.employeeId,
          date: dateStr,
          startTime: '00:00',
          endTime: '23:59',
          position,
          department,
          status,
          notes: `${department}: ${request.reason || ''}`,
          absenceRequestId: requestId,
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hilfsmethode für Abwesenheitstyp-Labels
   */
  static getAbsenceTypeLabel(type: AbsenceRequest['type']): string {
    const labels = {
      VACATION: 'Urlaub',
      SICK: 'Krankheit',
      PERSONAL: 'Persönlich',
      TRAINING: 'Weiterbildung',
      OTHER: 'Sonstiges',
    };
    return labels[type] || 'Abwesenheit';
  }

  /**
   * Aktualisiert Dienstplan-Einträge bei Änderung eines Abwesenheitsantrags
   */
  static async updateAbsenceShifts(
    companyId: string,
    requestId: string,
    newStatus: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    try {
      // Lade alle Schichten, die zu diesem Abwesenheitsantrag gehören
      const shiftsQuery = query(
        collection(db, 'companies', companyId, 'shifts'),
        where('absenceRequestId', '==', requestId)
      );

      const shiftsSnapshot = await getDocs(shiftsQuery);

      for (const shiftDoc of shiftsSnapshot.docs) {
        const shiftData = shiftDoc.data() as Shift;

        if (newStatus === 'APPROVED') {
          // Bei Genehmigung: Status und Bezeichnung aktualisieren
          await updateDoc(shiftDoc.ref, {
            position: 'Urlaubsgenehmigt',
            department: 'Urlaubsgenehmigt',
            status: 'ABSENT',
            updatedAt: new Date(),
          });
        } else if (newStatus === 'REJECTED') {
          // Bei Ablehnung: Schicht löschen
          await deleteDoc(shiftDoc.ref);
        }
      }
    } catch (error) {
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
      const updateData = {
        status,
        approvedBy,
        approvedAt: new Date().toISOString(),
        notes: notes || undefined,
      };

      await updateDoc(doc(db, 'companies', companyId, 'absenceRequests', requestId), updateData);

      // Aktualisiere entsprechende Dienstplan-Einträge
      await this.updateAbsenceShifts(companyId, requestId, status);
    } catch (error) {
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
    } catch (error) {
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
      throw error;
    }
  }

  // Feedback speichern
  static async saveFeedback(
    companyId: string,
    feedback: Omit<EmployeeFeedback, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
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

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Feedback für einen Mitarbeiter abrufen
  static async getEmployeeFeedback(
    companyId: string,
    employeeId: string
  ): Promise<EmployeeFeedback[]> {
    try {
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

      return feedback;
    } catch (error) {
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
      const feedbackDoc = doc(db, `companies/${companyId}/employee_feedback`, feedbackId);
      await updateDoc(feedbackDoc, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      throw error;
    }
  }

  // Feedback löschen
  static async deleteFeedback(companyId: string, feedbackId: string): Promise<void> {
    try {
      const feedbackDoc = doc(db, `companies/${companyId}/employee_feedback`, feedbackId);
      await deleteDoc(feedbackDoc);
    } catch (error) {
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
      const documentsRef = collection(db, `companies/${companyId}/employee_documents`);
      const docRef = await addDoc(documentsRef, {
        ...document,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Dokumente für einen Mitarbeiter abrufen
  static async getEmployeeDocuments(
    companyId: string,
    employeeId: string
  ): Promise<EmployeeDocument[]> {
    try {
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

      return documents;
    } catch (error) {
      throw error;
    }
  }

  // Dokument löschen
  static async deleteEmployeeDocument(companyId: string, documentId: string): Promise<void> {
    try {
      const documentDoc = doc(db, `companies/${companyId}/employee_documents`, documentId);
      await deleteDoc(documentDoc);
    } catch (error) {
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
      const leavesRef = collection(db, `companies/${companyId}/employee_leaves`);
      const leaveRef = await addDoc(leavesRef, {
        ...leave,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return leaveRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Urlaub/Abwesenheiten für einen Mitarbeiter abrufen
  static async getEmployeeLeaves(companyId: string, employeeId: string): Promise<EmployeeLeave[]> {
    try {
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

      return leaves;
    } catch (error) {
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
      const leaveDoc = doc(db, `companies/${companyId}/employee_leaves`, leaveId);
      await updateDoc(leaveDoc, {
        status,
        approvedBy: approvedBy || null,
        approvalDate: status === 'APPROVED' ? new Date().toISOString() : null,
        updatedAt: new Date(),
      });
    } catch (error) {
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
      // Verwende timeEntries Collection (gleiche wie die API)
      const timeRef = collection(db, `companies/${companyId}/timeEntries`);
      const entryRef = await addDoc(timeRef, {
        ...timeEntry,
        // Konvertiere TimeTracking-Format zu timeEntries-Format
        startTime: timeEntry.clockIn,
        endTime: timeEntry.clockOut,
        duration: Math.round((timeEntry.totalHours || 0) * 60), // In Minuten
        breakTime: 0,
        description: timeEntry.notes || timeEntry.project || '',
        category: 'WORK',
        status: timeEntry.status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED',
        isManual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return entryRef.id;
    } catch (error) {
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
      // Verwende timeEntries Collection (gleiche wie die API)
      const timeRef = collection(db, `companies/${companyId}/timeEntries`);
      const q = query(timeRef, where('employeeId', '==', employeeId));

      const querySnapshot = await getDocs(q);
      const timeEntries: TimeTracking[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        // Konvertiere timeEntries-Format zu TimeTracking-Format
        const entry: TimeTracking = {
          id: doc.id,
          companyId: data.companyId || companyId,
          employeeId: data.employeeId || employeeId,
          date: data.date || '',
          clockIn: data.startTime || data.clockIn || '',
          clockOut: data.endTime || data.clockOut || '',
          totalHours: data.duration ? data.duration / 60 : (data.totalHours || 0),
          overtimeHours: data.overtimeHours || 0,
          project: data.projectName || data.project || '',
          notes: data.description || data.notes || '',
          status: data.status === 'ACTIVE' ? 'ACTIVE' : (data.status === 'COMPLETED' ? 'COMPLETED' : 'REVIEWED'),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };
        
        // Optionale Datumsfilterung
        if (startDate && endDate) {
          if (entry.date >= startDate && entry.date <= endDate) {
            timeEntries.push(entry);
          }
        } else {
          timeEntries.push(entry);
        }
      });

      // Sortiere nach Datum absteigend
      timeEntries.sort((a, b) => b.date.localeCompare(a.date));

      return timeEntries;
    } catch (error) {
      throw error;
    }
  }

  // Zeiterfassung löschen
  static async deleteTimeTracking(companyId: string, timeTrackingId: string): Promise<void> {
    try {
      // Verwende timeEntries Collection (gleiche wie die API)
      await deleteDoc(doc(db, `companies/${companyId}/timeEntries`, timeTrackingId));
    } catch (error) {
      throw error;
    }
  }

  // Zeiterfassung aktualisieren
  static async updateTimeTracking(
    companyId: string, 
    timeTrackingId: string, 
    updates: Partial<TimeTracking>
  ): Promise<void> {
    try {
      // Konvertiere TimeTracking-Format zu timeEntries-Format
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.clockIn !== undefined) updateData.startTime = updates.clockIn;
      if (updates.clockOut !== undefined) updateData.endTime = updates.clockOut;
      if (updates.totalHours !== undefined) updateData.duration = Math.round(updates.totalHours * 60);
      if (updates.notes !== undefined) updateData.description = updates.notes;
      if (updates.project !== undefined) updateData.projectName = updates.project;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.overtimeHours !== undefined) updateData.overtimeHours = updates.overtimeHours;
      
      await updateDoc(doc(db, `companies/${companyId}/timeEntries`, timeTrackingId), updateData);
    } catch (error) {
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
      const reviewsRef = collection(db, `companies/${companyId}/performance_reviews`);
      const reviewRef = await addDoc(reviewsRef, {
        ...review,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return reviewRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Leistungsbeurteilungen für einen Mitarbeiter abrufen
  static async getEmployeePerformanceReviews(
    companyId: string,
    employeeId: string
  ): Promise<PerformanceReview[]> {
    try {
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

      return reviews;
    } catch (error) {
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
      const actionsRef = collection(db, `companies/${companyId}/disciplinary_actions`);
      const actionRef = await addDoc(actionsRef, {
        ...action,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return actionRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Disziplinarmaßnahmen für einen Mitarbeiter abrufen
  static async getEmployeeDisciplinaryActions(
    companyId: string,
    employeeId: string
  ): Promise<DisciplinaryAction[]> {
    try {
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

      return actions;
    } catch (error) {
      throw error;
    }
  }

  // ===== REALTIME SUBSCRIPTIONS =====

  /**
   * Realtime Subscription für Mitarbeiter
   */
  static subscribeToEmployees(
    companyId: string,
    onUpdate: (employees: Employee[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'employees'),
        orderBy('lastName', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const employees: Employee[] = [];

          querySnapshot.forEach(doc => {
            employees.push({
              id: doc.id,
              ...doc.data(),
            } as Employee);
          });

          onUpdate(employees);
        },
        error => {
          onError?.(error as Error);
        }
      );

      return unsubscribe;
    } catch (error) {
      onError?.(error as Error);
      return () => {};
    }
  }

  /**
   * Realtime Subscription für Schichten
   */
  static subscribeToShifts(
    companyId: string,
    onUpdate: (shifts: Shift[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      // Lade Schichten für aktuellen und nächsten Monat
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const startDateStr = startOfMonth.toISOString().split('T')[0];
      const endDateStr = endOfNextMonth.toISOString().split('T')[0];

      console.log('🔍 Subscribing to shifts:', { companyId, startDateStr, endDateStr });
      
      const q = query(
        collection(db, 'companies', companyId, 'shifts'),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          console.log('📥 Shifts snapshot received:', querySnapshot.size, 'documents');
          const shifts: Shift[] = [];

          querySnapshot.forEach(doc => {
            const data = doc.data();
            console.log('📄 Shift doc:', doc.id, data);
            shifts.push({
              id: doc.id,
              ...data,
            } as Shift);
          });

          // Sort client-side (Firestore limitation - no orderBy with range queries without index)
          shifts.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
          });

          console.log('✅ Shifts after sorting:', shifts);
          onUpdate(shifts);
        },
        error => {
          console.error('❌ Subscription error:', error);
          onError?.(error as Error);
        }
      );

      return unsubscribe;
    } catch (error) {
      onError?.(error as Error);
      return () => {};
    }
  }

  /**
   * Realtime Subscription für Abwesenheitsanträge
   */
  static subscribeToAbsenceRequests(
    companyId: string,
    onUpdate: (requests: AbsenceRequest[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'absenceRequests'),
        orderBy('startDate', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const requests: AbsenceRequest[] = [];

          querySnapshot.forEach(doc => {
            requests.push({
              id: doc.id,
              ...doc.data(),
            } as AbsenceRequest);
          });

          onUpdate(requests);
        },
        error => {
          onError?.(error as Error);
        }
      );

      return unsubscribe;
    } catch (error) {
      onError?.(error as Error);
      return () => {};
    }
  }

  // ============================================
  // GASTROMATIC FUNKTIONEN
  // ============================================

  /**
   * Deutsche Feiertage für ein Jahr berechnen
   * Beinhaltet bundesweite und wichtige regionale Feiertage
   */
  static getGermanHolidays(year: number): Map<string, string> {
    const holidays = new Map<string, string>();
    
    // Feste Feiertage
    holidays.set(`${year}-01-01`, 'Neujahr');
    holidays.set(`${year}-05-01`, 'Tag der Arbeit');
    holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
    holidays.set(`${year}-12-25`, 'Erster Weihnachtstag');
    holidays.set(`${year}-12-26`, 'Zweiter Weihnachtstag');
    
    // Bewegliche Feiertage (Ostern-basiert)
    const easter = this.calculateEaster(year);
    
    // Karfreitag (2 Tage vor Ostern)
    const karfreitag = new Date(easter);
    karfreitag.setDate(karfreitag.getDate() - 2);
    holidays.set(karfreitag.toISOString().split('T')[0], 'Karfreitag');
    
    // Ostermontag (1 Tag nach Ostern)
    const ostermontag = new Date(easter);
    ostermontag.setDate(ostermontag.getDate() + 1);
    holidays.set(ostermontag.toISOString().split('T')[0], 'Ostermontag');
    
    // Christi Himmelfahrt (39 Tage nach Ostern)
    const himmelfahrt = new Date(easter);
    himmelfahrt.setDate(himmelfahrt.getDate() + 39);
    holidays.set(himmelfahrt.toISOString().split('T')[0], 'Christi Himmelfahrt');
    
    // Pfingstmontag (50 Tage nach Ostern)
    const pfingstmontag = new Date(easter);
    pfingstmontag.setDate(pfingstmontag.getDate() + 50);
    holidays.set(pfingstmontag.toISOString().split('T')[0], 'Pfingstmontag');
    
    return holidays;
  }

  /**
   * Ostersonntag nach Gauss-Algorithmus berechnen
   */
  static calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  /**
   * Prüft ob ein Datum ein Feiertag ist
   */
  static isHoliday(dateStr: string): { isHoliday: boolean; name?: string } {
    const year = new Date(dateStr).getFullYear();
    const holidays = this.getGermanHolidays(year);
    const holidayName = holidays.get(dateStr);
    return { isHoliday: !!holidayName, name: holidayName };
  }

  /**
   * Prüft ob ein Datum am Wochenende liegt
   */
  static isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // Sonntag = 0, Samstag = 6
  }

  /**
   * Berechnet Nachtstunden (22:00-06:00)
   */
  static calculateNightHours(clockIn: string, clockOut: string): number {
    if (!clockIn || !clockOut) return 0;
    
    const [inHour, inMin] = clockIn.split(':').map(Number);
    const [outHour, outMin] = clockOut.split(':').map(Number);
    
    let nightMinutes = 0;
    
    // Vereinfachte Berechnung: Stunden zwischen 22:00 und 06:00
    for (let h = inHour; h !== outHour || (h === inHour && inMin > 0); h = (h + 1) % 24) {
      if (h >= 22 || h < 6) {
        nightMinutes += 60;
      }
      if (h === outHour && outMin > 0) break;
    }
    
    return Math.round(nightMinutes / 60 * 100) / 100;
  }

  /**
   * Arbeitszeitkonflikte prüfen (Gastromatic-Konfliktanzeige)
   */
  static checkTimeConflicts(
    entry: TimeTracking,
    employee: Employee,
    previousDayEndTime?: string
  ): TimeConflict[] {
    const conflicts: TimeConflict[] = [];
    const workSettings = employee.workSettings;
    
    if (!entry.totalHours) return conflicts;
    
    // 1. Maximale tägliche Arbeitszeit (Standard: 10 Stunden nach ArbZG)
    const maxDaily = workSettings?.maxDailyHours || 10;
    if (entry.totalHours > maxDaily) {
      conflicts.push({
        type: 'MAX_DAILY_HOURS',
        severity: 'ERROR',
        message: `Maximale Arbeitszeit überschritten`,
        details: `${entry.totalHours.toFixed(1)}h gearbeitet, max. ${maxDaily}h erlaubt (ArbZG)`
      });
    }
    
    // 2. Ruhezeit-Prüfung (min. 11 Stunden zwischen Schichten)
    if (previousDayEndTime && entry.clockIn) {
      const [prevH, prevM] = previousDayEndTime.split(':').map(Number);
      const [currH, currM] = entry.clockIn.split(':').map(Number);
      
      // Vereinfachte Berechnung: Annahme dass vorheriger Tag am Vortag war
      const restHours = (24 - prevH) + currH + (currM - prevM) / 60;
      
      if (restHours < 11) {
        conflicts.push({
          type: 'MIN_REST_TIME',
          severity: 'ERROR',
          message: `Ruhezeit unterschritten`,
          details: `Nur ${restHours.toFixed(1)}h Ruhezeit, min. 11h erforderlich (ArbZG)`
        });
      }
    }
    
    // 3. Pausenregelung prüfen (30 Min nach 6h, 45 Min nach 9h)
    const breakDuration = entry.breakDuration || 0;
    if (entry.totalHours > 9 && breakDuration < 45) {
      conflicts.push({
        type: 'MISSING_BREAK',
        severity: 'WARNING',
        message: `Pausenzeit zu kurz`,
        details: `Bei ${entry.totalHours.toFixed(1)}h Arbeit sind min. 45 Min Pause erforderlich`
      });
    } else if (entry.totalHours > 6 && breakDuration < 30) {
      conflicts.push({
        type: 'MISSING_BREAK',
        severity: 'WARNING',
        message: `Pausenzeit zu kurz`,
        details: `Bei ${entry.totalHours.toFixed(1)}h Arbeit sind min. 30 Min Pause erforderlich`
      });
    }
    
    // 4. Minijob-Grenze prüfen (538€ = ca. 45h bei 12€/h Mindestlohn)
    if (employee.employmentType === 'MINIJOB') {
      // Dies sollte monatlich geprüft werden, hier nur Warnung
      const hourlyRate = employee.hourlyRate || 12;
      const monthlyLimit = 538 / hourlyRate;
      // Warnung wenn einzelner Tag > 10h (unrealistisch für Minijob)
      if (entry.totalHours > 10) {
        conflicts.push({
          type: 'MINIJOB_LIMIT',
          severity: 'WARNING',
          message: `Minijob-Arbeitszeit prüfen`,
          details: `Hohe Arbeitszeit für Minijobber - Monatsgrenze beachten`
        });
      }
    }
    
    // 5. Überstundenlimit aus AZK prüfen
    if (employee.timeAccount?.overtimeLimit) {
      const currentBalance = employee.timeAccount.balance || 0;
      if (currentBalance > employee.timeAccount.overtimeLimit) {
        conflicts.push({
          type: 'OVERTIME_LIMIT',
          severity: 'WARNING',
          message: `Überstundenlimit erreicht`,
          details: `AZK-Stand: ${currentBalance.toFixed(1)}h, Limit: ${employee.timeAccount.overtimeLimit}h`
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Zuschläge berechnen (Gastromatic-Zuschlagsberechnung)
   */
  static calculateSurcharges(
    entry: TimeTracking,
    employee: Employee
  ): SurchargeCalculation {
    const hourlyRate = employee.hourlyRate || (employee.grossSalary / (employee.workingHours?.weekly || 40) / 4.33);
    const workSettings = employee.workSettings;
    
    const totalHours = entry.totalHours || 0;
    const overtimeThreshold = workSettings?.dailyWorkHours || 8;
    
    // Stunden aufteilen
    const baseHours = Math.min(totalHours, overtimeThreshold);
    const overtimeHours = Math.max(0, totalHours - overtimeThreshold);
    const nightHours = this.calculateNightHours(entry.clockIn, entry.clockOut || entry.clockIn);
    
    // Wochenende/Feiertag prüfen
    const isWeekendDay = this.isWeekend(entry.date);
    const holidayInfo = this.isHoliday(entry.date);
    
    const weekendHours = isWeekendDay ? totalHours : 0;
    const holidayHours = holidayInfo.isHoliday ? totalHours : 0;
    
    // Zuschläge berechnen (Multiplier aus WorkSettings)
    const overtimeMultiplier = (workSettings?.overtimeMultiplier || 1.25) - 1; // z.B. 0.25 für 25%
    const weekendMultiplier = (workSettings?.weekendMultiplier || 1.5) - 1; // z.B. 0.5 für 50%
    const holidayMultiplier = (workSettings?.holidayMultiplier || 2.0) - 1; // z.B. 1.0 für 100%
    const nightMultiplier = 0.25; // 25% Nachtzuschlag (Standard)
    
    const nightSurcharge = nightHours * hourlyRate * nightMultiplier;
    const weekendSurcharge = weekendHours * hourlyRate * weekendMultiplier;
    const holidaySurcharge = holidayHours * hourlyRate * holidayMultiplier;
    const overtimeSurcharge = overtimeHours * hourlyRate * overtimeMultiplier;
    
    const totalSurcharge = nightSurcharge + weekendSurcharge + holidaySurcharge + overtimeSurcharge;
    
    return {
      baseHours,
      nightHours,
      weekendHours,
      holidayHours,
      overtimeHours,
      nightSurcharge: Math.round(nightSurcharge * 100) / 100,
      weekendSurcharge: Math.round(weekendSurcharge * 100) / 100,
      holidaySurcharge: Math.round(holidaySurcharge * 100) / 100,
      overtimeSurcharge: Math.round(overtimeSurcharge * 100) / 100,
      totalSurcharge: Math.round(totalSurcharge * 100) / 100
    };
  }

  /**
   * Plan-Ist-Abgleich für einen Mitarbeiter (Gastromatic-Auswertung)
   */
  static async getPlanActualComparison(
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<PlanActualComparison[]> {
    const comparisons: PlanActualComparison[] = [];
    
    // Zeiteinträge laden
    const timeEntries = await this.getEmployeeTimeTracking(companyId, employeeId);
    
    // Schichten laden
    const start = new Date(startDate);
    const end = new Date(endDate);
    const shifts = await this.getShifts(companyId, start, end);
    const employeeShifts = shifts.filter(s => s.employeeId === employeeId);
    
    // Mitarbeiter laden
    const employee = await this.getEmployee(companyId, employeeId);
    if (!employee) return comparisons;
    
    // Für jeden Tag im Zeitraum vergleichen
    const current = new Date(startDate);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      
      // Geplante Schicht finden
      const shift = employeeShifts.find(s => s.date === dateStr);
      
      // Tatsächlicher Zeiteintrag finden
      const entry = timeEntries.find(e => e.date === dateStr);
      
      if (shift || entry) {
        const plannedHours = shift ? this.calculateHoursBetween(shift.startTime, shift.endTime) : 0;
        const actualHours = entry?.totalHours || 0;
        
        // Konflikte prüfen
        const conflicts = entry ? this.checkTimeConflicts(entry, employee) : [];
        
        comparisons.push({
          employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          date: dateStr,
          plannedHours,
          actualHours,
          difference: actualHours - plannedHours,
          plannedStart: shift?.startTime,
          plannedEnd: shift?.endTime,
          actualStart: entry?.clockIn,
          actualEnd: entry?.clockOut,
          hasConflict: conflicts.length > 0,
          conflicts
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return comparisons;
  }

  /**
   * Hilfsfunktion: Stunden zwischen zwei Uhrzeiten berechnen
   */
  static calculateHoursBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24; // Nachtschicht über Mitternacht
    
    return Math.round(hours * 100) / 100;
  }

  /**
   * Gastromatic-Auswertung: Mitarbeiter-Evaluation für Zeitraum
   */
  static async getEmployeeEvaluation(
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeEvaluation | null> {
    const employee = await this.getEmployee(companyId, employeeId);
    if (!employee) return null;
    
    // Zeiteinträge laden
    const timeEntries = await this.getEmployeeTimeTracking(companyId, employeeId);
    const periodEntries = timeEntries.filter(e => e.date >= startDate && e.date <= endDate);
    
    // Schichten laden
    const start = new Date(startDate);
    const end = new Date(endDate);
    const shifts = await this.getShifts(companyId, start, end);
    const employeeShifts = shifts.filter(s => s.employeeId === employeeId);
    
    // Abwesenheitsanträge laden
    const absences = await this.getAbsenceRequests(companyId);
    const employeeAbsences = absences.filter(a => 
      a.employeeId === employeeId && 
      a.status === 'APPROVED' &&
      a.type === 'VACATION'
    );
    
    // Berechnen
    const plannedHours = employeeShifts.reduce((sum, s) => 
      sum + this.calculateHoursBetween(s.startTime, s.endTime), 0);
    
    const actualHours = periodEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const overtimeHours = periodEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
    
    // Konflikte zählen
    let totalConflicts = 0;
    let unreviewedEntries = 0;
    let totalSurcharges = 0;
    
    for (const entry of periodEntries) {
      const conflicts = this.checkTimeConflicts(entry, employee);
      totalConflicts += conflicts.length;
      
      if (entry.status !== 'REVIEWED') {
        unreviewedEntries++;
      }
      
      const surcharges = this.calculateSurcharges(entry, employee);
      totalSurcharges += surcharges.totalSurcharge;
    }
    
    // Urlaub berechnen
    const vacationDaysTaken = employeeAbsences.reduce((sum, a) => sum + a.days, 0);
    const vacationDaysRemaining = this.calculateAvailableVacationDays(employee) - vacationDaysTaken;
    
    // AZK
    const weeklyHours = employee.workingHours?.weekly || 40;
    const targetHoursPerMonth = employee.timeAccount?.targetHoursPerMonth || (weeklyHours * 4.33);
    const azkChange = actualHours - plannedHours;
    const azkBalance = (employee.timeAccount?.balance || 0) + azkChange;
    
    // Lohn schätzen
    const hourlyRate = employee.hourlyRate || (employee.grossSalary / weeklyHours / 4.33);
    const estimatedGrossPay = (actualHours * hourlyRate) + totalSurcharges;
    
    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      period: { start: startDate, end: endDate },
      plannedHours: Math.round(plannedHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      azkBalance: Math.round(azkBalance * 100) / 100,
      azkChange: Math.round(azkChange * 100) / 100,
      totalConflicts,
      unreviewedEntries,
      vacationDaysTaken,
      vacationDaysRemaining,
      totalSurcharges: Math.round(totalSurcharges * 100) / 100,
      estimatedGrossPay: Math.round(estimatedGrossPay * 100) / 100
    };
  }

  /**
   * Gastromatic: AZK aktualisieren nach Zeiterfassung
   */
  static async updateTimeAccountBalance(
    companyId: string,
    employeeId: string,
    hoursChange: number
  ): Promise<void> {
    const employee = await this.getEmployee(companyId, employeeId);
    if (!employee) return;
    
    const currentBalance = employee.timeAccount?.balance || 0;
    const newBalance = currentBalance + hoursChange;
    
    await this.updateEmployee(companyId, employeeId, {
      timeAccount: {
        ...employee.timeAccount,
        balance: newBalance,
        targetHoursPerMonth: employee.timeAccount?.targetHoursPerMonth || 0,
        overtimeLimit: employee.timeAccount?.overtimeLimit || 100,
        compensationType: employee.timeAccount?.compensationType || 'MIXED',
        carryOverLimit: employee.timeAccount?.carryOverLimit || 40
      }
    });
  }
}

