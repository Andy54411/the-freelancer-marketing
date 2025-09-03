import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';
import { ProjectEmailNotificationService } from '@/lib/project-email-notifications';

export async function POST(request: Request) {
  try {
    const { projectData, userId } = await request.json();

    if (!userId || !projectData) {
      return NextResponse.json(
        { error: 'userId und projectData sind erforderlich' },
        { status: 400 }
      );
    }

    // Überprüfe ob Provider ausgewählt wurden
    const selectedProviders = projectData.recommendedProviders || [];
    const hasSelectedProviders = selectedProviders.length > 0;

    console.log(
      `🎯 Creating project for ${hasSelectedProviders ? 'selected providers' : 'all providers'}`
    );
    console.log(`📋 Selected providers:`, selectedProviders);

    if (hasSelectedProviders) {
      // QUOTES SYSTEM: Erstelle separate Quotes für jeden ausgewählten Provider
      console.log(`🎯 Creating ${selectedProviders.length} individual quotes`);

      const questResults: Array<{ questId: string; providerId: string }> = [];

      for (const providerId of selectedProviders) {
        const questDoc = {
          // Basis-Projektinformationen
          title: projectData.title,
          description: projectData.description,
          category: projectData.category,
          subcategory: projectData.subcategory || projectData.category,

          // Provider-spezifisch
          providerId: providerId, // WICHTIG: Quest ist nur für diesen Provider
          assignedTo: providerId,
          isDirectQuest: true,

          // Benutzerinformationen - KORRIGIERT für Quotes Schema
          userId: userId,
          customerId: userId,
          customerUid: userId,
          customerData: {
            uid: userId,
            // Weitere Kundendaten können hier hinzugefügt werden
          },

          // Budget und Timeline
          estimatedBudget: projectData.estimatedBudget || 0,
          budgetRange: {
            min: Math.max(0, (projectData.estimatedBudget || 0) * 0.8),
            max: (projectData.estimatedBudget || 0) * 1.2,
            currency: 'EUR',
          },
          timeline: projectData.timeline || 'Flexibel',
          preferredDate: null,

          // Services und Anforderungen
          requiredServices: projectData.services || [],
          projectRequirements: projectData.services
            ? `Benötigte Services: ${projectData.services.join(', ')}`
            : '',

          // Priorität und Status
          priority: projectData.priority || 'medium',
          urgency: projectData.priority === 'high' ? 'urgent' : 'normal',
          status: 'active',

          // Standort (falls verfügbar)
          location: projectData.location
            ? {
                type: 'user_provided',
                address: projectData.location,
                coordinates: null,
              }
            : {
                type: 'tbd',
                address: null,
                coordinates: null,
              },

          // Quest-spezifische Felder
          questType: 'direct_assignment',
          isExclusive: true, // Nur dieser Provider kann antworten
          allowsProposals: true,
          maxProposals: 1, // Nur ein Angebot pro Quest

          // Metadaten
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: userId,
          source: 'ai_assistant_direct',

          // Projekt-spezifische Felder
          projectType: 'direct_quest',
          isPublic: false, // Privat, nur für den Provider

          // Zusätzliche KI-Informationen
          aiGenerated: true,
          originalPrompt: projectData.originalPrompt || '',
          generatedFrom: 'project_assistant_targeted',

          proposals: [],
          proposalCount: 0,
          acceptedProposal: null,
        };

        // Speichere Quest in der quotes Collection
        const questRef = await db.collection('quotes').add(questDoc);

        // Aktualisiere Quest mit seiner ID
        await questRef.update({
          id: questRef.id,
        });

        questResults.push({
          questId: questRef.id,
          providerId: providerId,
        });

        console.log(`✅ Quote created for provider ${providerId}: ${questRef.id}`);
      }

      // Sende E-Mail-Benachrichtigungen an die ausgewählten Provider
      try {
        console.log(`📧 Sending emails to ${selectedProviders.length} selected providers`);
        // TODO: Implementiere spezielle E-Mail-Benachrichtigungen für ausgewählte Provider
        // Verwende erstmal die bestehende Kategorie-Benachrichtigung
        console.log(`✅ Email notifications would be sent to selected providers`);
      } catch (emailError) {
        console.error('❌ Error sending email notifications to providers:', emailError);
        // Projekt trotzdem erstellen, auch wenn E-Mail fehlschlägt
      }

      return NextResponse.json({
        success: true,
        message: `${questResults.length} direkte Quotes erfolgreich erstellt`,
        data: {
          type: 'quotes',
          quotes: questResults,
          selectedProviders: selectedProviders,
        },
      });
    } else {
      // Project Request Path: Öffentliches Projekt ohne spezifische Anbieter
      // PROJECT REQUEST SYSTEM: Erstelle öffentliches Projekt für alle in der Kategorie
      console.log(`📢 Creating public project request for category: ${projectData.category}`);

      // Erstelle neues Projekt in der project_requests Collection
      const projectDoc = {
        // Basis-Projektinformationen
        title: projectData.title,
        description: projectData.description,
        category: projectData.category,
        subcategory: projectData.subcategory || projectData.category, // Korrekte Subkategorie

        // Benutzerinformationen
        userId: userId,
        customerId: userId,
        customerUid: userId, // Wichtig für die Frontend-Abfrage

        // Budget und Timeline
        estimatedBudget: projectData.estimatedBudget || 0,
        budgetRange: {
          min: Math.max(0, (projectData.estimatedBudget || 0) * 0.8),
          max: (projectData.estimatedBudget || 0) * 1.2,
          currency: 'EUR',
        },
        timeline: projectData.timeline || 'Flexibel',
        preferredDate: null, // Kann später vom Benutzer gesetzt werden

        // Services und Anforderungen
        requiredServices: projectData.services || [],
        projectRequirements: projectData.services
          ? `Benötigte Services: ${projectData.services.join(', ')}`
          : '',

        // Priorität und Status
        priority: projectData.priority || 'medium',
        urgency: projectData.priority === 'high' ? 'urgent' : 'normal',
        status: 'active', // Projekt ist sofort aktiv

        // Standort (falls verfügbar)
        location: projectData.location
          ? {
              type: 'user_provided',
              address: projectData.location,
              coordinates: null, // Koordinaten könnten später über Geocoding hinzugefügt werden
            }
          : {
              type: 'tbd', // To be determined
              address: null,
              coordinates: null,
            },

        // Angebote und Bewerbungen
        proposals: [],
        proposalCount: 0,
        acceptedProposal: null,

        // Ausgewählte Dienstleister (falls welche ausgewählt wurden)
        selectedProviders: projectData.selectedProviders || [],
        hasSelectedProviders: (projectData.selectedProviders || []).length > 0,
        isDirectAssignment: (projectData.selectedProviders || []).length > 0, // Direkte Zuweisung wenn Provider ausgewählt

        // Metadaten
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        source: 'ai_assistant', // Markiert als KI-generiert

        // Projekt-spezifische Felder
        projectType: 'service_request',
        isPublic: (projectData.selectedProviders || []).length === 0, // Nur öffentlich wenn keine Provider ausgewählt
        allowsProposals: true,
        maxProposals:
          (projectData.selectedProviders || []).length > 0
            ? (projectData.selectedProviders || []).length
            : 10, // Begrenzt auf ausgewählte Provider

        // Zusätzliche KI-Informationen
        aiGenerated: true,
        originalPrompt: projectData.originalPrompt || '',
        generatedFrom: 'project_assistant',
      };

      // Speichere Projekt in der Datenbank
      const projectRef = await db.collection('project_requests').add(projectDoc);

      // Aktualisiere Projekt mit seiner ID
      await projectRef.update({
        id: projectRef.id,
      });

      // Wenn Dienstleister ausgewählt wurden, erstelle automatisch Einladungen
      if (projectData.selectedProviders && projectData.selectedProviders.length > 0) {
        for (const provider of projectData.selectedProviders) {
          try {
            // Erstelle eine Benachrichtigung für den Dienstleister
            await db.collection('notifications').add({
              userId: provider.id,
              type: 'project_invitation',
              title: 'Neues Projekt verfügbar',
              message: `Sie wurden für das Projekt "${projectData.title}" ausgewählt`,
              projectId: projectRef.id,
              projectTitle: projectData.title,
              customerId: userId,
              createdAt: Timestamp.now(),
              read: false,
              priority: 'high',
            });
          } catch (error) {}
        }
      }

      // Hole das erstellte Projekt für die Antwort
      const createdProject = await projectRef.get();
      const projectWithId = {
        id: projectRef.id,
        ...createdProject.data(),
      };

      // NEUES E-MAIL-NOTIFICATION SYSTEM für KI-generierte Projekte
      if (projectData.category) {
        try {
          const emailService = ProjectEmailNotificationService.getInstance();

          // Für KI-Projekte: category ist eigentlich die subcategory
          // Wir verwenden eine leere category und lassen das E-Mail-System
          // die Hauptkategorie aus der subcategory ableiten
          const emailResult = await emailService.notifyCompaniesAboutNewProject({
            projectId: projectRef.id,
            title: projectData.title,
            description: projectData.description,
            category: '', // Leere category - das System wird sie aus subcategory ableiten
            subcategory: projectData.category, // KI-category ist eigentlich die subcategory
            customerName: 'KI-Generated Project',
            location: projectData.location || 'Standort noch zu klären',
            budget: projectData.estimatedBudget
              ? {
                  amount: projectData.estimatedBudget,
                  type: 'fixed',
                }
              : undefined,
            timeline: projectData.timeline,
            urgency: projectData.priority || 'medium',
            createdAt: new Date(),
          });
          console.log(`✅ Category-wide email notifications sent`);
        } catch (emailError) {
          console.error('❌ Error sending category-wide email notifications:', emailError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Öffentliches Projekt erfolgreich erstellt',
        data: {
          type: 'project_request',
          project: projectWithId,
          projectUrl: `/dashboard/user/${userId}/projects/${projectRef.id}`,
        },
      });
    }
  } catch (error) {
    console.error('❌ Error creating project:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Projekts' }, { status: 500 });
  }
}
