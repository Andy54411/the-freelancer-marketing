import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { headers } from 'next/headers';

// Interface für Transaction Link
interface TransactionLink {
  transactionId: string;
  documentId: string;
  documentType: 'beleg' | 'rechnung' | 'gutschrift';
  documentNumber: string;
  documentDate: string;
  documentAmount: number;
  customerName: string;
  linkDate: string;
  createdBy: string;
  // Bidirektionale Referenzen
  transactionData: {
    id: string;
    name: string;
    verwendungszweck: string;
    buchungstag: string;
    betrag: number;
    accountId: string;
  };
  documentData: {
    id: string;
    type: string;
    number: string;
    customerName: string;
    total: number;
    date: string;
  };
}

// POST: Neue Transaction-Document Verknüpfung erstellen
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: 'Company ID and User ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { transactionId, documentId, transactionData, documentData } = body;

    if (!transactionId || !documentId) {
      return NextResponse.json(
        { error: 'Transaction ID and Document ID required' },
        { status: 400 }
      );
    }

    // Eindeutige Document ID für bidirektionale Verknüpfung
    const linkId = `${transactionId}_${documentId}`;
    
    const transactionLink: TransactionLink = {
      transactionId,
      documentId,
      documentType: documentData.type === 'storno' ? 'gutschrift' : 'rechnung',
      documentNumber: documentData.number,
      documentDate: documentData.date,
      documentAmount: documentData.total,
      customerName: documentData.customerName,
      linkDate: new Date().toISOString(),
      createdBy: userId,
      transactionData: {
        id: transactionData.id,
        name: transactionData.name,
        verwendungszweck: transactionData.verwendungszweck,
        buchungstag: transactionData.buchungstag,
        betrag: transactionData.betrag,
        accountId: transactionData.accountId
      },
      documentData: {
        id: documentData.id,
        type: documentData.type,
        number: documentData.number,
        customerName: documentData.customerName,
        total: documentData.total,
        date: documentData.date
      }
    };

    // In Subcollection speichern: companies/{companyId}/transaction_links/{linkId}
    if (!db) {
      throw new Error('Firebase Admin nicht initialisiert');
    }
    
    await db
      .collection('companies')
      .doc(companyId)
      .collection('transaction_links')
      .doc(linkId)
      .set(transactionLink);

    console.log(`✅ Transaction Link created: ${linkId} for company ${companyId}`);

    return NextResponse.json({
      success: true,
      linkId,
      message: 'Transaction successfully linked to document'
    });

  } catch (error) {
    console.error('❌ Error creating transaction link:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction link' },
      { status: 500 }
    );
  }
}

// GET: Transaction Links für ein Unternehmen abrufen
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const documentId = searchParams.get('documentId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      );
    }

    if (!db) {
      throw new Error('Firebase Admin nicht initialisiert');
    }
    
    const linksRef = db
      .collection('companies')
      .doc(companyId)
      .collection('transaction_links');

    let query = linksRef.orderBy('linkDate', 'desc');

    // Filter nach Transaction ID
    if (transactionId) {
      query = query.where('transactionId', '==', transactionId);
    }

    // Filter nach Document ID
    if (documentId) {
      query = query.where('documentId', '==', documentId);
    }

    const snapshot = await query.get();
    const links: TransactionLink[] = [];

    snapshot.forEach(doc => {
      links.push({
        ...doc.data() as TransactionLink
      });
    });

    return NextResponse.json({
      success: true,
      links,
      count: links.length
    });

  } catch (error) {
    console.error('❌ Error fetching transaction links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction links' },
      { status: 500 }
    );
  }
}

// DELETE: Transaction Link entfernen
export async function DELETE(request: NextRequest) {
  try {
    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const documentId = searchParams.get('documentId');

    if (!companyId || !transactionId || !documentId) {
      return NextResponse.json(
        { error: 'Company ID, Transaction ID and Document ID required' },
        { status: 400 }
      );
    }

    const linkId = `${transactionId}_${documentId}`;

    if (!db) {
      throw new Error('Firebase Admin nicht initialisiert');
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('transaction_links')
      .doc(linkId)
      .delete();

    console.log(`✅ Transaction Link deleted: ${linkId} for company ${companyId}`);

    return NextResponse.json({
      success: true,
      message: 'Transaction link successfully removed'
    });

  } catch (error) {
    console.error('❌ Error deleting transaction link:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction link' },
      { status: 500 }
    );
  }
}