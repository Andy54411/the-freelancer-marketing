import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    // Create test quote data
    const testQuote = {
      title: 'Geburtstagsfeier Catering',
      description:
        'Ich benötige einen Mietkoch für eine Geburtstagsfeier mit 20 Personen. Italienische Küche bevorzugt.',
      customerUid: 'test-customer-123',
      providerUid: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1', // Your company UID
      budget: {
        min: 500,
        max: 800,
      },
      deadline: '2025-09-01',
      status: 'pending',
      createdAt: new Date(),
      location: 'Berlin, Deutschland',
      priority: 'medium',
      serviceType: 'catering',
      guestCount: 20,
      eventDate: '2025-08-30',
      customerInfo: {
        name: 'Max Mustermann',
        type: 'user',
        email: 'max.mustermann@test.de',
        uid: 'test-customer-123',
      },
    };

    // Add to Firestore
    const docRef = await db.collection('quotes').add(testQuote);

    console.log(`[Test API] Created test quote with ID: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      message: 'Test quote created successfully',
      quoteId: docRef.id,
    });
  } catch (error) {
    console.error('[Test API] Error creating test quote:', error);
    return NextResponse.json({ error: 'Failed to create test quote' }, { status: 500 });
  }
}
