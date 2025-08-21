import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'orderId ist erforderlich' }, { status: 400 });
    }

    // Order laden
    const orderDoc = await db.collection('auftraege').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }
    
    const orderData = orderDoc.data();
    
    // Time Tracking laden
    const timeTrackingDoc = await db.collection('time_tracking').doc(orderId).get();
    const timeTrackingData = timeTrackingDoc.exists ? timeTrackingDoc.data() : null;

    // Analysiere timeEntries für Zahlungs-Status
    const timeEntries = timeTrackingData?.timeEntries || [];
    
    const analysis = {
      orderId,
      orderStatus: orderData?.status,
      orderTotalPrice: orderData?.totalPrice,
      orderPlannedHours: orderData?.plannedHours,
      orderHourlyRate: orderData?.hourlyRate,
      
      // Time Tracking Analysis
      timeTracking: {
        totalHours: timeTrackingData?.totalHours || 0,
        plannedHours: orderData?.plannedHours || 0,
        additionalHours: (timeTrackingData?.totalHours || 0) - (orderData?.plannedHours || 0),
        
        // Entry Status Breakdown
        entryStatusBreakdown: {} as Record<string, number>,
        paymentIntentAnalysis: [] as Array<{
          entryId: any;
          paymentIntentId: any;
          status: any;
          billingStatus: any;
          hours: any;
          rate: any;
          amount: number;
          paidAt: any;
          transferredAt: any;
        }>,
        
        // Detailed Payment Calculation
        originalPayment: {
          hours: orderData?.plannedHours || 0,
          rate: orderData?.hourlyRate || 0,
          amount: (orderData?.plannedHours || 0) * (orderData?.hourlyRate || 0)
        },
        
        additionalPayments: {
          totalHours: 0,
          totalAmount: 0,
          paidHours: 0,
          paidAmount: 0,
          unpaidHours: 0,
          unpaidAmount: 0
        }
      }
    };

    // Analysiere alle timeEntries
    const statusCounts: Record<string, number> = {};
    let additionalHours = 0;
    let additionalAmount = 0;
    let paidAdditionalHours = 0;
    let paidAdditionalAmount = 0;

    timeEntries.forEach((entry: any) => {
      // Status counting
      const status = entry.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Payment Intent Analysis
      if (entry.paymentIntentId) {
        analysis.timeTracking.paymentIntentAnalysis.push({
          entryId: entry.id,
          paymentIntentId: entry.paymentIntentId,
          status: entry.status,
          billingStatus: entry.billingStatus,
          hours: entry.hours || 0,
          rate: entry.hourlyRate || orderData?.hourlyRate || 0,
          amount: (entry.hours || 0) * (entry.hourlyRate || orderData?.hourlyRate || 0),
          paidAt: entry.paidAt,
          transferredAt: entry.transferredAt
        });
      }
      
      // Additional hours calculation
      if (entry.category === 'additional') {
        const hours = entry.hours || 0;
        const rate = entry.hourlyRate || orderData?.hourlyRate || 0;
        const amount = hours * rate;
        
        additionalHours += hours;
        additionalAmount += amount;
        
        if (entry.status === 'transferred' || entry.status === 'paid') {
          paidAdditionalHours += hours;
          paidAdditionalAmount += amount;
        }
      }
    });

    analysis.timeTracking.entryStatusBreakdown = statusCounts;
    analysis.timeTracking.additionalPayments = {
      totalHours: additionalHours,
      totalAmount: additionalAmount,
      paidHours: paidAdditionalHours,
      paidAmount: paidAdditionalAmount,
      unpaidHours: additionalHours - paidAdditionalHours,
      unpaidAmount: additionalAmount - paidAdditionalAmount
    };

    // Gesamtkalkulation
    const totalExpected = analysis.timeTracking.originalPayment.amount + additionalAmount;
    const totalPaid = analysis.timeTracking.originalPayment.amount + paidAdditionalAmount;
    
    // Erweitere timeTracking mit zusätzlichen Berechnungen
    const extendedTimeTracking = {
      ...analysis.timeTracking,
      totalExpected,
      totalPaid,
      missingAmount: totalExpected - totalPaid,
      
      // Stripe Comparison
      stripeComparison: {
        expectedInStripe: totalPaid,
        actualInStripe: 219268, // Known from previous API call
        discrepancy: totalPaid - 219268
      }
    };

    analysis.timeTracking = extendedTimeTracking;

    console.log('DEBUG Time Tracking Analysis:', analysis);
    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Debug Order Time Tracking Error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
