'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, AlertTriangle } from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { validateSteuernummer } from 'validate-steuernummer';

interface TaxEstimationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onComplete?: () => void;
}

type FamilyStatus = 'ledig' | 'verheiratet' | 'lebenspartnerschaft' | 'verwitwet' | 'geschieden' | 'getrennt';

interface TaxProfile {
  geburtsdatum?: string;
  familienstand?: FamilyStatus;
  religionsgemeinschaft?: string;
  warAngestellt?: boolean;
  einkommenAngestellt?: number;
  hatKrankenversicherung?: boolean;
  krankenversicherungBetrag?: number;
  hatPrivateKV?: boolean;
  privateKVBetrag?: number;
  hatOptionaleKV?: boolean;
  optionaleKVBetrag?: number;
  hatPflegeversicherung?: boolean;
  pflegeversicherungBetrag?: number;
  hatKrankengeld?: boolean;
  krankengeldBetrag?: number;
  bundesland?: string;
  einkommensteuernummer?: string;
}

const FAMILY_STATUS_OPTIONS: { value: FamilyStatus; label: string }[] = [
  { value: 'ledig', label: 'Ledig' },
  { value: 'verheiratet', label: 'Verheiratet' },
  { value: 'lebenspartnerschaft', label: 'Lebenspartnerschaft' },
  { value: 'verwitwet', label: 'Verwitwet' },
  { value: 'geschieden', label: 'Geschieden' },
  { value: 'getrennt', label: 'Getrennt' },
];

const RELIGIONSGEMEINSCHAFTEN = [
  'Nicht Kirchensteuerpflichtig',
  'Altkatholische',
  'Evangelische',
  'Römisch-katholisch',
  'Evangelische-reformiert',
  'Evangelische-reformiert Kirche Bückeburg',
  'Evangelische-reformiert Kirche Stadthagen',
  'Französisch-reformiert',
  'Freie Religionsgemeinschaft Alzey',
  'Freireligiöse Landesgemeinde Baden',
  'Freireligiöse Landesgemeinde Pfalz',
  'Freireligiöse Gemeinde Mainz',
  'Freireligiöse Gemeinde Offenbach',
  'Israelitische Religionsgemeinschaft Baden',
  'Jüdische Gemeinde im Landesverband Hessen',
  'Landesverband der israelitischen Kultusgemeinden in Bayern',
  'Jüdische Gemeinde Frankfurt (Hessen)',
  'Jüdische Kultusgemeinde Bad Kreuznach und Koblenz',
  'Israelitische (Saarland)',
  'Israelitische Religionsgemeinschaft Württemberg',
  'Nordrhein-Westfalen: Israelitisch (jüdisch)',
  'Jüdische Gemeinde Hamburg',
  'Sonstige',
];

const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

// Steuernummer-Formate je Bundesland (vereinfacht: nur Ziffern, ohne Trennzeichen)
// Format: [Regex-Pattern, Beispiel-Format für Anzeige, erwartete Länge nur Ziffern]
const STEUERNUMMER_FORMATE: Record<string, { pattern: RegExp; beispiel: string; laenge: number }> = {
  'Baden-Württemberg': { pattern: /^\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '12/345/67890', laenge: 10 },
  'Bayern': { pattern: /^\d{3}\/?\d{3}\/?\d{5}$/, beispiel: '123/456/78901', laenge: 11 },
  'Berlin': { pattern: /^\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '12/345/67890', laenge: 10 },
  'Brandenburg': { pattern: /^0?\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '012/345/67890', laenge: 10 },
  'Bremen': { pattern: /^\d{2}\s?\d{3}\s?\d{5}$/, beispiel: '12 345 67890', laenge: 10 },
  'Hamburg': { pattern: /^\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '12/345/67890', laenge: 10 },
  'Hessen': { pattern: /^0?\d{2}\s?\d{3}\s?\d{5}$/, beispiel: '012 345 67890', laenge: 10 },
  'Mecklenburg-Vorpommern': { pattern: /^0?\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '012/345/67890', laenge: 10 },
  'Niedersachsen': { pattern: /^\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '12/345/67890', laenge: 10 },
  'Nordrhein-Westfalen': { pattern: /^\d{3}\/?\d{4}\/?\d{4}$/, beispiel: '123/4567/8901', laenge: 11 },
  'Rheinland-Pfalz': { pattern: /^\d{2}\/?\d{3}\/?\d{4}\/?\d{1}$/, beispiel: '12/345/6789/0', laenge: 10 },
  'Saarland': { pattern: /^0?\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '012/345/67890', laenge: 10 },
  'Sachsen': { pattern: /^2\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '212/345/67890', laenge: 10 },
  'Sachsen-Anhalt': { pattern: /^1\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '112/345/67890', laenge: 10 },
  'Schleswig-Holstein': { pattern: /^\d{2}\s?\d{3}\s?\d{5}$/, beispiel: '12 345 67890', laenge: 10 },
  'Thüringen': { pattern: /^1\d{2}\/?\d{3}\/?\d{5}$/, beispiel: '112/345/67890', laenge: 10 },
};

