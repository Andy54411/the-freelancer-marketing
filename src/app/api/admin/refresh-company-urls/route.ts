import { NextRequest, NextResponse } from 'next/server';
import { db, auth as adminAuth } from '@/firebase/server';
import { getStorage } from 'firebase-admin/storage';

/**
 * Admin API: Erneuert abgelaufene signierte URLs für Unternehmen
 * 
 * POST /api/admin/refresh-company-urls
 * Body: { companyId?: string } - Wenn leer, werden alle Unternehmen aktualisiert
 * 
 * Erneuert folgende URL-Felder:
 * - logoUrl
 * - profilePictureURL
 * - profilePictureFirebaseUrl
 * - businessLicenseURL
 * - identityFrontUrl
 * - identityBackUrl
 * - masterCraftsmanCertificateUrl
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ') || !adminAuth) {
      return NextResponse.json({ success: false, error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Prüfe ob User Admin ist
    const userDoc = await db!.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    if (!userData?.isAdmin && !userData?.role?.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Keine Admin-Berechtigung' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const specificCompanyId = body.companyId as string | undefined;

    const bucket = getStorage().bucket();
    const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

    // URL-Felder die erneuert werden sollen
    const urlFields = [
      'logoUrl',
      'profilePictureURL',
      'profilePictureFirebaseUrl',
      'businessLicenseURL',
      'identityFrontUrl',
      'identityBackUrl',
      'masterCraftsmanCertificateUrl',
    ];

    // Funktion zum Extrahieren des Storage-Pfads aus einer signierten URL
    const extractStoragePath = (signedUrl: string): string | null => {
      try {
        // Format: https://storage.googleapis.com/BUCKET/PATH?...
        const url = new URL(signedUrl);
        const pathMatch = url.pathname.match(/\/[^/]+\/(.+)/);
        if (pathMatch) {
          return decodeURIComponent(pathMatch[1]);
        }
        return null;
      } catch {
        return null;
      }
    };

    // Funktion zum Generieren einer neuen signierten URL
    const refreshUrl = async (oldUrl: string): Promise<string | null> => {
      const storagePath = extractStoragePath(oldUrl);
      if (!storagePath) {
        return null;
      }

      try {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        
        if (!exists) {
          return null;
        }

        const [newSignedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + TEN_YEARS_MS,
        });

        return newSignedUrl;
      } catch (error) {
        console.error(`Fehler beim Erneuern der URL für ${storagePath}:`, error);
        return null;
      }
    };

    // Lade Unternehmen
    let companiesQuery;
    if (specificCompanyId) {
      companiesQuery = db!.collection('companies').where('__name__', '==', specificCompanyId);
    } else {
      companiesQuery = db!.collection('companies');
    }

    const companiesSnapshot = await companiesQuery.get();
    
    const results: Array<{
      companyId: string;
      companyName: string;
      updatedFields: string[];
      errors: string[];
    }> = [];

    for (const companyDoc of companiesSnapshot.docs) {
      const companyData = companyDoc.data();
      const companyId = companyDoc.id;
      const companyName = companyData.companyName || companyId;
      
      const updates: Record<string, string> = {};
      const updatedFields: string[] = [];
      const errors: string[] = [];

      // Prüfe jedes URL-Feld
      for (const field of urlFields) {
        const currentUrl = companyData[field];
        
        // Nur signierte URLs erneuern (enthalten GoogleAccessId oder Signature)
        if (currentUrl && typeof currentUrl === 'string' && 
            (currentUrl.includes('GoogleAccessId=') || currentUrl.includes('Signature='))) {
          
          // Prüfe ob URL bereits abgelaufen ist oder bald abläuft
          const expiresMatch = currentUrl.match(/Expires=(\d+)/);
          if (expiresMatch) {
            const expiresTimestamp = parseInt(expiresMatch[1]) * 1000; // In Millisekunden
            const now = Date.now();
            const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
            
            // Erneuere wenn abgelaufen oder in den nächsten 30 Tagen abläuft
            if (expiresTimestamp < thirtyDaysFromNow) {
              const newUrl = await refreshUrl(currentUrl);
              if (newUrl) {
                updates[field] = newUrl;
                updatedFields.push(field);
              } else {
                errors.push(`${field}: Konnte nicht erneuert werden`);
              }
            }
          }
        }
      }

      // Prüfe auch step5-Felder (Onboarding-Dokumente)
      const step5 = companyData.step5;
      if (step5) {
        const step5Fields = ['businessLicenseUrl', 'identityFrontUrl', 'identityBackUrl', 'masterCraftsmanCertificateUrl'];
        for (const field of step5Fields) {
          const currentUrl = step5[field];
          if (currentUrl && typeof currentUrl === 'string' && 
              (currentUrl.includes('GoogleAccessId=') || currentUrl.includes('Signature='))) {
            
            const expiresMatch = currentUrl.match(/Expires=(\d+)/);
            if (expiresMatch) {
              const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
              const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;
              
              if (expiresTimestamp < thirtyDaysFromNow) {
                const newUrl = await refreshUrl(currentUrl);
                if (newUrl) {
                  updates[`step5.${field}`] = newUrl;
                  updatedFields.push(`step5.${field}`);
                } else {
                  errors.push(`step5.${field}: Konnte nicht erneuert werden`);
                }
              }
            }
          }
        }
      }

      // Updates anwenden
      if (Object.keys(updates).length > 0) {
        await db!.collection('companies').doc(companyId).update({
          ...updates,
          urlsRefreshedAt: new Date().toISOString(),
        });
      }

      results.push({
        companyId,
        companyName,
        updatedFields,
        errors,
      });
    }

    const totalUpdated = results.filter(r => r.updatedFields.length > 0).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    return NextResponse.json({
      success: true,
      message: `${totalUpdated} Unternehmen aktualisiert`,
      totalCompanies: results.length,
      totalUpdated,
      totalErrors,
      results,
    });

  } catch (error) {
    console.error('Fehler beim Erneuern der URLs:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

/**
 * GET: Zeigt Status der URL-Ablaufdaten für ein Unternehmen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'companyId Parameter erforderlich' 
      }, { status: 400 });
    }

    const companyDoc = await db!.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unternehmen nicht gefunden' 
      }, { status: 404 });
    }

    const companyData = companyDoc.data()!;
    const urlStatus: Record<string, { url: string; expiresAt: string; isExpired: boolean; daysUntilExpiry: number }> = {};

    const urlFields = [
      'logoUrl',
      'profilePictureURL',
      'profilePictureFirebaseUrl',
      'businessLicenseURL',
      'identityFrontUrl',
      'identityBackUrl',
    ];

    const now = Date.now();

    for (const field of urlFields) {
      const url = companyData[field];
      if (url && typeof url === 'string') {
        const expiresMatch = url.match(/Expires=(\d+)/);
        if (expiresMatch) {
          const expiresTimestamp = parseInt(expiresMatch[1]) * 1000;
          const isExpired = expiresTimestamp < now;
          const daysUntilExpiry = Math.floor((expiresTimestamp - now) / (24 * 60 * 60 * 1000));
          
          urlStatus[field] = {
            url: url.substring(0, 100) + '...',
            expiresAt: new Date(expiresTimestamp).toISOString(),
            isExpired,
            daysUntilExpiry,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      companyId,
      companyName: companyData.companyName,
      urlStatus,
    });

  } catch (error) {
    console.error('Fehler beim Prüfen der URLs:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
    }, { status: 500 });
  }
}
