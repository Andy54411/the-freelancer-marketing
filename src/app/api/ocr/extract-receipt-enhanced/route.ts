// Enhanced OCR API Route für deutsche Buchhaltungs-Compliance
import { NextRequest, NextResponse } from 'next/server';
import { EnhancedOCRService } from '@/services/EnhancedOCRService';
import { CompanyOCRSettings } from '@/types/ocr-enhanced';

export async function POST(request: NextRequest) {
  // DEAKTIVIERT: Enhanced OCR API ist deaktiviert - verwende /api/expenses/extract-receipt
  return NextResponse.json(
    {
      success: false,
      error: 'Enhanced OCR ist deaktiviert. Verwende /api/expenses/extract-receipt für echte OCR-Daten.',
    },
    { status: 410 }
  );
  
  try {
    const formData = await request.formData();
    const companyId = formData.get('companyId') as string;
    const file = formData.get('file') as File;
    const enhancedMode = formData.get('enhanced') === 'true';
    const settingsJson = formData.get('settings') as string;

    // Validierung
    if (!companyId || !file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Datei sind erforderlich',
        },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nur PDF- oder Bilddateien sind erlaubt',
        },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) { // Erhöht auf 15MB für bessere OCR-Qualität
      return NextResponse.json(
        {
          success: false,
          error: 'Datei ist zu groß (max. 15MB)',
        },
        { status: 400 }
      );
    }

    // OCR-Service initialisieren
    const ocrService = EnhancedOCRService.getInstance();
    
    // Datei zu Buffer konvertieren
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Company-Settings parsen (falls übermittelt)
    let companySettings: CompanyOCRSettings | undefined;
    if (settingsJson) {
      try {
        companySettings = JSON.parse(settingsJson);
      } catch (error) {
        console.warn('Invalid company settings JSON:', error);
      }
    }

    // Erweiterte OCR-Verarbeitung
    if (enhancedMode) {
      console.log('🚀 Enhanced OCR processing started:', {
        filename: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        companyId: companyId.substring(0, 8) + '...',
        hasCustomSettings: !!companySettings
      });

      const result = await ocrService.extractReceiptAdvanced(
        fileBuffer,
        file.name,
        file.type,
        companyId,
        companySettings
      );

      console.log('✅ Enhanced OCR completed:', {
        success: result.success,
        supplier: result.data?.lieferant.name,
        amount: result.data?.steuerberechnung.bruttobetrag,
        confidence: result.ocr.confidence,
        goBDCompliant: result.validation?.goBDCompliant,
        issues: result.validation?.issues.length || 0,
        processingTime: `${result.ocr.processingTime}ms`,
        costs: `${result.ocr.kostenEUR}€`
      });

      return NextResponse.json(result);
    }

    // Fallback: Standard OCR (bestehende Implementierung)
    console.log('📋 Standard OCR processing:', file.name);
    
    try {
      // Versuche erweiterte OCR auch für Standard-Modus (mit reduzierten Features)
      const standardResult = await ocrService.extractReceiptAdvanced(
        fileBuffer,
        file.name,
        file.type,
        companyId,
        {
          ...companySettings,
          companyId,
          compliance: {
            goBDMode: false, // Reduzierte Compliance für Standard-Modus
            automaticValidation: false,
            requireManualApproval: false,
            minimumConfidence: 60
          },
          intelligence: {
            supplierLearning: false,
            categoryPrediction: true, // Basis-Kategorisierung beibehalten
            costCenterSuggestion: false,
            duplicateDetection: false
          },
          integration: {
            bankingSync: false,
            datevAutoExport: false,
            emailNotifications: false
          },
          workflowRules: [],
          defaults: {
            zahlungsziel: 30,
            waehrung: 'EUR'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Konvertiere zu altem Format für Rückwärtskompatibilität
      const legacyResult = convertToLegacyFormat(standardResult);
      
      console.log('✅ Standard OCR completed:', {
        method: 'enhanced_fallback',
        supplier: legacyResult.data?.vendor,
        amount: legacyResult.data?.amount,
        filename: file.name
      });

      return NextResponse.json(legacyResult);
      
    } catch (enhancedError) {
      console.log('❌ Enhanced OCR failed, using basic fallback:', enhancedError);
      
      // Final Fallback: Bestehende einfache Implementierung
      return await performBasicFallback(file, companyId);
    }

  } catch (error: unknown) {
    console.error('❌ OCR API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'OCR-Verarbeitung fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        extractionMethod: 'error'
      },
      { status: 500 }
    );
  }
}

