import { NextRequest, NextResponse } from 'next/server';

// Dynamic Firebase imports to prevent build-time issues
let db: any;

async function getFirebaseDb() {
  if (!db) {
    const firebaseModule = await import('@/firebase/server');
    db = firebaseModule.db;
  }
  return db;
}

/**
 * Simplified Steuerberater API for immediate functionality
 */
export async function GET(request: NextRequest) {
  try {
    const database = await getFirebaseDb();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');
    const action = searchParams.get('action');

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'invites':
        // Get invitations for this company
        const invitesSnapshot = await database
          .collection('steuerberater_invites')
          .where('companyId', '==', companyId)
          .orderBy('createdAt', 'desc')
          .get();

        const invites = invitesSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
          acceptedAt: doc.data().acceptedAt?.toDate?.() || doc.data().acceptedAt,
        }));

        return NextResponse.json({
          success: true,
          data: invites,
          timestamp: Date.now(),
        });

      case 'documents':
        // Get shared documents for this company
        const docsSnapshot = await database
          .collection('shared_documents')
          .where('companyId', '==', companyId)
          .orderBy('sharedAt', 'desc')
          .get();

        const documents = docsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          sharedAt: doc.data().sharedAt?.toDate?.() || doc.data().sharedAt,
          lastAccessed: doc.data().lastAccessed?.toDate?.() || doc.data().lastAccessed,
        }));

        return NextResponse.json({
          success: true,
          data: documents,
          timestamp: Date.now(),
        });

      case 'stats':
        // Get collaboration statistics
        const stats = {
          activeSteuerberater: 0,
          sharedDocuments: 0,
          lastActivity: null,
          totalDownloads: 0,
        };

        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: Date.now(),
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            invites: [],
            documents: [],
            stats: { activeSteuerberater: 0, sharedDocuments: 0 },
          },
          timestamp: Date.now(),
        });
    }
  } catch (error) {
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

export async function POST(request: NextRequest) {
  try {
    const database = await getFirebaseDb();
    const body = await request.json();
    const { action, companyId, company_id, ...data } = body;
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'invite':
        return await handleInvite(database, finalCompanyId, data);
      case 'share_document':
        return await handleShareDocument(database, finalCompanyId, data);
      default:
        return NextResponse.json(
          { error: 'invalid_action', message: 'Ungültige Aktion' },
          { status: 400 }
        );
    }
  } catch (error) {
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

async function handleInvite(database: any, companyId: string, data: any) {
  try {
    const { email, name, kanzleiName, message, accessLevel = 'basic', invitedBy = 'system' } = data;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'missing_data', message: 'E-Mail und Name sind erforderlich' },
        { status: 400 }
      );
    }

    // Check if invitation already exists
    const existingSnapshot = await database
      .collection('steuerberater_invites')
      .where('companyId', '==', companyId)
      .where('email', '==', email)
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'already_invited', message: 'Steuerberater bereits eingeladen' },
        { status: 400 }
      );
    }

    // Create invitation
    const inviteData = {
      companyId,
      email,
      name,
      kanzleiName: kanzleiName || '',
      status: 'pending',
      permissions: ['view_documents'],
      createdAt: new Date(),
      invitedBy,
      message: message || '',
      accessLevel,
      notificationSettings: {
        monthlyReports: true,
        documentSharing: true,
        taxDeadlines: true,
      },
    };

    const docRef = await database.collection('steuerberater_invites').add(inviteData);

    // Log activity
    await database.collection('collaboration_logs').add({
      companyId,
      action: 'invite_sent',
      details: `Steuerberater ${name} (${email}) eingeladen`,
      timestamp: new Date(),
      performedBy: invitedBy,
    });

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...inviteData },
      message: 'Einladung erfolgreich versendet',
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

async function handleShareDocument(database: any, companyId: string, data: any) {
  try {
    const { steuerberaterId, name, type, description, category = 'other' } = data;

    if (!steuerberaterId || !name || !type) {
      return NextResponse.json(
        { error: 'missing_data', message: 'Steuerberater, Name und Typ sind erforderlich' },
        { status: 400 }
      );
    }

    const documentData = {
      companyId,
      steuerberaterId,
      name,
      description: description || '',
      type,
      category,
      sharedAt: new Date(),
      sharedBy: 'system',
      accessLevel: 'view',
      downloadCount: 0,
      tags: [],
      encrypted: true,
    };

    const docRef = await database.collection('shared_documents').add(documentData);

    // Log activity
    await database.collection('collaboration_logs').add({
      companyId,
      steuerberaterId,
      action: 'document_shared',
      details: `Dokument "${name}" geteilt`,
      timestamp: new Date(),
      performedBy: 'system',
    });

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...documentData },
      message: 'Dokument erfolgreich geteilt',
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}
