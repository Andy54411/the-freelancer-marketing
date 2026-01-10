/**
 * OCR Learning API
 * =================
 * Speichert Benutzer-Korrekturen für das selbstlernende OCR-System.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveOCRCorrection, getOCRLearningStats } from '@/lib/ocr-learning-service';

// Validierungs-Schema
const correctionSchema = z.object({
  companyId: z.string().min(1),
  ocrData: z.object({
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    vatId: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
  }),
  correctedData: z.object({
    vendor: z.string().optional(),
    invoiceNumber: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    vatId: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
  }),
});

/**
 * POST /api/ocr/learn
 * Speichert eine OCR-Korrektur für das Lernsystem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validierung
    const parseResult = correctionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Eingabedaten',
        details: parseResult.error.errors,
      }, { status: 400 });
    }
    
    const { companyId, ocrData, correctedData } = parseResult.data;
    
    // Prüfe ob es überhaupt Korrekturen gibt
    const hasCorrections = Object.keys(correctedData).some(key => {
      const correctedValue = correctedData[key as keyof typeof correctedData];
      const originalValue = ocrData[key as keyof typeof ocrData];
      return correctedValue && correctedValue !== originalValue;
    });
    
    if (!hasCorrections) {
      return NextResponse.json({
        success: true,
        message: 'Keine Korrekturen erkannt, nichts zu lernen',
        learned: false,
      });
    }
    
    // Speichere Korrektur
    await saveOCRCorrection({
      companyId,
      ocrData,
      correctedData,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Korrektur gespeichert, System lernt',
      learned: true,
    });
    
  } catch (error) {
    console.error('[OCR Learning API] Fehler:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

/**
 * GET /api/ocr/learn?companyId=xxx
 * Holt Statistiken über das Lernsystem
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'companyId fehlt',
      }, { status: 400 });
    }
    
    const stats = await getOCRLearningStats(companyId);
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
    
  } catch (error) {
    console.error('[OCR Learning API] Fehler:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
    }, { status: 500 });
  }
}