// Konvertierung von EnhancedOCRResponse zu Legacy-Format
function convertToLegacyFormat(enhancedResult: any) {
  if (!enhancedResult.success || !enhancedResult.data) {
    return enhancedResult;
  }

  const data = enhancedResult.data;
  
  return {
    success: true,
    data: {
      title: `${data.lieferant.name} - Rechnung`,
      amount: data.steuerberechnung.bruttobetrag,
      category: data.datev.kontoNummer || 'Sonstiges',
      description: data.datev.buchungstext || `Rechnung: ${data.belegnummer}`,
      vendor: data.lieferant.name,
      date: data.belegdatum,
      invoiceNumber: data.belegnummer,
      vatAmount: data.steuerberechnung.ustBetrag,
      netAmount: data.steuerberechnung.nettobetrag,
      vatRate: data.steuerberechnung.ustSatz,
      
      // Erweiterte Felder (optional)
      companyName: data.lieferant.name,
      companyAddress: data.lieferant.adresse,
      companyVatNumber: data.lieferant.ustIdNr,
      contactEmail: data.lieferant.email,
      contactPhone: data.lieferant.telefon,
      
      // Deutsche Spezialfelder
      costCenter: data.datev.kostenstelle,
      paymentTerms: data.rechnungsdetails.zahlungsbedingungen.zahlungsziel,
      currency: data.rechnungsdetails.waehrung || 'EUR',
      
      // Validierungs-Info
      goBDCompliant: enhancedResult.validation?.goBDCompliant || false,
      validationIssues: enhancedResult.validation?.issues || [],
      
      // Processing-Info
      processingMode: 'enhanced_compatibility'
    },
    ocr: enhancedResult.ocr,
    message: enhancedResult.message,
    extractionMethod: 'enhanced_legacy_compat'
  };
}

// Basis-Fallback für kritische Fehler
async function performBasicFallback(file: File, companyId: string) {
  try {
    console.log('🔄 Using basic PDF text extraction fallback');
    
    // Einfache PDF-Text-Extraktion (bestehende Implementierung)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Vereinfachte Text-Extraktion
    let extractedText = '';
    if (file.type.includes('pdf')) {
      // PDF-Text-Extraktion würde hier implementiert
      extractedText = 'PDF text extraction placeholder';
    }
    
    // Basis-Datenextraktion
    const basicData = {
      title: `Rechnung vom ${new Date().toLocaleDateString('de-DE')}`,
      amount: 0,
      category: 'Sonstiges',
      description: `Rechnung: ${file.name}`,
      vendor: 'Unbekannter Lieferant',
      date: new Date().toLocaleDateString('de-DE'),
      invoiceNumber: '',
      vatAmount: null,
      netAmount: null,
      vatRate: 19,
      processingMode: 'basic_fallback'
    };

    return NextResponse.json({
      success: true,
      data: basicData,
      ocr: {
        provider: 'FALLBACK_TEXT_EXTRACTION',
        confidence: 50,
        textLength: extractedText.length,
        processingTime: Date.now() % 1000,
        enhanced: false
      },
      message: '⚠️ Basis-Extraktion verwendet - manuelle Überprüfung empfohlen',
      extractionMethod: 'basic_fallback'
    });
    
  } catch (fallbackError) {
    console.error('❌ Basic fallback failed:', fallbackError);
    throw fallbackError;
  }
}