'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronDown, ChevronRight, Search, MapPin, Mail, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/firebase/clients';
import { collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// --- Data Structures ---

const JOB_GROUPS = [
  {
    id: '180',
    label: 'Administration / Verwaltung',
    children: [
      {
        id: '72',
        label: 'Einkauf / Lager',
        children: [
          { id: '73', label: 'Einkauf' },
          { id: '128', label: 'Lagerhaltung / Warenannahme' },
        ],
      },
      {
        id: '59',
        label: 'Finanzen / Personal / Verwaltung',
        children: [
          { id: '167', label: 'Ausbildung / Praktikum (Finanzen / Personal / Verwaltung)' },
          { id: '62', label: 'Buchhaltung' },
          { id: '66', label: 'Controlling' },
          { id: '69', label: 'Finanzen & Analyse' },
          { id: '173', label: 'Leitung (Finanzen / Personal / Verwaltung)' },
          { id: '76', label: 'Personalwesen / Personalmanagement' },
          { id: '77', label: 'Training / Personalentwicklung' },
          { id: '174', label: 'Verwaltung / Büro' },
          { id: '156', label: 'weitere: Finanzen / Personal / Verwaltung' },
        ],
      },
      {
        id: '83',
        label: 'Geschäftsführung / Management',
        children: [
            { id: '93', label: 'Assistenz / Sekretariat' },
            { id: '88', label: 'Betriebsleitung' },
            { id: '91', label: 'F&B Management' },
            { id: '84', label: 'Geschäftsführung' },
            { id: '89', label: 'Hoteldirektion / Regionaldirektion' },
            { id: '86', label: 'Pacht / Franchise' },
            { id: '157', label: 'weitere: Geschäftsführung / Management' },
        ]
      },
      {
        id: '109',
        label: 'Marketing',
        children: [
            { id: '169', label: 'Ausbildung / Praktikum (Marketing)' },
            { id: '110', label: 'Marketing' },
            { id: '111', label: 'Öffentlichkeitsarbeit' },
            { id: '112', label: 'Online Marketing' },
            { id: '82', label: 'Produkt- / Qualitätsmanagement' },
            { id: '81', label: 'Projektentwicklung' },
            { id: '172', label: 'weitere: Marketing' },
        ]
      },
      {
        id: '116',
        label: 'Reiseverkehr / Touristik',
        children: [
            { id: '115', label: 'Airlinehandling' },
            { id: '170', label: 'Ausbildung / Praktikum (Reiseverkehr / Touristik)' },
            { id: '114', label: 'Flugbegleitung' },
            { id: '117', label: 'Reiseleitung' },
            { id: '118', label: 'Reiseverkehr' },
            { id: '158', label: 'weitere: Reiseverkehr / Touristik' },
        ]
      },
      {
        id: '97',
        label: 'Vertrieb / Verkauf',
        children: [
            { id: '177', label: 'Assistenz (Vertrieb / Verkauf)' },
            { id: '168', label: 'Ausbildung / Praktikum (Vertrieb / Verkauf)' },
            { id: '175', label: 'Kundenservice' },
            { id: '176', label: 'Leitung (Vertrieb / Verkauf)' },
            { id: '107', label: 'Promotion & Marketing' },
            { id: '105', label: 'Telesales / -marketing' },
            { id: '106', label: 'Veranstaltungsverkauf' },
            { id: '102', label: 'Verkauf' },
            { id: '108', label: 'Verkauf / Kasse / Handel' },
            { id: '160', label: 'weitere: Vertrieb / Verkauf' },
        ]
      }
    ],
  },
  {
    id: '181',
    label: 'Ausbildung / Praktikum / Trainee',
    children: [
        {
            id: '2',
            label: 'Ausbildung',
            children: [
                { id: '3', label: 'Ausbildung (System) Gastronomie' },
                { id: '11', label: 'Ausbildung Büro / Verwaltung / Personal' },
                { id: '7', label: 'Ausbildung Hotellerie' },
                { id: '6', label: 'Ausbildung Touristik' },
                { id: '9', label: 'Ausbildung Veranstaltung / Event' },
                { id: '12', label: 'Ausbildung Verkauf / Marketing' },
                { id: '10', label: 'Sonstige Ausbildungsplätze' },
            ]
        },
        {
            id: '14',
            label: 'Praktikum / Trainee',
            children: [
                { id: '18', label: 'Praktikum / Trainee Büro / Verwaltung / Personal' },
                { id: '16', label: 'Praktikum / Trainee Gastronomie' },
                { id: '15', label: 'Praktikum / Trainee Hotellerie' },
                { id: '17', label: 'Praktikum / Trainee Reiseverkehr / Touristik' },
                { id: '22', label: 'Praktikum / Trainee Technik / EDV / Programmierung' },
                { id: '19', label: 'Praktikum / Trainee Veranstaltung / Event' },
                { id: '20', label: 'Praktikum / Trainee Verkauf / Marketing' },
                { id: '23', label: 'Praktikum / Trainee Wellness / Beauty' },
                { id: '24', label: 'weitere: Praktikum / Trainee' },
            ]
        }
    ]
  },
  {
    id: '178',
    label: 'Food & Beverage',
    children: [
        { id: '47', label: 'Bar / Theke' },
        { id: '58', label: 'Fleischerei' },
        { id: '57', label: 'Konditorei / Bäckerei' },
        {
            id: '49',
            label: 'Küche',
            children: [
                { id: '165', label: 'Ausbildung / Praktikum (Küche)' },
                { id: '51', label: 'Chef de Partie / Supervisor' },
                { id: '52', label: 'Commis / Demi / Jungkoch' },
                { id: '53', label: 'Küchenhilfe' },
                { id: '50', label: 'Küchenleitung' },
                { id: '54', label: 'Spezialitätenköche' },
                { id: '155', label: 'weitere: Küche' },
            ]
        },
        { id: '125', label: 'Logistik / Fahrer' },
        {
            id: '34',
            label: 'Restaurant / Service',
            children: [
                { id: '161', label: 'Assistenz / stellv. Leitung' },
                { id: '163', label: 'Ausbildung / Praktikum (Restaurant / Service)' },
                { id: '36', label: 'Leitung (Restaurant / Service)' },
                { id: '38', label: 'Oberkellner / Supervisor' },
                { id: '39', label: 'Service (Restaurant)' },
                { id: '40', label: 'Sommelier' },
                { id: '153', label: 'weitere: Restaurant / Service' },
            ]
        },
        { id: '126', label: 'Stewarding / Spülküche' },
        {
            id: '42',
            label: 'Veranstaltung / Bankett',
            children: [
                { id: '164', label: 'Ausbildung / Praktikum (Veranstaltung / Bankett)' },
                { id: '46', label: 'Küchenausgabe' },
                { id: '43', label: 'Leitung (Veranstaltung / Bankett)' },
                { id: '44', label: 'Organisation / Assistenz' },
                { id: '45', label: 'Service (Veranstaltung / Bankett)' },
                { id: '154', label: 'weitere: Veranstaltung / Bankett' },
            ]
        }
    ]
  },
  {
    id: '179',
    label: 'Rooms & weiteres',
    children: [
        {
            id: '141',
            label: 'Empfang / Reservierung',
            children: [
                { id: '166', label: 'Ausbildung / Praktikum (Empfang / Reservierung)' },
                { id: '143', label: 'Empfang / Rezeption' },
                { id: '142', label: 'Front Office / Rooms Division' },
                { id: '149', label: 'Guest Relation / Kundenbetreuung' },
                { id: '147', label: 'Reservierung' },
                { id: '148', label: 'Revenue- und Yieldmanagement' },
                { id: '159', label: 'weitere: Empfang / Reservierung' },
            ]
        },
        {
            id: '137',
            label: 'Handwerk / Technik',
            children: [
                { id: '171', label: 'Ausbildung / Praktikum (Handwerk / Technik)' },
                { id: '139', label: 'Hausmeister / Facility Management' },
                { id: '136', label: 'IT / EDV' },
                { id: '138', label: 'Technik' },
                { id: '129', label: 'weitere: Handwerk / Technik' },
            ]
        },
        { id: '123', label: 'Housekeeping / Reinigung / Hauswirtschaft' },
        {
            id: '25',
            label: 'Wellness / Gesundheit / Unterhaltung',
            children: [
                { id: '32', label: 'Animation / Unterhaltung / Musik' },
                { id: '162', label: 'Ausbildung / Praktikum (Wellness / Gesundheit / Unterhaltung)' },
                { id: '33', label: 'Kinder- und Jugendbetreuung' },
                { id: '27', label: 'Medizinische / Therapeutische Berufe' },
                { id: '31', label: 'Sport / Fitness' },
                { id: '152', label: 'weitere: Wellness / Gesundheit / Unterhaltung' },
                { id: '26', label: 'Wellness / Beauty' },
            ]
        }
    ]
  }
];

const INDUSTRIES = [
  { id: '11', label: 'Autovermietung' },
  { id: '32', label: 'Banken / Versicherungen / Immobilien' },
  { id: '13', label: 'Bars / Bäckerei / Café / Bistro / Disko / Kneipe' },
  { id: '15', label: 'Catering / Großverpflegung' },
  { id: '14', label: 'Catering Event / Partyservice' },
  { id: '10', label: 'Day Spa / Fitness / Freizeitbad' },
  { id: '30', label: 'Dienstleistung' },
  { id: '26', label: 'Ferien- / Freizeitparks' },
  { id: '2', label: 'Ferienclubs' },
  { id: '34', label: 'Ferienhof / Gasthof / Pension' },
  { id: '5', label: 'Gastronomie' },
  { id: '1', label: 'Hotellerie' },
  { id: '4', label: 'Industrie / Dienstleistung' },
  { id: '35', label: 'Internet / IT / Telekommunikation' },
  { id: '33', label: 'Jugendherberge / Hostel / Camping' },
  { id: '31', label: 'Kanzlei / Beratung / Agentur' },
  { id: '8', label: 'Kliniken / Praxen / Seniorenheime' },
  { id: '38', label: 'Kochschulen' },
  { id: '3', label: 'Kreuzfahrtschiffe / Schifffahrt / Reedereien' },
  { id: '36', label: 'Messe / Konferenz / Seminarveranstalter' },
  { id: '28', label: 'Personaldienstleister / Personalvermittler' },
  { id: '6', label: 'Privathaushalt / Botschaft / Konsulat' },
  { id: '16', label: 'Restaurants', children: [
      { id: '37', label: 'Gourmetrestaurants' },
      { id: '13_sub', label: 'Restaurants' }
  ] },
  { id: '27', label: 'Schulen (Berufs-, Hoch- und Fachschulen) / Institute' },
  { id: '12', label: 'Soziale Einrichtungen' },
  { id: '29', label: 'Stadthallen / Theater / Kultureinrichtungen' },
  { id: '17', label: 'Systemgastronomie' },
  { id: '7', label: 'Touristik', children: [
      { id: '6_sub', label: 'Airlines / Flughafen' },
      { id: '21', label: 'Firmenreisedienste' },
      { id: '22', label: 'Fremdenverkehrsämter' },
      { id: '23', label: 'Incoming Agentur' },
      { id: '11_sub', label: 'Internet Portale / Buchungssysteme' },
      { id: '12_sub', label: 'Reisebüro / Reisevermittler' },
      { id: '24', label: 'Reiseveranstalter' },
      { id: '18', label: 'Touristik' },
      { id: '25', label: 'Verbände / Organisationen' },
  ] },
  { id: '9', label: 'Zulieferer / Handel' },
];

const EMPLOYMENT_TYPES = [
  { id: '1', label: 'Vollzeit' },
  { id: '4', label: 'Teilzeit' },
  { id: '6', label: 'Aushilfe' },
  { id: '2', label: 'Ausbildung' },
  { id: '5', label: 'Trainee / Praktikum' },
  { id: '7', label: 'Freiberuflich / Selbständig' },
  { id: '3', label: 'Zeit- / Saisonvertrag' },
];

const LANGUAGES = [
  { id: '0', label: 'Keine Auswahl' },
  { id: '1', label: 'Deutsch' },
  { id: '2', label: 'Englisch' },
  { id: '3', label: 'Französisch' },
  { id: '10', label: 'Italienisch' },
  { id: '13', label: 'Niederländisch' },
  { id: '15', label: 'Polnisch' },
  { id: '16', label: 'Portugiesisch' },
  { id: '20', label: 'Spanisch' },
];

const CATEGORIES = [
  { id: '1', label: '1*' },
  { id: '2', label: '2*' },
  { id: '3', label: '3*' },
  { id: '4', label: '4*' },
  { id: '5', label: '5*' },
];

const MICHELIN = [
  { id: '1', label: '1*' },
  { id: '2', label: '2*' },
  { id: '3', label: '3*' },
];

const GAULT_MILLAU = [
  { id: '7', label: '15 Punkte' },
  { id: '8', label: '15,5 Punkte' },
  { id: '9', label: '16 Punkte' },
  { id: '10', label: '16,5 Punkte' },
  { id: '11', label: '17 Punkte' },
  { id: '12', label: '17,5 Punkte' },
  { id: '13', label: '18 Punkte' },
  { id: '14', label: '18,5 Punkte' },
  { id: '15', label: '19 Punkte' },
  { id: '16', label: '19,5 Punkte' },
  { id: '17', label: '20 Punkte' },
];

const RANKS = [
  { id: '1', label: 'Führungskraft' },
  { id: '2', label: 'Fachkraft' },
  { id: '3', label: 'Ausbildung' },
];

// --- Schema ---

const jobfinderSchema = z.object({
  jobGroups: z.array(z.string()),
  location: z.string().min(2, 'Bitte geben Sie einen Ort ein'),
  radius: z.string(),
  searchPhrase: z.string().optional(),
  industries: z.array(z.string()),
  categories: z.array(z.string()),
  michelin: z.array(z.string()),
  gaultMillau: z.array(z.string()),
  ranks: z.array(z.string()),
  employment: z.array(z.string()),
  language: z.string().optional(),
  email: z.string().email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
});

interface JobfinderFormValues {
  jobGroups: string[];
  location: string;
  radius: string;
  searchPhrase?: string;
  industries: string[];
  categories: string[];
  michelin: string[];
  gaultMillau: string[];
  ranks: string[];
  employment: string[];
  language?: string;
  email: string;
}

// --- Components ---

const CheckboxTreeItem = ({ item, register, watch, setValue, fieldName = 'jobGroups' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedGroups = watch(fieldName) || [];
  const isChecked = selectedGroups.includes(item.id);

  const handleCheck = (checked: boolean) => {
    let newGroups = [...selectedGroups];
    if (checked) {
      newGroups.push(item.id);
    } else {
      newGroups = newGroups.filter((id: string) => id !== item.id);
    }
    setValue(fieldName, newGroups);
  };

  return (
    <li className="my-1">
      <div className="flex items-center gap-2">
        <Checkbox 
          id={`${fieldName}-${item.id}`} 
          checked={isChecked}
          onCheckedChange={handleCheck}
        />
        <label 
          htmlFor={`${fieldName}-${item.id}`} 
          className="text-sm text-gray-700 cursor-pointer hover:text-[#14ad9f] transition-colors"
        >
          {item.label}
        </label>
        {item.children && (
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
      {item.children && isOpen && (
        <ul className="ml-6 mt-1 border-l border-gray-200 pl-2">
          {item.children.map((child: any) => (
            <CheckboxTreeItem 
              key={child.id} 
              item={child} 
              register={register} 
              watch={watch} 
              setValue={setValue} 
              fieldName={fieldName}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const JobfinderForm = ({ userEmail, userId }: { userEmail?: string, userId?: string }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JobfinderFormValues>({
    resolver: zodResolver(jobfinderSchema),
    defaultValues: {
      jobGroups: [],
      location: 'Berlin',
      radius: '20',
      industries: [],
      categories: [],
      michelin: [],
      gaultMillau: [],
      ranks: [],
      employment: [],
      language: '1', // Default to Deutsch
      searchPhrase: '',
      email: userEmail || '',
    },
  });

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'users', userId, 'preferences', 'jobboard');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as JobfinderFormValues;
          // Ensure email is set, fallback to userEmail if not in saved prefs
          if (!data.email && userEmail) {
            data.email = userEmail;
          }
          form.reset(data);
        } else if (userEmail) {
           form.setValue('email', userEmail);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, [userId, form, userEmail]);

  // Helper to find label by ID (recursive)
  const findLabel = (id: string, groups: any[]): string | null => {
    for (const group of groups) {
      if (group.id === id) return group.label;
      if (group.children) {
        const found = findLabel(id, group.children);
        if (found) return found;
      }
    }
    return null;
  };

  const watchedJobGroups = form.watch('jobGroups') || [];
  const watchedLocation = form.watch('location');
  
  const selectedLabels = watchedJobGroups
    .map(id => findLabel(id, JOB_GROUPS))
    .filter(Boolean)
    .slice(0, 3) // Show max 3
    .join(', ');
  
  const moreCount = Math.max(0, watchedJobGroups.length - 3);

  const onSubmit = async (data: JobfinderFormValues) => {
    if (!userId) {
      toast.error('Du musst eingeloggt sein, um einen Jobfinder zu erstellen.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save to history (Jobfinder collection)
      await addDoc(collection(db, 'users', userId, 'jobfinder'), {
        ...data,
        createdAt: serverTimestamp(),
        active: true
      });

      // 2. Update active preferences for JobBoard
      await setDoc(doc(db, 'users', userId, 'preferences', 'jobboard'), {
        ...data,
        updatedAt: serverTimestamp()
      });

      toast.success('Jobfinder erfolgreich gespeichert und Filter angewendet!');
    } catch (error) {
      console.error('Error saving jobfinder:', error);
      toast.error('Fehler beim Speichern des Jobfinders.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      
      {/* Current Search Info Box */}
      <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 text-sm text-teal-900">
        <p className="font-semibold mb-1">Deine aktuelle Suche:</p>
        <p>
          Beruf: <span className="font-medium">
            {selectedLabels || 'Keine Auswahl'}
            {moreCount > 0 && `, +${moreCount} weitere`}
          </span>
        </p>
        <p>Ort: <span className="font-medium">{watchedLocation || 'Kein Ort'}</span></p>
      </div>

      {/* Berufsgruppe Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Berufsgruppe (empfohlen)</h3>
        <ul className="space-y-2">
          {JOB_GROUPS.map((group) => (
            <CheckboxTreeItem 
              key={group.id} 
              item={group} 
              register={form.register} 
              watch={form.watch} 
              setValue={form.setValue} 
              fieldName="jobGroups"
            />
          ))}
        </ul>
      </div>

      {/* Destination Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Destination (Stadt, Region, Land)</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="location">Ort / Region</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                id="location" 
                {...form.register('location')} 
                className="pl-9" 
                placeholder="z.B. Berlin"
              />
            </div>
          </div>
          <div className="w-40 space-y-2">
            <Label htmlFor="radius">Umkreis</Label>
            <Select 
              defaultValue="20" 
              onValueChange={(val) => form.setValue('radius', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Umkreis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">exakt</SelectItem>
                <SelectItem value="20">+ 20 km</SelectItem>
                <SelectItem value="50">+ 50 km</SelectItem>
                <SelectItem value="100">+ 100 km</SelectItem>
                <SelectItem value="150">+ 150 km</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">E-Mail Benachrichtigung</h3>
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail Adresse für Job-Updates</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              id="email"
              {...form.register('email')}
              className="pl-9" 
              placeholder="ihre.email@beispiel.de"
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Wir senden Ihnen passende Job-Angebote an diese E-Mail-Adresse.
          </p>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Advanced Settings Toggle */}
      <div className="flex justify-center">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
        >
          {showAdvanced ? 'Weniger anzeigen' : 'Erweiterte Einstellungen anzeigen'}
          {showAdvanced ? <ChevronDown className="ml-2 h-4 w-4 rotate-180" /> : <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {showAdvanced && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Search Phrase */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Suchbegriff (optional)</h3>
            <p className="text-sm text-gray-500">
              Hinweis: Du kannst entweder mithilfe eines Suchbegriffs oder einer Berufsgruppe suchen. Eine Kombination ist nicht möglich.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                {...form.register('searchPhrase')} 
                className="pl-9" 
                placeholder="Suchbegriff eingeben..."
              />
            </div>
          </div>

          {/* Industries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Branche</h3>
            <ul className="space-y-2">
              {INDUSTRIES.map((item) => (
                <CheckboxTreeItem 
                  key={item.id} 
                  item={item} 
                  register={form.register} 
                  watch={form.watch} 
                  setValue={form.setValue} 
                  fieldName="industries"
                />
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Kategorie</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CATEGORIES.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`cat-${item.id}`}
                    checked={(form.watch('categories') || []).includes(item.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch('categories') || [];
                      if (checked) form.setValue('categories', [...current, item.id]);
                      else form.setValue('categories', current.filter(id => id !== item.id));
                    }}
                  />
                  <label htmlFor={`cat-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Michelin */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Michelin-Sterne</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MICHELIN.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`mich-${item.id}`}
                    checked={(form.watch('michelin') || []).includes(item.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch('michelin') || [];
                      if (checked) form.setValue('michelin', [...current, item.id]);
                      else form.setValue('michelin', current.filter(id => id !== item.id));
                    }}
                  />
                  <label htmlFor={`mich-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Gault Millau */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Gault Millau-Punkte</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {GAULT_MILLAU.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`gm-${item.id}`}
                    checked={(form.watch('gaultMillau') || []).includes(item.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch('gaultMillau') || [];
                      if (checked) form.setValue('gaultMillau', [...current, item.id]);
                      else form.setValue('gaultMillau', current.filter(id => id !== item.id));
                    }}
                  />
                  <label htmlFor={`gm-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Rank */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Rang</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {RANKS.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`rank-${item.id}`}
                    checked={(form.watch('ranks') || []).includes(item.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch('ranks') || [];
                      if (checked) form.setValue('ranks', [...current, item.id]);
                      else form.setValue('ranks', current.filter(id => id !== item.id));
                    }}
                  />
                  <label htmlFor={`rank-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Employment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Anstellung</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {EMPLOYMENT_TYPES.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`emp-${item.id}`}
                    checked={(form.watch('employment') || []).includes(item.id)}
                    onCheckedChange={(checked) => {
                      const current = form.watch('employment') || [];
                      if (checked) form.setValue('employment', [...current, item.id]);
                      else form.setValue('employment', current.filter(id => id !== item.id));
                    }}
                  />
                  <label htmlFor={`emp-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Sprache</h3>
            <RadioGroup 
              onValueChange={(val) => form.setValue('language', val)}
              defaultValue={form.watch('language')}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {LANGUAGES.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <RadioGroupItem value={item.id} id={`lang-${item.id}`} />
                  <label htmlFor={`lang-${item.id}`} className="text-sm text-gray-700">{item.label}</label>
                </div>
              ))}
            </RadioGroup>
          </div>

        </div>
      )}

      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" disabled={isSubmitting} className="bg-[#14ad9f] hover:bg-[#11968a] text-white">
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Speichert...' : 'Jobfinder speichern'}
        </Button>
      </div>
    </form>
  );
};
