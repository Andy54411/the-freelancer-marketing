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
    
    // Alle Zahlungen für diesen Auftrag suchen
    const paymentsQuery = await db.collection('payments')
      .where('orderId', '==', orderId)
      .get();
    
    const payments = paymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Escrow Payments suchen
    const escrowQuery = await db.collection('escrowPayments')
      .where('orderId', '==', orderId) 
      .get();
    
    const escrowPayments = escrowQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Time Tracking laden
    const timeTrackingDoc = await db.collection('time_tracking').doc(orderId).get();
    const timeTrackingData = timeTrackingDoc.exists ? timeTrackingDoc.data() : null;

    // Alle zusätzlichen Zahlungen suchen
    const additionalPaymentsQuery = await db.collection('additionalPayments')
      .where('orderId', '==', orderId)
      .get();
    
    const additionalPayments = additionalPaymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Stripe Payments suchen
    const stripePaymentsQuery = await db.collection('stripePayments')
      .where('orderId', '==', orderId)
      .get();
    
    const stripePayments = stripePaymentsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const debugInfo = {
      orderId,
      orderStatus: orderData?.status,
      orderTotalPrice: orderData?.totalPrice,
      orderPlannedHours: orderData?.plannedHours,
      orderHourlyRate: orderData?.hourlyRate,
      payments: payments,
      escrowPayments: escrowPayments,
      additionalPayments: additionalPayments,
      stripePayments: stripePayments,
      timeTracking: timeTrackingData,
      
      // Zusammenfassungen
      paymentsCount: payments.length,
      escrowCount: escrowPayments.length,
      additionalCount: additionalPayments.length,
      stripeCount: stripePayments.length,
      
      totalPaymentAmount: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      totalEscrowAmount: escrowPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      totalAdditionalAmount: additionalPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      totalStripeAmount: stripePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      
      // Berechnete Werte
      calculatedTotal: 0, // wird berechnet
      missingAmount: 0 // wird berechnet
    };

    // Berechne erwartete Gesamtsumme
    const plannedHours = orderData?.plannedHours || 0;
    const hourlyRate = orderData?.hourlyRate || 0;
    const loggedHours = timeTrackingData?.totalHours || plannedHours;
    
    debugInfo.calculatedTotal = loggedHours * hourlyRate;
    debugInfo.missingAmount = debugInfo.calculatedTotal - (
      debugInfo.totalPaymentAmount + 
      debugInfo.totalEscrowAmount + 
      debugInfo.totalAdditionalAmount + 
      debugInfo.totalStripeAmount
    );

    console.log('DEBUG Order Payments:', debugInfo);
    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('Debug Order Error:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
