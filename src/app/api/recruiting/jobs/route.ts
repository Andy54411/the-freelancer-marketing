import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { JobPostingSchema } from '@/types/career';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input (excluding ID and dates which we generate)
    // We use a partial schema validation or construct the full object first
    
    const now = new Date().toISOString();
    
    const jobData = {
      ...body,
      postedAt: now,
      status: 'active',
      // ID will be assigned by Firestore
    };

    // Basic validation before saving
    if (!jobData.companyId || !jobData.title || !jobData.description) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtfelder' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Save to Firestore
    const docRef = await db.collection('jobs').add(jobData);
    
    // Update with ID
    await docRef.update({ id: docRef.id });

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      message: 'Job created successfully' 
    });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
