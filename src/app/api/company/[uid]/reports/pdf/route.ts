import { NextRequest, NextResponse } from 'next/server';
import { DatevAuswertungsServiceServer, BWAData, SuSaData, EURData } from '@/services/datevAuswertungsService.server';
import { auth } from '@/firebase/server';

/**
 * API-Route zur Generierung von BWA/SuSa/EÜR PDFs
 * 
 * GET /api/company/[uid]/reports/pdf?type=bwa&year=2026&month=1
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'bwa';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ') || !auth) {
      return NextResponse.json({ success: false, error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await auth.verifyIdToken(token);
    
    // Prüfe ob User Zugriff auf Company hat
    if (decodedToken.uid !== companyId) {
      return NextResponse.json({ success: false, error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Generiere Report-Daten
    let reportData: BWAData | SuSaData | EURData;
    let html: string;
    let filename: string;

    switch (reportType) {
      case 'bwa':
        reportData = await DatevAuswertungsServiceServer.generateBWA(companyId, month, year);
        html = generateBWAHtml(reportData as BWAData);
        filename = `BWA_${year}_${month.toString().padStart(2, '0')}.pdf`;
        break;
      case 'susa':
        reportData = await DatevAuswertungsServiceServer.generateSuSa(companyId, year, month);
        html = generateSuSaHtml(reportData as SuSaData);
        filename = `SuSa_${year}_${month.toString().padStart(2, '0')}.pdf`;
        break;
      case 'eur':
        reportData = await DatevAuswertungsServiceServer.generateEUR(companyId, year);
        html = generateEURHtml(reportData as EURData);
        filename = `EUR_${year}.pdf`;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Unbekannter Report-Typ' }, { status: 400 });
    }

    // PDF mit Playwright generieren
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    
    await browser.close();

    // PDF zurückgeben - Buffer in Uint8Array konvertieren
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Report PDF Fehler:', error);
    return NextResponse.json({
      success: false,
      error: 'PDF-Generierung fehlgeschlagen',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// ============================================================================
// HTML-GENERIERUNG FÜR BWA
// ============================================================================

function formatNumber(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generiert BWA-HTML im DATEV-Stil (Kurzfristige Erfolgsrechnung)
 * Layout basiert auf echten DATEV Kanzlei-Rechnungswesen Auswertungen
 */
