import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    console.log('🔍 OCR Debug Test:', {
      vendor: data.vendor,
      description: data.description,
      title: data.title,
      amount: data.amount,
      fullData: data,
    });

    // Teste die Gemini AI Kategorisierung direkt
    const receiptForAI = {
      vendor: data.vendor,
      description: data.description,
      title: data.title,
      amount: data.amount,
      invoiceNumber: data.invoiceNumber,
      date: data.date,
    };

    console.log('🧠 Teste Gemini AI mit:', receiptForAI);

    // Manueller Test: "Gastronomisch bezogene Honoraleistung"
    const testData = {
      vendor: 'Andy Staudinger',
      description: 'Gastronomisch bezogene Honoraleistung Andy Staudinger',
      title: 'Honorar',
      amount: 487.9,
    };

    console.log('🧪 Teste mit Beispieldaten:', testData);

    // Teste Gemini AI API direkt
    const geminiResponse = await fetch(`${request.nextUrl.origin}/api/gemini/categorize-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const geminiResult = await geminiResponse.json();
    console.log('🎯 Gemini AI Ergebnis:', geminiResult);

    return NextResponse.json({
      success: true,
      originalData: data,
      processedData: receiptForAI,
      testData: testData,
      geminiResult: geminiResult,
      analysis: {
        hasVendor: !!data.vendor,
        hasDescription: !!data.description,
        hasTitle: !!data.title,
        descriptionLength: data.description?.length || 0,
        keywords: {
          gastronomisch: data.description?.toLowerCase().includes('gastronomisch'),
          honorar: data.description?.toLowerCase().includes('honorar'),
          bewirtung: data.description?.toLowerCase().includes('bewirtung'),
        },
      },
    });
  } catch (error) {
    console.error('❌ OCR Debug Error:', error);
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
