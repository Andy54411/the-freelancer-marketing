// Typen für die kategorie-spezifischen Formulare
export interface BaseSubcategoryData {
  subcategory: string;
  [key: string]: any;
}

// Maler-spezifische Daten
export interface MalerData extends BaseSubcategoryData {
  subcategory: 'Maler & Lackierer';
  roomType:
    | 'zimmer'
    | 'treppe'
    | 'aussenwand'
    | 'garage'
    | 'keller'
    | 'bad'
    | 'kueche'
    | 'wohnzimmer'
    | 'schlafzimmer'
    | 'flur'
    | 'sonstiges';
  roomCount?: number;
  squareMeters?: number;
  wallHeight?: number;
  paintType: 'innenfarbe' | 'aussenfarbe' | 'spezialfarbe';
  paintColor?: string;
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  surfaceCondition: 'gut' | 'renovierungsbedürftig' | 'stark_beschädigt';
  additionalServices: string[];
  timeframe: 'sofort' | 'innerhalb_woche' | 'innerhalb_monat' | 'flexibel';
  budget?: number;
  specialRequirements?: string;
}

// Elektriker-spezifische Daten
export interface ElektrikerData extends BaseSubcategoryData {
  subcategory: 'Elektriker';
  serviceType: 'installation' | 'reparatur' | 'wartung' | 'neubau';
  workType:
    | 'steckdosen'
    | 'schalter'
    | 'beleuchtung'
    | 'sicherungskasten'
    | 'verkabelung'
    | 'smart_home'
    | 'sonstiges';
  roomCount?: number;
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  buildingType: 'einfamilienhaus' | 'wohnung' | 'gewerbe' | 'neubau';
  existingInstallation: 'vorhanden' | 'teilweise' | 'nicht_vorhanden';
  certificationNeeded: boolean;
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Klempner-spezifische Daten
export interface KlempnerData extends BaseSubcategoryData {
  subcategory: 'Klempner';
  serviceType: 'reparatur' | 'installation' | 'wartung' | 'notfall';
  problemType:
    | 'wasserschaden'
    | 'verstopfung'
    | 'undichtigkeit'
    | 'heizung'
    | 'bad_sanierung'
    | 'rohr_installation'
    | 'sonstiges';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  roomType: 'bad' | 'kueche' | 'keller' | 'waschraum' | 'mehrere_raeume' | 'sonstiges';
  buildingType: 'einfamilienhaus' | 'wohnung' | 'gewerbe';
  accessibilityIssues: string;
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Garten-spezifische Daten
export interface GartenData extends BaseSubcategoryData {
  subcategory: 'Garten und Landschaftspflege';
  serviceType: 'einmalig' | 'regelmäßig' | 'saison';
  gardenSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  squareMeters?: number;
  workType: string[]; // ['rasenmähen', 'hecke_schneiden', 'bäume_schneiden', 'unkraut_entfernen', 'beet_anlegen', 'pflaster_reinigen']
  seasonalWork: string[]; // ['frühling', 'sommer', 'herbst', 'winter']
  equipmentProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  wasteDisposal: 'inklusive' | 'nicht_nötig' | 'separat';
  frequency?: 'wöchentlich' | 'zweiwöchentlich' | 'monatlich' | 'nach_bedarf';
  specialRequirements?: string;
}

// Umzug-spezifische Daten
export interface UmzugData extends BaseSubcategoryData {
  subcategory: 'Umzugshelfer';
  serviceType: 'komplettservice' | 'nur_transport' | 'nur_verpackung' | 'nur_hilfe';
  fromFloor: number;
  toFloor: number;
  hasElevator: 'beide' | 'von' | 'nach' | 'keine';
  distance: number; // in km
  roomCount: number;
  furnitureType: string[]; // ['schwere_möbel', 'zerbrechlich', 'elektronik', 'pflanzen', 'klavier']
  packingMaterial: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  vehicleSize: 'klein' | 'mittel' | 'groß' | 'lkw';
  additionalServices: string[]; // ['montage', 'demontage', 'verpackung', 'reinigung']
  dateFlexible: boolean;
  specialRequirements?: string;
}

// IT-spezifische Daten
export interface ITData extends BaseSubcategoryData {
  subcategory: 'IT-Support' | 'Webentwicklung' | 'Softwareentwicklung';
  serviceType: 'reparatur' | 'installation' | 'entwicklung' | 'beratung' | 'wartung';
  deviceType?: string[]; // ['computer', 'laptop', 'server', 'netzwerk', 'smartphone', 'tablet']
  operatingSystem?: string[]; // ['windows', 'mac', 'linux', 'android', 'ios']
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  location: 'vor_ort' | 'remote' | 'beides';
  dataBackup: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  businessHours: boolean;
  specialRequirements?: string;
}

// Tischler-spezifische Daten
export interface TischlerData extends BaseSubcategoryData {
  subcategory: 'Tischler';
  serviceType: 'reparatur' | 'anfertigung' | 'restauration' | 'beratung';
  furnitureType:
    | 'küche'
    | 'schrank'
    | 'tisch'
    | 'stuhl'
    | 'türen'
    | 'fenster'
    | 'parkett'
    | 'sonstiges';
  material: 'holz' | 'mdf' | 'spanplatte' | 'massivholz' | 'nach_absprache';
  woodType?: string; // 'eiche', 'buche', 'kiefer', etc.
  dimensions?: string;
  complexity: 'einfach' | 'mittel' | 'komplex';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  timeframe: 'sofort' | 'innerhalb_woche' | 'innerhalb_monat' | 'flexibel';
  specialRequirements?: string;
}

// Heizungsbau & Sanitär-spezifische Daten
export interface HeizungSanitärData extends BaseSubcategoryData {
  subcategory: 'Heizungsbau & Sanitär';
  serviceType: 'reparatur' | 'installation' | 'wartung' | 'notfall' | 'modernisierung';
  systemType: 'heizung' | 'sanitär' | 'lüftung' | 'komplettsystem';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  buildingType: 'einfamilienhaus' | 'wohnung' | 'gewerbe' | 'neubau';
  roomCount?: number;
  heatingType?: 'gas' | 'öl' | 'wärmepumpe' | 'fernwärme' | 'solar' | 'holz';
  certificationNeeded: boolean;
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Fliesenleger-spezifische Daten
export interface FliesenlegerData extends BaseSubcategoryData {
  subcategory: 'Fliesenleger';
  serviceType: 'neubau' | 'renovierung' | 'reparatur';
  roomType: 'bad' | 'kueche' | 'wohnbereich' | 'terrasse' | 'balkon' | 'mehrere_raeume';
  squareMeters?: number;
  tileType: 'keramik' | 'naturstein' | 'feinsteinzeug' | 'mosaik' | 'nach_absprache';
  tileSize: 'klein' | 'mittel' | 'groß' | 'großformat';
  pattern: 'standard' | 'diagonal' | 'versetzt' | 'muster' | 'nach_absprache';
  preparationWork: 'benötigt' | 'teilweise' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  waterproofing: boolean;
  specialRequirements?: string;
}

// Dachdecker-spezifische Daten
export interface DachdeckerData extends BaseSubcategoryData {
  subcategory: 'Dachdecker';
  serviceType: 'reparatur' | 'neubau' | 'sanierung' | 'wartung' | 'notfall';
  roofType: 'steildach' | 'flachdach' | 'pultdach' | 'walmdach' | 'satteldach';
  material: 'ziegel' | 'schiefer' | 'blech' | 'bitumen' | 'reet' | 'sonstiges';
  roofSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  squareMeters?: number;
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  scaffolding: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  insulation: 'inklusive' | 'separat' | 'nicht_nötig';
  gutters: 'inklusive' | 'separat' | 'nicht_nötig';
  specialRequirements?: string;
}

// Maurer-spezifische Daten
export interface MaurerData extends BaseSubcategoryData {
  subcategory: 'Maurer';
  serviceType: 'neubau' | 'reparatur' | 'sanierung' | 'anbau';
  workType: 'mauer' | 'fundament' | 'putz' | 'estrich' | 'pflaster' | 'sonstiges';
  materialType: 'ziegel' | 'beton' | 'naturstein' | 'porenbeton' | 'nach_absprache';
  projectSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  squareMeters?: number;
  height?: number;
  foundation: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  permits: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Trockenbauer-spezifische Daten
export interface TrockenbauData extends BaseSubcategoryData {
  subcategory: 'Trockenbauer';
  serviceType: 'neubau' | 'umbau' | 'reparatur' | 'sanierung';
  workType: 'wand' | 'decke' | 'boden' | 'dachausbau' | 'schallschutz' | 'brandschutz';
  roomCount?: number;
  squareMeters?: number;
  height?: number;
  insulation: 'inklusive' | 'separat' | 'nicht_nötig';
  fireProof: boolean;
  soundProof: boolean;
  moistureProof: boolean;
  finish: 'spachteln' | 'tapezieren' | 'streichen' | 'fliesen' | 'keine';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Schreiner-spezifische Daten (ähnlich Tischler, aber mit Fokus auf Einbau)
export interface SchreinerData extends BaseSubcategoryData {
  subcategory: 'Schreiner';
  serviceType: 'einbau' | 'reparatur' | 'anfertigung' | 'restauration';
  furnitureType:
    | 'küche'
    | 'schrank'
    | 'türen'
    | 'fenster'
    | 'treppe'
    | 'einbauschrank'
    | 'sonstiges';
  material: 'holz' | 'mdf' | 'spanplatte' | 'massivholz' | 'nach_absprache';
  dimensions?: string;
  complexity: 'einfach' | 'mittel' | 'komplex';
  installation: 'inklusive' | 'separat' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  timeframe: 'sofort' | 'innerhalb_woche' | 'innerhalb_monat' | 'flexibel';
  specialRequirements?: string;
}

// Zimmerer-spezifische Daten
export interface ZimmererData extends BaseSubcategoryData {
  subcategory: 'Zimmerer';
  serviceType: 'neubau' | 'umbau' | 'reparatur' | 'sanierung';
  workType: 'dachstuhl' | 'holzbau' | 'carport' | 'terrasse' | 'balkon' | 'anbau' | 'sonstiges';
  woodType: 'fichte' | 'tanne' | 'lärche' | 'eiche' | 'buche' | 'nach_absprache';
  projectSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  squareMeters?: number;
  height?: number;
  foundation: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  permits: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  insulation: 'inklusive' | 'separat' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Bodenleger-spezifische Daten
export interface BodenlegerData extends BaseSubcategoryData {
  subcategory: 'Bodenleger';
  serviceType: 'neubau' | 'renovierung' | 'reparatur';
  floorType: 'laminat' | 'parkett' | 'vinyl' | 'teppich' | 'fliesen' | 'linoleum' | 'sonstiges';
  roomCount?: number;
  squareMeters?: number;
  underfloor: 'estrich' | 'holz' | 'beton' | 'sonstiges';
  preparationWork: 'benötigt' | 'teilweise' | 'nicht_nötig';
  underfloorHeating: boolean;
  moistureBarrier: boolean;
  skirting: 'inklusive' | 'separat' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Glaser-spezifische Daten
export interface GlaserData extends BaseSubcategoryData {
  subcategory: 'Glaser';
  serviceType: 'reparatur' | 'austausch' | 'neubau' | 'notfall';
  glassType: 'fenster' | 'tür' | 'spiegel' | 'duschkabine' | 'vitrine' | 'sonstiges';
  glassMaterial:
    | 'einfachglas'
    | 'doppelglas'
    | 'dreifachglas'
    | 'sicherheitsglas'
    | 'nach_absprache';
  dimensions?: string;
  quantity?: number;
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  measurement: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  installation: 'inklusive' | 'separat' | 'nicht_nötig';
  disposal: 'inklusive' | 'separat' | 'nicht_nötig';
  specialRequirements?: string;
}

// Schlosser-spezifische Daten
export interface SchlosserData extends BaseSubcategoryData {
  subcategory: 'Schlosser';
  serviceType: 'reparatur' | 'austausch' | 'neubau' | 'notfall' | 'öffnung';
  workType: 'schloss' | 'türbeschlag' | 'sicherheit' | 'zaun' | 'gitter' | 'sonstiges';
  lockType?: 'zylinder' | 'sicherheitsschloss' | 'elektronisch' | 'nach_absprache';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  securityLevel: 'standard' | 'erhöht' | 'hoch' | 'nach_absprache';
  keyService: 'benötigt' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Metallbauer-spezifische Daten
export interface MetallbauerData extends BaseSubcategoryData {
  subcategory: 'Metallbauer';
  serviceType: 'neubau' | 'reparatur' | 'anfertigung' | 'montage';
  workType: 'geländer' | 'zaun' | 'tor' | 'treppe' | 'balkon' | 'carport' | 'sonstiges';
  material: 'stahl' | 'edelstahl' | 'aluminium' | 'eisen' | 'nach_absprache';
  treatment: 'verzinkt' | 'pulverbeschichtet' | 'lackiert' | 'roh' | 'nach_absprache';
  dimensions?: string;
  complexity: 'einfach' | 'mittel' | 'komplex';
  installation: 'inklusive' | 'separat' | 'nicht_nötig';
  permits: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  materialProvided: 'kunde' | 'handwerker' | 'gemeinsam';
  specialRequirements?: string;
}

// Fenster- & Türenbauer-spezifische Daten
export interface FensterTürenbauData extends BaseSubcategoryData {
  subcategory: 'Fenster- & Türenbauer';
  serviceType: 'neubau' | 'austausch' | 'reparatur' | 'wartung';
  productType: 'fenster' | 'türen' | 'haustür' | 'terrassentür' | 'schiebetür' | 'rollläden';
  material: 'kunststoff' | 'holz' | 'aluminium' | 'holz_aluminium' | 'nach_absprache';
  glazing: 'einfachglas' | 'doppelglas' | 'dreifachglas' | 'sicherheitsglas';
  quantity?: number;
  dimensions?: string;
  energyEfficiency: 'standard' | 'erhöht' | 'passivhaus';
  security: 'standard' | 'erhöht' | 'hoch';
  installation: 'inklusive' | 'separat' | 'nicht_nötig';
  disposal: 'inklusive' | 'separat' | 'nicht_nötig';
  specialRequirements?: string;
}

// Reinigungskraft-spezifische Daten
export interface ReinigungskraftData extends BaseSubcategoryData {
  subcategory: 'Reinigungskraft';
  serviceType: 'einmalig' | 'regelmäßig' | 'nach_bedarf';
  cleaningType: 'grundreinigung' | 'unterhaltsreinigung' | 'endreinigung' | 'büroreinigung';
  frequency?: 'täglich' | 'wöchentlich' | 'zweiwöchentlich' | 'monatlich';
  roomCount?: number;
  squareMeters?: number;
  specialAreas: string[]; // ['bad', 'küche', 'fenster', 'balkon', 'keller', 'dachboden']
  equipment: 'vorhanden' | 'mitbringen' | 'bereitstellen';
  chemicals: 'vorhanden' | 'mitbringen' | 'bereitstellen' | 'umweltfreundlich';
  timePreference: 'morgens' | 'nachmittags' | 'abends' | 'flexibel';
  accessMethod: 'anwesend' | 'schlüssel' | 'nach_absprache';
  specialRequirements?: string;
}

// Haushaltshilfe-spezifische Daten
export interface HaushaltshilfeData extends BaseSubcategoryData {
  subcategory: 'Haushaltshilfe';
  serviceType: 'regelmäßig' | 'einmalig' | 'nach_bedarf';
  services: string[]; // ['putzen', 'waschen', 'bügeln', 'kochen', 'einkaufen', 'kinderbetreuung']
  frequency?: 'täglich' | 'wöchentlich' | 'zweiwöchentlich' | 'monatlich';
  hours?: number;
  timePreference: 'morgens' | 'nachmittags' | 'abends' | 'flexibel';
  languages: string[]; // ['deutsch', 'englisch', 'spanisch', 'französisch', 'sonstiges']
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  ownTransport: boolean;
  specialRequirements?: string;
}

// Fensterputzer-spezifische Daten
export interface FensterputzerData extends BaseSubcategoryData {
  subcategory: 'Fensterputzer';
  serviceType: 'einmalig' | 'regelmäßig';
  buildingType: 'privathaus' | 'wohnung' | 'büro' | 'gewerbe' | 'hochhaus';
  frequency?: 'monatlich' | 'zweimonatlich' | 'vierteljährlich' | 'halbjährlich';
  windowCount?: number;
  floors?: number;
  outsideAccess: 'einfach' | 'schwierig' | 'spezialausrüstung';
  insideIncluded: boolean;
  framesCleaning: boolean;
  blindsCleaning: boolean;
  equipmentProvided: 'mitbringen' | 'bereitstellen';
  specialRequirements?: string;
}

// Entrümpelung-spezifische Daten
export interface EntrümpelungData extends BaseSubcategoryData {
  subcategory: 'Entrümpelung';
  serviceType: 'komplett' | 'teilweise' | 'nur_transport';
  propertyType: 'wohnung' | 'haus' | 'keller' | 'dachboden' | 'garage' | 'büro';
  roomCount?: number;
  squareMeters?: number;
  volumeEstimate: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  itemTypes: string[]; // ['möbel', 'elektrogeräte', 'kleidung', 'bücher', 'sperrmüll', 'sondermüll']
  disposal: 'inklusive' | 'separat' | 'sortierung';
  vehicleSize: 'klein' | 'mittel' | 'groß' | 'lkw';
  accessDifficulty: 'einfach' | 'schwierig' | 'sehr_schwierig';
  timeframe: 'sofort' | 'innerhalb_woche' | 'flexibel';
  specialRequirements?: string;
}

// Hausmeisterdienste-spezifische Daten
export interface HausmeisterdienstData extends BaseSubcategoryData {
  subcategory: 'Hausmeisterdienste';
  serviceType: 'regelmäßig' | 'einmalig' | 'nach_bedarf';
  propertyType: 'wohngebäude' | 'bürogebäude' | 'gewerbe' | 'privathaus';
  services: string[]; // ['reinigung', 'wartung', 'reparaturen', 'gartenpflege', 'winterdienst', 'sicherheit']
  frequency?: 'täglich' | 'wöchentlich' | 'monatlich' | 'nach_bedarf';
  availability: 'geschäftszeiten' | 'erweitert' | 'rund_um_die_uhr';
  emergencyService: boolean;
  ownTools: boolean;
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  specialRequirements?: string;
}

// Teppichreinigung-spezifische Daten
export interface TeppichreinigungData extends BaseSubcategoryData {
  subcategory: 'Teppichreinigung';
  serviceType: 'vor_ort' | 'abholung' | 'nach_absprache';
  carpetType:
    | 'orientteppich'
    | 'perserteppich'
    | 'wollteppich'
    | 'synthetik'
    | 'hochflor'
    | 'sonstiges';
  cleaningMethod: 'nassreinigung' | 'trockenreinigung' | 'dampfreinigung' | 'nach_absprache';
  carpetCount?: number;
  size: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  stains: 'keine' | 'leichte' | 'starke' | 'spezielle';
  material: 'wolle' | 'seide' | 'baumwolle' | 'synthetik' | 'mischgewebe' | 'unbekannt';
  urgency: 'normal' | 'dringend' | 'kann_warten';
  protectionTreatment: boolean;
  specialRequirements?: string;
}

// Bodenreinigung-spezifische Daten
export interface BodenreinigungData extends BaseSubcategoryData {
  subcategory: 'Bodenreinigung';
  serviceType: 'einmalig' | 'regelmäßig' | 'grundreinigung';
  floorType: 'parkett' | 'laminat' | 'fliesen' | 'naturstein' | 'vinyl' | 'teppich' | 'linoleum';
  roomCount?: number;
  squareMeters?: number;
  frequency?: 'wöchentlich' | 'zweiwöchentlich' | 'monatlich' | 'nach_bedarf';
  treatmentType: 'standard' | 'tiefenreinigung' | 'versiegelung' | 'polieren';
  equipment: 'vorhanden' | 'mitbringen' | 'bereitstellen';
  chemicals: 'standard' | 'umweltfreundlich' | 'allergikerfreundlich';
  specialRequirements?: string[];
}

// Hausreinigung-spezifische Daten
export interface HausreinigungData extends BaseSubcategoryData {
  subcategory: 'Hausreinigung';
  serviceType: 'einmalig' | 'regelmäßig' | 'endreinigung' | 'umzugsreinigung';
  propertyType: 'wohnung' | 'haus' | 'büro' | 'praxis';
  roomCount?: number;
  squareMeters?: number;
  frequency?: 'wöchentlich' | 'zweiwöchentlich' | 'monatlich' | 'nach_bedarf';
  specialAreas: string[]; // ['bad', 'küche', 'fenster', 'balkon', 'keller', 'garage']
  equipment: 'vorhanden' | 'mitbringen' | 'bereitstellen';
  chemicals: 'standard' | 'umweltfreundlich' | 'allergikerfreundlich';
  timePreference: 'morgens' | 'nachmittags' | 'abends' | 'flexibel';
  specialRequirements?: string[];
}

// Möbelmontage-spezifische Daten
export interface MöbelmontageData extends BaseSubcategoryData {
  subcategory: 'Möbelmontage';
  serviceType: 'montage' | 'demontage' | 'ummontage' | 'reparatur';
  furnitureType: 'küche' | 'schrank' | 'bett' | 'tisch' | 'regal' | 'büromöbel' | 'verschiedenes';
  itemCount?: number;
  complexity: 'einfach' | 'mittel' | 'komplex';
  toolsProvided: 'vorhanden' | 'mitbringen' | 'bereitstellen';
  instructions: 'vorhanden' | 'nicht_vorhanden' | 'online';
  timeframe: 'sofort' | 'innerhalb_woche' | 'flexibel';
  accessDifficulty: 'einfach' | 'schwierig' | 'sehr_schwierig';
  specialRequirements?: string;
}

// Fahrer-spezifische Daten
export interface FahrerData extends BaseSubcategoryData {
  subcategory: 'Fahrer';
  serviceType: 'einmalig' | 'regelmäßig' | 'nach_bedarf';
  vehicleType: 'pkw' | 'transporter' | 'lkw' | 'kundenfahrzeug';
  licenseType: 'b' | 'be' | 'c' | 'ce' | 'nach_absprache';
  routeType: 'lokal' | 'regional' | 'überregional' | 'international';
  loadType: 'personen' | 'waren' | 'sperrgut' | 'spezialtransport';
  duration: 'stunden' | 'tag' | 'mehrere_tage' | 'dauerhaft';
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  languages: string[]; // ['deutsch', 'englisch', 'französisch', 'sonstiges']
  specialRequirements?: string;
}

// Kurierdienste-spezifische Daten
export interface KurierdiensteData extends BaseSubcategoryData {
  subcategory: 'Kurierdienste';
  serviceType: 'sofort' | 'terminiert' | 'regelmäßig';
  packageType: 'dokumente' | 'pakete' | 'sperrgut' | 'verderblich' | 'wertsachen';
  size: 'klein' | 'mittel' | 'groß' | 'sperrig';
  weight: 'leicht' | 'mittel' | 'schwer' | 'sehr_schwer';
  distance: 'lokal' | 'regional' | 'überregional';
  urgency: 'sofort' | 'innerhalb_stunde' | 'heute' | 'morgen';
  specialHandling: boolean;
  signature: 'erforderlich' | 'nicht_erforderlich';
  insurance: 'standard' | 'erweitert' | 'nicht_nötig';
  specialRequirements?: string;
}

// Transportdienstleistungen-spezifische Daten
export interface TransportdienstleistungenData extends BaseSubcategoryData {
  subcategory: 'Transportdienstleistungen';
  serviceType: 'einmalig' | 'regelmäßig' | 'projekt';
  cargoType: 'möbel' | 'baumaterial' | 'maschinen' | 'verschiedenes';
  vehicleSize: 'klein' | 'mittel' | 'groß' | 'lkw' | 'sattelzug';
  loadingHelp: 'benötigt' | 'nicht_nötig' | 'bereitstellen';
  distance: number; // in km
  specialEquipment: string[]; // ['kran', 'hebebühne', 'plane', 'kühlbox']
  timeframe: 'sofort' | 'innerhalb_woche' | 'flexibel';
  permits: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  specialRequirements?: string;
}

// Lagerlogistik-spezifische Daten
export interface LagerlogistikData extends BaseSubcategoryData {
  subcategory: 'Lagerlogistik';
  serviceType: 'einlagerung' | 'kommissionierung' | 'distribution' | 'komplett';
  goodsType: 'allgemein' | 'lebensmittel' | 'gefahrgut' | 'pharma' | 'elektronik';
  storageType: 'trocken' | 'kühl' | 'tiefkühl' | 'temperiert';
  volume: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  duration: 'kurz' | 'mittel' | 'lang' | 'dauerhaft';
  frequency: 'einmalig' | 'regelmäßig' | 'saisonal';
  packaging: 'erforderlich' | 'nicht_erforderlich';
  tracking: 'erforderlich' | 'nicht_erforderlich';
  specialRequirements?: string;
}

// Mietkoch-spezifische Daten
export interface MietkochData extends BaseSubcategoryData {
  subcategory: 'Mietkoch';
  serviceType: string;
  cuisineType: string[];
  eventType: string;
  level: string;
  numberOfGuests?: number;
  location: string;
  budgetPerPerson?: number;
  kitchenSize?: string;
  kitchenEquipment?: string;
  additionalServices?: string[];
  allergies?: string;
  menuWishes?: string;
  specialRequirements?: string;
  // Legacy fields for backward compatibility
  endTime?: string;
  eventDate?: string;
  startTime?: string;
  duration?: number;
  guestCount?: number;
  mealType?: string;
  ingredients?: string;
  equipment?: string;
  dietaryRequirements?: string[];
  budget?: number;
}

// Mietkellner-spezifische Daten
export interface MietkellnerData extends BaseSubcategoryData {
  subcategory: 'Mietkellner';
  serviceType: 'einmalig' | 'regelmäßig' | 'event';
  eventType: 'privat' | 'business' | 'hochzeit' | 'geburtstag' | 'firmenevent';
  guestCount?: number;
  duration: 'stunden' | 'tag' | 'mehrere_tage';
  serviceLevel: 'standard' | 'gehoben' | 'premium';
  tasks: string[]; // ['servieren', 'bar', 'aufräumen', 'kassenabrechnung']
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  uniform: 'erforderlich' | 'nicht_erforderlich' | 'bereitstellen';
  languages: string[]; // ['deutsch', 'englisch', 'französisch', 'sonstiges']
  specialRequirements?: string;
}

// Webentwicklung-spezifische Daten
export interface WebentwicklungData extends BaseSubcategoryData {
  subcategory: 'Webentwicklung';
  serviceType: 'neubau' | 'redesign' | 'wartung' | 'optimierung';
  projectType: 'website' | 'webshop' | 'webapp' | 'landing_page' | 'blog';
  technology: string[]; // ['html_css', 'javascript', 'react', 'vue', 'angular', 'php', 'python', 'wordpress']
  complexity: 'einfach' | 'mittel' | 'komplex';
  features: string[]; // ['responsive', 'cms', 'seo', 'analytics', 'mehrsprachig', 'datenbank']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// Softwareentwicklung-spezifische Daten
export interface SoftwareentwicklungData extends BaseSubcategoryData {
  subcategory: 'Softwareentwicklung';
  serviceType: 'neubau' | 'erweiterung' | 'wartung' | 'beratung';
  projectType: 'desktop' | 'mobile' | 'web' | 'api' | 'datenbank';
  platform: string[]; // ['windows', 'mac', 'linux', 'android', 'ios', 'web']
  technology: string[]; // ['java', 'python', 'javascript', 'react', 'flutter', 'dotnet']
  complexity: 'einfach' | 'mittel' | 'komplex';
  features: string[]; // ['benutzeroberfläche', 'datenbank', 'api', 'sicherheit', 'tests']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// App-Entwicklung-spezifische Daten
export interface AppEntwicklungData extends BaseSubcategoryData {
  subcategory: 'AppEntwicklung';
  serviceType: 'neubau' | 'erweiterung' | 'wartung' | 'beratung';
  platform: string[]; // ['android', 'ios', 'hybrid', 'web']
  appType: 'business' | 'spiel' | 'utility' | 'social' | 'ecommerce';
  complexity: 'einfach' | 'mittel' | 'komplex';
  features: string[]; // ['offline', 'push_notifications', 'gps', 'kamera', 'payment', 'social_login']
  design: 'vorhanden' | 'benötigt' | 'einfach';
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// Netzwerkadministration-spezifische Daten
export interface NetzwerkadministrationData extends BaseSubcategoryData {
  subcategory: 'Netzwerkadministration';
  serviceType: 'einrichtung' | 'wartung' | 'optimierung' | 'notfall';
  networkSize: 'klein' | 'mittel' | 'groß' | 'enterprise';
  deviceCount?: number;
  services: string[]; // ['wlan', 'firewall', 'server', 'backup', 'monitoring', 'sicherheit']
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  location: 'vor_ort' | 'remote' | 'beides';
  certifications: string[]; // ['cisco', 'microsoft', 'comptia', 'linux']
  support: 'einmalig' | 'laufend' | 'nach_bedarf';
  specialRequirements?: string;
}

// Datenbankentwicklung-spezifische Daten
export interface DatenbankentwicklungData extends BaseSubcategoryData {
  subcategory: 'Datenbankentwicklung';
  serviceType: 'neubau' | 'migration' | 'optimierung' | 'wartung';
  databaseType: 'mysql' | 'postgresql' | 'oracle' | 'mongodb' | 'sqlite' | 'mssql';
  complexity: 'einfach' | 'mittel' | 'komplex';
  dataVolume: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  features: string[]; // ['backup', 'replikation', 'performance', 'security', 'analytics']
  integration: string[]; // ['api', 'web', 'mobile', 'erp', 'crm']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// IT-Support-spezifische Daten
export interface ITSupportData extends BaseSubcategoryData {
  subcategory: 'ITSupport';
  serviceType:
    | 'hardware_support'
    | 'software_support'
    | 'netzwerk_support'
    | 'system_installation'
    | 'wartung'
    | 'beratung'
    | 'schulung';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  problemType:
    | 'computer_laptop'
    | 'drucker_scanner'
    | 'netzwerk'
    | 'software'
    | 'email'
    | 'backup'
    | 'virus'
    | 'performance';
  supportLocation: 'vor_ort' | 'remote' | 'beides';
  operatingSystem: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'andere';
  businessSize: 'privatperson' | 'klein' | 'mittel' | 'gross';
  deviceCount?: number;
  budget?: number;
  problemDescription: string;
  desiredSolution?: string;
  additionalInfo?: string;
}

// IT-Beratung-spezifische Daten
export interface ITBeratungData extends BaseSubcategoryData {
  subcategory: 'IT-Beratung';
  serviceType: 'strategie' | 'auswahl' | 'implementation' | 'optimierung';
  focusArea: string[]; // ['infrastruktur', 'software', 'sicherheit', 'digitalisierung', 'cloud']
  companySize: 'klein' | 'mittel' | 'groß' | 'enterprise';
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  deliverables: string[]; // ['konzept', 'analyse', 'implementation', 'schulung']
  industry: string; // 'branche'
  specialRequirements?: string;
}

// Webdesign-spezifische Daten
export interface WebdesignData extends BaseSubcategoryData {
  subcategory: 'Webdesign';
  serviceType: 'neubau' | 'redesign' | 'optimierung' | 'beratung';
  projectType: 'website' | 'webshop' | 'landing_page' | 'blog' | 'portfolio';
  pages?: number;
  style: 'modern' | 'klassisch' | 'minimalistisch' | 'kreativ' | 'nach_absprache';
  features: string[]; // ['responsive', 'animation', 'cms', 'seo', 'mehrsprachig']
  branding: 'vorhanden' | 'benötigt' | 'einfach';
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// UX/UI Design-spezifische Daten
export interface UXUIDesignData extends BaseSubcategoryData {
  subcategory: 'UX/UI Design';
  serviceType: 'neubau' | 'redesign' | 'optimierung' | 'beratung';
  projectType: 'website' | 'mobile_app' | 'desktop' | 'webapp';
  complexity: 'einfach' | 'mittel' | 'komplex';
  userResearch: 'benötigt' | 'vorhanden' | 'nicht_nötig';
  prototyping: 'benötigt' | 'nicht_nötig';
  testing: 'benötigt' | 'nicht_nötig';
  deliverables: string[]; // ['wireframes', 'mockups', 'prototyp', 'style_guide']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  specialRequirements?: string;
}

// Systemintegration-spezifische Daten
export interface SystemintegrationData extends BaseSubcategoryData {
  subcategory: 'Systemintegration';
  serviceType: 'neubau' | 'erweiterung' | 'migration' | 'optimierung';
  systemTypes: string[]; // ['erp', 'crm', 'shop', 'accounting', 'hr', 'custom']
  complexity: 'einfach' | 'mittel' | 'komplex';
  dataVolume: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  methods: string[]; // ['api', 'file_transfer', 'database', 'realtime']
  testing: 'benötigt' | 'nicht_nötig';
  documentation: 'benötigt' | 'nicht_nötig';
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// Cloud Computing-spezifische Daten
export interface CloudComputingData extends BaseSubcategoryData {
  subcategory: 'Cloud Computing';
  serviceType: 'migration' | 'einrichtung' | 'optimierung' | 'beratung';
  cloudProvider: string[]; // ['aws', 'azure', 'google', 'private', 'hybrid']
  services: string[]; // ['compute', 'storage', 'database', 'networking', 'security']
  complexity: 'einfach' | 'mittel' | 'komplex';
  companySize: 'klein' | 'mittel' | 'groß' | 'enterprise';
  compliance: string[]; // ['gdpr', 'iso27001', 'hipaa', 'sox']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// Cybersecurity-spezifische Daten
export interface CybersecurityData extends BaseSubcategoryData {
  subcategory: 'Cybersecurity';
  serviceType: 'audit' | 'implementierung' | 'monitoring' | 'incident_response';
  focusArea: string[]; // ['network', 'endpoint', 'email', 'web', 'mobile', 'cloud']
  companySize: 'klein' | 'mittel' | 'groß' | 'enterprise';
  compliance: string[]; // ['gdpr', 'iso27001', 'nist', 'bsi']
  currentSecurity: 'basic' | 'advanced' | 'enterprise' | 'none';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  support: 'einmalig' | 'laufend' | 'nicht_nötig';
  specialRequirements?: string;
}

// Online Marketing-spezifische Daten
export interface OnlineMarketingData extends BaseSubcategoryData {
  subcategory: 'Online Marketing';
  serviceType: 'strategie' | 'kampagne' | 'optimierung' | 'beratung';
  channels: string[]; // ['google_ads', 'facebook', 'instagram', 'linkedin', 'email', 'seo']
  goals: string[]; // ['awareness', 'leads', 'sales', 'traffic', 'engagement']
  budget?: number;
  duration: 'kurzfristig' | 'mittelfristig' | 'langfristig';
  targetAudience: string; // 'zielgruppe'
  reporting: 'basic' | 'detailliert' | 'nicht_nötig';
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  specialRequirements?: string;
}

// Social Media Marketing-spezifische Daten
export interface SocialMediaMarketingData extends BaseSubcategoryData {
  subcategory: 'Social Media Marketing';
  serviceType: 'strategie' | 'content' | 'management' | 'werbung';
  platforms: string[]; // ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube']
  contentTypes: string[]; // ['posts', 'stories', 'videos', 'bilder', 'artikel']
  frequency: 'täglich' | 'mehrmals_wöchentlich' | 'wöchentlich' | 'nach_bedarf';
  goals: string[]; // ['awareness', 'engagement', 'leads', 'sales', 'community']
  budget?: number;
  duration: 'kurzfristig' | 'mittelfristig' | 'langfristig';
  reporting: 'basic' | 'detailliert' | 'nicht_nötig';
  specialRequirements?: string;
}

// Content Marketing-spezifische Daten
export interface ContentMarketingData extends BaseSubcategoryData {
  subcategory: 'Content Marketing';
  serviceType: 'strategie' | 'erstellung' | 'optimierung' | 'beratung';
  contentTypes: string[]; // ['blog_artikel', 'whitepaper', 'videos', 'infografiken', 'podcasts']
  topics: string[]; // themen
  frequency: 'täglich' | 'wöchentlich' | 'monatlich' | 'nach_bedarf';
  goals: string[]; // ['awareness', 'leads', 'expertise', 'seo', 'engagement']
  targetAudience: string; // 'zielgruppe'
  budget?: number;
  duration: 'kurzfristig' | 'mittelfristig' | 'langfristig';
  distribution: string[]; // ['website', 'social_media', 'email', 'paid_ads']
  specialRequirements?: string;
}

// Buchhaltung-spezifische Daten
export interface BuchhaltungData extends BaseSubcategoryData {
  subcategory: 'Buchhaltung';
  serviceType: 'laufend' | 'jahresabschluss' | 'nacharbeitung' | 'beratung';
  companyType: 'einzelunternehmen' | 'gmbh' | 'ag' | 'freiberufler' | 'verein';
  businessSize: 'klein' | 'mittel' | 'groß';
  transactionVolume: 'niedrig' | 'mittel' | 'hoch' | 'sehr_hoch';
  software: 'datev' | 'lexware' | 'sevdesk' | 'keine' | 'sonstiges';
  services: string[]; // ['fibu', 'lohn', 'umsatzsteuer', 'jahresabschluss', 'beratung']
  frequency: 'monatlich' | 'quartalsweise' | 'jährlich' | 'nach_bedarf';
  remote: 'möglich' | 'nicht_möglich' | 'bevorzugt';
  specialRequirements?: string;
}

// Steuerberatung-spezifische Daten
export interface SteuerberatungData extends BaseSubcategoryData {
  subcategory: 'Steuerberatung (freiberuflich)';
  serviceType: 'beratung' | 'erstellung' | 'prüfung' | 'vertretung';
  clientType: 'privatperson' | 'einzelunternehmen' | 'gmbh' | 'freiberufler';
  taxTypes: string[]; // ['einkommensteuer', 'gewerbesteuer', 'umsatzsteuer', 'körperschaftsteuer']
  frequency: 'jährlich' | 'quartalsweise' | 'monatlich' | 'nach_bedarf';
  complexity: 'einfach' | 'mittel' | 'komplex';
  urgency: 'normal' | 'dringend' | 'kann_warten';
  remote: 'möglich' | 'nicht_möglich' | 'bevorzugt';
  specialRequirements?: string;
}

// Rechtsberatung-spezifische Daten
export interface RechtsberatungData extends BaseSubcategoryData {
  subcategory: 'Rechtsberatung (freiberuflich)';
  serviceType: 'beratung' | 'vertretung' | 'prüfung' | 'erstellung';
  legalArea: string[]; // ['arbeitsrecht', 'mietrecht', 'familienrecht', 'gesellschaftsrecht', 'vertragsrecht']
  clientType: 'privatperson' | 'unternehmen' | 'verein';
  urgency: 'notfall' | 'dringend' | 'normal' | 'kann_warten';
  complexity: 'einfach' | 'mittel' | 'komplex';
  consultation: 'einmalig' | 'laufend' | 'nach_bedarf';
  location: 'vor_ort' | 'remote' | 'beides';
  specialRequirements?: string;
}

// Finanzberatung-spezifische Daten
export interface FinanzberatungData extends BaseSubcategoryData {
  subcategory: 'Finanzberatung';
  serviceType: 'beratung' | 'planung' | 'analyse' | 'optimierung';
  focusArea: string[]; // ['geldanlage', 'altersvorsorge', 'finanzierung', 'versicherung', 'steuer']
  clientType: 'privatperson' | 'familie' | 'unternehmen' | 'freiberufler';
  assets: 'niedrig' | 'mittel' | 'hoch' | 'sehr_hoch';
  goals: string[]; // ['vermögensaufbau', 'altersvorsorge', 'risikoschutz', 'steueroptimierung']
  timeHorizon: 'kurzfristig' | 'mittelfristig' | 'langfristig';
  riskTolerance: 'niedrig' | 'mittel' | 'hoch';
  consultation: 'einmalig' | 'laufend' | 'nach_bedarf';
  specialRequirements?: string;
}

// Versicherungsberatung-spezifische Daten
export interface VersicherungsberatungData extends BaseSubcategoryData {
  subcategory: 'Versicherungsberatung';
  serviceType: 'beratung' | 'vergleich' | 'optimierung' | 'schadenfall';
  insuranceTypes: string[]; // ['kfz', 'haftpflicht', 'kranken', 'leben', 'berufsunfähigkeit', 'rechtsschutz']
  clientType: 'privatperson' | 'familie' | 'unternehmen' | 'freiberufler';
  currentInsurance: 'vorhanden' | 'teilweise' | 'keine';
  goals: string[]; // ['kostenoptimierung', 'bessere_leistung', 'neue_versicherung', 'schadenfall']
  budget?: number;
  consultation: 'einmalig' | 'laufend' | 'nach_bedarf';
  location: 'vor_ort' | 'remote' | 'beides';
  specialRequirements?: string;
}

// Tierbetreuung-spezifische Daten
export interface TierbetreuungData extends BaseSubcategoryData {
  subcategory: 'Tierbetreuung (Hundesitter etc.)';
  serviceType: 'einmalig' | 'regelmäßig' | 'urlaub' | 'notfall';
  animalType: 'hund' | 'katze' | 'kleintier' | 'vogel' | 'verschiedene';
  animalCount?: number;
  careType: 'zuhause' | 'betreuer' | 'gassi' | 'füttern' | 'spielen';
  duration: 'stunden' | 'tag' | 'mehrere_tage' | 'woche';
  frequency?: 'täglich' | 'mehrmals_wöchentlich' | 'wöchentlich' | 'nach_bedarf';
  experience: 'egal' | 'erfahren' | 'sehr_erfahren';
  specialNeeds: string[]; // ['medikamente', 'spezialfutter', 'training', 'alte_tiere']
  location: 'zuhause' | 'betreuer' | 'beides';
  specialRequirements?: string;
}

// Gartenpflege-spezifische Daten (erweitert)
export interface GartenpflegeData extends BaseSubcategoryData {
  subcategory: 'Gartenpflege';
  serviceType: 'einmalig' | 'regelmäßig' | 'saison' | 'komplettservice';
  gardenSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  squareMeters?: number;
  services: string[]; // ['rasenmähen', 'hecke_schneiden', 'bäume_schneiden', 'unkraut_entfernen', 'beet_pflegen']
  frequency?: 'wöchentlich' | 'zweiwöchentlich' | 'monatlich' | 'saisonal';
  season: string[]; // ['frühling', 'sommer', 'herbst', 'winter']
  equipment: 'vorhanden' | 'mitbringen' | 'bereitstellen';
  wasteDisposal: 'inklusive' | 'separat' | 'nicht_nötig';
  expertise: 'basic' | 'advanced' | 'professional';
  specialRequirements?: string;
}

// Landschaftsgärtner-spezifische Daten
export interface LandschaftsgärtnerData extends BaseSubcategoryData {
  subcategory: 'Landschaftsgärtner (klein)';
  serviceType: 'neubau' | 'umgestaltung' | 'reparatur' | 'beratung';
  projectType: 'komplett' | 'teilbereich' | 'spezialarbeit';
  gardenSize: 'klein' | 'mittel' | 'groß';
  squareMeters?: number;
  services: string[]; // ['planung', 'bepflanzung', 'pflasterung', 'bewässerung', 'beleuchtung']
  budget?: number;
  timeframe: 'sofort' | 'innerhalb_monat' | 'flexibel';
  permits: 'vorhanden' | 'benötigt' | 'nicht_nötig';
  maintenance: 'inklusive' | 'separat' | 'nicht_nötig';
  specialRequirements?: string;
}

// Hundetrainer-spezifische Daten
export interface HundetrainerData extends BaseSubcategoryData {
  subcategory: 'Hundetrainer (freiberuflich)';
  serviceType: 'einzeltraining' | 'gruppentraining' | 'verhaltenstherapie' | 'beratung';
  dogAge: 'welpe' | 'junghund' | 'adult' | 'senior';
  dogSize: 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  issues: string[]; // ['grundgehorsam', 'leinenführigkeit', 'aggression', 'angst', 'bellen']
  experience: 'anfänger' | 'fortgeschritten' | 'problemhund';
  location: 'zuhause' | 'draußen' | 'hundeschule' | 'flexibel';
  frequency: 'einmalig' | 'wöchentlich' | 'mehrmals_wöchentlich' | 'nach_bedarf';
  duration: 'stunden' | 'wochen' | 'monate';
  certification: 'wichtig' | 'nicht_wichtig';
  specialRequirements?: string;
}

// Catering-spezifische Daten
export interface CateringData extends BaseSubcategoryData {
  subcategory: 'Catering';
  serviceType: 'buffet' | 'menü' | 'fingerfood' | 'grillservice' | 'getränke' | 'komplettservice';
  eventType:
    | 'hochzeit'
    | 'geburtstag'
    | 'firmenfeier'
    | 'meeting'
    | 'privatfeier'
    | 'jubiläum'
    | 'taufe'
    | 'trauerfeier'
    | 'sonstiges';
  guestCount: number;
  eventLocation?: string;
  cuisineType?:
    | 'deutsch'
    | 'italienisch'
    | 'asiatisch'
    | 'mediterran'
    | 'international'
    | 'vegetarisch'
    | 'vegan'
    | 'bio'
    | 'regional';
  budgetRange?: 'bis_20' | '20_40' | '40_60' | '60_100' | 'über_100';
  additionalServices?: string[];
  dietaryRequirements?: string;
  additionalInfo?: string;
}

// Seniorenbetreuung-spezifische Daten
export interface SeniorenbetreuungData extends BaseSubcategoryData {
  subcategory: 'Seniorenbetreuung';
  serviceType:
    | 'stundenbetreuung'
    | 'tagespflege'
    | 'nachtbetreuung'
    | '24h_betreuung'
    | 'demenzbetreuung'
    | 'alltagsbegleitung';
  careLevel:
    | 'ohne_pflegegrad'
    | 'pflegegrad_1'
    | 'pflegegrad_2'
    | 'pflegegrad_3'
    | 'pflegegrad_4'
    | 'pflegegrad_5';
  frequency: 'einmalig' | 'gelegentlich' | 'wöchentlich' | 'täglich' | 'nach_bedarf';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'nachts' | 'ganztags' | 'flexibel';
  hoursPerSession?: number;
  hourlyRate?: number;
  additionalServices?: string[];
  qualifications?:
    | 'nicht_wichtig'
    | 'erfahrung'
    | 'pflegeausbildung'
    | 'demenz_schulung'
    | 'erste_hilfe';
  language?: 'deutsch' | 'mehrsprachig' | 'nicht_wichtig';
  specialRequirements?: string;
  additionalInfo?: string;
}

// Massage-spezifische Daten
export interface MassageData extends BaseSubcategoryData {
  subcategory: 'Massage';
  serviceType:
    | 'klassische_massage'
    | 'tiefengewebsmassage'
    | 'sportmassage'
    | 'entspannungsmassage'
    | 'hot_stone'
    | 'thai_massage'
    | 'reflexzonenmassage'
    | 'lymphdrainage'
    | 'aromamassage'
    | 'schwangerschaftsmassage';
  bodyArea:
    | 'ganzkörper'
    | 'rücken'
    | 'nacken_schultern'
    | 'kopf'
    | 'füße'
    | 'hände'
    | 'beine'
    | 'arme'
    | 'gesicht';
  duration: '30' | '45' | '60' | '90' | '120';
  frequency: 'einmalig' | 'wöchentlich' | 'zweiwöchentlich' | 'monatlich' | 'nach_bedarf';
  budgetRange?: 'bis_50' | '50_80' | '80_120' | '120_150' | 'über_150';
  location?: 'bei_mir' | 'praxis' | 'flexibel';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'flexibel';
  gender?: 'weiblich' | 'männlich' | 'egal';
  healthIssues?: string;
  additionalInfo?: string;
}

// Nachhilfe-spezifische Daten
export interface NachhilfeData extends BaseSubcategoryData {
  subcategory: 'Nachhilfe';
  subject:
    | 'mathematik'
    | 'deutsch'
    | 'englisch'
    | 'französisch'
    | 'spanisch'
    | 'latein'
    | 'physik'
    | 'chemie'
    | 'biologie'
    | 'geschichte'
    | 'geographie'
    | 'politik'
    | 'wirtschaft'
    | 'informatik'
    | 'kunst'
    | 'musik'
    | 'sport';
  gradeLevel:
    | 'grundschule'
    | 'unterstufe'
    | 'mittelstufe'
    | 'oberstufe'
    | 'studium'
    | 'ausbildung'
    | 'erwachsenenbildung';
  sessionType: 'einzelunterricht' | 'gruppenunterricht' | 'online' | 'hybrid';
  frequency:
    | 'einmalig'
    | 'wöchentlich'
    | 'zweiwöchentlich'
    | 'intensiv'
    | 'prüfungsvorbereitung'
    | 'ferien';
  duration?: '45' | '60' | '90' | '120';
  budgetRange?: 'bis_15' | '15_25' | '25_35' | '35_50' | 'über_50';
  studentCount?: number;
  location?: 'bei_schüler' | 'bei_lehrer' | 'online' | 'neutral' | 'flexibel';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'wochenende' | 'flexibel';
  learningGoals?: string;
  difficulties?: string;
  additionalInfo?: string;
}

// DJ-Service-spezifische Daten
export interface DJServiceData extends BaseSubcategoryData {
  subcategory: 'DJ-Service';
  serviceType:
    | 'hochzeit'
    | 'geburtstag'
    | 'firmenfeier'
    | 'club'
    | 'party'
    | 'schulfest'
    | 'stadtfest'
    | 'radio'
    | 'karaoke'
    | 'mobile_disco';
  musicGenres: string[];
  guestCount: 'bis_50' | '50_100' | '100_200' | '200_500' | 'über_500';
  eventLocation?: string;
  budgetRange?: 'bis_300' | '300_600' | '600_1000' | '1000_2000' | 'über_2000';
  additionalServices?: string[];
  equipment?: 'dj_bringt_alles' | 'teilweise_vorhanden' | 'alles_vorhanden';
  experience?: 'anfänger' | 'erfahren' | 'profi' | 'egal';
  specialRequests?: string;
  additionalInfo?: string;
}

// Montageservice-spezifische Daten
export interface MontageserviceData extends BaseSubcategoryData {
  subcategory: 'Montageservice';
  serviceType:
    | 'möbel'
    | 'küche'
    | 'elektrogeräte'
    | 'lampen'
    | 'regale'
    | 'tv_wandmontage'
    | 'gardinen'
    | 'spiegel'
    | 'bilder'
    | 'spielgeräte'
    | 'fitness'
    | 'sonstiges';
  complexity: 'einfach' | 'mittel' | 'komplex' | 'mehrtägig';
  roomType:
    | 'wohnzimmer'
    | 'schlafzimmer'
    | 'küche'
    | 'bad'
    | 'kinderzimmer'
    | 'büro'
    | 'keller'
    | 'dachboden'
    | 'balkon'
    | 'terrasse'
    | 'garten'
    | 'garage';
  urgency: 'sofort' | 'diese_woche' | 'nächste_woche' | 'flexibel';
  itemCount?: number;
  budgetRange?: 'bis_50' | '50_100' | '100_200' | '200_500' | 'über_500';
  additionalServices?: string[];
  tools?: 'vorhanden' | 'teilweise' | 'nicht_vorhanden';
  instructions?: 'vorhanden' | 'nicht_vorhanden' | 'teilweise';
  productDescription?: string;
  additionalInfo?: string;
}

// Tierpflege-spezifische Daten
export interface TierpflegeData extends BaseSubcategoryData {
  subcategory: 'Tierpflege';
  serviceType:
    | 'fellpflege'
    | 'scheren'
    | 'baden'
    | 'krallenschneiden'
    | 'zahnpflege'
    | 'ohrenpflege'
    | 'entwurmen'
    | 'impfung'
    | 'gesundheitscheck'
    | 'erste_hilfe';
  animalType:
    | 'hund'
    | 'katze'
    | 'kaninchen'
    | 'meerschweinchen'
    | 'hamster'
    | 'vogel'
    | 'reptil'
    | 'pferd'
    | 'schaf'
    | 'ziege'
    | 'sonstiges';
  size: 'sehr_klein' | 'klein' | 'mittel' | 'groß' | 'sehr_groß';
  frequency:
    | 'einmalig'
    | 'wöchentlich'
    | 'monatlich'
    | 'vierteljährlich'
    | 'halbjährlich'
    | 'nach_bedarf';
  animalName?: string;
  animalAge?: number;
  breed?: string;
  budgetRange?: 'bis_30' | '30_50' | '50_80' | '80_120' | 'über_120';
  location?: 'bei_mir' | 'beim_pfleger' | 'mobil' | 'flexibel';
  temperament?: 'ruhig' | 'lebhaft' | 'ängstlich' | 'aggressiv' | 'unbekannt';
  healthStatus?: string;
  specialRequirements?: string;
  additionalInfo?: string;
}

// Coaching-spezifische Daten
export interface CoachingData extends BaseSubcategoryData {
  subcategory: 'Coaching';
  serviceType:
    | 'life_coaching'
    | 'business_coaching'
    | 'career_coaching'
    | 'executive_coaching'
    | 'health_coaching'
    | 'relationship_coaching'
    | 'fitness_coaching'
    | 'mindfulness_coaching'
    | 'spiritual_coaching'
    | 'financial_coaching';
  sessionType: 'einzelsession' | 'gruppensession' | 'online' | 'hybrid' | 'intensive';
  duration: '60' | '90' | '120' | '180' | 'ganztag';
  frequency:
    | 'einmalig'
    | 'wöchentlich'
    | 'zweiwöchentlich'
    | 'monatlich'
    | 'intensiv'
    | 'nach_bedarf';
  sessionCount?: number;
  budgetRange?: 'bis_80' | '80_120' | '120_180' | '180_250' | 'über_250';
  goals?: string[];
  experience?: 'keine' | 'wenig' | 'einige' | 'viel';
  qualifications?: 'nicht_wichtig' | 'zertifiziert' | 'psychologie' | 'business' | 'spezialisiert';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'wochenende' | 'flexibel';
  currentSituation?: string;
  expectations?: string;
  additionalInfo?: string;
}

// Fitness-Training-spezifische Daten
export interface FitnessTrainingData extends BaseSubcategoryData {
  subcategory: 'Fitness-Training';
  serviceType:
    | 'personal_training'
    | 'gruppenfitness'
    | 'online_training'
    | 'ernährungsberatung'
    | 'trainingsplan'
    | 'reha_training';
  fitnessLevel: 'anfänger' | 'fortgeschritten' | 'profi';
  trainingType:
    | 'krafttraining'
    | 'ausdauer'
    | 'yoga'
    | 'pilates'
    | 'functional'
    | 'crossfit'
    | 'boxen'
    | 'tanz'
    | 'stretching'
    | 'reha';
  frequency: 'einmalig' | 'wöchentlich' | 'mehrmals_woche' | 'täglich' | 'nach_bedarf';
  duration: '30' | '45' | '60' | '90' | '120';
  location: 'bei_mir' | 'im_studio' | 'outdoor' | 'online' | 'flexibel';
  goals?: string[];
  budgetRange?: 'bis_50' | '50_80' | '80_120' | '120_200' | 'über_200';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'wochenende' | 'flexibel';
  specialRequirements?: string;
  additionalInfo?: string;
}

// Musikunterricht-spezifische Daten
export interface MusikunterrichtData extends BaseSubcategoryData {
  instrument: string;
  skillLevel: string;
  lessonType: string;
  durationPerLesson: string;
  pricePerLesson: string;
  ageGroup?: string[];
  musicStyle?: string[];
  availability?: string[];
  location?: string;
  instrumentProvided?: string;
  qualifications?: string[];
  specialization?: string[];
  onlineCapable?: string;
  specialNotes?: string;
}

export interface EventplanungData extends BaseSubcategoryData {
  eventType: string;
  eventSize: string;
  budgetRange: string;
  serviceType: string;
  locationType: string;
  guestCount?: number;
  cateringType?: string;
  projectDescription: string;
  // Legacy fields for backward compatibility
  endTime?: string;
  budget?: string;
  date?: string;
  eventDate?: string;
  startTime?: string;
  location?: string;
  services?: string[];
  duration?: string;
  specialRequirements?: string[];
}

export interface FotografData extends BaseSubcategoryData {
  photographyType: string;
  sessionDuration: string;
  pricePerHour: string;
  deliverables?: string[];
  equipment?: string[];
  location?: string;
  specialization?: string[];
  specialNotes?: string;
}

export interface GraphikdesignerData extends BaseSubcategoryData {
  designType: string;
  projectScope: string;
  deliverables?: string[];
  timeline?: string;
  priceRange?: string;
  revisions?: string;
  specialization?: string[];
  specialNotes?: string;
}

export interface GärtnerData extends BaseSubcategoryData {
  serviceType: string;
  gardenSize: string;
  gardenType?: string[];
  frequency?: string;
  season?: string;
  urgency?: string;
  budgetRange?: string;
  gardenArea?: number;
  lawnArea?: number;
  bedArea?: number;
  treeCount?: number;
  hedgeLength?: number;
  preferredDateTime?: string;
  contactPerson?: string;
  specialRequirements?: string;
  estimatedDuration?: string;
  waterConnection?: string;
  powerConnection?: string;
  access?: string;
  parking?: string;
  plantTypes?: string[];
  additionalServices?: string[];
  projectDescription?: string;
  gardenWishes?: string;
  problemAreas?: string;
  soilCondition?: string;
  lightConditions?: string;
  accessInstructions?: string;
  specialRequests?: string;
  pets?: string;
  children?: string;
  materialDelivery?: string;
  organic?: string;
  sustainable?: string;
  warranty?: string;
  estimate?: string;
  selfWork?: string;
  maintenanceContract?: string;
  // Legacy fields for backward compatibility
  seasonality?: string;
  equipment?: string[];
  specialization?: string[];
  priceRange?: string;
  availability?: string[];
  specialNotes?: string;
}

export interface HeizungData extends BaseSubcategoryData {
  serviceType: string;
  systemType: string;
  heatingType?: string;
  buildingType?: string;
  urgency?: string;
  certification?: boolean;
  warranty?: string;
  specialNotes?: string;
}

export interface MarketingberaterData extends BaseSubcategoryData {
  serviceType: string;
  marketingChannel: string;
  targetAudience?: string;
  budget?: string;
  timeline?: string;
  deliverables?: string[];
  experience?: string[];
  specialization?: string[];
  specialNotes?: string;
}

export interface MusikerData extends BaseSubcategoryData {
  musicType: string;
  instruments?: string[];
  eventType?: string[];
  duration?: string;
  priceRange?: string;
  equipment?: string[];
  repertoire?: string[];
  specialNotes?: string;
}

export interface PhysiotherapieData extends BaseSubcategoryData {
  treatmentType: string;
  specialization?: string[];
  sessionDuration?: string;
  pricePerSession?: string;
  location?: string;
  qualification?: string[];
  equipment?: string[];
  specialNotes?: string;
}

export interface SicherheitsdienstData extends BaseSubcategoryData {
  serviceType: string;
  location?: string;
  duration?: string;
  personnel?: string;
  equipment?: string[];
  certification?: string[];
  availability?: string[];
  specialNotes?: string;
}

export interface TexterData extends BaseSubcategoryData {
  textType: string;
  wordCount?: string;
  language?: string;
  specialization?: string[];
  deadline?: string;
  pricePerWord?: string;
  revisions?: string;
  specialNotes?: string;
}

export interface UmzugshelferData extends BaseSubcategoryData {
  serviceType: string;
  moveSize?: string;
  distance?: string;
  floors?: string;
  equipment?: string[];
  duration?: string;
  priceType?: string;
  specialNotes?: string;
}

export interface VideografData extends BaseSubcategoryData {
  videoType: string;
  duration?: string;
  location?: string;
  equipment?: string[];
  deliverables?: string[];
  priceRange?: string;
  timeline?: string;
  specialNotes?: string;
}

export interface ÜbersetzerData extends BaseSubcategoryData {
  sourceLanguage: string;
  targetLanguage: string;
  textType?: string;
  wordCount?: string;
  specialization?: string[];
  deadline?: string;
  pricePerWord?: string;
  specialNotes?: string;
}

// Union Type für alle Unterkategorien
export type SubcategoryData =
  | MalerData
  | ElektrikerData
  | KlempnerData
  | GartenData
  | UmzugData
  | ITData
  | TischlerData
  | HeizungSanitärData
  | FliesenlegerData
  | DachdeckerData
  | MaurerData
  | TrockenbauData
  | SchreinerData
  | ZimmererData
  | BodenlegerData
  | GlaserData
  | SchlosserData
  | MetallbauerData
  | FensterTürenbauData
  | ReinigungskraftData
  | HaushaltshilfeData
  | FensterputzerData
  | EntrümpelungData
  | HausmeisterdienstData
  | TeppichreinigungData
  | BodenreinigungData
  | HausreinigungData
  | MöbelmontageData
  | FahrerData
  | KurierdiensteData
  | TransportdienstleistungenData
  | LagerlogistikData
  | MietkochData
  | MietkellnerData
  | WebentwicklungData
  | SoftwareentwicklungData
  | AppEntwicklungData
  | ITSupportData
  | NetzwerkadministrationData
  | DatenbankentwicklungData
  | ITBeratungData
  | WebdesignData
  | UXUIDesignData
  | SystemintegrationData
  | CloudComputingData
  | CybersecurityData
  | OnlineMarketingData
  | SocialMediaMarketingData
  | ContentMarketingData
  | BuchhaltungData
  | SteuerberatungData
  | RechtsberatungData
  | FinanzberatungData
  | VersicherungsberatungData
  | TierbetreuungData
  | GartenpflegeData
  | LandschaftsgärtnerData
  | HundetrainerData
  | CateringData
  | SeniorenbetreuungData
  | KinderbetreuungData
  | MassageData
  | NachhilfeData
  | DJServiceData
  | MontageserviceData
  | TierpflegeData
  | CoachingData
  | FitnessTrainingData
  | BaumpflegeData
  | WinterdienstData
  | SprachunterrichtData
  | MusikunterrichtData
  | GartengestaltungData
  | AutoreparaturData
  | AutowäscheData
  | EventplanungData
  | FotografData
  | GraphikdesignerData
  | GärtnerData
  | HeizungData
  | MarketingberaterData
  | MusikerData
  | PhysiotherapieData
  | SicherheitsdienstData
  | TexterData
  | UmzugshelferData
  | VideografData
  | ÜbersetzerData;

// Hilfsfunktion zur Typprüfung
export function getSubcategoryType(subcategory: string): string {
  const mapping: { [key: string]: string } = {
    'Maler & Lackierer': 'maler',
    Elektriker: 'elektriker',
    Klempner: 'klempner',
    'Garten und Landschaftspflege': 'garten',
    Umzugshelfer: 'umzug',
    'IT-Support': 'it',
    Webentwicklung: 'webentwicklung',
    Softwareentwicklung: 'softwareentwicklung',
    'App-Entwicklung': 'app',
    Tischler: 'tischler',
    'Heizungsbau & Sanitär': 'heizung',
    Fliesenleger: 'fliesen',
    Dachdecker: 'dachdecker',
    Maurer: 'maurer',
    Trockenbauer: 'trockenbau',
    Schreiner: 'schreiner',
    Zimmerer: 'zimmerer',
    Bodenleger: 'bodenleger',
    Glaser: 'glaser',
    Schlosser: 'schlosser',
    Metallbauer: 'metallbauer',
    'Fenster- & Türenbauer': 'fenster',
    Reinigungskraft: 'reinigung',
    Haushaltshilfe: 'haushalt',
    Fensterputzer: 'fensterputzer',
    Entrümpelung: 'entrümpelung',
    Hausmeisterdienste: 'hausmeister',
    Teppichreinigung: 'teppich',
    Bodenreinigung: 'bodenreinigung',
    Hausreinigung: 'hausreinigung',
    Möbelmontage: 'möbel',
    Fahrer: 'fahrer',
    Kurierdienste: 'kurier',
    Transportdienstleistungen: 'transport',
    Lagerlogistik: 'lager',
    Mietkoch: 'koch',
    Mietkellner: 'kellner',
    Netzwerkadministration: 'netzwerk',
    Datenbankentwicklung: 'datenbank',
    'IT-Beratung': 'itberatung',
    Webdesign: 'webdesign',
    'UX/UI Design': 'uxui',
    Systemintegration: 'systemintegration',
    'Cloud Computing': 'cloud',
    Cybersecurity: 'cybersecurity',
    'Online Marketing': 'onlinemarketing',
    'Social Media Marketing': 'socialmedia',
    'Content Marketing': 'contentmarketing',
    Buchhaltung: 'buchhaltung',
    'Steuerberatung (freiberuflich)': 'steuer',
    'Rechtsberatung (freiberuflich)': 'recht',
    Finanzberatung: 'finanzen',
    Versicherungsberatung: 'versicherung',
    'Tierbetreuung (Hundesitter etc.)': 'tier',
    Gartenpflege: 'gartenpflege',
    'Landschaftsgärtner (klein)': 'landschaft',
    'Hundetrainer (freiberuflich)': 'hundetrainer',
    Kinderbetreuung: 'kinderbetreuung',
  };
  return mapping[subcategory] || 'default';
}

// Kategorie-spezifische Validierung
export function validateSubcategoryData(data: SubcategoryData): string[] {
  const errors: string[] = [];

  switch (data.subcategory) {
    case 'Maler & Lackierer':
      const malerData = data as MalerData;
      if (!malerData.roomType) errors.push('Raumtyp ist erforderlich');
      if (!malerData.paintType) errors.push('Farbart ist erforderlich');
      if (!malerData.materialProvided) errors.push('Materialbereitstellung ist erforderlich');
      break;

    case 'Elektriker':
      const elektrikerData = data as ElektrikerData;
      if (!elektrikerData.serviceType) errors.push('Serviceart ist erforderlich');
      if (!elektrikerData.workType) errors.push('Arbeitstyp ist erforderlich');
      if (!elektrikerData.urgency) errors.push('Dringlichkeit ist erforderlich');
      break;

    // Weitere Validierungen...
  }

  return errors;
}

// Friseur-spezifische Daten
export interface FriseurData extends BaseSubcategoryData {
  subcategory: 'Friseur';
  serviceType:
    | 'haarschnitt'
    | 'färben'
    | 'tönen'
    | 'strähnchen'
    | 'dauerwelle'
    | 'glätten'
    | 'styling'
    | 'hochsteckfrisur'
    | 'bartpflege'
    | 'augenbrauen'
    | 'haarverlängerung'
    | 'haarpflege';
  hairLength: 'kurz' | 'mittel' | 'lang' | 'sehr_lang';
  hairType: 'glatt' | 'wellig' | 'lockig' | 'kraus';
  occasion?:
    | 'alltag'
    | 'hochzeit'
    | 'party'
    | 'business'
    | 'date'
    | 'fotoshooting'
    | 'special_event';
  preferredDate?: string;
  budgetRange?: 'bis_30' | '30_50' | '50_80' | '80_120' | '120_200' | 'über_200';
  location?: 'salon' | 'zuhause' | 'flexibel';
  gender?: 'weiblich' | 'männlich' | 'egal';
  timePreference?: 'vormittags' | 'nachmittags' | 'abends' | 'wochenende' | 'flexibel';
  wishes?: string;
  allergies?: string;
  additionalInfo?: string;
}

// Baumpflege-spezifische Daten
export interface BaumpflegeData extends BaseSubcategoryData {
  subcategory: 'Baumpflege';
  serviceType: string;
  treeHeight: string;
  treeType?: string;
  numberOfTrees?: string;
  urgency?: string;
  pricePerTree: string;
  minimumPrice?: string;
  includesDisposal?: string;
  workingHours?: string[];
  certifications?: string[];
  specialNotes?: string;
}

// Winterdienst-spezifische Daten
export interface WinterdienstData extends BaseSubcategoryData {
  serviceType: string;
  areaSize: string;
  surfaceType?: string[];
  frequency?: string;
  workingTimes?: string[];
  equipment?: string[];
  pricePerService: string;
  minimumPrice?: string;
  seasonContract?: string;
  emergencyService?: string;
  materialIncluded?: string;
  availability?: string;
  specialNotes?: string;
}

// Sprachunterricht-spezifische Daten
export interface SprachunterrichtData extends BaseSubcategoryData {
  language: string;
  teachingLevel: string;
  lessonType: string;
  durationPerLesson: string;
  pricePerLesson: string;
  groupSize?: string;
  teachingMethod?: string[];
  availability?: string[];
  materials?: string;
  qualifications?: string[];
  specialization?: string[];
  onlineCapable?: string;
  specialNotes?: string;
}

// Gartengestaltung-spezifische Daten
export interface GartengestaltungData extends BaseSubcategoryData {
  projectType: string;
  gardenSize: string;
  budget: string;
  desiredElements?: string[];
  gardenStyle?: string;
  soilCondition?: string;
  lightConditions?: string;
  maintenanceLevel?: string;
  additionalServices?: string[];
  timeframe?: string;
  serviceScope?: string;
  specialRequests?: string;
}

// Autoreparatur-spezifische Daten
export interface AutoreparaturData extends BaseSubcategoryData {
  serviceType: string;
  vehicleType: string;
  repairType: string;
  urgency?: string;
  priceRange?: string;
  warranty?: string;
  pickupService?: string;
  specialization?: string[];
  workingHours?: string[];
  location?: string;
  certifications?: string[];
  specialNotes?: string;
}

// Autowäsche-spezifische Daten
export interface AutowäscheData extends BaseSubcategoryData {
  serviceType: string;
  vehicleType: string;
  washType: string;
  location?: string;
  priceRange?: string;
  additionalServices?: string[];
  frequency?: string;
  workingHours?: string[];
  pickupService?: string;
  ecoFriendly?: string;
  specialNotes?: string;
}

// Kinderbetreuung-spezifische Daten
export interface KinderbetreuungData extends BaseSubcategoryData {
  childAge: string;
  serviceType: string;
  duration: string;
  location: string;
  specialNeeds?: string;
  activities?: string[];
  pricePerHour: string;
  availability?: string[];
  qualifications?: string[];
  languages?: string[];
  specialNotes?: string;
}
