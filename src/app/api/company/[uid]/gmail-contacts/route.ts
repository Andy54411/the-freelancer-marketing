import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;
    const searchQuery = searchParams.get('q') || '';
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    // Suche nach Gmail-Config für diesen User
    let emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
      .where('userId', '==', userId)
      .where('provider', '==', 'gmail')
      .limit(1)
      .get();

    // Fallback: Wenn nicht gefunden, suche nach irgendeiner Gmail-Config
    if (emailConfigsSnapshot.empty) {
      emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
        .where('provider', '==', 'gmail')
        .limit(1)
        .get();
    }

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Keine Gmail-Konfiguration gefunden',
        contacts: []
      });
    }

    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const gmailConfig = emailConfigDoc.data();
    
    // Prüfe ob Access Token vorhanden ist
    const accessToken = gmailConfig.tokens?.access_token;
    if (!accessToken || accessToken === 'invalid') {
      return NextResponse.json({
        success: false,
        error: 'Gmail-Authentifizierung erforderlich',
        contacts: []
      });
    }

    // Google People API aufrufen um Kontakte zu bekommen
    // Wir nutzen die connections Endpunkt für persönliche Kontakte
    const peopleApiUrl = new URL('https://people.googleapis.com/v1/people/me/connections');
    peopleApiUrl.searchParams.set('personFields', 'names,emailAddresses,photos');
    peopleApiUrl.searchParams.set('pageSize', String(Math.min(limitParam, 1000)));
    peopleApiUrl.searchParams.set('sortOrder', 'LAST_MODIFIED_DESCENDING');
    
    const contactsResponse = await fetch(peopleApiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!contactsResponse.ok) {
      const errorText = await contactsResponse.text();
      console.error('Google People API Fehler:', errorText);
      
      // Bei 401 Token abgelaufen
      if (contactsResponse.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Gmail-Token abgelaufen. Bitte Gmail erneut verbinden.',
          needsReauth: true,
          contacts: []
        });
      }
      
      // Bei 403 fehlt der Contacts-Scope
      if (contactsResponse.status === 403) {
        // Fallback: Versuche Other Contacts (letzte E-Mails)
        const otherContactsUrl = new URL('https://people.googleapis.com/v1/otherContacts');
        otherContactsUrl.searchParams.set('readMask', 'names,emailAddresses');
        otherContactsUrl.searchParams.set('pageSize', String(Math.min(limitParam, 1000)));
        
        const otherResponse = await fetch(otherContactsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (otherResponse.ok) {
          const otherData = await otherResponse.json();
          const contacts = parseGoogleContacts(otherData.otherContacts || [], searchQuery);
          
          return NextResponse.json({
            success: true,
            contacts,
            count: contacts.length,
            source: 'otherContacts'
          });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Kontakte-Berechtigung fehlt. Bitte Gmail erneut verbinden mit Kontakte-Zugriff.',
          needsReauth: true,
          contacts: []
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Abrufen der Gmail-Kontakte',
        contacts: []
      });
    }

    const contactsData = await contactsResponse.json();
    const connections = contactsData.connections || [];
    
    // Kontakte parsen und filtern
    const contacts = parseGoogleContacts(connections, searchQuery);

    return NextResponse.json({
      success: true,
      contacts,
      count: contacts.length,
      source: 'connections'
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Gmail-Kontakte:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      contacts: []
    }, { status: 500 });
  }
}

interface GooglePerson {
  resourceName?: string;
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value?: string; type?: string }>;
  photos?: Array<{ url?: string }>;
}

function parseGoogleContacts(connections: GooglePerson[], searchQuery: string): Array<{ id: string; name: string; email: string; photo?: string }> {
  const contacts: Array<{ id: string; name: string; email: string; photo?: string }> = [];
  const searchLower = searchQuery.toLowerCase();
  
  for (const person of connections) {
    // Nur Kontakte mit E-Mail-Adresse
    const emails = person.emailAddresses || [];
    if (emails.length === 0) continue;
    
    const primaryEmail = emails[0]?.value || '';
    if (!primaryEmail) continue;
    
    // Name extrahieren
    const names = person.names || [];
    const displayName = names[0]?.displayName || 
      (names[0]?.givenName && names[0]?.familyName 
        ? `${names[0].givenName} ${names[0].familyName}`.trim()
        : names[0]?.givenName || names[0]?.familyName || primaryEmail.split('@')[0]);
    
    // Foto-URL
    const photoUrl = person.photos?.[0]?.url;
    
    // Suchfilter anwenden
    if (searchQuery) {
      const matchesSearch = 
        displayName.toLowerCase().includes(searchLower) ||
        primaryEmail.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) continue;
    }
    
    contacts.push({
      id: person.resourceName || primaryEmail,
      name: displayName,
      email: primaryEmail,
      photo: photoUrl,
    });
  }
  
  return contacts;
}