function generateBWAHtml(data: BWAData): string {
  const monthNames = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const fullMonthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  const gesamtleistung = data.gesamtleistung.kumuliert || 1;
  const calcPercent = (val: number) => gesamtleistung > 0 ? (val / gesamtleistung * 100) : 0;
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>BWA - ${fullMonthNames[data.monat - 1]} ${data.jahr}</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 10mm 8mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', Courier, monospace;
      font-size: 8pt;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #000;
    }
    .page-header-left {
      font-size: 8pt;
    }
    .page-header-right {
      text-align: right;
      font-size: 8pt;
    }
    .company-info {
      font-weight: bold;
      font-size: 9pt;
    }
    .report-title {
      text-align: center;
      font-weight: bold;
      font-size: 10pt;
      margin: 10px 0;
    }
    .report-subtitle {
      text-align: center;
      font-size: 8pt;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    th, td {
      padding: 2px 4px;
      text-align: left;
      border: none;
    }
    th {
      border-bottom: 1px solid #000;
      font-weight: bold;
      background: #f0f0f0;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .border-top { border-top: 1px solid #000; }
    .border-bottom { border-bottom: 1px solid #000; }
    .bold { font-weight: bold; }
    .section-row {
      background: #e8e8e8;
      font-weight: bold;
    }
    .subtotal-row {
      border-top: 1px solid #000;
      font-weight: bold;
    }
    .result-row {
      background: #d0d0d0;
      font-weight: bold;
      border-top: 2px solid #000;
    }
    .negative { }
    .indent { padding-left: 15px; }
    .footer {
      margin-top: 15px;
      font-size: 7pt;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    .footer-note {
      font-style: italic;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="page-header-left">
      <div class="company-info">${data.unternehmen}</div>
      <div>${data.kontenrahmen}</div>
    </div>
    <div class="page-header-right">
      <div>Taskilo Buchhaltung</div>
      <div>Kurzfristige Erfolgsrechnung ${fullMonthNames[data.monat - 1]} ${data.jahr}</div>
      <div>BWA-Nr. 1 BWA-Form Taskilo-BWA</div>
    </div>
  </div>

  <div class="report-title">Kurzfristige Erfolgsrechnung</div>
  <div class="report-subtitle">${fullMonthNames[data.monat - 1]} ${data.jahr} | Kumuliert: ${monthNames[0]}/${data.jahr} - ${monthNames[data.monat - 1]}/${data.jahr}</div>

  <table>
    <thead>
      <tr>
        <th style="width: 35%">Bezeichnung</th>
        <th class="text-right" style="width: 15%">${monthNames[data.monat - 1]}/${data.jahr}</th>
        <th class="text-right" style="width: 10%">% Ges.Leistg.</th>
        <th class="text-right" style="width: 15%">${monthNames[0]}/${data.jahr} - ${monthNames[data.monat - 1]}/${data.jahr}</th>
        <th class="text-right" style="width: 10%">% Ges.Leistg.</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Umsatzerlöse</td>
        <td class="text-right">${formatNumber(data.umsatzerloese.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.umsatzerloese.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.umsatzerloese.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.umsatzerloese.kumuliert))}</td>
      </tr>
      <tr>
        <td>Best.Verdg. FE/UE</td>
        <td class="text-right">${formatNumber(data.bestandsveraenderungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.bestandsveraenderungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.bestandsveraenderungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.bestandsveraenderungen.kumuliert))}</td>
      </tr>
      <tr>
        <td>Akt.Eigenleistungen</td>
        <td class="text-right">${formatNumber(data.aktivierteEigenleistungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.aktivierteEigenleistungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.aktivierteEigenleistungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.aktivierteEigenleistungen.kumuliert))}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Gesamtleistung</td>
        <td class="text-right">${formatNumber(data.gesamtleistung.aktuellerMonat)}</td>
        <td class="text-right">100,00</td>
        <td class="text-right">${formatNumber(data.gesamtleistung.kumuliert)}</td>
        <td class="text-right">100,00</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Mat./Wareneinkauf</td>
        <td class="text-right">${formatNumber(data.wareneinkauf.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.wareneinkauf.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.wareneinkauf.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.wareneinkauf.kumuliert))}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Rohertrag</td>
        <td class="text-right">${formatNumber(data.rohertrag.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.rohertrag.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.rohertrag.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.rohertrag.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>So. betr. Erlöse</td>
        <td class="text-right">${formatNumber(data.sonstigeErloese.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeErloese.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.sonstigeErloese.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeErloese.kumuliert))}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Betriebl. Rohertrag</td>
        <td class="text-right">${formatNumber(data.rohertrag.aktuellerMonat + data.sonstigeErloese.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.rohertrag.aktuellerMonat + data.sonstigeErloese.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.rohertrag.kumuliert + data.sonstigeErloese.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.rohertrag.kumuliert + data.sonstigeErloese.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr class="section-row">
        <td>Kostenarten:</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td class="indent">Personalkosten</td>
        <td class="text-right">${formatNumber(data.personalkostenGesamt.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.personalkostenGesamt.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.personalkostenGesamt.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.personalkostenGesamt.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Raumkosten</td>
        <td class="text-right">${formatNumber(data.raumkostenGesamt.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.raumkostenGesamt.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.raumkostenGesamt.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.raumkostenGesamt.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Betriebl. Steuern</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
      </tr>
      <tr>
        <td class="indent">Versich./Beiträge</td>
        <td class="text-right">${formatNumber(data.versicherungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.versicherungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.versicherungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.versicherungen.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Kfz-Kosten (o. St.)</td>
        <td class="text-right">${formatNumber(data.fahrzeugkosten.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.fahrzeugkosten.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.fahrzeugkosten.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.fahrzeugkosten.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Werbe-/Reisekosten</td>
        <td class="text-right">${formatNumber(data.werbekosten.aktuellerMonat + data.reisekosten.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.werbekosten.aktuellerMonat + data.reisekosten.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.werbekosten.kumuliert + data.reisekosten.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.werbekosten.kumuliert + data.reisekosten.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Abschreibungen</td>
        <td class="text-right">${formatNumber(data.abschreibungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.abschreibungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.abschreibungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.abschreibungen.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Reparatur/Instandh.</td>
        <td class="text-right">${formatNumber(data.reparaturen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.reparaturen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.reparaturen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.reparaturen.kumuliert))}</td>
      </tr>
      <tr>
        <td class="indent">Sonstige Kosten</td>
        <td class="text-right">${formatNumber(data.sonstigeAufwendungen.aktuellerMonat + data.buerokosten.aktuellerMonat + data.telekommunikation.aktuellerMonat + data.beratungskosten.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeAufwendungen.aktuellerMonat + data.buerokosten.aktuellerMonat + data.telekommunikation.aktuellerMonat + data.beratungskosten.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.sonstigeAufwendungen.kumuliert + data.buerokosten.kumuliert + data.telekommunikation.kumuliert + data.beratungskosten.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeAufwendungen.kumuliert + data.buerokosten.kumuliert + data.telekommunikation.kumuliert + data.beratungskosten.kumuliert))}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Gesamtkosten</td>
        <td class="text-right">${formatNumber(data.sonstigeKostenGesamt.aktuellerMonat + data.personalkostenGesamt.aktuellerMonat + data.raumkostenGesamt.aktuellerMonat + data.kfzKostenGesamt.aktuellerMonat + data.abschreibungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeKostenGesamt.aktuellerMonat + data.personalkostenGesamt.aktuellerMonat + data.raumkostenGesamt.aktuellerMonat + data.kfzKostenGesamt.aktuellerMonat + data.abschreibungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.sonstigeKostenGesamt.kumuliert + data.personalkostenGesamt.kumuliert + data.raumkostenGesamt.kumuliert + data.kfzKostenGesamt.kumuliert + data.abschreibungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.sonstigeKostenGesamt.kumuliert + data.personalkostenGesamt.kumuliert + data.raumkostenGesamt.kumuliert + data.kfzKostenGesamt.kumuliert + data.abschreibungen.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr class="subtotal-row">
        <td>Betriebsergebnis</td>
        <td class="text-right ${data.betriebsergebnis.aktuellerMonat < 0 ? 'negative' : ''}">${formatNumber(data.betriebsergebnis.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.betriebsergebnis.aktuellerMonat))}</td>
        <td class="text-right ${data.betriebsergebnis.kumuliert < 0 ? 'negative' : ''}">${formatNumber(data.betriebsergebnis.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.betriebsergebnis.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Zinsaufwand</td>
        <td class="text-right">${formatNumber(data.zinsaufwendungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsaufwendungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.zinsaufwendungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsaufwendungen.kumuliert))}</td>
      </tr>
      <tr>
        <td>Sonst. neutr. Aufw</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
      </tr>
      <tr>
        <td>Neutraler Aufwand</td>
        <td class="text-right">${formatNumber(data.zinsaufwendungen.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsaufwendungen.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.zinsaufwendungen.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsaufwendungen.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Zinserträge</td>
        <td class="text-right">${formatNumber(data.zinsertraege.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsertraege.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.zinsertraege.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsertraege.kumuliert))}</td>
      </tr>
      <tr>
        <td>Sonst. neutr. Ertr</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
        <td class="text-right">${formatNumber(0)}</td>
        <td class="text-right">${formatPercent(0)}</td>
      </tr>
      <tr>
        <td>Neutraler Ertrag</td>
        <td class="text-right">${formatNumber(data.zinsertraege.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsertraege.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.zinsertraege.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.zinsertraege.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr class="subtotal-row">
        <td>Ergebnis vor Steuern</td>
        <td class="text-right ${data.ergebnisVorSteuern.aktuellerMonat < 0 ? 'negative' : ''}">${formatNumber(data.ergebnisVorSteuern.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.ergebnisVorSteuern.aktuellerMonat))}</td>
        <td class="text-right ${data.ergebnisVorSteuern.kumuliert < 0 ? 'negative' : ''}">${formatNumber(data.ergebnisVorSteuern.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.ergebnisVorSteuern.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>Steuern Eink.u.Ertr</td>
        <td class="text-right">${formatNumber(data.steuern.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.steuern.aktuellerMonat))}</td>
        <td class="text-right">${formatNumber(data.steuern.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.steuern.kumuliert))}</td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr class="result-row">
        <td>Vorläufiges Ergebnis</td>
        <td class="text-right ${data.jahresueberschuss.aktuellerMonat < 0 ? 'negative' : ''}">${formatNumber(data.jahresueberschuss.aktuellerMonat)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.jahresueberschuss.aktuellerMonat))}</td>
        <td class="text-right ${data.jahresueberschuss.kumuliert < 0 ? 'negative' : ''}">${formatNumber(data.jahresueberschuss.kumuliert)}</td>
        <td class="text-right">${formatPercent(calcPercent(data.jahresueberschuss.kumuliert))}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>Das vorläufige Ergebnis entspricht dem derzeitigen Stand der Buchführung. Abschluss-/Abgrenzungsbuchungen können es noch verändern.</div>
    <div class="footer-note">Fibu ${data.jahr} | Werte in: EUR | Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr</div>
  </div>
</body>
</html>
`;
}

// ============================================================================
// HTML-GENERIERUNG FÜR SUSA (DATEV-STIL)
// ============================================================================

function generateSuSaHtml(data: SuSaData): string {
  const monthNames = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const fullMonthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const kontenRows = data.konten.map(konto => `
    <tr>
      <td class="konto-nr">${konto.kontonummer}</td>
      <td>${konto.bezeichnung}</td>
      <td class="text-right">${formatNumber(konto.ebSoll)}</td>
      <td class="text-right">${formatNumber(konto.ebHaben)}</td>
      <td class="text-right">${formatNumber(konto.soll)}</td>
      <td class="text-right">${formatNumber(konto.haben)}</td>
      <td class="text-right ${konto.saldo >= 0 ? '' : 'negative'}">${konto.saldo >= 0 ? formatNumber(konto.saldo) : ''}</td>
      <td class="text-right ${konto.saldo < 0 ? 'negative' : ''}">${konto.saldo < 0 ? formatNumber(Math.abs(konto.saldo)) : ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>SuSa - ${fullMonthNames[data.monat - 1]} ${data.jahr}</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 10mm 8mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', Courier, monospace;
      font-size: 7pt;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #000;
    }
    .page-header-left {
      font-size: 8pt;
    }
    .page-header-right {
      text-align: right;
      font-size: 8pt;
    }
    .company-info {
      font-weight: bold;
      font-size: 9pt;
    }
    .report-title {
      text-align: center;
      font-weight: bold;
      font-size: 10pt;
      margin: 8px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
    }
    th, td {
      padding: 2px 3px;
      text-align: left;
      border: none;
    }
    th {
      border-bottom: 1px solid #000;
      border-top: 1px solid #000;
      font-weight: bold;
      background: #f0f0f0;
    }
    .text-right { text-align: right; }
    .konto-nr { font-weight: bold; }
    .total-row {
      border-top: 2px solid #000;
      font-weight: bold;
      background: #e8e8e8;
    }
    .negative { }
    .footer {
      margin-top: 10px;
      font-size: 7pt;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="page-header-left">
      <div class="company-info">${data.unternehmen}</div>
      <div>${data.kontenrahmen}</div>
    </div>
    <div class="page-header-right">
      <div>Taskilo Buchhaltung</div>
      <div>Summen- und Saldenliste ${fullMonthNames[data.monat - 1]} ${data.jahr}</div>
    </div>
  </div>

  <div class="report-title">Summen- und Saldenliste</div>

  <table>
    <thead>
      <tr>
        <th style="width: 8%">Konto</th>
        <th style="width: 28%">Bezeichnung</th>
        <th class="text-right" style="width: 10%">EB Soll</th>
        <th class="text-right" style="width: 10%">EB Haben</th>
        <th class="text-right" style="width: 11%">Soll</th>
        <th class="text-right" style="width: 11%">Haben</th>
        <th class="text-right" style="width: 11%">Saldo Soll</th>
        <th class="text-right" style="width: 11%">Saldo Haben</th>
      </tr>
    </thead>
    <tbody>
      ${kontenRows}
      <tr class="total-row">
        <td></td>
        <td>Summen</td>
        <td class="text-right">${formatNumber(data.summen.anfangsbestandSoll)}</td>
        <td class="text-right">${formatNumber(data.summen.anfangsbestandHaben)}</td>
        <td class="text-right">${formatNumber(data.summen.summeSoll)}</td>
        <td class="text-right">${formatNumber(data.summen.summeHaben)}</td>
        <td class="text-right">${formatNumber(data.summen.saldoSoll)}</td>
        <td class="text-right">${formatNumber(data.summen.saldoHaben)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>Fibu ${data.jahr} | Werte in: EUR | Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr</div>
  </div>
</body>
</html>
`;
}

// ============================================================================
// HTML-GENERIERUNG FÜR EÜR (DATEV-STIL / Anlage EÜR)
// ============================================================================

function generateEURHtml(data: EURData): string {
  const gewinn = data.zusammenfassung?.gewinnVerlust ?? data.gewinnermittlung?.gewinn ?? 0;
  const einnahmen = data.betriebseinnahmen;
  const ausgaben = data.betriebsausgaben;
  const summeEinnahmen = einnahmen?.summeEinnahmen ?? data.zusammenfassung?.betriebseinnahmen ?? 0;
  const summeAusgaben = ausgaben?.summeAusgaben ?? data.zusammenfassung?.betriebsausgaben ?? 0;
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>EÜR ${data.jahr}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 15mm 10mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', Courier, monospace;
      font-size: 8pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #000;
    }
    .page-header-left {
      font-size: 8pt;
    }
    .page-header-right {
      text-align: right;
      font-size: 8pt;
    }
    .company-info {
      font-weight: bold;
      font-size: 9pt;
    }
    .report-title {
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      margin: 15px 0 5px 0;
    }
    .report-subtitle {
      text-align: center;
      font-size: 9pt;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }
    th, td {
      padding: 3px 5px;
      text-align: left;
      border: none;
    }
    th {
      border-bottom: 1px solid #000;
      font-weight: bold;
      background: #f0f0f0;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .zeile-nr { 
      width: 40px;
      font-weight: bold;
      color: #666;
    }
    .section-header {
      background: #d0d0d0;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .subtotal-row {
      border-top: 1px solid #000;
      font-weight: bold;
      background: #e8e8e8;
    }
    .result-row {
      background: #c0c0c0;
      font-weight: bold;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .indent { padding-left: 20px; }
    .footer {
      margin-top: 20px;
      font-size: 7pt;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    .footer-note {
      font-style: italic;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="page-header-left">
      <div class="company-info">${data.unternehmen}</div>
      ${data.steuernummer ? `<div>Steuernummer: ${data.steuernummer}</div>` : ''}
    </div>
    <div class="page-header-right">
      <div>Taskilo Buchhaltung</div>
      <div>Anlage EÜR ${data.jahr}</div>
    </div>
  </div>

  <div class="report-title">Einnahmenüberschussrechnung nach § 4 Abs. 3 EStG</div>
  <div class="report-subtitle">Anlage EÜR - Geschäftsjahr ${data.jahr}</div>

  <table>
    <thead>
      <tr>
        <th class="zeile-nr">Zeile</th>
        <th style="width: 60%">Bezeichnung</th>
        <th class="text-right" style="width: 25%">Betrag EUR</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-header">
        <td></td>
        <td colspan="2">I. Betriebseinnahmen</td>
      </tr>
      <tr>
        <td class="zeile-nr">14</td>
        <td class="indent">Betriebseinnahmen als umsatzsteuerlicher Kleinunternehmer oder Umsätze zu 0%</td>
        <td class="text-right">${formatNumber(einnahmen?.umsatzerloeseSteuerfrei?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">15</td>
        <td class="indent">Umsatzsteuerpflichtige Betriebseinnahmen (19%)</td>
        <td class="text-right">${formatNumber(einnahmen?.umsatzerloeseSteuerpflichtig19?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">16</td>
        <td class="indent">Umsatzsteuerpflichtige Betriebseinnahmen (7%)</td>
        <td class="text-right">${formatNumber(einnahmen?.umsatzerloeseSteuerpflichtig7?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">17</td>
        <td class="indent">Vereinnahmte Umsatzsteuer</td>
        <td class="text-right">${formatNumber(einnahmen?.vereinnahmteUmsatzsteuer?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">18</td>
        <td class="indent">Vom Finanzamt erstattete Umsatzsteuer</td>
        <td class="text-right">${formatNumber(0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">19</td>
        <td class="indent">Private Kfz-Nutzung</td>
        <td class="text-right">${formatNumber(einnahmen?.privatnutzungFahrzeug?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">20</td>
        <td class="indent">Sonstige Sach-, Nutzungs- und Leistungsentnahmen</td>
        <td class="text-right">${formatNumber(einnahmen?.privatnutzungSonstige?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">22</td>
        <td class="indent">Sonstige Betriebseinnahmen</td>
        <td class="text-right">${formatNumber(einnahmen?.sonstigeEinnahmen?.betrag ?? 0)}</td>
      </tr>
      <tr class="subtotal-row">
        <td class="zeile-nr">23</td>
        <td>Summe der Betriebseinnahmen</td>
        <td class="text-right">${formatNumber(summeEinnahmen)}</td>
      </tr>

      <tr><td colspan="3" style="height: 10px;"></td></tr>

      <tr class="section-header">
        <td></td>
        <td colspan="2">II. Betriebsausgaben</td>
      </tr>
      <tr>
        <td class="zeile-nr">25</td>
        <td class="indent">Waren, Rohstoffe und Hilfsstoffe</td>
        <td class="text-right">${formatNumber(ausgaben?.wareneinkauf?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">26</td>
        <td class="indent">Bezogene Fremdleistungen</td>
        <td class="text-right">${formatNumber(ausgaben?.bezogeneLeistungen?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">27</td>
        <td class="indent">Personalkosten (Löhne/Gehälter, AG-Anteile SV)</td>
        <td class="text-right">${formatNumber(ausgaben?.personalkosten?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">30</td>
        <td class="indent">Raumkosten (Miete, Nebenkosten)</td>
        <td class="text-right">${formatNumber(ausgaben?.raumkosten?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">35</td>
        <td class="indent">Kraftfahrzeugkosten</td>
        <td class="text-right">${formatNumber(ausgaben?.kfzKosten?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">41</td>
        <td class="indent">Reisekosten, Fahrtkosten für Wege zw. Wohnung u. Betrieb</td>
        <td class="text-right">${formatNumber((ausgaben?.reisekosten?.betrag ?? 0) + (ausgaben?.fahrtkosten?.betrag ?? 0))}</td>
      </tr>
      <tr>
        <td class="zeile-nr">43</td>
        <td class="indent">Miete/Leasing für bewegliche Wirtschaftsgüter</td>
        <td class="text-right">${formatNumber(ausgaben?.mieteLeasing?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">46</td>
        <td class="indent">AfA auf bewegliche Wirtschaftsgüter</td>
        <td class="text-right">${formatNumber(ausgaben?.abschreibungenBeweglicheWg?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">47</td>
        <td class="indent">AfA auf unbewegliche Wirtschaftsgüter</td>
        <td class="text-right">${formatNumber(ausgaben?.abschreibungenUnbeweglicheWg?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">48</td>
        <td class="indent">AfA auf GWG (sofort abzugsfähig)</td>
        <td class="text-right">${formatNumber(ausgaben?.abschreibungenGwg?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">52</td>
        <td class="indent">Schuldzinsen</td>
        <td class="text-right">${formatNumber(ausgaben?.schuldzinsen?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">63</td>
        <td class="indent">Gezahlte Vorsteuerbeträge</td>
        <td class="text-right">${formatNumber(ausgaben?.gezahlteVorsteuer?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">64</td>
        <td class="indent">An das Finanzamt gezahlte USt (USt-Vorauszahlungen)</td>
        <td class="text-right">${formatNumber(ausgaben?.umsatzsteuerVorauszahlungen?.betrag ?? 0)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">65</td>
        <td class="indent">Übrige Betriebsausgaben</td>
        <td class="text-right">${formatNumber(ausgaben?.üebrigeAusgaben?.betrag ?? 0)}</td>
      </tr>
      <tr class="subtotal-row">
        <td class="zeile-nr">66</td>
        <td>Summe der Betriebsausgaben</td>
        <td class="text-right">${formatNumber(summeAusgaben)}</td>
      </tr>

      <tr><td colspan="3" style="height: 10px;"></td></tr>

      <tr class="section-header">
        <td></td>
        <td colspan="2">III. Gewinnermittlung</td>
      </tr>
      <tr>
        <td class="zeile-nr">68</td>
        <td class="indent">Betriebseinnahmen (Zeile 23)</td>
        <td class="text-right">${formatNumber(summeEinnahmen)}</td>
      </tr>
      <tr>
        <td class="zeile-nr">69</td>
        <td class="indent">./. Betriebsausgaben (Zeile 66)</td>
        <td class="text-right">-${formatNumber(summeAusgaben)}</td>
      </tr>
      <tr class="result-row">
        <td class="zeile-nr">87</td>
        <td>${gewinn >= 0 ? 'Gewinn' : 'Verlust'}</td>
        <td class="text-right">${formatNumber(Math.abs(gewinn))}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>Anlage EÜR zur Einkommensteuererklärung ${data.jahr}</div>
    <div class="footer-note">Fibu ${data.jahr} | Werte in: EUR | Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr</div>
    <div class="footer-note">Diese EÜR wurde automatisch von Taskilo generiert und ersetzt nicht die Prüfung durch einen Steuerberater.</div>
  </div>
</body>
</html>
`;
}
