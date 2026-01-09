// Enhanced OCR API Route für deutsche Buchhaltungs-Compliance
// DEAKTIVIERT: Diese API ist deaktiviert - verwende /api/expenses/extract-receipt
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  // Diese Enhanced OCR API ist deaktiviert
  // Verwende stattdessen /api/expenses/extract-receipt für echte OCR-Verarbeitung
  return NextResponse.json(
    {
      success: false,
      error: 'Enhanced OCR ist deaktiviert. Verwende /api/expenses/extract-receipt für echte OCR-Daten.',
      redirectTo: '/api/expenses/extract-receipt',
    },
    { status: 410 }
  );
}