// Prüfziffer-Validierung nach dem 2-aus-11-Verfahren (Elster)
function validateSteuernummerPruefziffer(steuernummer: string): boolean {
  // Nur Ziffern extrahieren
  const digits = steuernummer.replace(/\D/g, '');
  
  if (digits.length < 10 || digits.length > 13) return false;
  
  // 11er-Prüfzifferverfahren (vereinfacht)
  // Die letzte Ziffer ist die Prüfziffer
  const pruefziffer = parseInt(digits[digits.length - 1], 10);
  const basisZiffern = digits.slice(0, -1);
  
  // Gewichtung: 2, 1, 2, 1, 2, 1... von rechts nach links
  let summe = 0;
  for (let i = 0; i < basisZiffern.length; i++) {
    const ziffer = parseInt(basisZiffern[basisZiffern.length - 1 - i], 10);
    const gewicht = (i % 2 === 0) ? 2 : 1;
    const produkt = ziffer * gewicht;
    // Quersumme bei zweistelligen Zahlen
    summe += produkt > 9 ? Math.floor(produkt / 10) + (produkt % 10) : produkt;
  }
  
  const berechneteP = (10 - (summe % 10)) % 10;
  return berechneteP === pruefziffer;
}

function validateSteuernummerLocal(steuernummer: string, bundesland: string): { valid: boolean; error?: string } {
  if (!steuernummer || !bundesland) {
    return { valid: false, error: 'Bitte gib eine Steuernummer ein' };
  }
  
  const format = STEUERNUMMER_FORMATE[bundesland];
  if (!format) {
    return { valid: false, error: 'Bundesland nicht unterstützt' };
  }
  
  // Nur Ziffern zählen
  const nurZiffern = steuernummer.replace(/\D/g, '');
  
  if (nurZiffern.length < format.laenge) {
    return { valid: false, error: `Die Steuernummer muss mindestens ${format.laenge} Ziffern haben. Format: ${format.beispiel}` };
  }
  
  if (!format.pattern.test(steuernummer)) {
    return { valid: false, error: `Ungültiges Format für ${bundesland}. Beispiel: ${format.beispiel}` };
  }
  
  // Prüfziffer validieren
  if (!validateSteuernummerPruefziffer(steuernummer)) {
    return { valid: false, error: 'Die Prüfziffer der Steuernummer ist ungültig' };
  }
  
  return { valid: true };
}

// Helper: String zu Number konvertieren (deutsches Format)
function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Tausendertrennzeichen (Punkte) entfernen, Komma zu Punkt
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper: Number zu deutschem String formatieren
function formatGermanNumber(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: Live-Formatierung während der Eingabe (nur Ganzzahl-Teil mit Tausendertrennzeichen)
function formatCurrencyInput(value: string): string {
  // Nur Ziffern und Komma behalten
  let cleaned = value.replace(/[^\d,]/g, '');
  
  // Nur ein Komma erlauben
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts[0] + ',' + parts.slice(1).join('');
  }
  
  // Ganzzahl-Teil und Dezimal-Teil trennen
  const [integerPart, decimalPart] = cleaned.split(',');
  
  // Tausendertrennzeichen für Ganzzahl-Teil hinzufügen
  const formattedInteger = integerPart
    ? parseInt(integerPart, 10).toLocaleString('de-DE')
    : '';
  
  // Dezimalstellen auf 2 begrenzen
  if (decimalPart !== undefined) {
    const limitedDecimal = decimalPart.slice(0, 2);
    return formattedInteger + ',' + limitedDecimal;
  }
  
  return formattedInteger;
}

