import { NextRequest, NextResponse } from 'next/server';
import { getDocs, query, where, collection, limit } from 'firebase/firestore';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const platform = searchParams.get('platform');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Mock-Kampagnen für Demo-Zwecke
    const mockCampaigns = [
      {
        id: 'camp_001',
        name: 'Google Ads - Elektriker Services',
        platform: 'google',
        status: 'active',
        budget: 500.00,
        spent: 127.50,
        impressions: 15420,
        clicks: 234,
        conversions: 12,
        startDate: '2024-11-01',
        endDate: '2024-12-01',
        targetAudience: 'Hausbesitzer 25-65 Jahre',
        keywords: ['elektriker', 'elektroinstallation', 'notdienst elektriker'],
      },
      {
        id: 'camp_002', 
        name: 'LinkedIn - B2B Elektrodienstleistungen',
        platform: 'linkedin',
        status: 'active',
        budget: 300.00,
        spent: 89.25,
        impressions: 8340,
        clicks: 156,
        conversions: 8,
        startDate: '2024-11-01',
        endDate: '2024-12-01',
        targetAudience: 'Unternehmen, Facility Manager',
        keywords: ['gewerbliche elektrik', 'betriebselektriker', 'elektroplanung'],
      },
      {
        id: 'camp_003',
        name: 'Meta - Lokale Elektrikerdienstleistungen', 
        platform: 'meta',
        status: 'paused',
        budget: 200.00,
        spent: 45.80,
        impressions: 5230,
        clicks: 89,
        conversions: 4,
        startDate: '2024-10-15',
        endDate: '2024-11-15',
        targetAudience: 'Lokale Zielgruppe 5km Umkreis',
        keywords: ['elektriker in der nähe', 'elektro notdienst', 'elektroinstallation'],
      }
    ];

    // Filtere nach Platform falls angegeben
    let campaigns = mockCampaigns;
    if (platform && platform !== 'all') {
      campaigns = mockCampaigns.filter(campaign => campaign.platform === platform);
    }

    return NextResponse.json({
      success: true,
      campaigns,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalBudget: campaigns.reduce((sum, c) => sum + c.budget, 0),
      totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kampagnen:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Kampagnen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const body = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    const { name, platform, budget, targetAudience, keywords, startDate, endDate } = body;

    if (!name || !platform || !budget) {
      return NextResponse.json(
        { success: false, error: 'Name, Platform und Budget sind erforderlich' },
        { status: 400 }
      );
    }

    // Mock-Kampagne erstellen
    const newCampaign = {
      id: `camp_${Date.now()}`,
      name,
      platform,
      status: 'active',
      budget: parseFloat(budget),
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate,
      targetAudience,
      keywords,
      createdAt: new Date().toISOString(),
      companyId,
    };

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
      message: 'Kampagne erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Kampagne:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen der Kampagne',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}