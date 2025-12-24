/**
 * Admin Users API Route
 * 
 * Firebase-basierte Benutzerverwaltung
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Pruefe ob spezifische Rolle angefordert wird (z.B. Support-Mitarbeiter)
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Wenn role=support, dann Admin-Mitarbeiter aus adminUsers Collection laden
    if (role === 'support') {
      const adminUsersSnapshot = await db.collection('adminUsers')
        .where('isActive', '==', true)
        .get();
      
      const supportUsers = adminUsersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
        };
      });

      return NextResponse.json({
        success: true,
        users: supportUsers,
      });
    }

    // Standard: Alle Benutzer aus users Collection laden
    const usersSnapshot = await db.collection('users').limit(100).get();
    
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      const rawType = data.user_type || data.userType || 'user';
      // Normalisiere den Typ fuer konsistente Filterung
      let normalizedType = 'user';
      if (rawType === 'firma' || rawType === 'Firma' || rawType === 'company' || rawType === 'unternehmen') {
        normalizedType = 'company';
      } else if (rawType === 'admin' || rawType === 'master' || rawType === 'master-admin') {
        normalizedType = 'admin';
      } else if (rawType === 'kunde' || rawType === 'Kunde' || rawType === 'user' || rawType === 'User') {
        normalizedType = 'user';
      }
      
      return {
        id: doc.id,
        email: data.email || '',
        name: data.displayName || data.name || data.email || 'Unbekannt',
        type: normalizedType,
        phone: data.phone || data.phoneNumber || '',
        company: data.companyName || data.company || '',
        status: data.isActive === false ? 'inactive' : 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        lastLogin: data.lastLogin?.toDate?.()?.toISOString() || data.lastLogin || null,
      };
    });

    // Admin-Benutzer aus adminUsers Collection laden
    const adminUsersSnapshot = await db.collection('adminUsers').get();
    const adminUsers = adminUsersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        name: data.name || data.email || 'Admin',
        type: 'admin',
        role: data.role,
        phone: data.phone || '',
        company: 'Taskilo',
        status: data.isActive === false ? 'inactive' : 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin?.toDate?.()?.toISOString() || null,
      };
    });

    // Unternehmen aus companies Collection laden
    const companiesSnapshot = await db.collection('companies').limit(100).get();
    const companyUsers = companiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || data.contactEmail || '',
        name: data.companyName || data.name || data.displayName || 'Unbekannt',
        type: 'company',
        phone: data.phone || data.phoneNumber || '',
        company: data.companyName || data.name || '',
        status: data.isActive === false ? 'inactive' : 'active',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLogin: data.lastLogin?.toDate?.()?.toISOString() || null,
      };
    });

    // Alle Benutzer zusammenfuehren (ohne Duplikate zwischen users und companies)
    const companyIds = new Set(companyUsers.map(c => c.id));
    const filteredUsers = users.filter(u => !companyIds.has(u.id));
    const allUsers = [...filteredUsers, ...companyUsers, ...adminUsers];

    return NextResponse.json({
      success: true,
      users: allUsers,
      totalUsers: allUsers.length,
      totalCompanies: companiesSnapshot.size,
      usersByType: {
        user: allUsers.filter(u => u.type === 'user').length,
        company: allUsers.filter(u => u.type === 'company').length,
        admin: allUsers.filter(u => u.type === 'admin').length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Failed to fetch users', details: errorMessage },
      { status: 500 }
    );
  }
}
