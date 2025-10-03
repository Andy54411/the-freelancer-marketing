// GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern)
// Modulares Festschreibungssystem für Taskilo

// Hauptkomponenten
export { GoBDSystem } from './GoBDSystem';

// Einzelne Komponenten
export { AutoLockSettings } from './AutoLockSettings';
export { ManualLockManager } from './ManualLockManager';
export { SevDeskLockManager } from './SevDeskLockManager';
export { StornoManager } from './StornoManager';
export { GoBDActionWarning, useGoBDActionWarning } from './GoBDActionWarning';
export { ComplianceDashboard } from './ComplianceDashboard';

// Services und Types sind über separate Pfade verfügbar
export { GoBDService } from '@/services/gobdService';
export type {
  GoBDDocument,
  GoBDLockStatus,
  GoBDPeriodLock,
  GoBDSettings,
  GoBDComplianceReport,
  StornoRequest,
  CreditNoteRequest,
  GoBDAuditEntry
} from '@/types/gobdTypes';