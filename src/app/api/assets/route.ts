import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyId,
      name,
      description,
      category,
      acquisitionDate,
      acquisitionCost,
      depreciationMethod,
      usefulLifeYears,
      residualValue,
      serialNumber,
      location,
      supplier,
      invoiceNumber,
      status,
      receipts,
    } = body;

    if (!companyId || !name || !acquisitionCost || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pflichtfelder fehlen (companyId, name, acquisitionCost, category)',
        },
        { status: 400 }
      );
    }

    if (typeof acquisitionCost !== 'number' || acquisitionCost <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ungültiger Anschaffungswert',
        },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not initialized',
        },
        { status: 500 }
      );
    }

    const assetData = {
      name,
      description: description || '',
      category: category || 'other',
      acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : new Date(),
      acquisitionCost,
      depreciationMethod: depreciationMethod || 'linear',
      usefulLifeYears: usefulLifeYears || 3,
      residualValue: residualValue || 1,
      serialNumber: serialNumber || '',
      location: location || '',
      supplier: supplier || '',
      invoiceNumber: invoiceNumber || '',
      status: status || 'active',
      receipts: receipts || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db
      .collection('companies')
      .doc(companyId)
      .collection('fixedAssets')
      .add(assetData);

    return NextResponse.json({
      success: true,
      assetId: docRef.id,
      message: 'Anlage erfolgreich erstellt',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fehler beim Erstellen der Anlage',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID ist erforderlich',
        },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not initialized',
        },
        { status: 500 }
      );
    }

    const assetsRef = db.collection('companies').doc(companyId).collection('fixedAssets');
    const snapshot = await assetsRef.get();

    const assets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      assets,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fehler beim Abrufen der Anlagen',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const id = searchParams.get('id');

    if (!companyId || !id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID und Asset ID sind erforderlich',
        },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not initialized',
        },
        { status: 500 }
      );
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('fixedAssets')
      .doc(id)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Anlage erfolgreich gelöscht',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fehler beim Löschen der Anlage',
      },
      { status: 500 }
    );
  }
}