export function TaxEstimationWizard({
  isOpen,
  onClose,
  companyId,
  onComplete,
}: TaxEstimationWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxProfile, setTaxProfile] = useState<TaxProfile>({});

  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [familienstand, setFamilienstand] = useState<FamilyStatus>('ledig');
  const [religionsgemeinschaft, setReligionsgemeinschaft] = useState('Nicht Kirchensteuerpflichtig');
  const [religionSearch, setReligionSearch] = useState('');
  const [warAngestellt, setWarAngestellt] = useState<boolean | null>(null);
  const [einkommenAngestelltInput, setEinkommenAngestelltInput] = useState('');
  const [hatKrankenversicherung, setHatKrankenversicherung] = useState<boolean | null>(null);
  const [krankenversicherungBetragInput, setKrankenversicherungBetragInput] = useState('');
  const [hatPrivateKV, setHatPrivateKV] = useState<boolean | null>(null);
  const [privateKVBetragInput, setPrivateKVBetragInput] = useState('');
  const [hatOptionaleKV, setHatOptionaleKV] = useState<boolean | null>(null);
  const [optionaleKVBetragInput, setOptionaleKVBetragInput] = useState('');
  const [hatPflegeversicherung, setHatPflegeversicherung] = useState<boolean | null>(null);
  const [pflegeversicherungBetragInput, setPflegeversicherungBetragInput] = useState('');
  const [hatKrankengeld, setHatKrankengeld] = useState<boolean | null>(null);
  const [krankengeldBetragInput, setKrankengeldBetragInput] = useState('');
  const [bundesland, setBundesland] = useState('');
  const [bundeslandSearch, setBundeslandSearch] = useState('');
  const [einkommensteuernummer, setEinkommensteuernummer] = useState('');
  const [steuernummerError, setSteuernummerError] = useState('');

  const filteredReligionen = useMemo(() => {
    if (!religionSearch.trim()) return RELIGIONSGEMEINSCHAFTEN;
    const searchLower = religionSearch.toLowerCase();
    return RELIGIONSGEMEINSCHAFTEN.filter(r => 
      r.toLowerCase().includes(searchLower)
    );
  }, [religionSearch]);

  const filteredBundeslaender = useMemo(() => {
    if (!bundeslandSearch.trim()) return BUNDESLAENDER;
    const searchLower = bundeslandSearch.toLowerCase();
    return BUNDESLAENDER.filter(b => 
      b.toLowerCase().includes(searchLower)
    );
  }, [bundeslandSearch]);

  useEffect(() => {
    if (!isOpen || !companyId) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          const profile: TaxProfile = {
            geburtsdatum: data.taxProfile?.geburtsdatum || data.step2?.geburtsdatum || '',
            familienstand: data.taxProfile?.familienstand || 'ledig',
            religionsgemeinschaft: data.taxProfile?.religionsgemeinschaft || 'Nicht Kirchensteuerpflichtig',
          };
          setTaxProfile(profile);
          setGeburtsdatum(profile.geburtsdatum || '');
          setFamilienstand(profile.familienstand || 'ledig');
          setReligionsgemeinschaft(profile.religionsgemeinschaft || 'Nicht Kirchensteuerpflichtig');
          setWarAngestellt(data.taxProfile?.warAngestellt ?? null);
          setEinkommenAngestelltInput(formatGermanNumber(data.taxProfile?.einkommenAngestellt ?? 0));
          setHatKrankenversicherung(data.taxProfile?.hatKrankenversicherung ?? null);
          setKrankenversicherungBetragInput(formatGermanNumber(data.taxProfile?.krankenversicherungBetrag ?? 0));
          setHatPrivateKV(data.taxProfile?.hatPrivateKV ?? null);
          setPrivateKVBetragInput(formatGermanNumber(data.taxProfile?.privateKVBetrag ?? 0));
          setHatOptionaleKV(data.taxProfile?.hatOptionaleKV ?? null);
          setOptionaleKVBetragInput(formatGermanNumber(data.taxProfile?.optionaleKVBetrag ?? 0));
          setHatPflegeversicherung(data.taxProfile?.hatPflegeversicherung ?? null);
          setPflegeversicherungBetragInput(formatGermanNumber(data.taxProfile?.pflegeversicherungBetrag ?? 0));
          setHatKrankengeld(data.taxProfile?.hatKrankengeld ?? null);
          setKrankengeldBetragInput(formatGermanNumber(data.taxProfile?.krankengeldBetrag ?? 0));
          setBundesland(data.taxProfile?.bundesland || '');
          setEinkommensteuernummer(data.taxProfile?.einkommensteuernummer || '');

          if (profile.geburtsdatum) {
            setStep(2);
          } else {
            setStep(1);
          }
        }
      } catch (error) {
        toast.error('Fehler beim Laden des Profils');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, companyId]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const updatedProfile = {
        taxProfile: {
          geburtsdatum,
          familienstand,
          religionsgemeinschaft,
          kirchensteuerpflichtig: religionsgemeinschaft !== 'Nicht Kirchensteuerpflichtig',
          warAngestellt: warAngestellt ?? false,
          einkommenAngestellt: warAngestellt ? parseGermanNumber(einkommenAngestelltInput) : 0,
          hatKrankenversicherung: hatKrankenversicherung ?? false,
          krankenversicherungBetrag: hatKrankenversicherung ? parseGermanNumber(krankenversicherungBetragInput) : 0,
          hatPrivateKV: hatPrivateKV ?? false,
          privateKVBetrag: hatPrivateKV ? parseGermanNumber(privateKVBetragInput) : 0,
          hatOptionaleKV: hatOptionaleKV ?? false,
          optionaleKVBetrag: hatOptionaleKV ? parseGermanNumber(optionaleKVBetragInput) : 0,
          hatPflegeversicherung: hatPflegeversicherung ?? false,
          pflegeversicherungBetrag: hatPflegeversicherung ? parseGermanNumber(pflegeversicherungBetragInput) : 0,
          hatKrankengeld: hatKrankengeld ?? false,
          krankengeldBetrag: hatKrankengeld ? parseGermanNumber(krankengeldBetragInput) : 0,
          bundesland,
          einkommensteuernummer,
          updatedAt: Timestamp.now(),
        },
      };

      await updateDoc(doc(db, 'companies', companyId), updatedProfile);
      
      toast.success('Steuerprofil gespeichert');
      onComplete?.();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !geburtsdatum) {
      toast.error('Bitte gib dein Geburtsdatum ein');
      return;
    }
    
    if (step < 17) {
      setStep(step + 1);
    } else {
      handleSave();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      if (step === 2 && taxProfile.geburtsdatum) {
        onClose();
      } else {
        setStep(step - 1);
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
            </div>
          ) : (
            <>
              {/* Step 1: Geburtsdatum */}
              {step === 1 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie lautet dein Geburtsdatum?
                  </h2>
                  
                  <input
                    type="date"
                    value={geburtsdatum}
                    onChange={(e) => setGeburtsdatum(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f] mb-6"
                  />

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Nächster Schritt
                  </button>
                </>
              )}

              {/* Step 2: Familienstand */}
              {(step === 2 || (step === 1 && taxProfile.geburtsdatum)) && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Wie ist dein Familienstand?
                  </h2>
                  
                  <div className="space-y-1 mb-6">
                    {FAMILY_STATUS_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="familienstand"
                          value={option.value}
                          checked={familienstand === option.value}
                          onChange={(e) => setFamilienstand(e.target.value as FamilyStatus)}
                          className="w-5 h-5 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />
                        <span className="text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Religionsgemeinschaft */}
              {step === 3 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Für welche Religionsgemeinschaft zahlst du Kirchensteuer?
                  </h2>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={religionSearch}
                      onChange={(e) => setReligionSearch(e.target.value)}
                      placeholder="Suche"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#14ad9f]"
                    />
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto mb-6">
                    {filteredReligionen.map((religion) => (
                      <label
                        key={religion}
                        className="flex items-center gap-3 py-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="religionsgemeinschaft"
                          value={religion}
                          checked={religionsgemeinschaft === religion}
                          onChange={(e) => setReligionsgemeinschaft(e.target.value)}
                          className="w-5 h-5 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />
                        <span className="text-gray-900">{religion}</span>
                      </label>
                    ))}
                    {filteredReligionen.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Keine Ergebnisse gefunden
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Angestellt */}
              {step === 4 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Warst du in {new Date().getFullYear()} angestellt?
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Entweder weil du nebenberuflich selbständig bist oder weil du für einen Teil des Jahres angestellt warst.
                  </p>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setWarAngestellt(true); setStep(5); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWarAngestellt(false); setStep(6); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 5: Einkommen als Angestellter (nur wenn warAngestellt = true) */}
              {step === 5 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Wie hoch ist dein steuerpflichtiges Einkommen als Angestellte:r in {new Date().getFullYear()}?
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Bitte trage hier den Betrag aus der 3. Zeile deiner Lohnsteuerjahresbescheinigung mit der Beschriftung &quot;Bruttoarbeitslohn&quot; ein.
                  </p>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={einkommenAngestelltInput}
                      onChange={(e) => setEinkommenAngestelltInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(einkommenAngestelltInput);
                        if (parsed > 0) {
                          setEinkommenAngestelltInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 6: Krankenversicherung Frage */}
              {step === 6 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Hast du Beiträge als Selbstständige:r für eine Krankenversicherung in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setHatKrankenversicherung(true); setStep(7); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHatKrankenversicherung(false); setStep(8); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(warAngestellt ? 5 : 4)}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 7: Krankenversicherung Betrag (nur wenn hatKrankenversicherung = true) */}
              {step === 7 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie viel hast du als Selbstständige:r an Beiträgen für die Krankenversicherung in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={krankenversicherungBetragInput}
                      onChange={(e) => setKrankenversicherungBetragInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(krankenversicherungBetragInput);
                        if (parsed > 0) {
                          setKrankenversicherungBetragInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(9)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 8: Private Krankenversicherung Frage (nur wenn hatKrankenversicherung = false) */}
              {step === 8 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Hast du Beiträge für eine private Krankenversicherung für den Basisschutz in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setHatPrivateKV(true); setStep(9); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHatPrivateKV(false); setStep(10); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 9: Private KV Betrag (nur wenn hatPrivateKV = true) */}
              {step === 9 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie viel hast du in {new Date().getFullYear()} für eine private Krankenversicherung für den Basisschutz bezahlt?
                  </h2>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={privateKVBetragInput}
                      onChange={(e) => setPrivateKVBetragInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(privateKVBetragInput);
                        if (parsed > 0) {
                          setPrivateKVBetragInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(8)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(10)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 10: Optionale KV Frage */}
              {step === 10 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Hast du in {new Date().getFullYear()} Beiträge für eine private Krankenversicherung für optionale Leistungen und Zusatzversicherungen gezahlt?
                  </h2>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setHatOptionaleKV(true); setStep(11); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHatOptionaleKV(false); setStep(12); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(hatPrivateKV ? 9 : 8)}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 11: Optionale KV Betrag (nur wenn hatOptionaleKV = true) */}
              {step === 11 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie viel hast du für die private Krankenversicherung für Beiträge zu Wahlleistungen und Zusatzversicherungen in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={optionaleKVBetragInput}
                      onChange={(e) => setOptionaleKVBetragInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(optionaleKVBetragInput);
                        if (parsed > 0) {
                          setOptionaleKVBetragInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(10)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(12)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 12: Pflegeversicherung Frage */}
              {step === 12 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Hast du in {new Date().getFullYear()} als Selbständige:r Beiträge zur Pflegeversicherung gezahlt?
                  </h2>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setHatPflegeversicherung(true); setStep(13); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHatPflegeversicherung(false); setStep(14); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(hatOptionaleKV ? 11 : 10)}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 13: Pflegeversicherung Betrag (nur wenn hatPflegeversicherung = true) */}
              {step === 13 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie viel hast du an Beiträgen zur Pflegeversicherung als Selbständige:r in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pflegeversicherungBetragInput}
                      onChange={(e) => setPflegeversicherungBetragInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(pflegeversicherungBetragInput);
                        if (parsed > 0) {
                          setPflegeversicherungBetragInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(12)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(14)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 14: Krankengeld Frage */}
              {step === 14 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Hast du in {new Date().getFullYear()} Beiträge für einen Anspruch auf Krankengeld bezahlt?
                  </h2>
                  
                  <div className="flex gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => { setHatKrankengeld(true); setStep(15); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHatKrankengeld(false); setStep(16); }}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nein
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(hatPflegeversicherung ? 13 : 12)}
                    className="flex items-center gap-2 text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
                  >
                    <span>←</span> Vorherige
                  </button>
                </>
              )}

              {/* Step 15: Krankengeld Betrag (nur wenn hatKrankengeld = true) */}
              {step === 15 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    Wie viel hast du an Beiträgen für einen Anspruch auf Krankengeld in {new Date().getFullYear()} gezahlt?
                  </h2>
                  
                  <div className="relative mb-6">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={krankengeldBetragInput}
                      onChange={(e) => setKrankengeldBetragInput(formatCurrencyInput(e.target.value))}
                      onBlur={() => {
                        const parsed = parseGermanNumber(krankengeldBetragInput);
                        if (parsed > 0) {
                          setKrankengeldBetragInput(formatGermanNumber(parsed));
                        }
                      }}
                      className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                      placeholder="0,00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(14)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(16)}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 16: Bundesland */}
              {step === 16 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">
                    In welchem Bundesland bist du einkommensteuerpflichtig?
                  </h2>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Suche"
                      value={bundeslandSearch}
                      onChange={(e) => setBundeslandSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f]"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto mb-6 space-y-1">
                    {filteredBundeslaender.map((bl) => (
                      <label
                        key={bl}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          bundesland === bl ? 'bg-teal-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bundesland"
                          value={bl}
                          checked={bundesland === bl}
                          onChange={() => setBundesland(bl)}
                          className="w-4 h-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                        />
                        <span className="text-gray-900">{bl}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(hatKrankengeld ? 15 : 14)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(17)}
                      disabled={!bundesland}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Nächster Schritt
                    </button>
                  </div>
                </>
              )}

              {/* Step 17: Einkommensteuernummer */}
              {step === 17 && (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Wie lautet deine Einkommensteuernummer?
                  </h2>
                  
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Möglicherweise weicht die Steuernummer für Einkommensteuer von der Steuernummer für Umsatzsteuer ab.
                    </p>
                  </div>
                  
                  <div className="mb-2">
                    <input
                      type="text"
                      value={einkommensteuernummer}
                      onChange={(e) => {
                        setEinkommensteuernummer(e.target.value);
                        setSteuernummerError('');
                      }}
                      placeholder={STEUERNUMMER_FORMATE[bundesland]?.beispiel || '12/345/67890'}
                      className={`w-full px-4 py-3 border rounded-lg text-gray-900 focus:outline-none focus:border-[#14ad9f] ${
                        steuernummerError ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  {steuernummerError && (
                    <p className="text-sm text-red-600 mb-4">{steuernummerError}</p>
                  )}
                  
                  <p className="text-xs text-gray-500 mb-6">
                    Format für {bundesland}: {STEUERNUMMER_FORMATE[bundesland]?.beispiel || 'XX/XXX/XXXXX'}
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(17)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Vorherige
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Bundesland zu ISO 3166-2 Format konvertieren
                        type ISO3166Code = 'DE-BW' | 'DE-BY' | 'DE-BE' | 'DE-BB' | 'DE-HB' | 'DE-HH' | 'DE-HE' | 'DE-MV' | 'DE-NI' | 'DE-NW' | 'DE-RP' | 'DE-SL' | 'DE-SN' | 'DE-ST' | 'DE-SH' | 'DE-TH';
                        const bundeslandToISO: Record<string, ISO3166Code> = {
                          'Baden-Württemberg': 'DE-BW',
                          'Bayern': 'DE-BY',
                          'Berlin': 'DE-BE',
                          'Brandenburg': 'DE-BB',
                          'Bremen': 'DE-HB',
                          'Hamburg': 'DE-HH',
                          'Hessen': 'DE-HE',
                          'Mecklenburg-Vorpommern': 'DE-MV',
                          'Niedersachsen': 'DE-NI',
                          'Nordrhein-Westfalen': 'DE-NW',
                          'Rheinland-Pfalz': 'DE-RP',
                          'Saarland': 'DE-SL',
                          'Sachsen': 'DE-SN',
                          'Sachsen-Anhalt': 'DE-ST',
                          'Schleswig-Holstein': 'DE-SH',
                          'Thüringen': 'DE-TH',
                        };
                        
                        const isoCode = bundeslandToISO[bundesland];
                        
                        // Validierung mit npm-Paket
                        const validationError = validateSteuernummer(einkommensteuernummer, { bundesland: isoCode });
                        
                        if (validationError) {
                          setSteuernummerError(validationError);
                          return;
                        }
                        
                        // Speichern wenn valide
                        handleSave();
                      }}
                      disabled={saving || !einkommensteuernummer.trim()}
                      className="flex-1 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Speichere...' : 'Speichern'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaxEstimationWizard;
