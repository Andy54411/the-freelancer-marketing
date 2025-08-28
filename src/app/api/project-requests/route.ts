import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { ProjectEmailNotificationService } from '@/lib/project-email-notifications';

/**
 * API Route zum Erstellen einer neuen Projektanfrage
 * POST /api/project-requests
 */
export async function POST(request: NextRequest) {
  try {
    // Dynamically import Firebase setup to avoid build-time initialization
    const { db } = await import('@/firebase/server');

    // Check if Firebase is properly initialized
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();

    // Support für AI Project Creation Format
    const isAIProjectFormat = body.projectData && body.userId;

    let projectRequestData: any;
    let customerUid: string;
    let subcategory: string;
    let selectedProviders: string[] = [];

    if (isAIProjectFormat) {
      // AI Project Creation Format (von ProjectAssistantModal)
      const projectData = body.projectData;
      customerUid = body.userId;
      selectedProviders = body.selectedProviders || [];
      subcategory = projectData.category; // AI Format nutzt category als subcategory

      if (!projectData.title || !projectData.description || !projectData.category || !customerUid) {
        return NextResponse.json(
          { error: 'Titel, Beschreibung, Kategorie und Kunde sind erforderlich' },
          { status: 400 }
        );
      }

      projectRequestData = {
        title: projectData.title,
        description: projectData.description,
        category: projectData.category,
        subcategory: projectData.category,
        serviceCategory: projectData.category,
        serviceSubcategory: projectData.category,
        budgetType: 'range',
        budgetAmount: projectData.estimatedBudget || null,
        maxBudget: projectData.estimatedBudget || null,
        timeline: projectData.timeline || '',
        startDate: null,
        endDate: null,
        preferredDate: null,
        location: projectData.location || '',
        isRemote: false,
        requiredSkills: projectData.services || [],
        urgency: projectData.priority || 'medium',
        subcategoryData: null,
        customerUid: customerUid,
        customerEmail: '',
        status: 'open',
        proposals: [],
        viewCount: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // AI-spezifische Felder
        originalPrompt: projectData.originalPrompt || '',
        aiGenerated: true,
        selectedProviders: selectedProviders.map((p: any) => (typeof p === 'string' ? p : p.id)), // Falls Provider-Objekte übergeben werden
      };
    } else {
      // Standard Project Creation Format (von normalem Formular)
      customerUid = body.customerUid;
      subcategory = body.subcategory;

      if (!body.title || !body.description || !body.category || !customerUid) {
        return NextResponse.json(
          { error: 'Titel, Beschreibung, Kategorie und Kunde sind erforderlich' },
          { status: 400 }
        );
      }

      projectRequestData = {
        title: body.title,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory || '',
        serviceCategory: body.category,
        serviceSubcategory: body.subcategory || '',
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
        customerUid: customerUid,
        customerEmail: body.customerEmail || '',
        status: 'open',
        proposals: [],
        viewCount: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        selectedProviders: [],
      };
    }

    // Speichere in Firestore
    const docRef = await db.collection('project_requests').add(projectRequestData);

    // ERWEITERTE NOTIFICATION LOGIK: Handle selectedProviders + public notifications
    if (selectedProviders.length > 0) {
      // 1. Direkte Benachrichtigungen an ausgewählte Provider

      try {
        const directNotificationPromises = selectedProviders.map(async providerId => {
          try {
            await db.collection('notifications').add({
              userId: providerId,
              type: 'direct_project_assignment',
              title: 'Direktzuweisung: Neues Projekt',
              message: `Sie wurden direkt für das Projekt "${projectRequestData.title}" ausgewählt`,
              projectId: docRef.id,
              projectTitle: projectRequestData.title,
              projectCategory: projectRequestData.category,
              projectSubcategory: projectRequestData.subcategory,
              customerId: customerUid,
              createdAt: Timestamp.now(),
              isRead: false,
              priority: 'high', // Direkte Zuweisungen haben hohe Priorität
            });

            return { success: true, providerId };
          } catch (error) {
            return { success: false, providerId, error };
          }
        });

        await Promise.allSettled(directNotificationPromises);
      } catch (directNotificationError) {}
    }

    // 2. Standard E-Mail und Public Notifications (immer ausführen für öffentliche Subcategory)
    if (subcategory) {
      try {
        const emailService = ProjectEmailNotificationService.getInstance();
        const emailResult = await emailService.notifyCompaniesAboutNewProject({
          projectId: docRef.id,
          title: projectRequestData.title,
          description: projectRequestData.description,
          category: projectRequestData.category,
          subcategory: subcategory,
          customerName: isAIProjectFormat ? 'AI Project' : body.customerName,
          location: projectRequestData.location,
          budget:
            projectRequestData.budgetAmount || projectRequestData.maxBudget
              ? {
                  amount: projectRequestData.budgetAmount,
                  type: projectRequestData.budgetType,
                  max: projectRequestData.maxBudget,
                }
              : undefined,
          timeline: projectRequestData.timeline,
          startDate: projectRequestData.startDate,
          endDate: projectRequestData.endDate,
          urgency: projectRequestData.urgency,
          createdAt: new Date(),
        });

        if (emailResult.failedCount > 0) {
        }

        // 3. ÖFFENTLICHE FIRESTORE-NOTIFICATIONS: Erstelle Notifications für relevante Unternehmen (zusätzlich zu direkten)

        try {
          // Query companies collection directly - no legacy support needed
          const companiesQuery = await db
            .collection('companies')
            .where('subcategories', 'array-contains', subcategory)
            .get();

          const publicNotificationPromises = companiesQuery.docs.map(async companyDoc => {
            try {
              const companyData = companyDoc.data();

              // Skip falls dieses Unternehmen bereits eine direkte Notification erhalten hat
              if (selectedProviders.length > 0 && selectedProviders.includes(companyDoc.id)) {
                return { success: true, companyId: companyDoc.id, skipped: true };
              }

              // Erstelle Firestore-Notification für jedes relevante Unternehmen
              await db.collection('notifications').add({
                userId: companyDoc.id,
                type: 'new_project_available',
                title: 'Neue Projektanfrage verfügbar',
                message: `Neues Projekt in der Kategorie "${subcategory}": ${projectRequestData.title}`,
                projectId: docRef.id,
                projectTitle: projectRequestData.title,
                projectCategory: projectRequestData.category,
                projectSubcategory: subcategory,
                customerId: customerUid,
                createdAt: Timestamp.now(),
                isRead: false,
                priority: 'medium',
              });

              return { success: true, companyId: companyDoc.id };
            } catch (error) {
              console.error('Error creating notification for company:', companyDoc.id, error);
              return { success: false, companyId: companyDoc.id, error };
            }
          });

          const publicNotificationResults = await Promise.allSettled(publicNotificationPromises);
          const successfulPublicNotifications = publicNotificationResults.filter(
            result => result.status === 'fulfilled' && result.value.success && !result.value.skipped
          ).length;
        } catch (notificationError) {}
      } catch (emailError) {
        // Projekt wurde trotzdem erfolgreich erstellt, auch wenn E-Mails fehlschlagen
      }
    }

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Projektanfrage erfolgreich erstellt',
    });
  } catch (error) {
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
    // Dynamically import Firebase setup to avoid build-time initialization
    const { db } = await import('@/firebase/server');

    // Check if Firebase is properly initialized
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

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

    const snapshot = await query.get();

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
    return NextResponse.json({ error: 'Fehler beim Abrufen der Projektanfragen' }, { status: 500 });
  }
}
