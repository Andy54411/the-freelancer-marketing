import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { projectData, userId } = await request.json();

    if (!userId || !projectData) {
      return NextResponse.json(
        { error: 'userId und projectData sind erforderlich' },
        { status: 400 }
      );
    }

    // Erstelle neues Projekt in der project_requests Collection
    const projectDoc = {
      // Basis-Projektinformationen
      title: projectData.title,
      description: projectData.description,
      category: projectData.category,
      subcategory: projectData.category, // Fallback

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
      location: {
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
      maxProposals: (projectData.selectedProviders || []).length > 0 ? (projectData.selectedProviders || []).length : 10, // Begrenzt auf ausgewählte Provider

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
      console.log(`📧 Lade ${projectData.selectedProviders.length} Dienstleister für Projekt ${projectRef.id} ein`);
      
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
            priority: 'high'
          });
          console.log(`✅ Benachrichtigung für Provider ${provider.id} erstellt`);
        } catch (error) {
          console.error(`❌ Fehler beim Benachrichtigen von Provider ${provider.id}:`, error);
        }
      }
    }

    // Hole das erstellte Projekt für die Antwort
    const createdProject = await projectRef.get();
    const projectWithId = {
      id: projectRef.id,
      ...createdProject.data(),
    };

    return NextResponse.json({
      success: true,
      project: projectWithId,
      message: 'Projekt erfolgreich erstellt',
      projectUrl: `/dashboard/user/${userId}/projects/${projectRef.id}`,
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Projekts:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Projekts' }, { status: 500 });
  }
}
