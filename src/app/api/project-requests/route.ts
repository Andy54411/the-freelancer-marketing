import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { ProjectEmailNotificationService } from '@/lib/project-email-notifications';

/**
 * API Route zum Erstellen einer neuen Projektanfrage
 * POST /api/project-requests
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 [Project Requests API] Creating new project request...');

    const body = await request.json();
    console.log('📋 [Project Requests API] Request body:', body);

    // Validierung der erforderlichen Felder
    if (!body.title || !body.description || !body.category || !body.customerUid) {
      console.error('❌ [Project Requests API] Missing required fields');
      return NextResponse.json(
        { error: 'Titel, Beschreibung, Kategorie und Kunde sind erforderlich' },
        { status: 400 }
      );
    }

    // Erstelle Projektanfrage-Dokument
    const projectRequestData = {
      title: body.title,
      description: body.description,
      category: body.category,
      subcategory: body.subcategory || '',
      serviceCategory: body.category, // Für die Quotes-Abfrage
      serviceSubcategory: body.subcategory || '', // Für die Quotes-Abfrage
      budgetType: body.budgetType || 'negotiable',
      budgetAmount: body.budgetAmount || null,
      maxBudget: body.maxBudget || null,
      timeline: body.timeline || '',
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      preferredDate: body.preferredDate || null,
      location: body.location || '',
      isRemote: body.isRemote || false,
      requiredSkills: body.requiredSkills || [],
      urgency: body.urgency || 'medium',
      subcategoryData: body.subcategoryData || null,
      customerUid: body.customerUid,
      customerEmail: body.customerEmail || '',
      status: 'open',
      proposals: [],
      viewCount: 0,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log('💾 [Project Requests API] Saving to Firestore...');

    // Speichere in Firestore
    const docRef = await db.collection('project_requests').add(projectRequestData);

    console.log('✅ [Project Requests API] Project request created with ID:', docRef.id);

    // Sende E-Mail-Benachrichtigungen an relevante Unternehmen
    if (body.subcategory) {
      try {
        console.log('📧 [Project Requests API] Sending email notifications to companies...');

        const emailService = ProjectEmailNotificationService.getInstance();
        const emailResult = await emailService.notifyCompaniesAboutNewProject({
          projectId: docRef.id,
          title: body.title,
          description: body.description,
          category: body.category,
          subcategory: body.subcategory,
          customerName: body.customerName,
          location: body.location,
          budget:
            body.budgetAmount || body.maxBudget
              ? {
                  amount: body.budgetAmount,
                  type: body.budgetType,
                  max: body.maxBudget,
                }
              : undefined,
          timeline: body.timeline,
          startDate: body.startDate,
          endDate: body.endDate,
          urgency: body.urgency,
          createdAt: new Date(),
        });

        console.log(
          `📊 [Project Requests API] E-Mail-Benachrichtigungen: ${emailResult.sentCount} gesendet, ${emailResult.failedCount} fehlgeschlagen`
        );

        if (emailResult.failedCount > 0) {
          console.warn(
            '⚠️ [Project Requests API] Einige E-Mail-Benachrichtigungen fehlgeschlagen:',
            emailResult.details.filter(d => !d.success).map(d => `${d.email}: ${d.error}`)
          );
        }
      } catch (emailError) {
        console.error(
          '❌ [Project Requests API] Fehler beim Senden der E-Mail-Benachrichtigungen:',
          emailError
        );
        // Projekt wurde trotzdem erfolgreich erstellt, auch wenn E-Mails fehlschlagen
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Projektanfrage erfolgreich erstellt',
    });
  } catch (error) {
    console.error('💥 [Project Requests API] Detailed error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });

    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Projektanfrage' },
      { status: 500 }
    );
  }
}

/**
 * API Route zum Abrufen aller Projektanfragen
 * GET /api/project-requests
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [Project Requests API] Fetching project requests...');

    const { searchParams } = new URL(request.url);
    const customerUid = searchParams.get('customerUid');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = db.collection('project_requests').where('isActive', '==', true);

    // Filter nach Kunde
    if (customerUid) {
      query = query.where('customerUid', '==', customerUid);
    }

    // Filter nach Status
    if (status) {
      query = query.where('status', '==', status);
    }

    // Filter nach Kategorie
    if (category) {
      query = query.where('category', '==', category);
    }

    // Sortierung und Limit
    query = query.orderBy('createdAt', 'desc').limit(limit);

    console.log('🔍 [Project Requests API] Executing query...');
    const snapshot = await query.get();

    console.log('📊 [Project Requests API] Found', snapshot.size, 'project requests');

    const projectRequests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      projectRequests,
      total: snapshot.size,
    });
  } catch (error) {
    console.error('💥 [Project Requests API] Error fetching project requests:', error);

    return NextResponse.json({ error: 'Fehler beim Abrufen der Projektanfragen' }, { status: 500 });
  }
}
