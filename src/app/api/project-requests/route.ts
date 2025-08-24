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
        console.error('❌ [Project Requests API] Missing required fields in AI format');
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
        console.error('❌ [Project Requests API] Missing required fields in standard format');
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

    console.log('💾 [Project Requests API] Saving to Firestore...');

    // Speichere in Firestore
    const docRef = await db.collection('project_requests').add(projectRequestData);

    console.log('✅ [Project Requests API] Project request created with ID:', docRef.id);

    // ERWEITERTE NOTIFICATION LOGIK: Handle selectedProviders + public notifications
    if (selectedProviders.length > 0) {
      // 1. Direkte Benachrichtigungen an ausgewählte Provider
      console.log(
        '🎯 [Project Requests API] Sending direct notifications to selected providers...'
      );

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

            console.log(
              `✅ [Project Requests API] Direct notification für Provider ${providerId} erstellt`
            );
            return { success: true, providerId };
          } catch (error) {
            console.error(
              `❌ [Project Requests API] Fehler bei direkter Notification für Provider ${providerId}:`,
              error
            );
            return { success: false, providerId, error };
          }
        });

        await Promise.allSettled(directNotificationPromises);
        console.log(
          `🎯 [Project Requests API] Direkte Notifications für ${selectedProviders.length} Provider gesendet`
        );
      } catch (directNotificationError) {
        console.error(
          '❌ [Project Requests API] Fehler bei direkten Notifications:',
          directNotificationError
        );
      }
    }

    // 2. Standard E-Mail und Public Notifications (immer ausführen für öffentliche Subcategory)
    if (subcategory) {
      try {
        console.log('📧 [Project Requests API] Sending email notifications to companies...');

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

        console.log(
          `📊 [Project Requests API] E-Mail-Benachrichtigungen: ${emailResult.sentCount} gesendet, ${emailResult.failedCount} fehlgeschlagen`
        );

        if (emailResult.failedCount > 0) {
          console.warn(
            '⚠️ [Project Requests API] Einige E-Mail-Benachrichtigungen fehlgeschlagen:',
            emailResult.details.filter(d => !d.success).map(d => `${d.email}: ${d.error}`)
          );
        }

        // 3. ÖFFENTLICHE FIRESTORE-NOTIFICATIONS: Erstelle Notifications für relevante Unternehmen (zusätzlich zu direkten)
        console.log(
          '🔔 [Project Requests API] Creating public Firestore notifications for companies...'
        );

        try {
          // Finde alle Unternehmen mit der entsprechenden Subcategory
          const firmUsersQuery = await db
            .collection('users')
            .where('user_type', '==', 'firma')
            .where('subcategories', 'array-contains', subcategory)
            .get();

          const publicNotificationPromises = firmUsersQuery.docs.map(async firmDoc => {
            try {
              const firmData = firmDoc.data();

              // Skip falls dieses Unternehmen bereits eine direkte Notification erhalten hat
              if (selectedProviders.length > 0 && selectedProviders.includes(firmDoc.id)) {
                console.log(
                  `⚠️ [Project Requests API] Skipping public notification für ${firmDoc.id} - bereits direkt benachrichtigt`
                );
                return { success: true, companyId: firmDoc.id, skipped: true };
              }

              // Erstelle Firestore-Notification für jedes relevante Unternehmen
              await db.collection('notifications').add({
                userId: firmDoc.id,
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

              console.log(
                `✅ [Project Requests API] Public Firestore-Notification für Company ${firmDoc.id} erstellt`
              );
              return { success: true, companyId: firmDoc.id };
            } catch (error) {
              console.error(
                `❌ [Project Requests API] Fehler beim Erstellen der public Notification für Company ${firmDoc.id}:`,
                error
              );
              return { success: false, companyId: firmDoc.id, error };
            }
          });

          const publicNotificationResults = await Promise.allSettled(publicNotificationPromises);
          const successfulPublicNotifications = publicNotificationResults.filter(
            result => result.status === 'fulfilled' && result.value.success && !result.value.skipped
          ).length;

          console.log(
            `🔔 [Project Requests API] Öffentliche Firestore-Notifications erstellt: ${successfulPublicNotifications} von ${publicNotificationResults.length}`
          );
        } catch (notificationError) {
          console.error(
            '❌ [Project Requests API] Fehler beim Erstellen der öffentlichen Firestore-Notifications:',
            notificationError
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
