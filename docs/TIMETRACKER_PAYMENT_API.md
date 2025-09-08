# TimeTracker API & Payment System - Backend Implementation Guide

## 🎯 Überblick
Diese Dokumentation beschreibt die benötigten Backend API Endpunkte für das TimeTracker Payment System.

## 📡 Benötigte API Endpunkte

### 1. `/createAdditionalHoursPaymentIntent`
**POST** - Erstellt ein Stripe Payment Intent für zusätzliche Stunden

#### Request Body:
```json
{
  "orderId": "order_1757236855486_zfhg6tikp",
  "timeEntryIds": ["1757247867827sb25m0pgs", "1757251497341frdg69r1z"],
  "totalAmountInCents": 28000,
  "totalHours": 8,
  "customerId": "VP9BNVTey1WvdkMb0EPA3rdPq4t2",
  "providerId": "LLc8PX1VYHfpoFknk8o51LAOfSA2",
  "currency": "eur",
  "paymentType": "additional_hours",
  "description": "Zusätzliche Arbeitsstunden für Auftrag order_1757236855486_zfhg6tikp",
  "metadata": {
    "orderId": "order_1757236855486_zfhg6tikp",
    "totalHours": "8",
    "timeEntryCount": "2",
    "paymentType": "additional_hours",
    "platform": "flutter_mobile"
  }
}
```

#### Response Success (200):
```json
{
  "success": true,
  "clientSecret": "pi_1234567890_secret_abcdef",
  "paymentIntentId": "pi_1234567890",
  "publishableKey": "pk_live_51234567890...",
  "message": "Payment Intent erfolgreich erstellt"
}
```

#### Response Error (400/500):
```json
{
  "success": false,
  "error": "Fehlergrund",
  "statusCode": 400
}
```

### 2. `/confirmAdditionalHoursPayment`
**POST** - Bestätigt Payment und löst Stripe Connect Auszahlung aus

#### Request Body:
```json
{
  "paymentIntentId": "pi_1234567890",
  "orderId": "order_1757236855486_zfhg6tikp",
  "timeEntryIds": ["1757247867827sb25m0pgs", "1757251497341frdg69r1z"],
  "confirmationSource": "flutter_mobile",
  "timestamp": "2025-09-08T14:30:00.000Z"
}
```

#### Response Success (200):
```json
{
  "success": true,
  "paymentIntentId": "pi_1234567890",
  "orderId": "order_1757236855486_zfhg6tikp",
  "transferAmount": 26320,
  "platformFee": 1680,
  "providerNetAmount": 26320,
  "stripeTransferId": "tr_1234567890",
  "paymentStatus": "confirmed",
  "confirmedAt": "2025-09-08T14:30:15.000Z",
  "approvedHours": 8,
  "message": "Zahlung erfolgreich! 8h wurden freigegeben und €263.20 an den Anbieter ausgezahlt."
}
```

### 3. `/getPaymentStatus`
**GET** - Lädt Payment Status

#### Query Parameters:
- `paymentIntentId`: Die Stripe Payment Intent ID

#### Response Success (200):
```json
{
  "success": true,
  "paymentIntentId": "pi_1234567890",
  "status": "succeeded",
  "amount": 28000,
  "currency": "eur",
  "orderId": "order_1757236855486_zfhg6tikp",
  "createdAt": "2025-09-08T14:29:00.000Z",
  "confirmedAt": "2025-09-08T14:30:15.000Z",
  "lastUpdated": "2025-09-08T14:30:15.000Z"
}
```

### 4. `/logPaymentTransaction`
**POST** - Protokolliert Payment-Transaktionen für Auditing

#### Request Body:
```json
{
  "paymentIntentId": "pi_1234567890",
  "orderId": "order_1757236855486_zfhg6tikp",
  "timeEntryIds": ["1757247867827sb25m0pgs"],
  "transferAmount": 26320,
  "platformFee": 1680,
  "providerNetAmount": 26320,
  "stripeTransferId": "tr_1234567890",
  "approvedHours": 8,
  "paymentStatus": "confirmed",
  "customerId": "VP9BNVTey1WvdkMb0EPA3rdPq4t2",
  "providerId": "LLc8PX1VYHfpoFknk8o51LAOfSA2",
  "loggedAt": "2025-09-08T14:30:15.000Z",
  "platform": "flutter_mobile",
  "version": "1.0.0"
}
```

## 🏗️ Backend Implementation Schritte

