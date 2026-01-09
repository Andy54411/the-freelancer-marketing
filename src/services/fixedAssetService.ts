/**
 * Fixed Asset Service - Anlagenbuchhaltung nach §7 EStG
 * 
 * Verwaltet:
 * - Anlagegüter (Wirtschaftsgüter des Anlagevermögens)
 * - AfA-Berechnung (Absetzung für Abnutzung)
 * - GWG-Behandlung (Geringwertige Wirtschaftsgüter nach §6 Abs. 2 EStG)
 * - Sammelposten-Verwaltung
 * 
 * Gesetzliche Grundlagen:
 * - §7 EStG: AfA (lineare/degressive Abschreibung)
 * - §6 Abs. 2 EStG: GWG bis 800€ netto
 * - §6 Abs. 2a EStG: Sammelposten 250-1000€ netto
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

// ============================================================================
// TYPES
// ============================================================================

export type DepreciationMethod = 'linear' | 'degressiv' | 'gwg' | 'sammelposten';
export type AssetStatus = 'active' | 'sold' | 'scrapped' | 'donated';

export interface FixedAsset {
  id?: string;
  companyId: string;
  
  // Stammdaten
  name: string;
  description?: string;
  inventoryNumber: string;
  category: AssetCategory;
  location?: string;
  
  // Anschaffung
  purchaseDate: Date;
  purchasePrice: number; // Netto in Cent
  vendor?: string;
  invoiceNumber?: string;
  expenseId?: string; // Verknüpfung zu Ausgabe
  
  // AfA-Parameter nach §7 EStG
  usefulLife: number; // Nutzungsdauer in Monaten
  depreciationMethod: DepreciationMethod;
  depreciationRate: number; // AfA-Satz pro Jahr (z.B. 0.3333 für 3 Jahre)
  residualValue?: number; // Restwert in Cent (default 0)
  
  // GWG-Behandlung nach §6 Abs. 2 EStG
  isGwg: boolean; // Bis 800€ netto
  isSammelposten: boolean; // 250-1000€ netto, 5 Jahre à 20%
  
  // Tracking
  currentBookValue: number; // Aktueller Buchwert in Cent
  totalDepreciation: number; // Kumulierte AfA in Cent
  
  // Status
  status: AssetStatus;
  disposalDate?: Date;
  disposalPrice?: number; // Veräußerungspreis in Cent
  disposalType?: 'sale' | 'scrap' | 'donation';
  disposalGainLoss?: number; // Veräußerungsgewinn/-verlust in Cent
  
  // DATEV-Konten (SKR03)
  datevAccountNumber: string; // z.B. 0420 für Maschinen
  afaAccountNumber: string; // z.B. 6921 für AfA Maschinen
  
  // GoBD
  isLocked: boolean;
  lockedAt?: Date;
  
  // Metadaten
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type AssetCategory = 
  | 'COMPUTER'           // EDV-Anlagen (0420)
  | 'SOFTWARE'           // EDV-Software (0027)
  | 'FURNITURE'          // Büromöbel (0430)
  | 'VEHICLE'            // Fahrzeuge (0520)
  | 'MACHINERY'          // Maschinen (0440)
  | 'TOOLS'              // Werkzeuge (0460)
  | 'BUILDING'           // Gebäude (0210)
  | 'LAND'               // Grundstücke (0200)
  | 'OTHER';             // Sonstige (0490)

export interface DepreciationSchedule {
  year: number;
  month: number;
  openingValue: number; // Buchwert zu Jahresbeginn
  depreciation: number; // AfA für den Monat/Jahr
  closingValue: number; // Buchwert nach AfA
  cumulativeDepreciation: number; // Kumulierte AfA
  isPartialYear: boolean; // Zeitanteilige AfA
}

export interface AssetSummary {
  totalAssets: number;
  totalPurchaseValue: number;
  totalBookValue: number;
  totalDepreciation: number;
  yearlyDepreciation: number;
  byCategory: Record<AssetCategory, {
    count: number;
    purchaseValue: number;
    bookValue: number;
  }>;
  gwgCount: number;
  sammelpostenCount: number;
}

// ============================================================================
// AfA-TABELLEN NACH BMF
// ============================================================================

/**
 * Betriebsgewöhnliche Nutzungsdauer nach amtlichen AfA-Tabellen
 * Quelle: BMF AfA-Tabellen
 */
