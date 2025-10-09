import { NextRequest, NextResponse } from 'next/server';

/**
 * Cloud Storage OCR Processing Endpoint
 * Verarbeitet OCR-Requests mit Cloud Storage Referenzen
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      s3Path,
      gcsPath,
      fileUrl,
      companyId,
      fileName,
      mimeType,
      maxFileSizeMB = 50,
      enhanced = true,
      settings,
    } = body;

    // Validation
    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'COMPANY_ID_REQUIRED',
          details: 'Company ID is required for OCR processing',
        },
        { status: 400 }
      );
    }

    if (!s3Path && !gcsPath && !fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_FILE_REFERENCE',
          details: 'Either s3Path, gcsPath, or fileUrl must be provided',
        },
        { status: 400 }
      );
    }

    // Prepare request for Firebase Cloud Function
    const ocrRequest = {
      // Cloud storage reference (priority order)
      s3Path,
      gcsPath,
      fileUrl,

      // Metadata
      companyId,
      fileName: fileName || 'document',
      mimeType,
      maxFileSizeMB,

      // Processing options
      enhancedMode: enhanced,
      ocrSettings: settings,

      // German OCR specific settings
      germanCompliance: true,
      extractVatDetails: true,
      detectInvoiceFields: true,
    };

    console.log('[CLOUD OCR] Processing request:', {
      hasS3Path: !!s3Path,
      hasGcsPath: !!gcsPath,
      hasFileUrl: !!fileUrl,
      companyId,
      fileName,
      enhanced,
    });

    // Call Firebase Cloud Function with cloud storage reference
    const firebaseUrl =
      process.env.FIREBASE_FUNCTION_URL ||
      'https://europe-west1-tilvo-f142f.cloudfunctions.net/financeApiWithOCR';
    
    // Add OCR endpoint path
    const ocrEndpoint = `${firebaseUrl}/ocr/extract-receipt`;

    console.log('[CLOUD OCR] Calling Firebase function:', ocrEndpoint);

    const firebaseResponse = await fetch(ocrEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Required authentication headers for Firebase function
        'x-user-id': companyId, // Use companyId as user-id for company context
        'x-company-id': companyId,
      },
      body: JSON.stringify(ocrRequest),
    });

    console.log('[CLOUD OCR] Firebase response status:', firebaseResponse.status);

    let firebaseResult;
    try {
      firebaseResult = await firebaseResponse.json();
      console.log('[CLOUD OCR] Firebase result:', JSON.stringify(firebaseResult, null, 2));
    } catch (parseError) {
      console.error('[CLOUD OCR] Failed to parse Firebase response:', parseError);
      const responseText = await firebaseResponse.text();
      console.error('[CLOUD OCR] Raw response:', responseText);

      return NextResponse.json(
        {
          success: false,
          error: 'FIREBASE_RESPONSE_PARSE_ERROR',
          details: 'Could not parse Firebase function response',
          rawResponse: responseText,
        },
        { status: 500 }
      );
    }

    if (!firebaseResponse.ok) {
      console.error('[CLOUD OCR] Firebase function error:', firebaseResult);
      return NextResponse.json(
        {
          success: false,
          error: 'OCR_PROCESSING_FAILED',
          details: firebaseResult.error || 'Firebase function error',
          firebaseError: firebaseResult,
          status: firebaseResponse.status,
        },
        { status: 500 }
      );
    }

    // Transform Firebase response to expected format
    console.log('[CLOUD OCR] Raw Firebase result details:', {
      hasData: !!firebaseResult.data,
      dataKeys: firebaseResult.data ? Object.keys(firebaseResult.data) : [],
      rootKeys: Object.keys(firebaseResult),
      vendor: firebaseResult.vendor,
      dataVendor: firebaseResult.data?.vendorName,
      amount: firebaseResult.amount,
      dataAmount: firebaseResult.data?.totalGrossAmount
    });

    // Extract data from Firebase result - handle both root level and nested 'data' property
    const extractedData = firebaseResult.data || firebaseResult;
    
    console.log('[CLOUD OCR] Extracted data for mapping:', {
      vendorName: extractedData.vendorName,
      totalGrossAmount: extractedData.totalGrossAmount,
      invoiceNumber: extractedData.invoiceNumber,
      invoiceDate: extractedData.invoiceDate,
      dueDate: extractedData.dueDate,
    });

    const transformedResult = {
      success: true,
      data: {
        // Core extracted data - Comprehensive mapping from Firebase result
        vendor: extractedData.vendorName || extractedData.vendor || extractedData.companyName || firebaseResult.vendor,
        amount: extractedData.totalGrossAmount || extractedData.amount || extractedData.totalGross || firebaseResult.amount,
        invoiceNumber: extractedData.invoiceNumber || firebaseResult.invoiceNumber,
        date: extractedData.invoiceDate || extractedData.date || firebaseResult.date,
        dueDate: extractedData.dueDate || firebaseResult.dueDate,
        category: extractedData.category || firebaseResult.category,
        description: extractedData.description || firebaseResult.description,
        title: extractedData.title || firebaseResult.title,

        // VAT information - Map from Firebase naming with all variants
        vatAmount: extractedData.totalVatAmount || extractedData.vatAmount || extractedData.totalVat || firebaseResult.vatAmount,
        netAmount: extractedData.totalNetAmount || extractedData.netAmount || extractedData.totalNet || firebaseResult.netAmount,
        vatRate: extractedData.taxRate || extractedData.vatRate || firebaseResult.vatRate,

        // 🎯 CUSTOMER/RECIPIENT Information - Extract from Firebase result
        customerName: extractedData.customerName || firebaseResult.customerName,
        customerAddress: extractedData.customerAddress || firebaseResult.customerAddress,

        // Enhanced fields
        costCenter: extractedData.costCenter || firebaseResult.costCenter,
        paymentTerms: extractedData.paymentTerms || firebaseResult.paymentTerms,
        currency: extractedData.currency || firebaseResult.currency || 'EUR',
        companyVatNumber: extractedData.vendorVatId || extractedData.companyVatNumber || firebaseResult.companyVatNumber,
        goBDCompliant: extractedData.goBDCompliant || firebaseResult.goBDCompliant,

        // Validation and processing info
        validationIssues: extractedData.validationIssues || firebaseResult.validationIssues || [],
        processingMode: 'CLOUD_STORAGE',
        cloudStorage: {
          source: s3Path || gcsPath || fileUrl,
          processingTime: extractedData.processingTime || firebaseResult.processingTime,
          confidence: extractedData.confidence || firebaseResult.confidence,
        },
      },

      // Additional metadata
      validation: {
        issues: firebaseResult.validationIssues || [],
        goBDCompliant: firebaseResult.goBDCompliant || false,
      },

      processing: {
        mode: 'CLOUD_STORAGE_OCR',
        enhanced: enhanced,
        source: s3Path ? 'S3' : gcsPath ? 'GCS' : 'HTTP_URL',
        processingTime: firebaseResult.processingTime || 0,
      },
    };

    console.log('[CLOUD OCR] Transformed result data:', {
      vendor: transformedResult.data.vendor,
      amount: transformedResult.data.amount,
      invoiceNumber: transformedResult.data.invoiceNumber,
      date: transformedResult.data.date,
      vatRate: transformedResult.data.vatRate
    });

    console.log('[CLOUD OCR] Processing completed successfully');

    return NextResponse.json(transformedResult);
  } catch (error) {
    console.error('[CLOUD OCR] Processing error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown processing error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to process OCR with cloud storage references',
      documentation: {
        endpoint: '/api/finance/ocr-cloud-storage',
        method: 'POST',
        requiredFields: ['companyId', 'one of: s3Path|gcsPath|fileUrl'],
        optionalFields: ['fileName', 'mimeType', 'maxFileSizeMB', 'enhanced', 'settings'],
      },
    },
    { status: 405 }
  );
}
