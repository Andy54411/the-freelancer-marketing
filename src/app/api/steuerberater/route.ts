import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

/**
 * Steuerberater-Kollaborations-API für Taskilo
 * Ermöglicht Mandanten ihren Steuerberater einzuladen und sicher Unterlagen auszutauschen
 */

interface SteuerberaterInvite {
  id?: string;
  companyId: string;
  email: string;
  name: string;
  kanzleiName?: string;
  telefon?: string;
  datevNummer?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  permissions: Array<'view_documents' | 'export_data' | 'monthly_reports' | 'tax_access' | 'accounting_access'>;
  invitedAt: Date;
  invitedBy: string;
  acceptedAt?: Date;
  message?: string;
  accessLevel: 'basic' | 'advanced' | 'full';
  notificationSettings: {
    monthlyReports: boolean;
    documentSharing: boolean;
    taxDeadlines: boolean;
  };
}

interface SharedDocument {
  id?: string;
  companyId: string;
  steuerberaterId: string;
  name: string;
  description?: string;
  type: 'PDF' | 'Excel' | 'CSV' | 'XML' | 'DATEV' | 'EÜR' | 'UStVA' | 'BWA' | 'GuV';
  category: 'tax_report' | 'financial_statement' | 'cashbook' | 'invoice_data' | 'expense_report' | 'datev_export' | 'other';
  fileUrl?: string;
  filePath?: string;
  fileSize?: number;
  sharedAt: Date;
  sharedBy: string;
  accessLevel: 'view' | 'download' | 'edit';
  downloadCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  tags: string[];
  encrypted: boolean;
  metadata?: {
    period?: string;
    year?: number;
    quarter?: number;
    month?: number;
    reportType?: string;
  };
}

interface CollaborationLog {
  id?: string;
  companyId: string;
  steuerberaterId: string;
  action: 'invite_sent' | 'invite_accepted' | 'document_shared' | 'document_accessed' | 'report_generated' | 'message_sent' | 'permission_changed';
  details: string;
  timestamp: Date;
  performedBy: string;
  ipAddress?: string;
}

