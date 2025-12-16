import { useState, useEffect, useCallback } from 'react';
import { DashboardComponent } from '@/components/dashboard/DraggableDashboardGrid';

interface DashboardConfig {
  components: DashboardComponent[];
  lastUpdated: string;
}

const STORAGE_KEY = 'taskilo-dashboard-config';

// Default Dashboard Layout - ALLE Komponenten als Drag & Drop
const getDefaultComponents = (uid: string): DashboardComponent[] => [
  {
    id: 'onboarding-banner',
    title: 'Onboarding Banner',
    width: 'full',
    enabled: true,
    order: 0,
  },
  {
    id: 'section-cards',
    title: 'Quick Actions',
    width: 'full',
    enabled: true,
    order: 1,
  },
  {
    id: 'chart-interactive',
    title: 'Finanz-Diagramm',
    width: 'full',
    enabled: true,
    order: 2,
  },
  {
    id: 'outstanding-invoices',
    title: 'Offene Rechnungen',
    width: 'half',
    enabled: true,
    order: 3,
  },
  {
    id: 'vat-pre-registration',
    title: 'USt-Voranmeldung',
    width: 'half',
    enabled: true,
    order: 4,
  },
  {
    id: 'top-expenses',
    title: 'Top Ausgaben',
    width: 'half',
    enabled: true,
    order: 5,
  },
  {
    id: 'top-customers',
    title: 'Top Kunden',
    width: 'half',
    enabled: true,
    order: 6,
  },
  {
    id: 'bank-account',
    title: 'Bankverbindung',
    width: 'half',
    enabled: true,
    order: 7,
  },
  {
    id: 'accounting-score',
    title: 'Buchhaltungs-Score',
    width: 'half',
    enabled: true,
    order: 8,
  },
  {
    id: 'products-services',
    title: 'Produkte & Leistungen',
    width: 'half',
    enabled: true,
    order: 9,
  },
  {
    id: 'activity-history',
    title: 'Aktivitätsverlauf',
    width: 'half',
    enabled: true,
    order: 10,
  },
  {
    id: 'contract-alerts',
    title: 'Personalwarnungen',
    width: 'half',
    enabled: true,
    order: 11,
  },
  {
    id: 'orders-table',
    title: 'Aufträge Übersicht',
    width: 'full',
    enabled: true,
    order: 12,
  },
  {
    id: 'view-all-orders',
    title: 'Alle Aufträge Button',
    width: 'full',
    enabled: true,
    order: 13,
  },
];

export function useDashboardConfig(uid: string) {
  const [components, setComponents] = useState<DashboardComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Storage Key mit User ID
  const storageKey = `${STORAGE_KEY}-${uid}`;

  // Load Configuration
  useEffect(() => {
    const loadConfig = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const config: DashboardConfig = JSON.parse(saved);
          // Validiere und merge mit defaults falls neue Komponenten hinzugekommen sind
          const defaultComponents = getDefaultComponents(uid);
          const mergedComponents = mergeWithDefaults(config.components, defaultComponents);
          setComponents(mergedComponents);
        } else {
          // Erste Verwendung - lade Defaults
          setComponents(getDefaultComponents(uid));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Konfiguration:', error);
        setComponents(getDefaultComponents(uid));
      } finally {
        setIsLoading(false);
      }
    };

    if (uid) {
      loadConfig();
    }
  }, [uid, storageKey]);

  // Save Configuration
  const saveConfig = useCallback((newComponents: DashboardComponent[]) => {
    try {
      // Entferne React-Komponenten vor dem Speichern (nur Metadaten speichern)
      const componentsToSave = newComponents.map(({ component, ...rest }) => rest);
      
      const config: DashboardConfig = {
        components: componentsToSave as DashboardComponent[],
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(config));
      setComponents(newComponents);
    } catch (error) {
      console.error('Fehler beim Speichern der Dashboard-Konfiguration:', error);
    }
  }, [storageKey]);

  // Reset to Defaults
  const resetToDefaults = useCallback(() => {
    const defaultComponents = getDefaultComponents(uid);
    localStorage.removeItem(storageKey);
    setComponents(defaultComponents);
  }, [uid, storageKey]);

  // Update Component
  const updateComponent = useCallback((componentId: string, updates: Partial<DashboardComponent>) => {
    setComponents(prev => {
      const newComponents = prev.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      );
      saveConfig(newComponents);
      return newComponents;
    });
  }, [saveConfig]);

  return {
    components,
    setComponents: saveConfig,
    updateComponent,
    resetToDefaults,
    isLoading,
  };
}

// Hilfsfunktion zum Mergen von gespeicherten und Standard-Komponenten
function mergeWithDefaults(
  saved: DashboardComponent[], 
  defaults: DashboardComponent[]
): DashboardComponent[] {
  const savedMap = new Map(saved.map(comp => [comp.id, comp]));
  
  return defaults.map(defaultComp => {
    const savedComp = savedMap.get(defaultComp.id);
    return savedComp ? { ...defaultComp, ...savedComp } : defaultComp;
  }).sort((a, b) => a.order - b.order);
}

export type { DashboardConfig };