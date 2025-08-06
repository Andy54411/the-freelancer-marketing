import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV Accounting Documents API Route
 * Manages documents in DATEV accounting system
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');
    const documentId = searchParams.get('documentId');
    const search = searchParams.get('search');

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Documents] Fetching documents for company:', companyId, {
      documentId,
      search,
    });

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Documents] No token cookie found');
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (parseError) {
      console.error('❌ [DATEV Documents] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Documents] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // Build API endpoint URL
    const config = getDatevConfig();
    let apiUrl = `${config.apiBaseUrl}/accounting/v2.0/documents`;

    // Add document ID if specified
    if (documentId) {
      apiUrl += `/${documentId}`;
    }

    // Add search parameters
    const urlParams = new URLSearchParams();
    if (search) {
      urlParams.append('search', search);
    }
    if (urlParams.toString()) {
      apiUrl += `?${urlParams.toString()}`;
    }

    console.log('🌐 [DATEV Documents] Fetching documents...', { apiUrl });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Documents] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      // Handle specific token errors that require clearing tokens
      if (response.status === 401) {
        let errorData: any = null;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // Ignore parse errors
        }

        const tokenError = errorData?.error;
        const errorDescription = errorData?.error_description;

        if (
          tokenError === 'invalid_token' ||
          (errorDescription &&
            (errorDescription.includes('Token issued to another client') ||
              errorDescription.includes('Token malformed') ||
              errorDescription.includes('invalid_token')))
        ) {
          console.warn('⚠️ [DATEV Documents] Invalid token detected, clearing cookie...');

          // Clear the invalid token cookie
          const response = NextResponse.json(
            {
              error: 'invalid_token',
              error_description:
                errorDescription || 'Token ungültig - erneute Authentifizierung erforderlich',
              requiresAuth: true,
              clearTokens: true,
            },
            { status: 401 }
          );

          // Clear the DATEV token cookie
          response.cookies.set(cookieName, '', {
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          });

          return response;
        }
      }

      return NextResponse.json(
        {
          error: 'api_error',
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const documents = await response.json();

    console.log('✅ [DATEV Documents] Documents fetched successfully:', {
      hasData: !!documents,
      documentCount: Array.isArray(documents) ? documents.length : 'single document',
    });

    return NextResponse.json({
      success: true,
      data: documents,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV Documents] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Upload/Create Documents
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const companyId =
      (formData.get('companyId') as string) || (formData.get('company_id') as string);
    const documentFile = formData.get('document') as File;
    const documentMetadata = formData.get('metadata') as string;

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!documentFile) {
      return NextResponse.json(
        { error: 'missing_document', message: 'Dokument-Datei ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Documents] Uploading document for company:', companyId, {
      fileName: documentFile.name,
      fileSize: documentFile.size,
      fileType: documentFile.type,
    });

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${companyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Documents] No token cookie found');
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (parseError) {
      console.error('❌ [DATEV Documents] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Documents] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // Prepare multipart form data for DATEV API
    const datevFormData = new FormData();
    datevFormData.append('document', documentFile);

    if (documentMetadata) {
      try {
        const metadata = JSON.parse(documentMetadata);
        Object.keys(metadata).forEach(key => {
          datevFormData.append(key, metadata[key]);
        });
      } catch (metadataError) {
        console.warn('⚠️ [DATEV Documents] Invalid metadata JSON, skipping:', metadataError);
      }
    }

    // Upload document to DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Documents] Uploading document...');

    const response = await fetch(`${config.apiBaseUrl}/accounting/v2.0/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        // Note: Don't set Content-Type header for FormData - browser will set it with boundary
      },
      body: datevFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Documents] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'api_error',
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const uploadResult = await response.json();

    console.log('✅ [DATEV Documents] Document uploaded successfully:', {
      hasData: !!uploadResult,
      documentId: uploadResult?.documentId || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: uploadResult,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV Documents] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update Documents
 */
export async function PUT(request: NextRequest) {
  try {
    const { companyId, company_id, documentId, documentData } = await request.json();
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        { error: 'missing_document_id', message: 'Document ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (!documentData) {
      return NextResponse.json(
        { error: 'missing_data', message: 'Dokument-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Documents] Updating document for company:', finalCompanyId, { documentId });

    // Get tokens from HTTP-only cookies
    const cookieStore = await cookies();
    const cookieName = `datev_tokens_${finalCompanyId}`;
    const tokenCookie = cookieStore.get(cookieName);

    if (!tokenCookie?.value) {
      console.log('❌ [DATEV Documents] No token cookie found');
      return NextResponse.json(
        {
          error: 'no_tokens',
          message: 'Keine DATEV-Token gefunden. Bitte authentifizieren Sie sich zuerst.',
        },
        { status: 401 }
      );
    }

    // Decode token data
    let tokenData;
    try {
      const decodedData = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
      tokenData = JSON.parse(decodedData);
    } catch (parseError) {
      console.error('❌ [DATEV Documents] Failed to parse token cookie:', parseError);
      return NextResponse.json(
        { error: 'invalid_tokens', message: 'Ungültige Token-Daten.' },
        { status: 401 }
      );
    }

    // Check if tokens are expired
    const now = Date.now();
    const expiresAt = tokenData.connected_at + tokenData.expires_in * 1000;

    if (now >= expiresAt) {
      console.log('⚠️ [DATEV Documents] Tokens expired');
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Token abgelaufen. Bitte authentifizieren Sie sich erneut.',
        },
        { status: 401 }
      );
    }

    // Update document via DATEV API
    const config = getDatevConfig();
    console.log('🌐 [DATEV Documents] Updating document...');

    const response = await fetch(`${config.apiBaseUrl}/accounting/v2.0/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DATEV Documents] API request failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return NextResponse.json(
        {
          error: 'api_error',
          message: `DATEV API-Fehler: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const updateResult = await response.json();

    console.log('✅ [DATEV Documents] Document updated successfully:', {
      hasData: !!updateResult,
      documentId: updateResult?.documentId || documentId,
    });

    return NextResponse.json({
      success: true,
      data: updateResult,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('❌ [DATEV Documents] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
