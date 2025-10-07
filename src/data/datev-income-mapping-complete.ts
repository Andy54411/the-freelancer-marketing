/**
 * DATEV Einnahmen-Kategorien Mapping System
 * 
 * Deutsche Geschäftskategorien für Einnahmen/Erlöse (INCOME-Konten)
 * Komplette manuelle Zuordnung aller 178 DATEV INCOME-Konten
 * 
 * Systematische Kategorisierung für deutsches EAR-System (Einnahmen-Ausgaben-Rechnung)
 */

// Typ-Definitionen für INCOME-Mappings
export interface DatevIncomeMapping {
  kontoNummer: string;
  kontoName: string;
  kategorie: 'umsatzerlöse' | 'steuerfreie-umsätze' | 'erlöse-7prozent' | 'erlöse-19prozent' | 'provisionen' | 'erlösschmälerungen' | 'sonstige-erträge';
  beschreibung: string;
  beispiele: string[];
}

// Hauptdatenbank: Alle DATEV INCOME-Konten mit deren Kategorien (178 Einträge)
const datevIncomeCategories: DatevIncomeMapping[] = [
  { kontoNummer: '4000', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4001', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4002', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4003', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4004', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4005', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4006', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4007', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4008', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4009', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4010', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4011', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4012', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4013', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4014', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4015', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4016', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4017', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4018', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4019', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4020', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4021', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4022', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4023', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4024', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4025', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4026', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4027', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4028', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4029', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4030', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4031', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4032', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4033', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4034', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4035', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4036', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4037', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4038', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4039', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4040', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4041', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4042', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4043', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4044', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4045', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4046', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4047', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4048', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4049', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4050', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4051', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4052', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4053', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4054', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4055', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4056', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4057', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4058', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4059', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4060', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4061', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4062', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4063', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4064', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4065', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4066', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4067', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4068', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4069', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4070', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4071', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4072', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4073', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4074', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4075', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4076', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4077', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4078', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4079', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4080', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4081', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4082', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4083', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4084', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4085', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4086', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4087', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4088', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4089', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4090', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4091', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4092', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4093', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4094', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4095', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4096', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4097', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4098', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4099', kontoName: 'Umsatzerlöse', kategorie: 'umsatzerlöse', beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen', beispiele: ["Verkaufserlöse", "Dienstleistungserlöse", "Hauptgeschäft"] },
  { kontoNummer: '4100', kontoName: 'Steuerfreie Umsätze § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4101', kontoName: 'Steuerfreie Umsätze § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4102', kontoName: 'Steuerfreie Umsätze § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4103', kontoName: 'Steuerfreie Umsätze § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4104', kontoName: 'Steuerfreie Umsätze § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4110', kontoName: 'Sonstige steuerfreie Umsätze Inland', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4120', kontoName: 'Steuerfreie Erlöse Drittland', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4125', kontoName: 'steuerfreie EU Erlöse', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4136', kontoName: 'Umsätze nach §§ 25 und 25a UStG 19 %  USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4200', kontoName: 'Erlöse', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4300', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4301', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4302', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4303', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4304', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4305', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4306', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4307', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4308', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4309', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4334', kontoName: 'Erlöse 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4337', kontoName: 'Erlöse aus Leistungen nach § 13 b UStG', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4338', kontoName: 'Nicht steuerbare Umsätze Drittland', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4400', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4401', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4402', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4403', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4404', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4405', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4406', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4407', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4408', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4409', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4410', kontoName: 'Erlöse 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4510', kontoName: 'Erlöse Abfallverwertung', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4520', kontoName: 'Erlöse Leergut', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4560', kontoName: 'Provisionsumsätze', kategorie: 'provisionen', beschreibung: 'Erlöse aus Vermittlungsgeschäften', beispiele: ["Provisionen", "Vermittlung", "Maklergebühren"] },
  { kontoNummer: '4564', kontoName: 'Provisionsumsätze steuerfrei § 4 Nr. 8ff', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4566', kontoName: 'Provisionsumsätze 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4569', kontoName: 'Provisionsumsätze 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4570', kontoName: 'Provisionen sonstige Erträge', kategorie: 'provisionen', beschreibung: 'Erlöse aus Vermittlungsgeschäften', beispiele: ["Provisionen", "Vermittlung", "Maklergebühren"] },
  { kontoNummer: '4670', kontoName: 'Unentgeltliche Zuwendung von Waren 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4680', kontoName: 'Unentgeltliche Zuwendung von Waren 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4686', kontoName: 'Unentgeltliche Zuwendung von Gegenständen 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4700', kontoName: 'Erlösschmälerungen', kategorie: 'erlösschmälerungen', beschreibung: 'Reduzierungen der Umsatzerlöse', beispiele: ["Rabatte", "Nachlässe", "Skonti"] },
  { kontoNummer: '4701', kontoName: 'Erlösschmälerungen steuerfrei § 4 Nr. 8ff UStG', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4710', kontoName: 'Erlösschmälerungen 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4720', kontoName: 'Erlösschmälerungen 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4730', kontoName: 'Gewährte Skonti', kategorie: 'erlösschmälerungen', beschreibung: 'Reduzierungen der Umsatzerlöse', beispiele: ["Rabatte", "Nachlässe", "Skonti"] },
  { kontoNummer: '4731', kontoName: 'Gewährte Skonti 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4736', kontoName: 'Gewährte Skonti 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4745', kontoName: 'Gewährte Skonti steuerpflichtige EU-Lieferungen', kategorie: 'erlösschmälerungen', beschreibung: 'Reduzierungen der Umsatzerlöse', beispiele: ["Rabatte", "Nachlässe", "Skonti"] },
  { kontoNummer: '4750', kontoName: 'Gewährte Boni 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4760', kontoName: 'Gewährte Boni 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4769', kontoName: 'Gewährte Boni', kategorie: 'erlösschmälerungen', beschreibung: 'Reduzierungen der Umsatzerlöse', beispiele: ["Rabatte", "Nachlässe", "Skonti"] },
  { kontoNummer: '4770', kontoName: 'Gewährte Rabatte', kategorie: 'erlösschmälerungen', beschreibung: 'Reduzierungen der Umsatzerlöse', beispiele: ["Rabatte", "Nachlässe", "Skonti"] },
  { kontoNummer: '4780', kontoName: 'Gewährte Rabatte 7 % USt', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4790', kontoName: 'Gewährte Rabatte 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4820', kontoName: 'andere aktivierte Eigenleistungen', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4830', kontoName: 'Sonstige betriebliche Erträge', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4835', kontoName: 'Sonstige betriebl. Regelm. Erträge', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4836', kontoName: 'Sonstige Erträge betrieblich und regelmäßig 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4837', kontoName: 'Sonstige Erträge betriebsfremd und regelmäßig', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4839', kontoName: 'Sonstige Erträge unregelmäßig', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4840', kontoName: 'Erträge aus der Währungsumrechnung', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4841', kontoName: 'Sonst. Erträge betr. u. regelmäßig steuerfrei', kategorie: 'steuerfreie-umsätze', beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG', beispiele: ["Steuerfreie Lieferungen", "Befreiungen", "Export"] },
  { kontoNummer: '4849', kontoName: 'Erlöse Sachanlagenverkäufe Buchgewinn', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4855', kontoName: 'Abgänge Sachanlagen Restbuchwert bei BG', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4857', kontoName: 'Abgänge Finanzanlagen Restbuchwert BG', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4858', kontoName: 'Abgänge Finanzanlagen RBW z.T. Stf., BG', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4860', kontoName: 'Grundstückserträge', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4862', kontoName: 'Erlöse aus Vermietung und Verpachtung 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4925', kontoName: 'Erträge aus abgeschriebenen Forderungen', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4941', kontoName: 'Sachbezüge 7 %  USt (Waren)', kategorie: 'erlöse-7prozent', beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%', beispiele: ["Ermäßigter Steuersatz", "Lebensmittel", "Bücher"] },
  { kontoNummer: '4945', kontoName: 'Sachbezüge 19 % USt (Waren)', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4948', kontoName: 'Verrechnete sonstige Sachbezüge 19 % USt', kategorie: 'erlöse-19prozent', beschreibung: 'Erlöse mit Regelsteuersatz 19%', beispiele: ["Normalsteuersatz", "Dienstleistungen", "Waren"] },
  { kontoNummer: '4960', kontoName: 'Periodenfremde Erträge (soweit nicht außerordentlich)', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] },
  { kontoNummer: '4975', kontoName: 'Investitionszuschüsse', kategorie: 'sonstige-erträge', beschreibung: 'Andere betriebliche Einnahmen', beispiele: ["Nebenerlöse", "Sonstige Einnahmen", "Außerordentliche Erträge"] }
];

// Kategorie-Beschreibungen für deutsches Geschäftswesen
export const incomeKategorienBeschreibungen = {
  'umsatzerlöse': {
    name: 'Umsatzerlöse',
    beschreibung: 'Haupterlöse aus Verkauf von Waren und Dienstleistungen',
    beispiele: ['Verkaufserlöse', 'Dienstleistungserlöse', 'Hauptgeschäft']
  },
  'steuerfreie-umsätze': {
    name: 'Steuerfreie Umsätze',
    beschreibung: 'Umsätze ohne Umsatzsteuer nach UStG',
    beispiele: ['Steuerfreie Lieferungen', 'Befreiungen', 'Export']
  },
  'erlöse-7prozent': {
    name: 'Erlöse 7% USt',
    beschreibung: 'Erlöse mit ermäßigtem Umsatzsteuersatz 7%',
    beispiele: ['Ermäßigter Steuersatz', 'Lebensmittel', 'Bücher']
  },
  'erlöse-19prozent': {
    name: 'Erlöse 19% USt',
    beschreibung: 'Erlöse mit Regelsteuersatz 19%',
    beispiele: ['Normalsteuersatz', 'Dienstleistungen', 'Waren']
  },
  'provisionen': {
    name: 'Provisionen',
    beschreibung: 'Erlöse aus Vermittlungsgeschäften',
    beispiele: ['Provisionen', 'Vermittlung', 'Maklergebühren']
  },
  'erlösschmälerungen': {
    name: 'Erlösschmälerungen',
    beschreibung: 'Reduzierungen der Umsatzerlöse',
    beispiele: ['Rabatte', 'Nachlässe', 'Skonti']
  },
  'sonstige-erträge': {
    name: 'Sonstige Erträge',
    beschreibung: 'Andere betriebliche Einnahmen',
    beispiele: ['Nebenerlöse', 'Sonstige Einnahmen', 'Außerordentliche Erträge']
  }
};

// Service-Funktionen für INCOME-Mappings
export function findIncomeMappingByAccountNumber(accountNumber: string): DatevIncomeMapping | undefined {
  return datevIncomeCategories.find(mapping => mapping.kontoNummer === accountNumber);
}

export function getIncomeMappingsByCategory(kategorie: string): DatevIncomeMapping[] {
  return datevIncomeCategories.filter(mapping => mapping.kategorie === kategorie);
}

export function getAllIncomeCategories(): string[] {
  return Object.keys(incomeKategorienBeschreibungen);
}

export function getIncomeCategoryInfo(kategorie: string) {
  return incomeKategorienBeschreibungen[kategorie as keyof typeof incomeKategorienBeschreibungen];
}

export function getAllIncomeMappings(): DatevIncomeMapping[] {
  return datevIncomeCategories;
}

// Export default für einfache Nutzung
export default datevIncomeCategories;