### 1. Stripe Connect Setup
```javascript
// Beispiel: createAdditionalHoursPaymentIntent Function
exports.createAdditionalHoursPaymentIntent = functions.https.onRequest(async (req, res) => {
  try {
    const {
      orderId,
      timeEntryIds,
      totalAmountInCents,
      totalHours,
      customerId,
      providerId
    } = req.body;

    // 1. Validiere Input-Daten
    if (!orderId || !timeEntryIds || !totalAmountInCents || !customerId || !providerId) {
      return res.status(400).json({
        success: false,
        error: 'Fehlende erforderliche Parameter'
      });
    }

    // 2. Lade Provider Stripe Account ID
    const providerDoc = await admin.firestore()
      .collection('companies')
      .doc(providerId)
      .get();
    
    const providerStripeAccountId = providerDoc.data()?.stripeAccountId;
    if (!providerStripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Provider Stripe Account nicht gefunden'
      });
    }

    // 3. Berechne Platform Fee (6% von Gesamtbetrag)
    const platformFeeAmount = Math.round(totalAmountInCents * 0.06);
    const transferAmount = totalAmountInCents - platformFeeAmount;

    // 4. Erstelle Stripe Payment Intent mit Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountInCents,
      currency: 'eur',
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: providerStripeAccountId,
      },
      metadata: {
        orderId,
        timeEntryIds: timeEntryIds.join(','),
        totalHours: totalHours.toString(),
        paymentType: 'additional_hours',
        customerId,
        providerId,
      },
      description: `Zusätzliche ${totalHours}h für Auftrag ${orderId}`,
    });

    // 5. Protokolliere in Firestore
    await admin.firestore()
      .collection('auftraege')
      .doc(orderId)
      .collection('payments')
      .doc(paymentIntent.id)
      .set({
        paymentIntentId: paymentIntent.id,
        type: 'additional_hours',
        timeEntryIds,
        totalAmountInCents,
        platformFeeAmount,
        transferAmount,
        status: 'created',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        customerId,
        providerId,
      });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

### 2. Payment Confirmation & Connect Transfer
```javascript
exports.confirmAdditionalHoursPayment = functions.https.onRequest(async (req, res) => {
  try {
    const { paymentIntentId, orderId, timeEntryIds } = req.body;

    // 1. Verifiziere Payment Intent Status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment noch nicht erfolgreich'
      });
    }

    // 2. Update TimeEntry Status in Firestore
    const batch = admin.firestore().batch();
    const orderRef = admin.firestore().collection('auftraege').doc(orderId);
    
    for (const timeEntryId of timeEntryIds) {
      // Update timeTracking.timeEntries[].status = 'approved'
      // Dies erfordert eine Firestore Transaction für Array-Updates
    }
    
    // 3. Protokolliere erfolgreiche Auszahlung
    await orderRef.collection('payments').doc(paymentIntentId).update({
      status: 'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      stripeTransferId: paymentIntent.transfer_data?.destination,
    });

    // 4. Response mit allen Details
    res.status(200).json({
      success: true,
      paymentIntentId,
      transferAmount: paymentIntent.amount - paymentIntent.application_fee_amount,
      platformFee: paymentIntent.application_fee_amount,
      providerNetAmount: paymentIntent.amount - paymentIntent.application_fee_amount,
      stripeTransferId: paymentIntent.transfer_data?.destination,
      paymentStatus: 'confirmed',
      confirmedAt: new Date().toISOString(),
      approvedHours: timeEntryIds.length * 4, // Beispiel-Calculation
      message: `Zahlung erfolgreich! ${timeEntryIds.length}h wurden freigegeben.`,
    });
  } catch (error) {
    console.error('Payment Confirmation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

## 🔄 Workflow Zusammenfassung

1. **Flutter App** → `createAdditionalHoursPaymentIntent`
2. **Backend** → Erstellt Stripe Payment Intent mit Connect Transfer
3. **Flutter App** → Zeigt Payment UI (automatisch erfolgreich simuliert)
4. **Flutter App** → `confirmAdditionalHoursPayment`
5. **Backend** → Verifiziert Payment, updated TimeEntries, löst Transfer aus
6. **Stripe** → Überweist Geld automatisch an Provider Verbundkonto
7. **System** → Protokolliert alles für spätere Auszahlungsberichte

## 📊 Firestore Datenstruktur

### auftraege/{orderId}/payments/{paymentIntentId}
```json
{
  "paymentIntentId": "pi_1234567890",
  "type": "additional_hours",
  "timeEntryIds": ["entry1", "entry2"],
  "totalAmountInCents": 28000,
  "platformFeeAmount": 1680,
  "transferAmount": 26320,
  "status": "confirmed",
  "createdAt": "2025-09-08T14:29:00.000Z",
  "confirmedAt": "2025-09-08T14:30:15.000Z",
  "customerId": "VP9BNVTey1WvdkMb0EPA3rdPq4t2",
  "providerId": "LLc8PX1VYHfpoFknk8o51LAOfSA2",
  "stripeTransferId": "tr_1234567890"
}
```

### auftraege/{orderId}/timeTracking/timeEntries[]
```json
{
  "id": "1757251497341frdg69r1z",
  "status": "approved", // Updated from "logged"
  "approvedAt": "2025-09-08T14:30:15.000Z",
  "approvedBy": "VP9BNVTey1WvdkMb0EPA3rdPq4t2",
  "paymentIntentId": "pi_1234567890",
  "billableAmount": 14000,
  "paidAmount": 13160, // Nach Platform Fee
  "category": "additional",
  "hours": 4
}
```

## 🚀 Deployment Checklist

- [ ] Firebase Functions deployed
- [ ] Stripe Connect Webhooks konfiguriert  
- [ ] API Endpunkte getestet
- [ ] Firestore Security Rules erweitert
- [ ] Error Handling implementiert
- [ ] Logging & Monitoring aktiviert
- [ ] Production Stripe Keys konfiguriert
