import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getINWXService } from '@/services/inwx';

const DomainCheckSchema = z.object({
  domain: z.string().min(1),
  tlds: z.array(z.string()).optional(),
});

interface DomainCheckResult {
  domain: string;
  tld: string;
  available: boolean;
  priceMonthly: number;
  priceYearly: number;
  registrar: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, tlds } = DomainCheckSchema.parse(body);

    // Clean domain name
    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.[a-z]+$/i, '') // Remove any TLD if present
      .replace(/[^a-z0-9-äöüß]/g, '')
      .replace(/^-+|-+$/g, '');

    if (cleanDomain.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Domain muss mindestens 2 Zeichen haben' },
        { status: 400 }
      );
    }

    const inwxService = getINWXService();
    
    // Clean TLDs (remove leading dots if present)
    const cleanTlds = tlds?.map(tld => tld.replace(/^\./, ''));
    
    // Check domain availability via INWX API
    const inwxResults = await inwxService.checkDomain(cleanDomain, cleanTlds);
    
    // Transform to expected response format
    const results: DomainCheckResult[] = inwxResults.map(result => {
      const pricing = inwxService.getDomainPrice(result.tld);
      return {
        domain: result.domain,
        tld: result.tld,
        available: result.available,
        priceMonthly: pricing.monthly,
        priceYearly: pricing.yearly,
        registrar: 'INWX',
      };
    });

    // Sort: available first, then by price
    results.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.priceMonthly - b.priceMonthly;
    });

    // Get all available TLDs with pricing
    const allTlds = inwxService.getAllTLDPrices();

    return NextResponse.json({
      success: true,
      query: cleanDomain,
      results,
      availableTlds: allTlds.map(tld => ({
        tld: tld.tld,
        priceMonthly: tld.monthly,
        priceYearly: tld.yearly,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Eingabe', details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: 'Domain-Prüfung fehlgeschlagen', details: message },
      { status: 500 }
    );
  }
}

// GET endpoint to list available TLDs
export async function GET() {
  const inwxService = getINWXService();
  const allTlds = inwxService.getAllTLDPrices();
  
  // Mark popular TLDs
  const popularTlds = ['.de', '.com', '.eu', '.io', '.net', '.org'];

  const tlds = allTlds.map(tld => ({
    tld: tld.tld,
    priceMonthly: tld.monthly,
    priceYearly: tld.yearly,
    popular: popularTlds.includes(tld.tld),
  }));

  return NextResponse.json({
    success: true,
    tlds,
    registrar: 'INWX',
    configured: inwxService.isConfigured(),
  });
}
