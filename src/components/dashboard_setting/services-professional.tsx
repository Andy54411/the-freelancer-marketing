'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, Save, X, Star, Settings, 
         Clock, Users, CheckCircle, ArrowUpDown, Package, 
         TrendingUp, BarChart3, Activity, DollarSign,
         ChevronDown, ChevronRight, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { categories, findCategoryBySubcategory } from '@/lib/categoriesData';
import { generateAddonSuggestions } from '@/lib/gemini-addon-generator';

// Package Templates basierend auf Service-Kategorien
interface PackageTemplate {
  basic: Partial<ServicePackage>;
  standard: Partial<ServicePackage>;
  premium: Partial<ServicePackage>;
}

const PACKAGE_TEMPLATES: Record<string, PackageTemplate> = {
  // HANDWERK - Zeit + Material + Expertise
  'Handwerk': {
    basic: {
      title: 'Standard Service',
      description: 'Grundlegende Arbeiten mit Standardmaterialien',
      deliveryTime: 3,
      features: ['Anfahrt inklusive', 'Standardmaterialien', '1 Jahr Garantie', 'Ausführung innerhalb 3 Werktagen'],
      revisions: 1,
      price: 150
    },
    standard: {
      title: 'Komplett Service',
      description: 'Umfassende Arbeiten mit Premium-Materialien',
      deliveryTime: 5,
      features: ['Anfahrt inklusive', 'Premium-Materialien', 'Beratung', '2 Jahre Garantie', 'Fertigstellung in 5 Werktagen'],
      revisions: 2,
      price: 280
    },
    premium: {
      title: 'Express & Premium',
      description: 'Notdienst mit Luxus-Materialien',
      deliveryTime: 1,
      features: ['Express-Service', 'Luxus-Materialien', 'Umfassende Beratung', '5 Jahre Garantie', 'Notdienst - Ausführung am selben Tag', 'Kostenlose Nachbesserungen'],
      revisions: 3,
      price: 450
    }
  },

  // HAUSHALT - Zeit-basiert, regelmäßige Services
  'Haushalt': {
    basic: {
      title: 'Grundreinigung',
      description: 'Basis Haushaltsreinigung',
      deliveryTime: 1,
      features: ['2-3 Stunden Service', 'Grundreinigung', 'Eigene Reinigungsmittel'],
      revisions: 0,
      price: 80
    },
    standard: {
      title: 'Umfassende Reinigung',
      description: 'Komplette Haushaltsführung',
      deliveryTime: 1,
      features: ['4-5 Stunden Service', 'Umfassende Reinigung', 'Professionelle Reinigungsmittel', 'Zusatzleistungen'],
      revisions: 1,
      price: 140
    },
    premium: {
      title: 'Luxus Haushaltsservice',
      description: 'Premium Haushaltsführung mit Extraservice',
      deliveryTime: 1,
      features: ['Ganztags Service', 'Luxus-Reinigung', 'Sonderleistungen', 'Schlüsselservice', 'Flexible Termine', 'Kostenlose Nacharbeiten'],
      revisions: 2,
      price: 220
    }
  },

  // TRANSPORT - Volumen/Distanz/Zeit-basiert
  'Transport': {
    basic: {
      title: 'Lokaler Transport',
      description: 'Standardtransport in der Region',
      deliveryTime: 1,
      features: ['Bis 50km', 'Standard-Lieferwagen', 'Be-/Entladung inklusive'],
      revisions: 1,
      price: 120
    },
    standard: {
      title: 'Regional Transport',
      description: 'Erweiterte Transportleistungen',
      deliveryTime: 2,
      features: ['Bis 200km', 'Größere Fahrzeuge', 'Montage-Service', 'Verpackungsmaterial'],
      revisions: 2,
      price: 250
    },
    premium: {
      title: 'Express & Überregional',
      description: 'Premium Transportservice',
      deliveryTime: 1,
      features: ['Unbegrenzte Entfernung', 'Spezialfahrzeuge', 'Express-Service', 'Vollservice', '24/7 verfügbar'],
      revisions: 3,
      price: 450
    }
  },

  // IT & DIGITAL - Projekt-basiert, komplexitäts-orientiert
  'IT & Digital': {
    basic: {
      title: 'Einfaches Projekt',
      description: 'Grundlegende IT-Lösungen',
      deliveryTime: 7,
      features: ['Basis-Features', '3 Monate Support', '2 Revisionen'],
      revisions: 2,
      price: 800
    },
    standard: {
      title: 'Professionelle Lösung',
      description: 'Erweiterte IT-Entwicklung',
      deliveryTime: 14,
      features: ['Erweiterte Features', '6 Monate Support', '5 Revisionen', 'Dokumentation'],
      revisions: 5,
      price: 1800
    },
    premium: {
      title: 'Enterprise Lösung',
      description: 'Vollumfängliche IT-Entwicklung',
      deliveryTime: 30,
      features: ['Premium Features', '12 Monate Support', 'Unbegrenzte Revisionen', 'Vollständige Dokumentation', 'Rush-Delivery möglich'],
      revisions: 999,
      price: 4500
    }
  },

  // GARTEN - Saison-abhängig, zeit-basiert
  'Garten': {
    basic: {
      title: 'Grundpflege',
      description: 'Basis Gartenpflege',
      deliveryTime: 1,
      features: ['Rasenmähen', 'Grundpflege', 'Monatlicher Service'],
      revisions: 0, // Garten kann man nicht "korrigieren"
      price: 100
    },
    standard: {
      title: 'Umfassende Pflege',
      description: 'Komplette Gartenpflege',
      deliveryTime: 2,
      features: ['Komplette Pflege', 'Schnittarbeiten', '14-tägiger Service', 'Entsorgung inklusive'],
      revisions: 1, // z.B. Nachpflege bei Problemen
      price: 180
    },
    premium: {
      title: 'Garten Vollservice',
      description: 'Premium Gartenpflege und -gestaltung',
      deliveryTime: 3,
      features: ['Vollservice', 'Gartenplanung', 'Wöchentlicher Service', 'Neupflanzungen', 'Bewässerungsanlagen'],
      revisions: 2, // Nachpflege und Anpassungen
      price: 350
    }
  },

  // WELLNESS - Zeit-basiert, persönliche Services
  'Wellness': {
    basic: {
      title: 'Basis Behandlung',
      description: 'Grundlegende Wellness-Behandlung',
      deliveryTime: 1,
      features: ['30-45 Min Session', 'Basis-Behandlung', 'Studio-Termin'],
      revisions: 0, // Frisör kann nicht "nacharbeiten"
      price: 60
    },
    standard: {
      title: 'Erweiterte Behandlung',
      description: 'Umfassende Wellness-Session',
      deliveryTime: 1,
      features: ['60-90 Min Session', 'Erweiterte Behandlung', 'Beratung inklusive', 'Styling-Tipps'],
      revisions: 1, // z.B. kleine Korrekturen am Schnitt
      price: 120
    },
    premium: {
      title: 'Luxus Wellness',
      description: 'Premium Wellness-Erlebnis',
      deliveryTime: 1,
      features: ['2+ Stunden Session', 'Luxus-Behandlung', 'Hausbesuch möglich', 'Styling + Beratung', 'Pflegeprodukte inklusive'],
      revisions: 2, // z.B. Nachstyling innerhalb einer Woche
      price: 250
    }
  },

  // HOTEL & GASTRONOMIE - Event-basiert, personenanzahl-orientiert
  'Hotel & Gastronomie': {
    basic: {
      title: 'Privat Dinner',
      description: 'Mietkoch für kleine private Runden',
      deliveryTime: 2,
      features: ['2-4 Personen', '3-Gänge Menü', 'Einkauf inklusive', 'Vor-Ort Zubereitung'],
      revisions: 0, // Menü wird einmal geplant und gekocht
      price: 180
    },
    standard: {
      title: 'Dinner Party',
      description: 'Mietkoch für Dinner-Partys',
      deliveryTime: 3,
      features: ['4-8 Personen', '4-Gänge Menü', 'Aperitif', 'Einkauf & Zubereitung', 'Aufräumen inklusive'],
      revisions: 1, // z.B. Menü-Anpassung bei Allergien
      price: 320
    },
    premium: {
      title: 'Gourmet Experience',
      description: 'Luxus Mietkoch-Erlebnis',
      deliveryTime: 5,
      features: ['8-12 Personen', '5-Gänge Gourmet-Menü', 'Aperitif & Digestif', 'Premium-Zutaten', 'Persönlicher Service', 'Weinbegleitung'],
      revisions: 2, // Menü-Anpassungen und Zusatzwünsche
      price: 580
    }
  },

  // MARKETING & VERTRIEB - Kampagnen-basiert, ergebnis-orientiert
  'Marketing & Vertrieb': {
    basic: {
      title: 'Einzelkampagne',
      description: 'Grundlegende Marketingkampagne',
      deliveryTime: 14,
      features: ['1 Kanal', '1 Monat Laufzeit', 'Basis-Reporting'],
      revisions: 2,
      price: 600
    },
    standard: {
      title: 'Mehrkanal-Marketing',
      description: 'Umfassende Marketingstrategie',
      deliveryTime: 21,
      features: ['3 Kanäle', '3 Monate Laufzeit', 'Detailliertes Reporting', 'A/B Testing'],
      revisions: 4,
      price: 1500
    },
    premium: {
      title: 'Vollservice Marketing',
      description: 'Premium Marketingbetreuung',
      deliveryTime: 30,
      features: ['Alle Kanäle', '6+ Monate Laufzeit', 'ROI-Garantie', 'Persönlicher Account Manager', '24/7 Support'],
      revisions: 999,
      price: 3500
    }
  },

  // FINANZEN & RECHT - Beratungs-basiert, komplexitäts-orientiert
  'Finanzen & Recht': {
    basic: {
      title: 'Standardberatung',
      description: 'Grundlegende Beratungsleistung',
      deliveryTime: 3,
      features: ['1-2 Stunden Beratung', 'Einfache Fälle', '48h Response'],
      revisions: 1,
      price: 150
    },
    standard: {
      title: 'Umfassende Beratung',
      description: 'Erweiterte Beratungsleistung',
      deliveryTime: 7,
      features: ['Laufende Betreuung', 'Mittlere Komplexität', '24h Response', 'Nachbetreuung'],
      revisions: 3,
      price: 400
    },
    premium: {
      title: 'Premium Beratung',
      description: 'Vollumfängliche Beratung',
      deliveryTime: 14,
      features: ['24/7 Support', 'Komplexe Mandate', 'Sofort Response', 'Persönlicher Berater'],
      revisions: 5,
      price: 800
    }
  },

  // BILDUNG & UNTERSTÜTZUNG - Stunden-basiert, bildungs-orientiert
  'Bildung & Unterstützung': {
    basic: {
      title: 'Einzelstunden',
      description: 'Grundlegende Nachhilfe',
      deliveryTime: 1,
      features: ['Einzelstunden', 'Basis-Niveau', '5er Paket'],
      revisions: 1,
      price: 100
    },
    standard: {
      title: 'Kurs-Pakete',
      description: 'Strukturierte Lernpakete',
      deliveryTime: 2,
      features: ['10er Paket', 'Mittleres Niveau', 'Lernmaterialien inklusive'],
      revisions: 2,
      price: 180
    },
    premium: {
      title: 'Intensiv-Kurse',
      description: 'Premium Bildungsbetreuung',
      deliveryTime: 3,
      features: ['20er Paket', 'Experten-Niveau', 'Alle Materialien', 'Prüfungsvorbereitung'],
      revisions: 3,
      price: 320
    }
  },

  // TIERE & PFLANZEN - Zeit-basiert, tier-spezifisch
  'Tiere & Pflanzen': {
    basic: {
      title: 'Gelegentliche Betreuung',
      description: 'Basis Tierbetreuung',
      deliveryTime: 1,
      features: ['1-2 Stunden', '1 Tier', 'Wochenend-Service'],
      revisions: 1,
      price: 40
    },
    standard: {
      title: 'Regelmäßige Betreuung',
      description: 'Erweiterte Tierbetreuung',
      deliveryTime: 1,
      features: ['Halbtags Betreuung', 'Mehrere Tiere', 'Wochentags verfügbar'],
      revisions: 2,
      price: 80
    },
    premium: {
      title: 'Vollzeit-Betreuung',
      description: 'Premium Tierbetreuung',
      deliveryTime: 1,
      features: ['24/7 Betreuung', 'Unbegrenzte Anzahl', 'Notfall-Service', 'Medikamentengabe'],
      revisions: 3,
      price: 150
    }
  },

  // KREATIV & KUNST - Projekt-basiert, kreativitäts-orientiert
  'Kreativ & Kunst': {
    basic: {
      title: 'Einfache Projekte',
      description: 'Grundlegende kreative Arbeiten',
      deliveryTime: 3,
      features: ['Einfache Projekte', 'Basis-Ausstattung', '2 Revisionen'],
      revisions: 2,
      price: 200
    },
    standard: {
      title: 'Professionelle Projekte',
      description: 'Erweiterte kreative Leistungen',
      deliveryTime: 7,
      features: ['Mittlere Komplexität', 'Professionelle Ausstattung', '4 Revisionen', 'Mehrere Formate'],
      revisions: 4,
      price: 500
    },
    premium: {
      title: 'Premium Kreativ-Service',
      description: 'Luxus kreative Betreuung',
      deliveryTime: 14,
      features: ['Komplexe Projekte', 'Premium-Equipment', 'Unbegrenzte Revisionen', 'Alle Formate'],
      revisions: 999,
      price: 1200
    }
  },

  // EVENT & VERANSTALTUNG - Event-basiert, größen-orientiert
  'Event & Veranstaltung': {
    basic: {
      title: 'Kleine Events',
      description: 'Basis Eventservice',
      deliveryTime: 7,
      features: ['Bis 4 Stunden', 'Bis 50 Personen', 'Basis-Ausstattung'],
      revisions: 1,
      price: 400
    },
    standard: {
      title: 'Mittlere Events',
      description: 'Professioneller Eventservice',
      deliveryTime: 14,
      features: ['Ganzer Tag', 'Bis 200 Personen', 'Erweiterte Ausstattung', 'Setup/Abbau'],
      revisions: 2,
      price: 1000
    },
    premium: {
      title: 'Große Events',
      description: 'Premium Eventservice',
      deliveryTime: 21,
      features: ['Mehrere Tage', '200+ Personen', 'Premium-Service', 'Komplette Betreuung', 'Backup-Equipment'],
      revisions: 3,
      price: 2500
    }
  },

  // BÜRO & ADMINISTRATION - Zeit-basiert, aufgaben-orientiert
  'Büro & Administration': {
    basic: {
      title: 'Einzelaufgaben',
      description: 'Basis administrative Unterstützung',
      deliveryTime: 3,
      features: ['Wenige Stunden', 'Einfache Tasks', 'Remote möglich'],
      revisions: 1,
      price: 80
    },
    standard: {
      title: 'Laufende Unterstützung',
      description: 'Erweiterte administrative Betreuung',
      deliveryTime: 7,
      features: ['Halbtags Support', 'Komplexere Aufgaben', 'Bürozeiten verfügbar'],
      revisions: 2,
      price: 200
    },
    premium: {
      title: 'Vollzeit-Support',
      description: 'Premium administrative Betreuung',
      deliveryTime: 14,
      features: ['Ganztags Support', 'Gesamtverantwortung', 'Vor Ort verfügbar', 'Flexible Zeiten'],
      revisions: 3,
      price: 500
    }
  },

  // DEFAULT für alle anderen Kategorien
  'Default': {
    basic: {
      title: 'Basic Paket',
      description: 'Grundlegende Dienstleistung',
      deliveryTime: 7,
      features: ['Basis-Service', 'Standard-Lieferzeit'],
      revisions: 1,
      price: 100
    },
    standard: {
      title: 'Standard Paket',
      description: 'Erweiterte Dienstleistung',
      deliveryTime: 5,
      features: ['Erweiterter Service', 'Schnellere Lieferzeit', 'Zusatzleistungen'],
      revisions: 2,
      price: 200
    },
    premium: {
      title: 'Premium Paket',
      description: 'Vollumfängliche Dienstleistung',
      deliveryTime: 3,
      features: ['Premium Service', 'Express-Lieferung', 'Vollservice', 'Priority Support'],
      revisions: 5,
      price: 400
    }
  }
};