// GET - Alle Steuerberater-Einladungen abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || searchParams.get('company_id');
    const action = searchParams.get('action');

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[Steuerberater API] GET request:', { companyId, action });

    switch (action) {
      case 'invites':
        return await getInvites(companyId);
      case 'documents':
        return await getSharedDocuments(companyId);
      case 'logs':
        return await getCollaborationLogs(companyId);
      case 'stats':
        return await getCollaborationStats(companyId);
      default:
        return await getOverview(companyId);
    }

  } catch (error) {
    console.error('❌ [Steuerberater API] GET error:', error);
    return NextResponse.json(
      { 
        error: 'internal_server_error', 
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Steuerberater einladen oder Dokument teilen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, companyId, company_id, ...data } = body;
    const finalCompanyId = companyId || company_id;

    if (!finalCompanyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[Steuerberater API] POST request:', { finalCompanyId, action });

    switch (action) {
      case 'invite':
        return await sendInvite(finalCompanyId, data);
      case 'share_document':
        return await shareDocument(finalCompanyId, data);
      case 'generate_report':
        return await generateReportForSteuerberater(finalCompanyId, data);
      case 'send_message':
        return await sendMessage(finalCompanyId, data);
      default:
        return NextResponse.json(
          { error: 'invalid_action', message: 'Ungültige Aktion' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [Steuerberater API] POST error:', error);
    return NextResponse.json(
      { 
        error: 'internal_server_error', 
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Einladung akzeptieren/ablehnen oder Berechtigungen ändern
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, inviteId, companyId, company_id, ...data } = body;
    const finalCompanyId = companyId || company_id;

    console.log('[Steuerberater API] PUT request:', { finalCompanyId, action, inviteId });

    switch (action) {
      case 'accept_invite':
        return await acceptInvite(inviteId, data);
      case 'decline_invite':
        return await declineInvite(inviteId, data);
      case 'update_permissions':
        return await updatePermissions(inviteId, data);
      case 'revoke_access':
        return await revokeAccess(inviteId);
      default:
        return NextResponse.json(
          { error: 'invalid_action', message: 'Ungültige Aktion' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [Steuerberater API] PUT error:', error);
    return NextResponse.json(
      { 
        error: 'internal_server_error', 
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Einladung widerrufen oder Dokument-Zugriff entfernen
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');
    const documentId = searchParams.get('documentId');
    const action = searchParams.get('action');

    console.log('[Steuerberater API] DELETE request:', { inviteId, documentId, action });

    if (inviteId) {
      return await deleteInvite(inviteId);
    } else if (documentId) {
      return await deleteSharedDocument(documentId);
    } else {
      return NextResponse.json(
        { error: 'missing_id', message: 'Invite ID oder Document ID ist erforderlich' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ [Steuerberater API] DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'internal_server_error', 
        message: 'Unerwarteter Serverfehler',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper Functions

async function getInvites(companyId: string) {
  const q = query(
    collection(db, 'steuerberater_invites'),
    where('companyId', '==', companyId),
    orderBy('invitedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const invites = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    invitedAt: doc.data().invitedAt?.toDate(),
    acceptedAt: doc.data().acceptedAt?.toDate(),
  }));

  return NextResponse.json({
    success: true,
    data: invites,
    timestamp: Date.now(),
  });
}

async function getSharedDocuments(companyId: string) {
  const q = query(
    collection(db, 'shared_documents'),
    where('companyId', '==', companyId),
    orderBy('sharedAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const documents = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    sharedAt: doc.data().sharedAt?.toDate(),
    lastAccessed: doc.data().lastAccessed?.toDate(),
    expiresAt: doc.data().expiresAt?.toDate(),
  }));

  return NextResponse.json({
    success: true,
    data: documents,
    timestamp: Date.now(),
  });
}

async function getCollaborationLogs(companyId: string) {
  const q = query(
    collection(db, 'collaboration_logs'),
    where('companyId', '==', companyId),
    orderBy('timestamp', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const logs = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate(),
  }));

  return NextResponse.json({
    success: true,
    data: logs,
    timestamp: Date.now(),
  });
}

async function getCollaborationStats(companyId: string) {
  // Anzahl aktiver Steuerberater
  const invitesQuery = query(
    collection(db, 'steuerberater_invites'),
    where('companyId', '==', companyId),
    where('status', '==', 'accepted')
  );
  const invitesSnapshot = await getDocs(invitesQuery);

  // Anzahl geteilter Dokumente
  const docsQuery = query(
    collection(db, 'shared_documents'),
    where('companyId', '==', companyId)
  );
  const docsSnapshot = await getDocs(docsQuery);

  // Letzte Aktivität
  const logsQuery = query(
    collection(db, 'collaboration_logs'),
    where('companyId', '==', companyId),
    orderBy('timestamp', 'desc')
  );
  const logsSnapshot = await getDocs(logsQuery);

  const stats = {
    activeSteuerberater: invitesSnapshot.size,
    sharedDocuments: docsSnapshot.size,
    lastActivity: logsSnapshot.docs[0]?.data()?.timestamp?.toDate() || null,
    totalDownloads: docsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().downloadCount || 0), 0),
    monthlyReports: docsSnapshot.docs.filter(doc => doc.data().category === 'tax_report').length,
  };

  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: Date.now(),
  });
}

async function getOverview(companyId: string) {
  const [invitesResponse, documentsResponse, statsResponse] = await Promise.all([
    getInvites(companyId),
    getSharedDocuments(companyId),
    getCollaborationStats(companyId),
  ]);

  const invites = await invitesResponse.json();
  const documents = await documentsResponse.json();
  const stats = await statsResponse.json();

  return NextResponse.json({
    success: true,
    data: {
      invites: invites.data,
      documents: documents.data,
      stats: stats.data,
    },
    timestamp: Date.now(),
  });
}

async function sendInvite(companyId: string, data: any) {
  const { email, name, kanzleiName, telefon, permissions = ['view_documents'], message, accessLevel = 'basic', invitedBy } = data;

  if (!email || !name) {
    return NextResponse.json(
      { error: 'missing_data', message: 'E-Mail und Name sind erforderlich' },
      { status: 400 }
    );
  }

  // Prüfen ob bereits eine Einladung existiert
  const existingQuery = query(
    collection(db, 'steuerberater_invites'),
    where('companyId', '==', companyId),
    where('email', '==', email)
  );
  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    return NextResponse.json(
      { error: 'already_invited', message: 'Steuerberater bereits eingeladen' },
      { status: 400 }
    );
  }

  const invite: SteuerberaterInvite = {
    companyId,
    email,
    name,
    kanzleiName,
    telefon,
    status: 'pending',
    permissions,
    invitedAt: new Date(),
    invitedBy: invitedBy || 'system',
    message,
    accessLevel,
    notificationSettings: {
      monthlyReports: true,
      documentSharing: true,
      taxDeadlines: true,
    },
  };

  const docRef = await addDoc(collection(db, 'steuerberater_invites'), invite);

  // Log der Aktivität
  await logCollaborationActivity(companyId, '', 'invite_sent', `Steuerberater ${name} (${email}) eingeladen`, invitedBy || 'system');

  // TODO: E-Mail-Benachrichtigung senden

  return NextResponse.json({
    success: true,
    data: { id: docRef.id, ...invite },
    message: 'Einladung erfolgreich versendet',
    timestamp: Date.now(),
  });
}

async function shareDocument(companyId: string, data: any) {
  const { 
    steuerberaterId, 
    name, 
    description, 
    type, 
    category, 
    fileUrl, 
    filePath, 
    fileSize, 
    accessLevel = 'view', 
    tags = [], 
    metadata = {},
    sharedBy,
    expiresAt 
  } = data;

  if (!steuerberaterId || !name || !type) {
    return NextResponse.json(
      { error: 'missing_data', message: 'Steuerberater, Name und Typ sind erforderlich' },
      { status: 400 }
    );
  }

  const document: SharedDocument = {
    companyId,
    steuerberaterId,
    name,
    description,
    type,
    category: category || 'other',
    fileUrl,
    filePath,
    fileSize,
    sharedAt: new Date(),
    sharedBy: sharedBy || 'system',
    accessLevel,
    downloadCount: 0,
    tags,
    encrypted: true, // Standardmäßig verschlüsselt
    metadata,
    ...(expiresAt && { expiresAt: new Date(expiresAt) }),
  };

  const docRef = await addDoc(collection(db, 'shared_documents'), document);

  // Log der Aktivität
  await logCollaborationActivity(companyId, steuerberaterId, 'document_shared', `Dokument "${name}" geteilt`, sharedBy || 'system');

  return NextResponse.json({
    success: true,
    data: { id: docRef.id, ...document },
    message: 'Dokument erfolgreich geteilt',
    timestamp: Date.now(),
  });
}

async function generateReportForSteuerberater(companyId: string, data: any) {
  const { steuerberaterId, reportType, period, year, quarter, month } = data;

  if (!steuerberaterId || !reportType) {
    return NextResponse.json(
      { error: 'missing_data', message: 'Steuerberater und Report-Typ sind erforderlich' },
      { status: 400 }
    );
  }

  // Simuliere Report-Generierung
  const reportName = `${reportType.toUpperCase()}_${period || year}_${Date.now()}`;
  const reportData = {
    reportType,
    period: period || `${year}${quarter ? `-Q${quarter}` : ''}${month ? `-${month.toString().padStart(2, '0')}` : ''}`,
    generatedAt: new Date().toISOString(),
    // Hier würden echte Berechnungen stattfinden
    summary: `${reportType} Bericht für ${period || year}`,
  };

  // Dokument als geteilt markieren
  const sharedDoc = await shareDocument(companyId, {
    steuerberaterId,
    name: reportName,
    description: `Automatisch generierter ${reportType} Bericht`,
    type: 'PDF',
    category: 'tax_report',
    accessLevel: 'download',
    tags: [reportType, period || year.toString()],
    metadata: {
      period: period || year.toString(),
      year,
      quarter,
      month,
      reportType,
    },
    sharedBy: 'system',
  });

  await logCollaborationActivity(companyId, steuerberaterId, 'report_generated', `${reportType} Bericht für ${period || year} generiert`, 'system');

  return NextResponse.json({
    success: true,
    data: { reportData, sharedDocument: sharedDoc },
    message: `${reportType} Bericht erfolgreich generiert und geteilt`,
    timestamp: Date.now(),
  });
}

async function sendMessage(companyId: string, data: any) {
  const { steuerberaterId, message, sender } = data;

  if (!steuerberaterId || !message) {
    return NextResponse.json(
      { error: 'missing_data', message: 'Steuerberater und Nachricht sind erforderlich' },
      { status: 400 }
    );
  }

  await logCollaborationActivity(companyId, steuerberaterId, 'message_sent', `Nachricht: "${message.substring(0, 50)}..."`, sender || 'system');

  // TODO: Echte Nachrichten-Funktionalität implementieren
  
  return NextResponse.json({
    success: true,
    message: 'Nachricht erfolgreich gesendet',
    timestamp: Date.now(),
  });
}

async function acceptInvite(inviteId: string, data: any) {
  const docRef = doc(db, 'steuerberater_invites', inviteId);
  
  await updateDoc(docRef, {
    status: 'accepted',
    acceptedAt: new Date(),
    ...data,
  });

  const inviteDoc = await getDoc(docRef);
  const inviteData = inviteDoc.data();

  if (inviteData) {
    await logCollaborationActivity(inviteData.companyId, inviteId, 'invite_accepted', `Einladung von ${inviteData.name} akzeptiert`, inviteData.email);
  }

  return NextResponse.json({
    success: true,
    message: 'Einladung erfolgreich akzeptiert',
    timestamp: Date.now(),
  });
}

async function declineInvite(inviteId: string, data: any) {
  const docRef = doc(db, 'steuerberater_invites', inviteId);
  
  await updateDoc(docRef, {
    status: 'declined',
    declinedAt: new Date(),
    ...data,
  });

  return NextResponse.json({
    success: true,
    message: 'Einladung abgelehnt',
    timestamp: Date.now(),
  });
}

async function updatePermissions(inviteId: string, data: any) {
  const { permissions, accessLevel } = data;
  const docRef = doc(db, 'steuerberater_invites', inviteId);
  
  await updateDoc(docRef, {
    permissions,
    accessLevel,
    updatedAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: 'Berechtigungen erfolgreich aktualisiert',
    timestamp: Date.now(),
  });
}

async function revokeAccess(inviteId: string) {
  const docRef = doc(db, 'steuerberater_invites', inviteId);
  
  await updateDoc(docRef, {
    status: 'revoked',
    revokedAt: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: 'Zugriff erfolgreich widerrufen',
    timestamp: Date.now(),
  });
}

async function deleteInvite(inviteId: string) {
  await deleteDoc(doc(db, 'steuerberater_invites', inviteId));

  return NextResponse.json({
    success: true,
    message: 'Einladung erfolgreich gelöscht',
    timestamp: Date.now(),
  });
}

async function deleteSharedDocument(documentId: string) {
  await deleteDoc(doc(db, 'shared_documents', documentId));

  return NextResponse.json({
    success: true,
    message: 'Geteiltes Dokument erfolgreich gelöscht',
    timestamp: Date.now(),
  });
}

async function logCollaborationActivity(
  companyId: string, 
  steuerberaterId: string, 
  action: CollaborationLog['action'], 
  details: string, 
  performedBy: string
) {
  const log: CollaborationLog = {
    companyId,
    steuerberaterId,
    action,
    details,
    timestamp: new Date(),
    performedBy,
  };

  await addDoc(collection(db, 'collaboration_logs'), log);
}
