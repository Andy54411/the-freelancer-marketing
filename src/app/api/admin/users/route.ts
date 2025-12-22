/**
 * Admin Users API Route
 * 
 * Firebase-basierte Benutzerverwaltung
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(_request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Datenbank nicht verfuegbar' },
        { status: 500 }
      );
    }

    // Get all users from Firebase
    const usersSnapshot = await db.collection('users').limit(100).get();
    
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.displayName || data.name,
        userType: data.user_type || data.userType || 'user',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        lastLogin: data.lastLogin?.toDate?.()?.toISOString() || data.lastLogin,
        isActive: data.isActive !== false,
        companyId: data.companyId,
      };
    });

    // Get companies count
    const companiesSnapshot = await db.collection('companies').limit(100).get();
    const companies = companiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      users,
      totalUsers: users.length,
      totalCompanies: companies.length,
      usersByType: {
        user: users.filter(u => u.userType === 'user').length,
        firma: users.filter(u => u.userType === 'firma').length,
        admin: users.filter(u => u.userType === 'admin' || u.userType === 'master').length,
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