export const AFA_TABLE: Record<AssetCategory, { years: number; datevAccount: string; afaAccount: string }> = {
  'COMPUTER': { years: 3, datevAccount: '0420', afaAccount: '6921' },
  'SOFTWARE': { years: 3, datevAccount: '0027', afaAccount: '6920' },
  'FURNITURE': { years: 13, datevAccount: '0430', afaAccount: '6922' },
  'VEHICLE': { years: 6, datevAccount: '0520', afaAccount: '6923' },
  'MACHINERY': { years: 10, datevAccount: '0440', afaAccount: '6924' },
  'TOOLS': { years: 8, datevAccount: '0460', afaAccount: '6925' },
  'BUILDING': { years: 33, datevAccount: '0210', afaAccount: '6910' },
  'LAND': { years: 0, datevAccount: '0200', afaAccount: '' }, // Keine AfA für Grundstücke
  'OTHER': { years: 10, datevAccount: '0490', afaAccount: '6929' },
};

// ============================================================================
// FIXED ASSET SERVICE
// ============================================================================

export class FixedAssetService {
  
  /**
   * Erstellt ein neues Anlagegut
   */
  static async createAsset(
    companyId: string,
    assetData: Omit<FixedAsset, 'id' | 'companyId' | 'currentBookValue' | 'totalDepreciation' | 'isLocked' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    // GWG/Sammelposten automatisch bestimmen
    const netPrice = assetData.purchasePrice; // bereits in Cent
    const gwgTreatment = this.determineGwgTreatment(netPrice);
    
    // AfA-Parameter aus Tabelle holen
    const afaInfo = AFA_TABLE[assetData.category];
    const usefulLife = assetData.usefulLife || (afaInfo.years * 12);
    
    // Initiale Werte berechnen
    const initialBookValue = assetData.purchasePrice;
    
    const asset: Omit<FixedAsset, 'id'> = {
      ...assetData,
      companyId,
      usefulLife,
      depreciationRate: usefulLife > 0 ? 1 / (usefulLife / 12) : 0,
      isGwg: gwgTreatment === 'gwg' || gwgTreatment === 'sofort',
      isSammelposten: gwgTreatment === 'sammelposten',
      currentBookValue: gwgTreatment === 'sofort' ? 0 : initialBookValue,
      totalDepreciation: gwgTreatment === 'sofort' ? assetData.purchasePrice : 0,
      status: assetData.status || 'active',
      datevAccountNumber: assetData.datevAccountNumber || afaInfo.datevAccount,
      afaAccountNumber: assetData.afaAccountNumber || afaInfo.afaAccount,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Bei GWG-Sofortabschreibung: depreciationMethod anpassen
    if (gwgTreatment === 'sofort') {
      asset.depreciationMethod = 'gwg';
    } else if (gwgTreatment === 'sammelposten') {
      asset.depreciationMethod = 'sammelposten';
      asset.usefulLife = 60; // 5 Jahre
      asset.depreciationRate = 0.2; // 20% pro Jahr
    }
    
    const assetsRef = collection(db, 'companies', companyId, 'fixedAssets');
    const docRef = await addDoc(assetsRef, {
      ...asset,
      purchaseDate: Timestamp.fromDate(asset.purchaseDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return docRef.id;
  }
  
  /**
   * Bestimmt GWG-Behandlung nach §6 Abs. 2 EStG
   */
  static determineGwgTreatment(netPriceInCent: number): 'sofort' | 'gwg' | 'sammelposten' | 'normal' {
    const netPrice = netPriceInCent / 100; // In Euro umrechnen
    
    if (netPrice <= 250) {
      return 'sofort'; // Sofort als Betriebsausgabe
    }
    if (netPrice <= 800) {
      return 'gwg'; // GWG - Wahlrecht: sofort oder normal
    }
    if (netPrice <= 1000) {
      return 'sammelposten'; // Optional: Sammelposten über 5 Jahre
    }
    return 'normal'; // Reguläre AfA nach Nutzungsdauer
  }
  
  /**
   * Lädt alle Anlagegüter eines Unternehmens
   */
  static async getAssetsByCompany(companyId: string, status?: AssetStatus): Promise<FixedAsset[]> {
    const assetsRef = collection(db, 'companies', companyId, 'fixedAssets');
    
    let q;
    if (status) {
      q = query(assetsRef, where('status', '==', status), orderBy('purchaseDate', 'desc'));
    } else {
      q = query(assetsRef, orderBy('purchaseDate', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as Record<string, unknown>;
      return {
        id: docSnapshot.id,
        ...data,
        purchaseDate: (data.purchaseDate as { toDate: () => Date })?.toDate() || new Date(),
        disposalDate: (data.disposalDate as { toDate: () => Date } | undefined)?.toDate(),
        lockedAt: (data.lockedAt as { toDate: () => Date } | undefined)?.toDate(),
        createdAt: (data.createdAt as { toDate: () => Date })?.toDate() || new Date(),
        updatedAt: (data.updatedAt as { toDate: () => Date })?.toDate() || new Date(),
      } as FixedAsset;
    });
  }
  
  /**
   * Lädt ein einzelnes Anlagegut
   */
  static async getAsset(companyId: string, assetId: string): Promise<FixedAsset | null> {
    const assetRef = doc(db, 'companies', companyId, 'fixedAssets', assetId);
    const assetDoc = await getDoc(assetRef);
    
    if (!assetDoc.exists()) {
      return null;
    }
    
    const data = assetDoc.data();
    return {
      id: assetDoc.id,
      ...data,
      purchaseDate: data.purchaseDate?.toDate() || new Date(),
      disposalDate: data.disposalDate?.toDate(),
      lockedAt: data.lockedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as FixedAsset;
  }
  
  /**
   * Aktualisiert ein Anlagegut
   */
  static async updateAsset(
    companyId: string,
    assetId: string,
    updates: Partial<FixedAsset>
  ): Promise<void> {
    const assetRef = doc(db, 'companies', companyId, 'fixedAssets', assetId);
    
    // Prüfe ob gesperrt
    const asset = await this.getAsset(companyId, assetId);
    if (asset?.isLocked) {
      throw new Error('Anlagegut ist GoBD-gesperrt und kann nicht bearbeitet werden');
    }
    
    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    
    // Datum-Felder konvertieren
    if (updates.purchaseDate) {
      updateData.purchaseDate = Timestamp.fromDate(updates.purchaseDate);
    }
    if (updates.disposalDate) {
      updateData.disposalDate = Timestamp.fromDate(updates.disposalDate);
    }
    
    await updateDoc(assetRef, updateData);
  }
  
  /**
   * Löscht ein Anlagegut (nur wenn nicht gesperrt)
   */
  static async deleteAsset(companyId: string, assetId: string): Promise<void> {
    const asset = await this.getAsset(companyId, assetId);
    if (asset?.isLocked) {
      throw new Error('Anlagegut ist GoBD-gesperrt und kann nicht gelöscht werden');
    }
    
    const assetRef = doc(db, 'companies', companyId, 'fixedAssets', assetId);
    await deleteDoc(assetRef);
  }
  
  /**
   * Berechnet AfA für ein Jahr
   */
  static calculateYearlyDepreciation(asset: FixedAsset, year: number): number {
    const purchaseDate = asset.purchaseDate;
    const purchaseYear = purchaseDate.getFullYear();
    const purchasePrice = asset.purchasePrice / 100; // In Euro
    
    // Grundstücke: keine AfA
    if (asset.category === 'LAND') {
      return 0;
    }
    
    // GWG: Volle Abschreibung im Anschaffungsjahr
    if (asset.isGwg && purchaseYear === year) {
      return purchasePrice;
    }
    
    // GWG: In Folgejahren keine AfA mehr
    if (asset.isGwg && purchaseYear < year) {
      return 0;
    }
    
    // Sammelposten: 20% pro Jahr über 5 Jahre
    if (asset.isSammelposten) {
      const yearsActive = year - purchaseYear;
      if (yearsActive >= 0 && yearsActive < 5) {
        return purchasePrice * 0.2;
      }
      return 0;
    }
    
    // Lineare AfA
    if (asset.depreciationMethod === 'linear') {
      const usefulLifeMonths = asset.usefulLife || 36;
      const monthlyAfa = purchasePrice / usefulLifeMonths;
      
      // Zeitanteilig im Anschaffungsjahr
      if (purchaseYear === year) {
        const monthsActive = 12 - purchaseDate.getMonth();
        return Math.round(monthlyAfa * monthsActive * 100) / 100;
      }
      
      // Prüfe ob noch Restbuchwert vorhanden
      const monthsSincePurchase = (year - purchaseYear) * 12;
      if (monthsSincePurchase >= usefulLifeMonths) {
        return 0; // Vollständig abgeschrieben
      }
      
      // Letztes Jahr: nur Restbetrag
      const remainingMonths = usefulLifeMonths - monthsSincePurchase;
      if (remainingMonths < 12) {
        return Math.round(monthlyAfa * remainingMonths * 100) / 100;
      }
      
      // Volles Jahr
      return Math.round(monthlyAfa * 12 * 100) / 100;
    }
    
    // Degressive AfA (§7 Abs. 2 EStG)
    if (asset.depreciationMethod === 'degressiv') {
      const degressivRate = Math.min(asset.depreciationRate * 3, 0.3); // Max 30%
      const bookValueStartOfYear = this.calculateBookValueAtDate(
        asset,
        new Date(year, 0, 1)
      );
      
      // Zeitanteilig im Anschaffungsjahr
      if (purchaseYear === year) {
        const monthsActive = 12 - purchaseDate.getMonth();
        return Math.round(bookValueStartOfYear * degressivRate * (monthsActive / 12) * 100) / 100;
      }
      
      return Math.round(bookValueStartOfYear * degressivRate * 100) / 100;
    }
    
    return 0;
  }
  
  /**
   * Berechnet Buchwert zu einem bestimmten Datum
   */
  static calculateBookValueAtDate(asset: FixedAsset, date: Date): number {
    const purchaseDate = asset.purchaseDate;
    const purchasePrice = asset.purchasePrice / 100;
    
    if (date < purchaseDate) {
      return 0;
    }
    
    // Grundstücke: kein Wertverlust
    if (asset.category === 'LAND') {
      return purchasePrice;
    }
    
    // GWG: sofort auf 0
    if (asset.isGwg) {
      return 0;
    }
    
    // Sammelposten: 20% pro Jahr
    if (asset.isSammelposten) {
      const yearsActive = date.getFullYear() - purchaseDate.getFullYear();
      const depreciated = Math.min(yearsActive * 0.2, 1) * purchasePrice;
      return Math.max(0, purchasePrice - depreciated);
    }
    
    // Lineare AfA
    const usefulLifeMonths = asset.usefulLife || 36;
    const monthlyAfa = purchasePrice / usefulLifeMonths;
    
    const monthsSincePurchase = 
      (date.getFullYear() - purchaseDate.getFullYear()) * 12 +
      (date.getMonth() - purchaseDate.getMonth());
    
    const totalDepreciation = Math.min(monthsSincePurchase * monthlyAfa, purchasePrice);
    
    return Math.max(0, Math.round((purchasePrice - totalDepreciation) * 100) / 100);
  }
  
  /**
   * Erstellt einen AfA-Plan für ein Anlagegut
   */
  static generateDepreciationSchedule(asset: FixedAsset): DepreciationSchedule[] {
    const schedule: DepreciationSchedule[] = [];
    const purchaseDate = asset.purchaseDate;
    const purchaseYear = purchaseDate.getFullYear();
    const purchasePrice = asset.purchasePrice / 100;
    
    if (asset.category === 'LAND') {
      return []; // Keine AfA für Grundstücke
    }
    
    // GWG: Nur ein Eintrag
    if (asset.isGwg) {
      schedule.push({
        year: purchaseYear,
        month: purchaseDate.getMonth() + 1,
        openingValue: purchasePrice,
        depreciation: purchasePrice,
        closingValue: 0,
        cumulativeDepreciation: purchasePrice,
        isPartialYear: true,
      });
      return schedule;
    }
    
    // Sammelposten: 5 Jahre
    if (asset.isSammelposten) {
      let cumulative = 0;
      for (let i = 0; i < 5; i++) {
        const yearlyAfa = purchasePrice * 0.2;
        cumulative += yearlyAfa;
        schedule.push({
          year: purchaseYear + i,
          month: 12,
          openingValue: purchasePrice - (i * yearlyAfa),
          depreciation: yearlyAfa,
          closingValue: purchasePrice - cumulative,
          cumulativeDepreciation: cumulative,
          isPartialYear: i === 0,
        });
      }
      return schedule;
    }
    
    // Lineare AfA
    const usefulLifeMonths = asset.usefulLife || 36;
    const usefulLifeYears = Math.ceil(usefulLifeMonths / 12);
    const monthlyAfa = purchasePrice / usefulLifeMonths;
    
    let cumulative = 0;
    let currentValue = purchasePrice;
    
    for (let i = 0; i <= usefulLifeYears; i++) {
      const year = purchaseYear + i;
      let yearlyAfa: number;
      let isPartial = false;
      
      if (i === 0) {
        // Erstes Jahr: zeitanteilig
        const monthsActive = 12 - purchaseDate.getMonth();
        yearlyAfa = monthlyAfa * monthsActive;
        isPartial = true;
      } else {
        // Folgende Jahre
        const remainingMonths = usefulLifeMonths - (i * 12) + purchaseDate.getMonth();
        if (remainingMonths <= 0) break;
        yearlyAfa = monthlyAfa * Math.min(12, remainingMonths);
        isPartial = remainingMonths < 12;
      }
      
      yearlyAfa = Math.round(yearlyAfa * 100) / 100;
      cumulative += yearlyAfa;
      const openingValue = currentValue;
      currentValue = Math.max(0, currentValue - yearlyAfa);
      
      schedule.push({
        year,
        month: 12,
        openingValue: Math.round(openingValue * 100) / 100,
        depreciation: yearlyAfa,
        closingValue: Math.round(currentValue * 100) / 100,
        cumulativeDepreciation: Math.round(cumulative * 100) / 100,
        isPartialYear: isPartial,
      });
    }
    
    return schedule;
  }
  
  /**
   * Berechnet Gesamtübersicht aller Anlagen
   */
  static async getAssetSummary(companyId: string, year: number): Promise<AssetSummary> {
    const assets = await this.getAssetsByCompany(companyId);
    const currentYear = year || new Date().getFullYear();
    
    const summary: AssetSummary = {
      totalAssets: 0,
      totalPurchaseValue: 0,
      totalBookValue: 0,
      totalDepreciation: 0,
      yearlyDepreciation: 0,
      byCategory: {} as Record<AssetCategory, { count: number; purchaseValue: number; bookValue: number }>,
      gwgCount: 0,
      sammelpostenCount: 0,
    };
    
    // Kategorien initialisieren
    const categories: AssetCategory[] = ['COMPUTER', 'SOFTWARE', 'FURNITURE', 'VEHICLE', 'MACHINERY', 'TOOLS', 'BUILDING', 'LAND', 'OTHER'];
    categories.forEach(cat => {
      summary.byCategory[cat] = { count: 0, purchaseValue: 0, bookValue: 0 };
    });
    
    for (const asset of assets) {
      if (asset.status !== 'active') continue;
      
      summary.totalAssets++;
      summary.totalPurchaseValue += asset.purchasePrice;
      
      const bookValue = this.calculateBookValueAtDate(asset, new Date()) * 100; // Zurück in Cent
      summary.totalBookValue += bookValue;
      summary.totalDepreciation += asset.purchasePrice - bookValue;
      
      const yearlyAfa = this.calculateYearlyDepreciation(asset, currentYear) * 100; // In Cent
      summary.yearlyDepreciation += yearlyAfa;
      
      // Pro Kategorie
      const cat = asset.category || 'OTHER';
      summary.byCategory[cat].count++;
      summary.byCategory[cat].purchaseValue += asset.purchasePrice;
      summary.byCategory[cat].bookValue += bookValue;
      
      if (asset.isGwg) summary.gwgCount++;
      if (asset.isSammelposten) summary.sammelpostenCount++;
    }
    
    return summary;
  }
  
  /**
   * Veräußert/Entsorgt ein Anlagegut
   */
  static async disposeAsset(
    companyId: string,
    assetId: string,
    disposalData: {
      disposalDate: Date;
      disposalType: 'sale' | 'scrap' | 'donation';
      disposalPrice?: number; // In Cent
    }
  ): Promise<void> {
    const asset = await this.getAsset(companyId, assetId);
    if (!asset) {
      throw new Error('Anlagegut nicht gefunden');
    }
    
    const bookValueAtDisposal = this.calculateBookValueAtDate(asset, disposalData.disposalDate) * 100;
    const disposalPrice = disposalData.disposalPrice || 0;
    const gainLoss = disposalPrice - bookValueAtDisposal;
    
    await this.updateAsset(companyId, assetId, {
      status: disposalData.disposalType === 'sale' ? 'sold' : 
              disposalData.disposalType === 'donation' ? 'donated' : 'scrapped',
      disposalDate: disposalData.disposalDate,
      disposalType: disposalData.disposalType,
      disposalPrice,
      disposalGainLoss: gainLoss,
      currentBookValue: 0,
    });
  }
  
  /**
   * Sperrt ein Anlagegut (GoBD)
   */
  static async lockAsset(companyId: string, assetId: string): Promise<void> {
    const assetRef = doc(db, 'companies', companyId, 'fixedAssets', assetId);
    await updateDoc(assetRef, {
      isLocked: true,
      lockedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
  
  /**
   * Generiert nächste Inventarnummer
   */
  static async generateInventoryNumber(companyId: string, category: AssetCategory): Promise<string> {
    const assets = await this.getAssetsByCompany(companyId);
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear().toString().substring(2);
    
    // Zähle bestehende Assets dieser Kategorie in diesem Jahr
    const sameYearSameCategory = assets.filter(a => 
      a.inventoryNumber?.startsWith(`${categoryPrefix}-${year}`)
    );
    
    const nextNumber = sameYearSameCategory.length + 1;
    return `${categoryPrefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }
}