interface ServicePackage {
  name: 'basic' | 'standard' | 'premium';
  title: string;
  description: string;
  price: number;
  deliveryTime: number; // in Tagen
  features: string[];
  revisions: number;
  active: boolean;
}

interface AdditionalService {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryTime?: number; // optional zusätzliche Zeit
  active: boolean;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  subcategory: string;
  packages: {
    basic: ServicePackage;
    standard: ServicePackage;
    premium: ServicePackage;
  };
  additionalServices?: AdditionalService[];
  gallery?: string[];
  tags?: string[];
  featured?: boolean;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  totalOrders?: number;
  avgRating?: number;
  revenue?: number;
}

interface ServicesFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

const ServicesForm: React.FC<ServicesFormProps> = ({ formData, setFormData }) => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allowedSubcategories, setAllowedSubcategories] = useState<string[]>([]);
  const [companyMainCategory, setCompanyMainCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAdditionalServiceDialogOpen, setIsAdditionalServiceDialogOpen] = useState(false);
  const [editingAdditionalService, setEditingAdditionalService] = useState<AdditionalService | null>(null);

  // Package Template basierend auf Subkategorie anwenden
  const applyPackageTemplate = (subcategory: string) => {
    const mainCategory = findCategoryBySubcategory(subcategory);
    const template = PACKAGE_TEMPLATES[mainCategory || 'Default'] || PACKAGE_TEMPLATES['Default'];
    
    // Fallback für den Fall, dass template undefined ist
    const safeTemplate = {
      basic: template?.basic || PACKAGE_TEMPLATES['Default'].basic,
      standard: template?.standard || PACKAGE_TEMPLATES['Default'].standard,
      premium: template?.premium || PACKAGE_TEMPLATES['Default'].premium,
    };
    
    return {
      basic: {
        name: 'basic' as const,
        title: safeTemplate.basic.title || 'Basic Paket',
        description: safeTemplate.basic.description || 'Grundlegende Dienstleistung',
        price: safeTemplate.basic.price || 100,
        deliveryTime: safeTemplate.basic.deliveryTime || 7,
        features: safeTemplate.basic.features || ['Basis-Service'],
        revisions: safeTemplate.basic.revisions || 1,
        active: true,
      },
      standard: {
        name: 'standard' as const,
        title: safeTemplate.standard.title || 'Standard Paket',
        description: safeTemplate.standard.description || 'Erweiterte Dienstleistung',
        price: safeTemplate.standard.price || 200,
        deliveryTime: safeTemplate.standard.deliveryTime || 5,
        features: safeTemplate.standard.features || ['Erweiterter Service'],
        revisions: safeTemplate.standard.revisions || 2,
        active: true,
      },
      premium: {
        name: 'premium' as const,
        title: safeTemplate.premium.title || 'Premium Paket',
        description: safeTemplate.premium.description || 'Vollumfängliche Dienstleistung',
        price: safeTemplate.premium.price || 400,
        deliveryTime: safeTemplate.premium.deliveryTime || 3,
        features: safeTemplate.premium.features || ['Premium Service'],
        revisions: safeTemplate.premium.revisions || 5,
        active: true,
      },
    };
  };
  
  const [newService, setNewService] = useState<ServiceItem>({
    id: '',
    title: '',
    description: '',
    subcategory: '',
    packages: {
      basic: {
        name: 'basic',
        title: 'Basic',
        description: '',
        price: 0,
        deliveryTime: 7,
        features: [''],
        revisions: 1,
        active: true,
      },
      standard: {
        name: 'standard',
        title: 'Standard',
        description: '',
        price: 0,
        deliveryTime: 5,
        features: [''],
        revisions: 2,
        active: true,
      },
      premium: {
        name: 'premium',
        title: 'Premium',
        description: '',
        price: 0,
        deliveryTime: 3,
        features: [''],
        revisions: 5,
        active: true,
      },
    },
    additionalServices: [],
    gallery: [],
    tags: [],
    featured: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalOrders: 0,
    avgRating: 0,
    revenue: 0,
  });

  // Erlaubte Subkategorien aus der Firmenregistrierung laden
  const loadAllowedSubcategories = async (uid: string) => {
    try {
      const companyRef = doc(db, 'companies', uid);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        const companyData = companySnap.data();
        console.log('Company data:', companyData); // Debug log
        
        // Priorität: selectedSubcategory (aus der Registrierung)
        const registeredSubcategory = companyData.selectedSubcategory;
        
        if (registeredSubcategory) {
          setAllowedSubcategories([registeredSubcategory]);
          const mainCategory = findCategoryBySubcategory(registeredSubcategory);
          if (mainCategory) {
            setCompanyMainCategory(mainCategory);
          }
          
          // Automatisch Templates anwenden für die registrierte Subkategorie
          const templatePackages = applyPackageTemplate(registeredSubcategory);
          setNewService(prev => ({
            ...prev,
            subcategory: registeredSubcategory,
            packages: templatePackages
          }));
          
          console.log(`✅ Company registered with: ${mainCategory} -> ${registeredSubcategory}`);
          console.log('🎯 Templates automatically applied');
          return;
        }
        
        // Fallback: Versuche andere Felder
        let companySubcategories: string[] = [];
        
        if (companyData.subcategories && Array.isArray(companyData.subcategories)) {
          companySubcategories = companyData.subcategories;
        } else if (companyData.step1?.selectedSubcategory) {
          companySubcategories = [companyData.step1.selectedSubcategory];
        } else if (companyData.step2?.selectedSubcategory) {
          companySubcategories = [companyData.step2.selectedSubcategory];
        }
        
        if (companySubcategories.length > 0) {
          setAllowedSubcategories(companySubcategories);
          const mainCategory = findCategoryBySubcategory(companySubcategories[0]);
          if (mainCategory) {
            setCompanyMainCategory(mainCategory);
          }
          const templatePackages = applyPackageTemplate(companySubcategories[0]);
          setNewService(prev => ({
            ...prev,
            subcategory: companySubcategories[0],
            packages: templatePackages
          }));
          return;
        }
      }
      
      // Fallback: Wenn keine spezifischen Subcategorien gefunden wurden
      console.warn('⚠️ Keine Unternehmen-Subcategorien gefunden, lade alle Kategorien');
      const allSubcategories = categories.flatMap(cat => cat.subcategories);
      setAllowedSubcategories(allSubcategories.slice(0, 5)); // Nur erste 5 als Fallback
      setCompanyMainCategory('Alle Kategorien');
      setNewService(prev => ({
        ...prev,
        subcategory: allSubcategories[0] || '' 
      }));
    } catch (error) {
      console.error('Fehler beim Laden der erlaubten Subkategorien:', error);
      toast.error('Fehler beim Laden der Kategorien');
    }
  };

  // Services aus Datenbank laden
  const loadServicesFromDatabase = async (uid: string) => {
    try {
      setIsLoading(true);
      await loadAllowedSubcategories(uid);
      
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const serviceItems = userData.serviceItems || [];
        setServices(serviceItems);
        setFormData((prev: any) => ({ ...prev, serviceItems }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Services:', error);
      toast.error('Fehler beim Laden der Services');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && service.active) ||
                         (filterStatus === 'inactive' && !service.active);

    return matchesSearch && matchesFilter;
  });

  // Package Update Helper
  const updatePackage = (packageName: 'basic' | 'standard' | 'premium', field: string, value: any) => {
    if (selectedService) {
      setSelectedService(prev => ({
        ...prev!,
        packages: {
          ...prev!.packages,
          [packageName]: {
            ...prev!.packages[packageName],
            [field]: value
          }
        }
      }));
    } else {
      setNewService(prev => ({
        ...prev,
        packages: {
          ...prev.packages,
          [packageName]: {
            ...prev.packages[packageName],
            [field]: value
          }
        }
      }));
    }
  };

  // Feature Management
  const addFeature = (packageName: 'basic' | 'standard' | 'premium') => {
    const currentService = selectedService || newService;
    updatePackage(packageName, 'features', [
      ...currentService.packages[packageName].features,
      ''
    ]);
  };

  const updateFeature = (packageName: 'basic' | 'standard' | 'premium', index: number, value: string) => {
    const currentService = selectedService || newService;
    const currentFeatures = currentService.packages[packageName].features;
    const updatedFeatures = [...currentFeatures];
    updatedFeatures[index] = value;
    updatePackage(packageName, 'features', updatedFeatures);
  };

  const removeFeature = (packageName: 'basic' | 'standard' | 'premium', index: number) => {
    const currentService = selectedService || newService;
    const currentFeatures = currentService.packages[packageName].features;
    if (currentFeatures.length > 1) {
      const updatedFeatures = currentFeatures.filter((_, i) => i !== index);
      updatePackage(packageName, 'features', updatedFeatures);
    }
  };

  // Service hinzufügen
  const addService = async () => {
    if (!newService.title.trim() || !newService.description.trim()) {
      toast.error('Titel und Beschreibung sind erforderlich');
      return;
    }

    // Check package limits (max 1 pro Typ)
    const activePackages = Object.entries(newService.packages).filter(([_, pkg]) => pkg.active);
    const packageTypes = activePackages.map(([name, _]) => name);
    
    // Check if we already have services with these package types
    const existingPackageTypes = services.flatMap(service => 
      Object.entries(service.packages)
        .filter(([_, pkg]) => pkg.active)
        .map(([name, _]) => name)
    );
    
    const conflictingTypes = packageTypes.filter(type => existingPackageTypes.includes(type));
    
    if (conflictingTypes.length > 0) {
      toast.error(`Sie haben bereits einen ${conflictingTypes.join(', ')} Service. Pro Typ ist nur ein Service erlaubt.`);
      return;
    }

    const hasValidPackage = Object.values(newService.packages).some(pkg => 
      pkg.active && pkg.price > 0 && pkg.description.trim()
    );

    if (!hasValidPackage) {
      toast.error('Mindestens ein Paket muss aktiv sein und einen Preis haben');
      return;
    }

    try {
      const serviceWithId: ServiceItem = {
        ...newService,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedServices = [...services, serviceWithId];
      setServices(updatedServices);
      setFormData((prev: any) => ({ ...prev, serviceItems: updatedServices }));

      // Auto-save to Firestore
      try {
        // Here you would implement the actual Firestore save
        // await saveServicesToFirestore(companyId, updatedServices);
        console.log('Services would be saved to Firestore:', updatedServices);
      } catch (error) {
        console.error('Fehler beim Speichern in Firestore:', error);
        toast.error('Fehler beim Speichern');
      }

      // Reset form
      setNewService({
        id: '',
        title: '',
        description: '',
        subcategory: allowedSubcategories[0] || '',
        packages: {
          basic: {
            name: 'basic',
            title: 'Basic',
            description: '',
            price: 0,
            deliveryTime: 7,
            features: [''],
            revisions: 1,
            active: true,
          },
          standard: {
            name: 'standard',
            title: 'Standard', 
            description: '',
            price: 0,
            deliveryTime: 5,
            features: [''],
            revisions: 2,
            active: true,
          },
          premium: {
            name: 'premium',
            title: 'Premium',
            description: '',
            price: 0,
            deliveryTime: 3,
            features: [''],
            revisions: 5,
            active: true,
          },
        },
        gallery: [],
        tags: [],
        featured: false,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalOrders: 0,
        avgRating: 0,
        revenue: 0,
      });

      setIsCreateDialogOpen(false);
      toast.success('Service erfolgreich hinzugefügt');
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Services:', error);
      toast.error('Fehler beim Hinzufügen des Services');
    }
  };

  // Service bearbeiten
  const updateService = async () => {
    if (!selectedService) return;

    const updatedServices = services.map(service =>
      service.id === selectedService.id 
        ? { ...selectedService, updatedAt: new Date() }
        : service
    );
    
    setServices(updatedServices);
    setFormData((prev: any) => ({ ...prev, serviceItems: updatedServices }));
    
    // Auto-save to Firestore
    try {
      // Here you would implement the actual Firestore save
      // await saveServicesToFirestore(companyId, updatedServices);
      console.log('Updated services would be saved to Firestore:', updatedServices);
    } catch (error) {
      console.error('Fehler beim Speichern in Firestore:', error);
      toast.error('Fehler beim Speichern');
    }
    
    setIsEditDialogOpen(false);
    setSelectedService(null);
    toast.success('Service aktualisiert und gespeichert');
  };

  // Service löschen
  const deleteService = async (serviceId: string) => {
    const updatedServices = services.filter(s => s.id !== serviceId);
    setServices(updatedServices);
    setFormData((prev: any) => ({ ...prev, serviceItems: updatedServices }));
    
    // Auto-save to Firestore
    try {
      // Here you would implement the actual Firestore save
      // await saveServicesToFirestore(companyId, updatedServices);
      console.log('Updated services after deletion would be saved to Firestore:', updatedServices);
    } catch (error) {
      console.error('Fehler beim Speichern in Firestore:', error);
      toast.error('Fehler beim Speichern');
    }
    
    toast.success('Service gelöscht und gespeichert');
  };

  // Service aktivieren/deaktivieren
  const toggleServiceStatus = (serviceId: string) => {
    const updatedServices = services.map(service =>
      service.id === serviceId 
        ? { ...service, active: !service.active, updatedAt: new Date() }
        : service
    );
    
    setServices(updatedServices);
    setFormData((prev: any) => ({ ...prev, serviceItems: updatedServices }));
    
    const service = services.find(s => s.id === serviceId);
    toast.success(`Service ${service?.active ? 'deaktiviert' : 'aktiviert'}`);
  };

  // Preis formatieren
  const formatPrice = (service: ServiceItem): string => {
    const activePrices = Object.values(service.packages)
      .filter(pkg => pkg.active && pkg.price > 0)
      .map(pkg => pkg.price);
    
    if (activePrices.length === 0) return 'Auf Anfrage';
    
    const minPrice = Math.min(...activePrices);
    return `ab ${minPrice}€`;
  };

  // Package Colors
  const getPackageColor = (packageName: string) => {
    switch (packageName) {
      case 'basic': return 'bg-gray-50 border-gray-200 text-gray-700';
      case 'standard': return 'bg-gray-100 border-gray-300 text-gray-800';
      case 'premium': return 'bg-[#14ad9f]/10 border-[#14ad9f]/20 text-[#14ad9f]';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Service Form Component
  const ServiceFormFields = ({ service, setService }: { service: ServiceItem, setService: (service: ServiceItem) => void }) => {
    
    // Dynamisches Label basierend auf Kategorie
    const getDeliveryTimeLabel = (subcategory: string) => {
      if (!subcategory) return 'Bearbeitungszeit (Tage) *';
      
      const mainCategory = findCategoryBySubcategory(subcategory);
      switch (mainCategory) {
        case 'Handwerk':
          return 'Ausführungszeit (Werktage) *';
        case 'Transport':
          return 'Transportdauer (Tage) *';
        case 'IT & Digital':
          return 'Projektdauer (Tage) *';
        case 'Marketing & Vertrieb':
          return 'Kampagnendauer (Tage) *';
        case 'Finanzen & Recht':
          return 'Bearbeitungszeit (Tage) *';
        case 'Event & Veranstaltung':
          return 'Planungszeit (Tage) *';
        case 'Kreativ & Kunst':
          return 'Erstellungszeit (Tage) *';
        case 'Haushalt':
        case 'Wellness':
        case 'Tiere & Pflanzen':
          return 'Terminverfügbarkeit (Tage) *';
        case 'Bildung & Unterstützung':
          return 'Kursdauer (Tage) *';
        case 'Hotel & Gastronomie':
          return 'Planungszeit (Tage) *'; // Zeit für Menüplanung, Einkauf
        default:
          return 'Bearbeitungszeit (Tage) *';
      }
    };

    // Dynamisches Label für Revisionen
    const getRevisionsLabel = (subcategory: string) => {
      if (!subcategory) return 'Zusätzliche Leistungen';
      
      const mainCategory = findCategoryBySubcategory(subcategory);
      switch (mainCategory) {
        case 'Handwerk':
          return 'Nachbesserungen inklusive';
        case 'Transport':
          return 'Zusätzliche Fahrten';
        case 'IT & Digital':
        case 'Kreativ & Kunst':
        case 'Marketing & Vertrieb':
          return 'Revisionen';
        case 'Finanzen & Recht':
          return 'Nachberatungen';
        case 'Event & Veranstaltung':
          return 'Planungsänderungen';
        case 'Haushalt':
          return 'Nacharbeiten inklusive';
        case 'Wellness':
          return 'Zusätzliche Behandlungen'; // Frisör, Massage, etc.
        case 'Tiere & Pflanzen':
          return 'Zusätzliche Besuche';
        case 'Bildung & Unterstützung':
          return 'Wiederholungsstunden';
        case 'Büro & Administration':
          return 'Korrekturrunden';
        case 'Garten':
          return 'Nachpflege-Termine';
        case 'Hotel & Gastronomie':
          return 'Zusätzliche Services'; // z.B. Aperitif, Dessert extra
        default:
          return 'Zusätzliche Leistungen';
      }
    };

    // Funktionen für zusätzliche Services
    const addAdditionalService = () => {
      const newService: AdditionalService = {
        id: `add_${Date.now()}`,
        title: '',
        description: '',
        price: 0,
        deliveryTime: 0,
        active: true
      };
      
      setService({
        ...service,
        additionalServices: [...(service.additionalServices || []), newService]
      });
    };

    // Branchenspezifische Add-on Vorschläge
    const getAddonSuggestions = (subcategory: string) => {
      const mainCategory = findCategoryBySubcategory(subcategory);
      
      const suggestions: { [key: string]: AdditionalService[] } = {
        'Handwerk': [
          { id: 'hw1', title: 'Express-Service', description: 'Prioritäre Bearbeitung innerhalb 24h', price: 50, deliveryTime: -2, active: true },
          { id: 'hw2', title: 'Premium-Material', description: 'Hochwertige Materialien verwenden', price: 75, deliveryTime: 0, active: true },
          { id: 'hw3', title: 'Wochenend-Arbeit', description: 'Arbeiten am Wochenende möglich', price: 100, deliveryTime: -1, active: true },
          { id: 'hw4', title: 'Aufräumen inklusive', description: 'Vollständige Reinigung nach der Arbeit', price: 25, deliveryTime: 0, active: true },
          { id: 'hw5', title: 'Zusätzliche Nachbesserung', description: 'Eine weitere Korrektur inklusive', price: 30, deliveryTime: 1, active: true }
        ],
        'IT & Digital': [
          { id: 'it1', title: 'Express-Lieferung', description: 'Projektabschluss in der Hälfte der Zeit', price: 200, deliveryTime: -3, active: true },
          { id: 'it2', title: 'Source Code', description: 'Vollständiger Quellcode inklusive', price: 150, deliveryTime: 0, active: true },
          { id: 'it3', title: 'Live-Demo', description: 'Persönliche Präsentation des Ergebnisses', price: 100, deliveryTime: 1, active: true },
          { id: 'it4', title: 'Zusätzliche Revision', description: 'Eine weitere Überarbeitung', price: 75, deliveryTime: 2, active: true },
          { id: 'it5', title: '24/7 Support', description: '2 Wochen kostenlosen Support', price: 250, deliveryTime: 0, active: true }
        ],
        'Wellness': [
          { id: 'wl1', title: 'Premium-Produkte', description: 'Hochwertige Bio-Produkte verwenden', price: 35, deliveryTime: 0, active: true },
          { id: 'wl2', title: 'Hausbesuch', description: 'Service bei Ihnen zu Hause', price: 50, deliveryTime: 0, active: true },
          { id: 'wl3', title: 'Verlängerte Behandlung', description: '+30 Minuten extra Zeit', price: 25, deliveryTime: 0, active: true },
          { id: 'wl4', title: 'Wochenend-Termin', description: 'Termine am Samstag/Sonntag', price: 40, deliveryTime: 0, active: true },
          { id: 'wl5', title: 'Folgebehandlung', description: 'Kostenlose Nachkontrolle nach 1 Woche', price: 20, deliveryTime: 7, active: true }
        ],
        'Transport': [
          { id: 'tr1', title: 'Express-Transport', description: 'Lieferung am selben Tag', price: 80, deliveryTime: -1, active: true },
          { id: 'tr2', title: 'Zerbrechlich-Handling', description: 'Spezielle Behandlung für empfindliche Güter', price: 45, deliveryTime: 0, active: true },
          { id: 'tr3', title: 'Wochenend-Lieferung', description: 'Lieferung auch samstags/sonntags', price: 60, deliveryTime: 0, active: true },
          { id: 'tr4', title: 'Zusätzlicher Stopp', description: 'Ein weiterer Abhol-/Lieferort', price: 35, deliveryTime: 0, active: true },
          { id: 'tr5', title: 'Wartezeit inklusive', description: 'Bis zu 30 Min Wartezeit ohne Aufpreis', price: 25, deliveryTime: 0, active: true }
        ],
        'Hotel & Gastronomie': [
          { id: 'hg1', title: 'Aperitif', description: 'Begrüßungsgetränk für alle Gäste', price: 45, deliveryTime: 0, active: true },
          { id: 'hg2', title: 'Weinbegleitung', description: 'Passende Weine zu jedem Gang', price: 80, deliveryTime: 0, active: true },
          { id: 'hg3', title: 'Extra Gang', description: 'Zusätzlicher Zwischengang', price: 35, deliveryTime: 0, active: true },
          { id: 'hg4', title: 'Vegetarisches Menü', description: 'Alternative für Vegetarier', price: 25, deliveryTime: 0, active: true },
          { id: 'hg5', title: 'Service-Personal', description: 'Professionelle Bedienung inklusive', price: 120, deliveryTime: 0, active: true }
        ],
        'Kreativ & Kunst': [
          { id: 'ka1', title: 'Express-Bearbeitung', description: 'Fertigstellung in der Hälfte der Zeit', price: 150, deliveryTime: -3, active: true },
          { id: 'ka2', title: 'Zusätzliche Variante', description: 'Eine weitere Design-Option', price: 100, deliveryTime: 2, active: true },
          { id: 'ka3', title: 'Hochauflösende Dateien', description: 'Print-ready Qualität inklusive', price: 50, deliveryTime: 0, active: true },
          { id: 'ka4', title: 'Social Media Formate', description: 'Anpassung für Instagram, Facebook etc.', price: 75, deliveryTime: 1, active: true },
          { id: 'ka5', title: 'Unlimited Revisionen', description: 'Unbegrenzte Korrekturen', price: 200, deliveryTime: 0, active: true }
        ]
      };

      return suggestions[mainCategory || 'Default'] || [];
    };

    const addSuggestedAddon = (suggestion: AdditionalService) => {
      const newAddon = {
        ...suggestion,
        id: `add_${Date.now()}_${suggestion.id}`
      };
      
      setService({
        ...service,
        additionalServices: [...(service.additionalServices || []), newAddon]
      });
    };

    // Gemini AI Add-on Generator
    const [aiDescription, setAiDescription] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<AdditionalService[]>([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [showAiConfirm, setShowAiConfirm] = useState<AdditionalService | null>(null);

    const generateAiAddons = async () => {
      if (!aiDescription.trim()) {
        toast.error('Bitte beschreiben Sie Ihre Tätigkeit');
        return;
      }

      setIsGeneratingAI(true);
      try {
        // Gemini AI Integration
        const suggestions = await generateAddonSuggestions(aiDescription, service.subcategory);
        setAiSuggestions(suggestions);
        toast.success('KI hat 2 Add-on Vorschläge erstellt');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        
        // Show user-friendly error messages
        if (errorMessage.includes('überlastet') || errorMessage.includes('overloaded')) {
          toast.error('KI-Service ist überlastet. Bitte versuchen Sie es in 1-2 Minuten erneut.');
        } else if (errorMessage.includes('rate limit')) {
          toast.error('Zu viele Anfragen. Bitte warten Sie einen Moment.');
        } else {
          toast.error(`KI-Fehler: ${errorMessage}`);
        }
        
        console.error('AI Generation Error:', error);
      } finally {
        setIsGeneratingAI(false);
      }
    };

    const handleAiCardClick = (suggestion: AdditionalService) => {
      setShowAiConfirm(suggestion);
    };

    const confirmAiAddon = () => {
      if (showAiConfirm) {
        addSuggestedAddon(showAiConfirm);
        setShowAiConfirm(null);
        toast.success(`Add-on "${showAiConfirm.title}" hinzugefügt`);
      }
    };

    const updateAdditionalService = (index: number, field: keyof AdditionalService, value: any) => {
      if (!service.additionalServices) return;
      
      const updated = [...service.additionalServices];
      updated[index] = { ...updated[index], [field]: value };
      
      setService({
        ...service,
        additionalServices: updated
      });
    };

    const removeAdditionalService = (index: number) => {
      if (!service.additionalServices) return;
      
      const updated = service.additionalServices.filter((_, i) => i !== index);
      setService({
        ...service,
        additionalServices: updated
      });
    };

    return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Service-Titel *</Label>
          <Input
            id="title"
            value={service.title}
            onChange={(e) => setService({ ...service, title: e.target.value })}
            placeholder="z.B. Professionelle Website-Entwicklung"
            className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          />
        </div>
        <div>
          <Label htmlFor="subcategory">Kategorie</Label>
          <select
            id="subcategory"
            value={service.subcategory}
            onChange={(e) => {
              const newSubcategory = e.target.value;
              const updatedPackages = applyPackageTemplate(newSubcategory);
              setService({ 
                ...service, 
                subcategory: newSubcategory,
                packages: updatedPackages
              });
              toast.success(`Package-Templates für ${findCategoryBySubcategory(newSubcategory)} wurden angewendet!`);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          >
            {[...new Set(allowedSubcategories)].map((cat, index) => (
              <option key={`${cat}-${index}`} value={cat}>{cat}</option>
            ))}
          </select>
          {service.subcategory && (
            <p className="text-sm text-gray-600 mt-1">
              Templates für <strong>{findCategoryBySubcategory(service.subcategory)}</strong> aktiv
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Service-Beschreibung *</Label>
        <Textarea
          id="description"
          value={service.description}
          onChange={(e) => setService({ ...service, description: e.target.value })}
          placeholder="Detaillierte Beschreibung Ihrer Dienstleistung..."
          rows={3}
          className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
        />
      </div>

      {/* Package Configuration */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Package className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Pakete konfigurieren
          </h3>
          {service.subcategory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const updatedPackages = applyPackageTemplate(service.subcategory);
                setService({ 
                  ...service, 
                  packages: updatedPackages
                });
                toast.success(`Templates für ${findCategoryBySubcategory(service.subcategory)} wurden neu angewendet!`);
              }}
              className="text-xs"
            >
              Templates aktualisieren
            </Button>
          )}
        </div>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger 
              value="basic" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#14ad9f] data-[state=active]:shadow-sm font-medium transition-all"
            >
              Basic
            </TabsTrigger>
            <TabsTrigger 
              value="standard" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#14ad9f] data-[state=active]:shadow-sm font-medium transition-all"
            >
              Standard
            </TabsTrigger>
            <TabsTrigger 
              value="premium" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#14ad9f] data-[state=active]:shadow-sm font-medium transition-all"
            >
              Premium
            </TabsTrigger>
          </TabsList>

          {(['basic', 'standard', 'premium'] as const).map((packageName) => (
            <TabsContent key={packageName} value={packageName} className="space-y-4">
              <div className={`p-6 rounded-lg border-2 ${getPackageColor(packageName)}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg capitalize">{packageName} Paket</h4>
                  <Switch
                    checked={service.packages[packageName].active}
                    onCheckedChange={(checked) => updatePackage(packageName, 'active', checked)}
                  />
                </div>

                {service.packages[packageName].active && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Preis (€) *</Label>
                        <Input
                          type="number"
                          value={service.packages[packageName].price || ''}
                          onChange={(e) => updatePackage(packageName, 'price', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label>{getDeliveryTimeLabel(service.subcategory)}</Label>
                        <Input
                          type="number"
                          value={service.packages[packageName].deliveryTime || ''}
                          onChange={(e) => updatePackage(packageName, 'deliveryTime', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label>{getRevisionsLabel(service.subcategory)}</Label>
                        <Input
                          type="number"
                          value={service.packages[packageName].revisions || ''}
                          onChange={(e) => updatePackage(packageName, 'revisions', Number(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Paket-Beschreibung *</Label>
                      <Textarea
                        value={service.packages[packageName].description}
                        onChange={(e) => updatePackage(packageName, 'description', e.target.value)}
                        placeholder="Was ist in diesem Paket enthalten?"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Features</Label>
                      <div className="space-y-2">
                        {service.packages[packageName].features.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => updateFeature(packageName, index, e.target.value)}
                              placeholder="Feature beschreiben..."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeFeature(packageName, index)}
                              disabled={service.packages[packageName].features.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFeature(packageName)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Feature hinzufügen
                        </Button>
                      </div>
                    </div>

                    {/* Add-ons für dieses Paket */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Zusätzliche Services (Add-ons)
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={addAdditionalService}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={(service.additionalServices?.length || 0) >= 5}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Eigenes Add-on
                          </Button>
                        </div>
                      </div>

                      {/* KI-Generator */}
                      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-gray-800">KI Add-on Generator</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-gray-600">Beschreiben Sie Ihre Tätigkeit:</Label>
                            <Textarea
                              value={aiDescription}
                              onChange={(e) => setAiDescription(e.target.value)}
                              placeholder="z.B. &quot;Ich bin Friseur und mache Haarschnitte, Färbungen und Styling für Männer und Frauen...&quot;"
                              rows={2}
                              className="text-sm mt-1"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={generateAiAddons}
                            disabled={isGeneratingAI || !aiDescription.trim()}
                            size="sm"
                            className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                          >
                            {isGeneratingAI ? 'Generiere...' : 'KI Vorschläge erstellen'}
                          </Button>
                        </div>

                        {/* KI Vorschläge */}
                        {aiSuggestions.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <div className="text-xs font-medium text-gray-700">KI Vorschläge (klicken zum Auswählen):</div>
                            <div className="grid grid-cols-2 gap-2">
                              {aiSuggestions.map((suggestion, index) => (
                                <div
                                  key={suggestion.id}
                                  onClick={() => handleAiCardClick(suggestion)}
                                  className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-[#14ad9f] hover:shadow-md transition-all"
                                >
                                  <div className="text-sm font-medium text-gray-800">
                                    Option {index + 1}: {suggestion.title}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">{suggestion.description}</div>
                                  <div className="text-sm font-bold text-[#14ad9f] mt-1">+{suggestion.price}€</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* KI Bestätigungs-Dialog */}
                      {showAiConfirm && (
                        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50">
                          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
                            <h3 className="text-lg font-semibold mb-3">Add-on hinzufügen?</h3>
                            <div className="mb-4 p-3 bg-gray-50 rounded">
                              <div className="font-medium">{showAiConfirm.title}</div>
                              <div className="text-sm text-gray-600">{showAiConfirm.description}</div>
                              <div className="text-lg font-bold text-[#14ad9f]">+{showAiConfirm.price}€</div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={confirmAiAddon}
                                className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
                              >
                                Ja, hinzufügen
                              </Button>
                              <Button
                                onClick={() => setShowAiConfirm(null)}
                                variant="outline"
                                className="flex-1"
                              >
                                Abbrechen
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Add-ons Liste */}
                      {service.additionalServices && service.additionalServices.length > 0 ? (
                        <div className="space-y-3">
                          {service.additionalServices.map((addon, index) => (
                            <div key={addon.id} className="border rounded-lg p-3 bg-white">
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant="secondary" className="bg-[#14ad9f] text-white text-xs">
                                  Add-on #{index + 1}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeAdditionalService(index)}
                                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                  <Label htmlFor={`add-title-${index}`} className="text-xs">Service-Titel</Label>
                                  <Input
                                    id={`add-title-${index}`}
                                    value={addon.title}
                                    onChange={(e) => updateAdditionalService(index, 'title', e.target.value)}
                                    placeholder="z.B. Express-Lieferung..."
                                    className="text-sm h-8"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <Label htmlFor={`add-price-${index}`} className="text-xs">Preis (€)</Label>
                                    <Input
                                      id={`add-price-${index}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={addon.price}
                                      onChange={(e) => updateAdditionalService(index, 'price', parseFloat(e.target.value) || 0)}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor={`add-time-${index}`} className="text-xs">+Tage</Label>
                                    <Input
                                      id={`add-time-${index}`}
                                      type="number"
                                      min="0"
                                      value={addon.deliveryTime || 0}
                                      onChange={(e) => updateAdditionalService(index, 'deliveryTime', parseInt(e.target.value) || 0)}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor={`add-desc-${index}`} className="text-xs">Beschreibung</Label>
                                <Textarea
                                  id={`add-desc-${index}`}
                                  value={addon.description}
                                  onChange={(e) => updateAdditionalService(index, 'description', e.target.value)}
                                  placeholder="Beschreiben Sie den zusätzlichen Service..."
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                          <Star className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                          <p className="text-sm">Keine Add-ons erstellt</p>
                          <p className="text-xs text-gray-400">Klicken Sie "Add-on hinzufügen"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
    );
  };

  // Init
  useEffect(() => {
    const uid = window.location.pathname.split('/')[3];
    if (uid) {
      loadServicesFromDatabase(uid);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
          <p className="mt-2 text-gray-600">Services werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Services verwalten</TabsTrigger>
          <TabsTrigger value="create">Service erstellen</TabsTrigger>
        </TabsList>

        {/* Tab Content: Services verwalten */}
        <TabsContent value="manage" className="space-y-6">
          {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Services durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                {filterStatus === 'all' ? 'Alle' : filterStatus === 'active' ? 'Aktiv' : 'Inaktiv'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                Alle Services
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                Nur aktive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>
                Nur inaktive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Services Table */}
      {filteredServices.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Kategorie</TableHead>
                  <TableHead className="font-semibold">Pakete</TableHead>
                  <TableHead className="font-semibold">Add-ons</TableHead>
                  <TableHead className="font-semibold">Preisbereich</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Performance</TableHead>
                  <TableHead className="font-semibold text-center">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{service.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{service.description}</div>
                          {service.featured && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">{service.subcategory}</Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        {Object.entries(service.packages)
                          .filter(([_, pkg]) => pkg.active)
                          .map(([name, pkg]) => (
                            <div key={name} className={`px-2 py-1 rounded text-xs ${getPackageColor(name)}`}>
                              {name}
                            </div>
                          ))}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {service.additionalServices && service.additionalServices.length > 0 ? (
                          service.additionalServices
                            .filter(addon => addon.active)
                            .slice(0, 3)
                            .map((addon, index) => (
                              <Badge 
                                key={addon.id} 
                                variant="outline" 
                                className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20"
                              >
                                {addon.title}
                              </Badge>
                            ))
                        ) : (
                          <span className="text-gray-400 text-sm">Keine Add-ons</span>
                        )}
                        {service.additionalServices && service.additionalServices.filter(addon => addon.active).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{service.additionalServices.filter(addon => addon.active).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">{formatPrice(service)}</div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${service.active ? 'bg-[#14ad9f]' : 'bg-gray-400'}`}></div>
                        <span className={`text-sm ${service.active ? 'text-[#14ad9f]' : 'text-gray-500'}`}>
                          {service.active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{service.totalOrders || 0} Bestellungen</div>
                        <div className="text-gray-500">€{(service.revenue || 0).toLocaleString()} Umsatz</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedService(service);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => toggleServiceStatus(service.id)}
                            >
                              {service.active ? 'Deaktivieren' : 'Aktivieren'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteService(service.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      ) : (
        <div className="text-center py-16">
          <div className="p-6 bg-gray-50 rounded-full mb-4 mx-auto w-fit">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterStatus !== 'all' ? 'Keine Services gefunden' : 'Noch keine Services vorhanden'}
          </h3>
          <p className="text-gray-600 text-center mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all' 
              ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
              : 'Erstellen Sie Ihren ersten Service, um Kunden Ihre Dienstleistungen anzubieten.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ersten Service erstellen
            </Button>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details und Pakete Ihres Services
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <>
              <ServiceFormFields 
                service={selectedService} 
                setService={setSelectedService} 
              />
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={updateService}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Änderungen speichern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedService(null);
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

        </TabsContent>

        {/* Tab Content: Service erstellen */}
        <TabsContent value="create" className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Neuen Service erstellen</h3>
            <p className="text-gray-600 mb-6">Erstellen Sie einen neuen Service mit konfigurierbaren Paketen</p>
            
            <ServiceFormFields service={newService} setService={setNewService} />
            
            <div className="flex gap-2 pt-4 border-t mt-6">
              <Button
                onClick={addService}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Service erstellen
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Reset form and switch to manage tab
                    setNewService({
                      id: '',
                      title: '',
                      description: '',
                      subcategory: allowedSubcategories[0] || '',
                      packages: {
                        basic: { 
                          name: 'basic',
                          title: 'Basic',
                          price: 0, 
                          deliveryTime: 3, 
                          features: ['Grundlegende Funktionen'], 
                          revisions: 1, 
                          active: true, 
                          description: '' 
                        },
                        standard: { 
                          name: 'standard',
                          title: 'Standard',
                          price: 0, 
                          deliveryTime: 5, 
                          features: ['Erweiterte Funktionen'], 
                          revisions: 2, 
                          active: false, 
                          description: '' 
                        },
                        premium: { 
                          name: 'premium',
                          title: 'Premium',
                          price: 0, 
                          deliveryTime: 7, 
                          features: ['Premium Funktionen'], 
                          revisions: 3, 
                          active: false, 
                          description: '' 
                        }
                      },
                      additionalServices: [],
                      active: true,
                      featured: false,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    });
                }}
              >
                Zurücksetzen
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Service bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie die Service-Details und Pakete
              </DialogDescription>
            </DialogHeader>
            
            {selectedService && (
              <>
                <ServiceFormFields service={selectedService} setService={setSelectedService} />
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={updateService}
                    className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Änderungen speichern
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setSelectedService(null);
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
};

export default ServicesForm;