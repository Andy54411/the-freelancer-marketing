/**
 * Interner API-Endpunkt für die OCR-KI auf dem Hetzner Server.
 * Durchsucht Geschäftspartner (Kunden/Lieferanten) einer Firma.
 * 
 * SICHERHEIT: Nur für interne Aufrufe vom Hetzner OCR-Service!
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, where, limit as firestoreLimit } from 'firebase/firestore';

// Interner API-Key für OCR-Service (muss in beiden Systemen konfiguriert sein)
const INTERNAL_API_KEY = process.env.TASKILO_INTERNAL_API_KEY || 'taskilo-internal-eb62b9b7fb92053eebc3bbc45e3f55c6';

interface PartnerSearchResult {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  city?: string;
  vatId?: string;
  source: 'taskilo_crm';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // API-Key Validierung
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== INTERNAL_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Ungültiger API-Key' },
      { status: 401 }
    );
  }
  
  const searchParams = request.nextUrl.searchParams;
  const queryText = searchParams.get('q');
  const companyId = searchParams.get('company_id');
  const maxResults = parseInt(searchParams.get('limit') || '10', 10);
  
  if (!queryText) {
    return NextResponse.json(
      { success: false, error: 'Suchbegriff (q) erforderlich' },
      { status: 400 }
    );
  }
  
  if (!companyId) {
    return NextResponse.json(
      { success: false, error: 'Company ID erforderlich' },
      { status: 400 }
    );
  }
  
  try {
    const results: PartnerSearchResult[] = [];
    const searchTermLower = queryText.toLowerCase();
    
    // Suche in Kunden-Subcollection
    const customersRef = collection(db, 'companies', companyId, 'customers');
    const customersSnapshot = await getDocs(customersRef);
    
    customersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const name = data.name || data.companyName || data.displayName || '';
      
      // Einfache Substring-Suche (für komplexere Suche könnte Algolia verwendet werden)
      if (name.toLowerCase().includes(searchTermLower)) {
        results.push({
          id: doc.id,
          name: name,
          type: 'customer',
          city: data.city || data.address?.city,
          vatId: data.vatId || data.ustId,
          source: 'taskilo_crm',
        });
      }
    });
    
    // Suche in Lieferanten-Subcollection
    const suppliersRef = collection(db, 'companies', companyId, 'suppliers');
    const suppliersSnapshot = await getDocs(suppliersRef);
    
    suppliersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const name = data.name || data.companyName || data.displayName || '';
      
      if (name.toLowerCase().includes(searchTermLower)) {
        results.push({
          id: doc.id,
          name: name,
          type: 'supplier',
          city: data.city || data.address?.city,
          vatId: data.vatId || data.ustId,
          source: 'taskilo_crm',
        });
      }
    });
    
    // Suche in businessPartners (wenn vorhanden)
    try {
      const partnersRef = collection(db, 'companies', companyId, 'businessPartners');
      const partnersSnapshot = await getDocs(partnersRef);
      
      partnersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const name = data.name || data.companyName || data.displayName || '';
        
        if (name.toLowerCase().includes(searchTermLower)) {
          // Prüfe ob nicht bereits in results
          const exists = results.some(r => r.name.toLowerCase() === name.toLowerCase());
          if (!exists) {
            results.push({
              id: doc.id,
              name: name,
              type: data.type === 'supplier' ? 'supplier' : 'customer',
              city: data.city || data.address?.city,
              vatId: data.vatId || data.ustId,
              source: 'taskilo_crm',
            });
          }
        }
      });
    } catch {
      // businessPartners Collection existiert möglicherweise nicht
    }
    
    // Nach Relevanz sortieren (exakte Übereinstimmung zuerst)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchTermLower;
      const bExact = b.name.toLowerCase() === searchTermLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Dann nach Startübereinstimmung
      const aStarts = a.name.toLowerCase().startsWith(searchTermLower);
      const bStarts = b.name.toLowerCase().startsWith(searchTermLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.name.localeCompare(b.name, 'de');
    });
    
    // Limitieren
    const limitedResults = results.slice(0, maxResults);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      results: limitedResults,
      total: results.length,
      query: queryText,
      company_id: companyId,
      processing_time_ms: processingTime,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Internal API] Fehler bei Partner-Suche:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Suche fehlgeschlagen',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
