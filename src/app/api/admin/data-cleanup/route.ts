import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    console.log('[DATA-CLEANUP] Starting data cleanup process...');

    // Verify admin authentication
    const adminVerification = await verifyAdminAuth(request);
    if (!adminVerification.success) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyId, action } = body;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const results = {
      userUpdates: {},
      companyUpdates: {},
      fieldsRemoved: [] as string[],
      fieldsNormalized: [] as string[],
      timestamp: new Date().toISOString(),
    };

    console.log(`[DATA-CLEANUP] Processing company: ${companyId}, action: ${action}`);

    // Get current data
    const userDocRef = db.collection('users').doc(companyId);
    const companyDocRef = db.collection('companies').doc(companyId);

    const [userDoc, companyDoc] = await Promise.all([userDocRef.get(), companyDocRef.get()]);

    if (action === 'analyze') {
      // Just analyze without changes
      const analysis = await analyzeDataIssues(userDoc, companyDoc);
      return NextResponse.json({
        success: true,
        analysis,
        recommendations: generateRecommendations(analysis),
      });
    }

    if (action === 'cleanup') {
      // Perform actual cleanup
      const batch = db.batch();

      // Clean user data
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const cleanedUserData = await cleanUserData(userData);

        if (Object.keys(cleanedUserData.updates).length > 0) {
          batch.update(userDocRef, cleanedUserData.updates);
          results.userUpdates = cleanedUserData.updates;
          results.fieldsNormalized.push(...cleanedUserData.normalized);
          results.fieldsRemoved.push(...cleanedUserData.removed);
        }
      }

      // Clean company data
      if (companyDoc.exists) {
        const companyData = companyDoc.data()!;
        const cleanedCompanyData = await cleanCompanyData(companyData);

        if (Object.keys(cleanedCompanyData.updates).length > 0) {
          batch.update(companyDocRef, cleanedCompanyData.updates);
          results.companyUpdates = cleanedCompanyData.updates;
          results.fieldsNormalized.push(...cleanedCompanyData.normalized);
          results.fieldsRemoved.push(...cleanedCompanyData.removed);
        }
      }

      // Execute batch update
      await batch.commit();
      console.log('[DATA-CLEANUP] Batch update completed successfully');

      return NextResponse.json({
        success: true,
        message: `Data cleanup completed for company ${companyId}`,
        results,
      });
    }

    if (action === 'remove-null-fields') {
      // Remove all null fields
      const batch = db.batch();

      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const fieldsToRemove = Object.keys(userData).filter(key => userData[key] === null);

        if (fieldsToRemove.length > 0) {
          const updates: Record<string, any> = {};
          fieldsToRemove.forEach(field => {
            updates[field] = FieldValue.delete();
          });

          batch.update(userDocRef, updates);
          results.fieldsRemoved.push(...fieldsToRemove.map(f => `user.${f}`));
        }
      }

      if (companyDoc.exists) {
        const companyData = companyDoc.data()!;
        const fieldsToRemove = Object.keys(companyData).filter(key => companyData[key] === null);

        if (fieldsToRemove.length > 0) {
          const updates: Record<string, any> = {};
          fieldsToRemove.forEach(field => {
            updates[field] = FieldValue.delete();
          });

          batch.update(companyDocRef, updates);
          results.fieldsRemoved.push(...fieldsToRemove.map(f => `company.${f}`));
        }
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Null fields removed for company ${companyId}`,
        results,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[DATA-CLEANUP] Error in data cleanup:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function analyzeDataIssues(userDoc: any, companyDoc: any) {
  const issues = {
    userIssues: [] as string[],
    companyIssues: [] as string[],
    totalNullFields: 0,
    totalComplexObjects: 0,
    totalTimestamps: 0,
  };

  if (userDoc.exists) {
    const userData = userDoc.data()!;
    for (const [key, value] of Object.entries(userData)) {
      if (value === null) {
        issues.userIssues.push(`${key}: null`);
        issues.totalNullFields++;
      } else if (typeof value === 'object' && value?.constructor?.name === 'Timestamp') {
        issues.userIssues.push(`${key}: Firebase Timestamp`);
        issues.totalTimestamps++;
      } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        issues.userIssues.push(`${key}: Complex Object`);
        issues.totalComplexObjects++;
      }
    }
  }

  if (companyDoc.exists) {
    const companyData = companyDoc.data()!;
    for (const [key, value] of Object.entries(companyData)) {
      if (value === null) {
        issues.companyIssues.push(`${key}: null`);
        issues.totalNullFields++;
      } else if (typeof value === 'object' && value?.constructor?.name === 'Timestamp') {
        issues.companyIssues.push(`${key}: Firebase Timestamp`);
        issues.totalTimestamps++;
      } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        issues.companyIssues.push(`${key}: Complex Object`);
        issues.totalComplexObjects++;
      }
    }
  }

  return issues;
}

function generateRecommendations(analysis: any) {
  const recommendations: any[] = [];

  if (analysis.totalNullFields > 0) {
    recommendations.push({
      type: 'REMOVE_NULL_FIELDS',
      priority: 'HIGH',
      title: `Entferne ${analysis.totalNullFields} null-Felder`,
      description: 'Null-Felder können zu Problemen in der Anzeige und Verarbeitung führen',
      action: 'remove-null-fields',
    });
  }

  if (analysis.totalTimestamps > 0) {
    recommendations.push({
      type: 'NORMALIZE_TIMESTAMPS',
      priority: 'MEDIUM',
      title: `Normalisiere ${analysis.totalTimestamps} Firebase Timestamps`,
      description: 'Firebase Timestamps sollten für bessere Kompatibilität normalisiert werden',
      action: 'normalize-timestamps',
    });
  }

  if (analysis.totalComplexObjects > 5) {
    recommendations.push({
      type: 'SIMPLIFY_OBJECTS',
      priority: 'LOW',
      title: `Vereinfache ${analysis.totalComplexObjects} komplexe Objekte`,
      description: 'Komplexe verschachtelte Objekte können Performance-Probleme verursachen',
      action: 'simplify-objects',
    });
  }

  return recommendations;
}

async function cleanUserData(userData: any) {
  const updates: Record<string, any> = {};
  const normalized: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of Object.entries(userData)) {
    // Remove null values
    if (value === null) {
      updates[key] = FieldValue.delete();
      removed.push(`user.${key}`);
    }
    // Normalize timestamps to ISO strings
    else if (typeof value === 'object' && value?.constructor?.name === 'Timestamp') {
      updates[key] = (value as any).toDate().toISOString();
      normalized.push(`user.${key}`);
    }
    // Handle specific problematic fields
    else if (key === 'step1' || key === 'step2' || key === 'step3' || key === 'step4') {
      // Keep step data but ensure it's properly structured
      if (typeof value === 'object' && value !== null) {
        const stepValue = value as any;
        updates[key] = {
          completed: stepValue.completed || false,
          timestamp: stepValue.timestamp
            ? stepValue.timestamp.toDate
              ? stepValue.timestamp.toDate().toISOString()
              : stepValue.timestamp
            : new Date().toISOString(),
          data: stepValue.data || {},
        };
        normalized.push(`user.${key}`);
      }
    }
  }

  return { updates, normalized, removed };
}

async function cleanCompanyData(companyData: any) {
  const updates: Record<string, any> = {};
  const normalized: string[] = [];
  const removed: string[] = [];

  for (const [key, value] of Object.entries(companyData)) {
    // Remove null values
    if (value === null) {
      updates[key] = FieldValue.delete();
      removed.push(`company.${key}`);
    }
    // Normalize timestamps to ISO strings
    else if (typeof value === 'object' && value?.constructor?.name === 'Timestamp') {
      updates[key] = (value as any).toDate().toISOString();
      normalized.push(`company.${key}`);
    }
    // Handle DATEV object specifically
    else if (key === 'datev' && typeof value === 'object' && value !== null) {
      const datevValue = value as any;
      updates[key] = {
        connected: datevValue.connected || false,
        lastSync: datevValue.lastSync
          ? datevValue.lastSync.toDate
            ? datevValue.lastSync.toDate().toISOString()
            : datevValue.lastSync
          : null,
        clientId: datevValue.clientId || null,
        credentials: datevValue.credentials || null,
      };
      normalized.push(`company.${key}`);
    }
  }

  return { updates, normalized, removed };
}
