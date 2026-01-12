import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

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

    const recurringRef = db.collection('companies').doc(companyId).collection('recurringExpenses');
    const snapshot = await recurringRef.get();

    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      expenses,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fehler beim Abrufen der wiederkehrenden Ausgaben',
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
          error: 'Company ID und ID sind erforderlich',
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
      .collection('recurringExpenses')
      .doc(id)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Wiederkehrende Ausgabe erfolgreich gelöscht',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Fehler beim Löschen der wiederkehrenden Ausgabe',
      },
      { status: 500 }
    );
  }
}
