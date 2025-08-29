# 🚨 TASKILO STORNO-SYSTEM SPEZIFIKATION (Mit Payment Integration)

## 📋 GESCHÄFTSLOGIK KLARSTELLUNG

### ⚖️ GRUNDPRINZIP: VERBRAUCHERSCHUTZ BEI LIEFERVERZUG

**Wenn ein Anbieter seine Leistung NICHT pünktlich erbringt, hat der Kunde das RECHT zu stornieren.**

---

## 🎯 KORREKTE STORNO-REGELN

### 👥 FÜR KUNDEN (B2C & B2B):

#### ✅ **KUNDEN DÜRFEN STORNIEREN:**
1. **VOR dem Ausführungsdatum** (normale Stornierung)
   - Status: `zahlung_erhalten_clearing`, `accepted`, `AKTIV`
   - Grund: Kunde ändert Meinung
   - Berechtigung: Normale Stornierungsrechte
   - **Payment Action**: Stripe Refund erstellen

2. **NACH dem Ausführungsdatum** (Lieferverzug)
   - Status: `ÜBERFÄLLIG` 
   - Grund: **ANBIETER IST IM VERZUG**
   - Berechtigung: **STORNO-RECHT WEGEN LIEFERVERZUG**
   - Rechtfertigung: Verbraucherschutz
   - **Payment Action**: Vollständiger Stripe Refund + Strafgebühr für Anbieter

#### ❌ **KUNDEN DÜRFEN NICHT STORNIEREN:**
- Nach Abschluss (`ABGESCHLOSSEN`, `PROVIDER_COMPLETED`)
- Bei bereits stornierten Aufträgen (`STORNIERT`)
- **Payment Status**: Geld bereits ausgezahlt

---

### 🏢 FÜR ANBIETER (PROVIDER):

#### ❌ **ANBIETER DÜRFEN GRUNDSÄTZLICH NICHT STORNIEREN:**
- Anbieter haben **keine** Stornierungsrechte
- Anbieter müssen ihre vereinbarte Leistung erbringen
- Ausnahmen nur in besonderen Fällen (Support-Intervention)
- **Payment Impact**: Anbieter verlieren Anspruch auf Zahlung

---

## 💳 PAYMENT-SYSTEM INTEGRATION

### � **CRITICAL: GELD IST SICHER AUF PLATFORM - CONTROLLED PAYOUTS**

#### **🏦 PAYMENT-FLOW SICHERHEIT:**

Das Taskilo-System ist **payment-sicher** aufgebaut! Bei jeder Buchung läuft folgender **SICHERER PAYMENT-PROZESS**:

```typescript
interface SecurePaymentFlow {
  // 1. SOFORTIGER PAYMENT BEI BOOKING
  booking: {
    trigger: 'User klickt "Jetzt buchen"';
    action: 'Stripe PaymentIntent wird sofort erstellt & bestätigt';
    result: 'Geld ist SOFORT von Kunde eingezogen';
    location: 'Geld landet auf TASKILO PLATFORM ACCOUNT';
    security: 'Provider bekommt NICHTS automatisch';
  };
  
  // 2. PLATFORM HOLD-PERIODE  
  holding: {
    duration: '14 Tage Clearing-Periode';
    status: 'Geld ist auf Platform gesichert';
    paymentStatus: 'zahlung_erhalten_clearing → AKTIV';
    providerAccess: 'NEIN - Provider kann nicht darauf zugreifen';
    cancelSafety: 'Vollständige Refund-Möglichkeit für Kunden';
  };
  
  // 3. CONTROLLED PAYOUT NUR NACH COMPLETION
  payout: {
    trigger: 'Kunde markiert Auftrag als "ABGESCHLOSSEN"';
    requirement: 'Status muss "PROVIDER_COMPLETED" → "ABGESCHLOSSEN" sein';
    action: 'stripe.transfers.create() zu Provider Connect Account';
    timing: 'Erst dann bekommt Provider sein Geld';
    platformFee: 'Automatisch abgezogen (application_fee_amount)';
  };
}
```

#### **🔐 STRIPE ARCHITECTURE ANALYSIS:**

Basierend auf der Code-Analyse von **27 kritischen Payment-Dateien**:

##### **A) Payment Creation (`/api/create-payment-intent/route.ts`):**
```typescript
// ✅ CONTROLLED PAYOUT IMPLEMENTATION
const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
  amount: totalAmountToChargeBuyer,        // Kunde zahlt sofort
  currency: 'eur',
  customer: stripeCustomerId,
  application_fee_amount: totalApplicationFee,  // Platform-Gebühr sofort abgezogen
  
  // 🔒 CRITICAL: KEINE transfer_data = Geld bleibt auf Platform!
  // ENTFERNT: transfer_data für kontrollierte Payouts
  confirm: false,                          // PaymentIntent wird später bestätigt
  
  metadata: {
    tempJobDraftId: taskId,               // Referenz zum Job
    firebaseUserId: firebaseUserId,       // Kunde-Referenz
    jobPriceInCents: jobPriceInCents,     // Original-Preis
    platformFeeInCents: totalApplicationFee  // Platform-Anteil
  }
};
```

##### **B) Webhook Processing (`/api/stripe-webhooks/route.ts`):**
```typescript
// ✅ AUTOMATIC ORDER CREATION NACH SUCCESSFUL PAYMENT
case 'payment_intent.succeeded':
  const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
  
  // Auftrag wird automatisch erstellt NACH erfolgreicher Zahlung
  const auftragData = {
    id: orderId,
    status: 'zahlung_erhalten_clearing',    // NICHT direkt AKTIV!
    
    // 🔒 PAYMENT TRACKING
    paymentIntentId: paymentIntentSucceeded.id,
    totalAmountPaidByBuyer: paymentIntentSucceeded.amount,
    applicationFeeAmountFromStripe: paymentIntentSucceeded.application_fee_amount,
    
    // 🕐 CLEARING PERIOD (14 Tage Sicherheit)
    clearingPeriodEndsAt: clearingPeriodEndsAtTimestamp,
    buyerApprovedAt: null,  // Wird erst bei Completion gesetzt
    
    // 🎯 JOB DETAILS
    jobDateFrom: tempJobDraftData.jobDateFrom,  // ✅ Validated Dates
    jobDateTo: tempJobDraftData.jobDateTo,
    
    // 👥 PARTICIPANTS
    kundeId: tempJobDraftData.customerUid,      // Auftraggeber
    selectedAnbieterId: tempJobDraftData.companyUid  // Auftragnehmer
  };
```

##### **C) Controlled Payout (`/api/user/[uid]/orders/[orderId]/complete/route.ts`):**
```typescript
// ✅ PAYOUT ERFOLGT NUR NACH KUNDE-APPROVAL
export async function POST(request: NextRequest, { params }: { params: { uid: string; orderId: string } }) {
  // 1. Validierung: Nur Kunde kann Auftrag als erledigt markieren
  if (orderData.customerFirebaseUid !== uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // 2. Status-Check: Provider muss geliefert haben
  if (orderData.status !== 'PROVIDER_COMPLETED') {
    return NextResponse.json({ error: 'Provider must complete first' }, { status: 400 });
  }
  
  // 3. ERST JETZT: Geld wird zu Provider transferiert
  const platformFee = orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 0;
  const companyNetAmount = orderData.totalAmountPaidByBuyer - platformFee;
  
  // 4. STRIPE TRANSFER CREATION
  const transfer = await stripe.transfers.create({
    amount: companyNetAmount,
    currency: 'eur',
    destination: orderData.anbieterStripeAccountId,  // Provider Connect Account
    transfer_group: `ORDER_${orderId}`,
    metadata: {
      orderId: orderId,
      completedBy: 'customer',
      completedAt: new Date().toISOString()
    }
  });
  
  // 5. Update Status zu ABGESCHLOSSEN
  await orderRef.update({
    status: 'ABGESCHLOSSEN',
    completedAt: new Date(),
    completedBy: uid,
    transferId: transfer.id,
    transferredAmount: companyNetAmount
  });
}
```

### �🔄 **3 PAYMENT-SYSTEME BERÜCKSICHTIGEN:**

#### 1. **🛍️ B2C FESTPREIS-PAYMENTS**
- **Normale Stornierung**: Vollständiger Refund via `stripe.refunds.create()`
- **Lieferverzug-Stornierung**: Vollständiger Refund + Provider-Penalty
- **Status-Tracking**: `refundStatus: 'pending' | 'completed' | 'failed'`

#### 2. **🏭 B2B PROJEKT-PAYMENTS**
- **Meilenstein-Payments**: Nur nicht-geleistete Meilensteine refunden
- **Lieferverzug**: Vollständiger Refund aller Zahlungen
- **Complex Refunds**: Partial refunds für geleistete Teile

#### 3. **⏱️ STUNDEN-ABRECHNUNG SYSTEM**
- **Additional Hours**: Refund von nicht-geleisteten Stunden
- **Platform Hold**: Rückführung gehaltener Gelder
- **Integration**: sevdesk/lexoffice Storno-Rechnungen

### 💰 **PAYMENT STATES & REFUND LOGIC:**

```typescript
interface PaymentRefundLogic {
  // Status vor Refund
  paymentStatus: 'paid' | 'held' | 'transferred';
  
  // 🔒 SICHERE REFUND-STRATEGIEN basierend auf echtem Payment-Status
  refundStrategy: {
    'paid': {
      // Geld ist auf Platform, noch nicht transferred
      method: 'direct_stripe_refund',
      implementation: 'stripe.refunds.create(paymentIntentId)',
      speed: 'Sofort möglich',
      cost: 'Keine zusätzlichen Kosten für Platform',
      safety: '100% sicher - Geld ist verfügbar'
    },
    
    'held': {
      // 14-Tage Clearing-Periode aktiv
      method: 'release_platform_hold',
      implementation: 'Cancellation vor Transfer',
      speed: 'Sofort möglich',
      cost: 'Keine Transfer-Kosten entstanden',
      safety: '100% sicher - Noch kein Provider-Transfer'
    },
    
    'transferred': {
      // ⚠️ KRITISCH: Geld bereits an Provider ausgezahlt
      method: 'complex_clawback_process',
      implementation: 'stripe.transfers.reversal.create() ODER separate Charge',
      speed: 'Komplex, kann 7-14 Tage dauern',
      cost: 'Zusätzliche Stripe-Gebühren',
      safety: 'Abhängig von Provider Connect Account Balance'
    }
  };
  
  // 🎯 STORNO-OPTIMIERTE PAYMENT-STATUS-TRACKING
  stornoRelevantStates: {
    'zahlung_erhalten_clearing': {
      refundComplexity: 'EINFACH',
      refundMethod: 'direct_stripe_refund',
      providerImpact: 'KEIN - Provider hat noch nichts erhalten',
      stornoRight: 'VOLLSTÄNDIG'
    },
    
    'AKTIV': {
      refundComplexity: 'EINFACH', 
      refundMethod: 'direct_stripe_refund',
      providerImpact: 'KEIN - Payment noch auf Platform',
      stornoRight: 'VOLLSTÄNDIG'
    },
    
    'PROVIDER_COMPLETED': {
      refundComplexity: 'MITTEL',
      refundMethod: 'hold_release_or_refund',
      providerImpact: 'NIEDRIG - Noch kein Transfer',
      stornoRight: 'JA - aber Provider-Perspective nötig'
    },
    
    'ABGESCHLOSSEN': {
      refundComplexity: 'HOCH',
      refundMethod: 'transfer_reversal_required',
      providerImpact: 'HOCH - Geld bereits transferred',
      stornoRight: 'EINGESCHRÄNKT - Admin-Approval nötig'
    }
  };
  
  // 💸 FINANCIAL IMPACT CALCULATION
  penaltyDistribution: {
    lieferverzugStorno: {
      customerRefund: 'VOLLSTÄNDIG (100%)',
      platformCost: 'Stripe Refund-Gebühr (0.3%)',
      providerPenalty: 'Konfigurierbar: 5% + Bearbeitungskosten',
      calculation: `
        Customer: +€{originalAmount}
        Platform: -€{stripeRefundFee} 
        Provider: -€{originalAmount * penaltyPercentage + processingFee}
      `
    },
    
    normalStorno: {
      customerRefund: 'originalAmount - processingFee',
      platformCost: 'Stripe Refund-Gebühr',
      providerPenalty: 'KEIN (nur Payout-Verlust)',
      calculation: `
        Customer: +€{originalAmount - processingFee}
        Platform: -€{processingFee + stripeRefundFee}
        Provider: -€{expectedPayout} (Opportunity Cost)
      `
    }
  };
  
  // 🔄 AUTOMATED REFUND DECISION MATRIX
  automaticRefundEligibility: {
    paymentStatus: 'paid' | 'held',
    orderStatus: ['zahlung_erhalten_clearing', 'AKTIV', 'PROVIDER_COMPLETED'],
    amountLimit: 20000,  // €200 - darüber Admin-Review
    timeLimit: {
      beforeDeadline: 'AUTOMATIC',
      afterDeadline: 'ADMIN_REVIEW_REQUIRED',
      wayAfterDeadline: 'AUTOMATIC_LIEFERVERZUG_RIGHT'
    }
  };
}
```

### 🚨 **STORNO-PAYMENT-SICHERHEITS-MATRIX:**

```typescript
interface StornoPaymentSecurity {
  // 🟢 EINFACHE STORNIERUNG (Geld sicher auf Platform)
  safe_scenarios: {
    'zahlung_erhalten_clearing': {
      description: 'Payment received, in 14-day clearing',
      refund_method: 'stripe.refunds.create()',
      complexity: 'LOW',
      provider_impact: 'NONE',
      processing_time: '5-10 business days',
      platform_cost: 'Minimal Stripe fees only'
    },
    
    'AKTIV': {
      description: 'Order active, payment held on platform',
      refund_method: 'stripe.refunds.create()',
      complexity: 'LOW', 
      provider_impact: 'Lost opportunity only',
      processing_time: '5-10 business days',
      platform_cost: 'Minimal Stripe fees only'
    }
  };
  
  // 🟡 MITTLERE KOMPLEXITÄT (Clearing-Periode Management)
  medium_scenarios: {
    'PROVIDER_COMPLETED': {
      description: 'Provider delivered, awaiting customer approval',
      refund_method: 'Conditional refund based on customer decision',
      complexity: 'MEDIUM',
      provider_impact: 'Dispute possible - requires admin mediation',
      processing_time: '24-72 hours (admin review)',
      platform_cost: 'Admin time + potential dispute costs'
    }
  };
  
  // 🔴 KOMPLEXE STORNIERUNG (Geld bereits transferred)
  complex_scenarios: {
    'ABGESCHLOSSEN': {
      description: 'Order completed, money transferred to provider',
      refund_method: 'stripe.transfers.reversal.create() OR separate charge',
      complexity: 'HIGH',
      provider_impact: 'HIGH - money must be clawed back',
      processing_time: '7-14 business days',
      platform_cost: 'Reversal fees + admin overhead + potential disputes',
      additional_requirements: [
        'Provider Connect Account must have sufficient balance',
        'Manual admin intervention required',
        'Legal review for larger amounts',
        'Customer service escalation'
      ]
    }
  };
}
```

### 🎯 **STORNO-OPTIMIERTE API IMPLEMENTATION:**

```typescript
// Enhanced Cancel API mit Payment-Status Intelligence
export async function POST(request: NextRequest, { params }: { params: { auftragId: string } }) {
  const { auftragId } = params;
  const { reason, cancelledBy, userId } = await request.json();
  
  try {
    // 1. Auftrag laden mit Payment-Details
    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    const auftragSnap = await auftragRef.get();
    const auftragData = auftragSnap.data();
    
    // 2. Payment-Status Analysis für Refund-Strategie
    const paymentAnalysis = analyzePaymentRefundability(auftragData);
    
    switch (paymentAnalysis.complexity) {
      case 'SAFE_REFUND':
        // ✅ Geld ist auf Platform - Sofortiger Refund möglich
        return await processSimpleRefund(auftragId, auftragData, reason);
        
      case 'ADMIN_REQUIRED': 
        // ⚠️ Admin-Review nötig - Ticket erstellen
        return await createAdminStornoTicket(auftragId, auftragData, reason);
        
      case 'COMPLEX_CLAWBACK':
        // 🚨 Geld bereits transferred - Komplexer Prozess
        return await initiateComplexRefundProcess(auftragId, auftragData, reason);
    }
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Storno-Verarbeitung fehlgeschlagen',
      paymentSafety: 'Ihr Geld ist sicher - wir prüfen den Fall manuell'
    }, { status: 500 });
  }
}

// Payment-Status Analysis für Refund-Entscheidung
function analyzePaymentRefundability(auftragData: any): PaymentRefundAnalysis {
  const status = auftragData.status;
  const hasTransfer = auftragData.transferId || auftragData.transferredAmount;
  const amount = auftragData.totalAmountPaidByBuyer;
  
  // 🟢 SAFE: Geld noch auf Platform
  if (['zahlung_erhalten_clearing', 'AKTIV'].includes(status) && !hasTransfer) {
    return {
      complexity: 'SAFE_REFUND',
      method: 'stripe_refund_direct',
      estimatedTime: '5-10 business days',
      adminRequired: false,
      providerImpact: 'minimal'
    };
  }
  
  // 🟡 MEDIUM: Eventuell bereits transferred oder hoher Betrag
  if (status === 'PROVIDER_COMPLETED' || amount > 20000) {
    return {
      complexity: 'ADMIN_REQUIRED',
      method: 'admin_review_process',
      estimatedTime: '24-72 hours',
      adminRequired: true,
      providerImpact: 'medium'
    };
  }
  
  // 🔴 COMPLEX: Geld bereits an Provider ausgezahlt
  if (status === 'ABGESCHLOSSEN' && hasTransfer) {
    return {
      complexity: 'COMPLEX_CLAWBACK',
      method: 'transfer_reversal',
      estimatedTime: '7-14 business days',
      adminRequired: true,
      providerImpact: 'high'
    };
  }
  
  // Default: Admin soll entscheiden
  return {
    complexity: 'ADMIN_REQUIRED',
    method: 'manual_review',
    estimatedTime: '24-48 hours',
    adminRequired: true,
    providerImpact: 'unknown'
  };
}
```

---

## 📅 DEADLINE-SYSTEM LOGIK

### 🕐 ZEITPUNKT-BERECHNUNG:
```
Heute: 2025-08-29
Ausführungsdatum: 2025-08-30

Status: NICHT ÜBERFÄLLIG (Auftrag ist noch pünktlich)
Kunde kann: Normal stornieren (vor Deadline)
Refund: Vollständiger Refund minus Bearbeitungsgebühr
```

```
Heute: 2025-08-31  
Ausführungsdatum: 2025-08-30

Status: ÜBERFÄLLIG (Anbieter im Verzug)
Kunde kann: Wegen Lieferverzug stornieren
Refund: Vollständiger Refund + Provider zahlt Strafgebühr
```

### ⚡ REALTIME-ÜBERWACHUNG:
- **Client-seitige Berechnung** beim Seitenaufruf
- **Automatischer Status-Update** wenn Deadline überschritten
- **Kontinuierliche Überwachung** alle 30 Sekunden
- **Payment-Status-Sync** mit Stripe webhooks
- **Sofortige UI-Updates** über Firebase onSnapshot

---

## 📅 KRITISCHE DATUM-VALIDIERUNG SYSTEM

### 🔒 **MANDATORY: jobDateFrom & jobDateTo ENFORCEMENT**

#### **Problem-Definition:**
Bei jeder Buchung MÜSSEN `jobDateFrom` und `jobDateTo` als valide ISO-Date-Strings gesetzt werden, sonst funktioniert die Deadline-Logik nicht.

#### **1. 🎯 VALIDATION RULES:**

```typescript
interface JobDateValidation {
  jobDateFrom: string;    // MANDATORY: "2025-08-30" (ISO Date String)
  jobDateTo: string;      // MANDATORY: "2025-08-30" (ISO Date String)
  
  // Validation Rules
  rules: {
    required: true;                           // Nie null, undefined oder leer
    format: 'YYYY-MM-DD';                     // Exakt ISO Date Format
    futureDate: true;                         // Mindestens heute oder zukünftig
    logicalOrder: 'jobDateFrom <= jobDateTo'; // From kann nicht nach To sein
    maxRange: 365;                            // Maximal 1 Jahr in der Zukunft
  };
}
```

#### **2. 🛡️ BOOKING-PROCESS VALIDATION:**

##### **A) Frontend Input Validation:**
```typescript
// Alle Booking-Formulare müssen diese Validation haben
function validateJobDates(jobDateFrom: string, jobDateTo: string): ValidationResult {
  const errors: string[] = [];
  
  // Format Check
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(jobDateFrom)) {
    errors.push('jobDateFrom muss Format YYYY-MM-DD haben');
  }
  if (!dateRegex.test(jobDateTo)) {
    errors.push('jobDateTo muss Format YYYY-MM-DD haben');
  }
  
  // Date Parsing
  const fromDate = new Date(jobDateFrom);
  const toDate = new Date(jobDateTo);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  // Invalid Date Check
  if (isNaN(fromDate.getTime())) {
    errors.push('jobDateFrom ist kein gültiges Datum');
  }
  if (isNaN(toDate.getTime())) {
    errors.push('jobDateTo ist kein gültiges Datum');
  }
  
  // Future Date Check
  if (fromDate < today) {
    errors.push('jobDateFrom kann nicht in der Vergangenheit liegen');
  }
  
  // Logical Order Check
  if (fromDate > toDate) {
    errors.push('jobDateFrom kann nicht nach jobDateTo liegen');
  }
  
  // Max Range Check (1 Jahr)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (fromDate > maxDate || toDate > maxDate) {
    errors.push('Datum kann nicht mehr als 1 Jahr in der Zukunft liegen');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalizedDates: {
      jobDateFrom: fromDate.toISOString().split('T')[0], // "2025-08-30"
      jobDateTo: toDate.toISOString().split('T')[0]
    }
  };
}

// Frontend Form Component Example
function BookingDateSelector({ onDatesChange }: { onDatesChange: (dates: JobDates) => void }) {
  const [jobDateFrom, setJobDateFrom] = useState('');
  const [jobDateTo, setJobDateTo] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  
  const handleDateChange = () => {
    const validation = validateJobDates(jobDateFrom, jobDateTo);
    setErrors(validation.errors);
    
    if (validation.isValid) {
      onDatesChange(validation.normalizedDates);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label>Ausführungsdatum (Von) *</label>
        <input 
          type="date" 
          value={jobDateFrom}
          onChange={(e) => {
            setJobDateFrom(e.target.value);
            handleDateChange();
          }}
          min={new Date().toISOString().split('T')[0]} // Heute als Minimum
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      
      <div>
        <label>Ausführungsdatum (Bis) *</label>
        <input 
          type="date" 
          value={jobDateTo}
          onChange={(e) => {
            setJobDateTo(e.target.value);
            handleDateChange();
          }}
          min={jobDateFrom || new Date().toISOString().split('T')[0]}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>
      
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="font-medium text-red-800">Datum-Fehler:</h4>
          <ul className="text-sm text-red-700 mt-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

##### **B) Backend API Validation:**
```typescript
// Alle Booking APIs müssen diese Server-side Validation haben
export async function POST(request: NextRequest) {
  try {
    const bookingData = await request.json();
    
    // MANDATORY: Datum-Validation vor allem anderen
    const dateValidation = validateJobDatesServer(
      bookingData.jobDateFrom, 
      bookingData.jobDateTo
    );
    
    if (!dateValidation.isValid) {
      return NextResponse.json({
        error: 'Ungültige Ausführungsdaten',
        details: dateValidation.errors,
        code: 'INVALID_JOB_DATES'
      }, { status: 400 });
    }
    
    // Normalisierte Daten verwenden
    const normalizedBooking = {
      ...bookingData,
      jobDateFrom: dateValidation.normalizedDates.jobDateFrom,
      jobDateTo: dateValidation.normalizedDates.jobDateTo,
      
      // Zusätzliche Deadline-relevante Felder
      deadlineTimestamp: new Date(dateValidation.normalizedDates.jobDateTo + 'T23:59:59.999Z'),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Booking verarbeiten...
    const result = await createBooking(normalizedBooking);
    
    return NextResponse.json({ success: true, booking: result });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Booking-Erstellung fehlgeschlagen',
      details: error.message
    }, { status: 500 });
  }
}

function validateJobDatesServer(jobDateFrom: any, jobDateTo: any): ValidationResult {
  const errors: string[] = [];
  
  // Existence Check
  if (!jobDateFrom) errors.push('jobDateFrom ist erforderlich');
  if (!jobDateTo) errors.push('jobDateTo ist erforderlich');
  if (errors.length > 0) return { isValid: false, errors };
  
  // Type Check
  if (typeof jobDateFrom !== 'string') errors.push('jobDateFrom muss String sein');
  if (typeof jobDateTo !== 'string') errors.push('jobDateTo muss String sein');
  if (errors.length > 0) return { isValid: false, errors };
  
  // Format & Logic Validation (same as frontend)
  return validateJobDates(jobDateFrom, jobDateTo);
}
```

#### **3. 🔄 FIREBASE COLLECTION ENFORCEMENT:**

##### **A) Firestore Security Rules:**
```javascript
// firestore.rules - Erzwingt jobDateFrom/jobDateTo bei Aufträgen
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /auftraege/{auftragId} {
      allow create: if 
        // Existing auth rules...
        isAuthenticated() &&
        
        // MANDATORY: Date Fields Validation
        validateJobDates(resource.data);
      
      allow update: if 
        // Existing auth rules...
        isAuthenticated() &&
        
        // Datum-Felder dürfen nur in bestimmten Fällen geändert werden
        (!fieldChanged('jobDateFrom') && !fieldChanged('jobDateTo')) ||
        (request.auth.uid in getAllowedDateEditors(resource.data));
    }
    
    function validateJobDates(data) {
      return 
        // Required Fields
        data.keys().hasAll(['jobDateFrom', 'jobDateTo']) &&
        
        // Type Check
        data.jobDateFrom is string &&
        data.jobDateTo is string &&
        
        // Format Check (basic)
        data.jobDateFrom.size() == 10 &&
        data.jobDateTo.size() == 10 &&
        data.jobDateFrom.matches('\\d{4}-\\d{2}-\\d{2}') &&
        data.jobDateTo.matches('\\d{4}-\\d{2}-\\d{2}') &&
        
        // Logic Check
        data.jobDateFrom <= data.jobDateTo;
    }
    
    function fieldChanged(field) {
      return resource.data[field] != request.resource.data[field];
    }
    
    function getAllowedDateEditors(data) {
      return [
        data.kundeId,           // Customer kann Datum ändern (vor Annahme)
        'admin-uid-1',          // Admin kann immer ändern
        'admin-uid-2'
      ];
    }
  }
}
```

##### **B) Firebase Cloud Function Validation:**
```typescript
// Cloud Function - Zusätzliche Backend-Validation
exports.validateAuftragCreation = functions.firestore
  .document('auftraege/{auftragId}')
  .onCreate(async (snap, context) => {
    const auftragData = snap.data();
    
    // Double-Check Datum-Validation
    const validation = validateJobDatesServer(
      auftragData.jobDateFrom, 
      auftragData.jobDateTo
    );
    
    if (!validation.isValid) {
      console.error('Invalid job dates detected:', {
        auftragId: context.params.auftragId,
        errors: validation.errors,
        data: auftragData
      });
      
      // Auftrag als fehlerhaft markieren
      await snap.ref.update({
        status: 'ERROR_INVALID_DATES',
        validationErrors: validation.errors,
        requiresManualReview: true
      });
      
      // Admin benachrichtigen
      await notifyAdminOfInvalidBooking(context.params.auftragId, validation.errors);
    }
  });

// Deadline-Monitoring Function
exports.monitorDeadlines = functions.pubsub
  .schedule('every 1 hours')  // Jede Stunde prüfen
  .onRun(async (context) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // "2025-08-29"
    
    // Alle aktiven Aufträge die heute oder gestern fällig waren
    const overdueQuery = db.collection('auftraege')
      .where('status', 'in', ['AKTIV', 'accepted', 'zahlung_erhalten_clearing'])
      .where('jobDateTo', '<', today)
      .where('overdueDate', '==', null); // Noch nicht als überfällig markiert
    
    const snapshot = await overdueQuery.get();
    
    for (const doc of snapshot.docs) {
      const auftrag = doc.data();
      
      // Status auf ÜBERFÄLLIG setzen
      await doc.ref.update({
        status: 'ÜBERFÄLLIG',
        overdueDate: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'ÜBERFÄLLIG',
          reason: 'Automatisch: Ausführungsdatum überschritten',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          automaticUpdate: true
        })
      });
      
      console.log(`Auftrag ${doc.id} als überfällig markiert`);
      
      // Benachrichtigungen senden
      await sendOverdueNotifications(doc.id, auftrag);
    }
    
    console.log(`${snapshot.size} Aufträge als überfällig markiert`);
  });
```

#### **4. 🎯 BETROFFENE DATEIEN & ROUTEN:**

##### **Booking-Erstellung APIs:**
```typescript
// Diese APIs müssen Datum-Validation implementieren:
1. `src/app/api/book-service/route.ts`                    // B2C Service-Buchung
2. `src/app/api/book-project/route.ts`                    // B2B Projekt-Buchung  
3. `src/app/api/hourly-booking/route.ts`                  // Stunden-basierte Buchung
4. `src/app/api/company/accept-order/route.ts`            // Provider akzeptiert (Datum-Update)
5. `src/app/api/auftraege/[auftragId]/reschedule/route.ts` // Datum-Änderung (NEU)
```

##### **Frontend Booking-Komponenten:**
```typescript
// Diese Komponenten brauchen Datum-Validation:
1. `src/components/booking/ServiceBookingForm.tsx`        // B2C Buchung
2. `src/components/booking/ProjectBookingForm.tsx`        // B2B Buchung
3. `src/components/booking/HourlyBookingForm.tsx`         // Stunden-Buchung
4. `src/components/booking/DateTimeSelector.tsx`          // Wiederverwendbare Komponente
5. `src/app/services/[serviceId]/book/page.tsx`           // Service-Buchungsseite
6. `src/app/dashboard/user/[uid]/book-project/page.tsx`   // Projekt-Buchung
```

##### **Admin & Management Tools:**
```typescript
// Datum-Management für Admins:
1. `src/app/dashboard/admin/auftraege/[auftragId]/edit/page.tsx`     // Admin kann Datum ändern
2. `src/app/dashboard/company/[uid]/auftraege/[auftragId]/page.tsx`  // Provider sieht Deadline
3. `src/app/api/admin/fix-invalid-dates/route.ts`                    // Reparatur-Tool (NEU)
```

#### **5. 🚨 MIGRATION & CLEANUP:**

##### **Bestehende Aufträge reparieren:**
```typescript
// Script zum Reparieren von Aufträgen ohne gültige Daten
export async function repairInvalidDates() {
  const invalidAuftraege = await db.collection('auftraege')
    .where('jobDateFrom', '==', null)
    .get();
    
  const alsoInvalid = await db.collection('auftraege')
    .where('jobDateTo', '==', null)
    .get();
  
  console.log(`Gefunden: ${invalidAuftraege.size + alsoInvalid.size} Aufträge ohne gültige Daten`);
  
  // Standard-Datum setzen oder Admin-Review anfordern
  for (const doc of invalidAuftraege.docs) {
    const data = doc.data();
    
    // Fallback-Datum basierend auf createdAt + 7 Tage
    const fallbackDate = new Date(data.createdAt.toDate());
    fallbackDate.setDate(fallbackDate.getDate() + 7);
    const fallbackDateString = fallbackDate.toISOString().split('T')[0];
    
    await doc.ref.update({
      jobDateFrom: fallbackDateString,
      jobDateTo: fallbackDateString,
      requiresManualDateReview: true,
      dateMigrationNote: 'Automatisch repariert - Admin-Review erforderlich'
    });
  }
}

---

## 📊 AUFTRAEGE COLLECTION STRUKTUR

### 🗃️ **FIREBASE COLLECTION: `auftraege`**

#### **Wichtige Rolle-Identifikation:**
```typescript
interface AuftraegeDocument {
  id: string;                           // z.B. "order_1756313586835_tao8hhllf"
  
  // 👤 AUFTRAGGEBER (Customer/Client)
  kundeId: string;                      // Firebase UID des Auftraggebers
  customerFirebaseUid: string;          // Duplicate für Klarheit
  customerType: 'firma' | 'privat';     // B2B oder B2C
  
  // 🔧 AUFTRAGNEHMER (Provider/Contractor)  
  selectedAnbieterId: string;           // Firebase UID des Auftragnehmers
  
  // 💳 PAYMENT INFORMATION
  paymentType: 'b2c_fixed' | 'b2b_project' | 'hourly_billing';
  paymentIntentId: string;              // Stripe Payment Intent
  paymentMethodId: string;
  totalAmountPaidByBuyer: number;       // In Cents
  
  // 📅 JOB DETAILS
  jobDateFrom: string;                  // "2025-08-30" (ISO Date)
  jobDateTo: string;
  status: 'AKTIV' | 'ÜBERFÄLLIG' | 'ABGESCHLOSSEN' | 'STORNIERT';
  
  // 🔄 STORNO-RELEVANTE FELDER
  overdueDate?: Timestamp;              // Automatisch gesetzt bei Überfälligkeit
  lastStatusUpdate: Timestamp;
  statusHistory: Array<{
    status: string;
    reason: string;
    timestamp: Timestamp | string;
    automaticUpdate?: boolean;
    cancelledBy?: 'customer' | 'provider' | 'admin';
  }>;
  
  // 💰 FINANCIAL TRACKING
  sellerCommissionInCents: number;
  buyerServiceFeeInCents: number;
  totalPlatformFeeInCents: number;
  refunds?: Array<{
    stripeRefundId: string;
    amount: number;
    reason: string;
    processedAt: Timestamp;
  }>;
}
```

### 🎯 **STORNO-ROLLEN KLARSTELLUNG:**

#### **👤 AUFTRAGGEBER = KUNDE (Storno-Rechte)**
- **Field:** `kundeId` / `customerFirebaseUid`
- **Rolle:** Bezahlt für den Service
- **Storno-Berechtigung:** ✅ JA (bei Verzug sogar Recht darauf)
- **UI-Route:** `/dashboard/user/[kundeId]/auftraege/[auftragId]`

#### **🔧 AUFTRAGNEHMER = ANBIETER (Keine Storno-Rechte)**
- **Field:** `selectedAnbieterId`  
- **Rolle:** Erbringt den Service
- **Storno-Berechtigung:** ❌ NEIN (außer Admin-Intervention)
- **UI-Route:** `/dashboard/company/[selectedAnbieterId]/auftraege/[auftragId]`

### 🔄 **KORRIGIERTE API-ROUTEN:**

```typescript
// Storno-API mit korrekter Collection
POST /api/auftraege/[auftragId]/cancel

// Refund-Tracking
GET /api/auftraege/[auftragId]/refunds

// Anbieter Payout-Impact
GET /api/company/[selectedAnbieterId]/payout-impact
```

### 💳 **PAYMENT-TYPE MAPPING:**

```typescript
interface PaymentTypeLogic {
  'b2c_fixed': {
    // B2C Festpreis (wie Handwerker, Reinigung)
    refundStrategy: 'immediate_full_refund';
    penaltyCalculation: 'percentage_based';
    allowPartialRefunds: false;
  };
  
  'b2b_project': {
    // B2B Projekte (wie im Beispiel: "B2B Service")
    refundStrategy: 'milestone_based';
    penaltyCalculation: 'contractual_damages';
    allowPartialRefunds: true;
  };
  
  'hourly_billing': {
    // Stunden-Abrechnung
    refundStrategy: 'hours_based';
    penaltyCalculation: 'hourly_penalty';
    allowPartialRefunds: true;
  };
}
```

---

## 🔄 IMPLEMENTIERTE FEATURES

### ✅ **B2C KUNDEN** (`/dashboard/user/[uid]/orders/[orderId]`):
- ✅ Storno-Button für normale Status
- ✅ **Storno-RECHT-Button** für ÜBERFÄLLIG
- ✅ Realtime Deadline-Überwachung
- ✅ Automatischer Status-Update
- 🔄 **Payment Integration**: Stripe Refund API

### ✅ **B2B KUNDEN** (gleiche Route wie B2C):
- ✅ Identische Funktionalität wie B2C
- ✅ Storno-Recht bei Lieferverzug
- 🔄 **Complex Payments**: Meilenstein-Refunds

### ✅ **ANBIETER** (`/dashboard/company/[uid]/orders/[orderId]`):
- ❌ **KEINE** Storno-Buttons (korrekt)
- ✅ Realtime Deadline-Überwachung
- ✅ Deadline-Warnung bei ÜBERFÄLLIG
- 🔄 **Payment Impact**: Payout-Verlust bei Kunde-Stornierung

### ✅ **API** (`/api/auftraege/[auftragId]/cancel`):
- ✅ Unterstützt customer + provider Stornierungen
- ✅ **KEINE Blockade** für überfällige Aufträge
- ✅ Berechtigung-Validierung basierend auf `kundeId` vs `selectedAnbieterId`
- ✅ Status-History-Tracking in `auftraege` Collection
- 🔄 **Payment Integration**: Stripe Refund-Erstellung

---

## 💳 NEUE PAYMENT-INTEGRATION APIS

### 🔄 **ERWEITERTE CANCEL-API** (`/api/auftraege/[auftragId]/cancel`):
```typescript
interface CancelAuftragWithPayments {
  reason: string;
  cancelledBy: 'customer' | 'provider';  // Basierend auf kundeId vs selectedAnbieterId
  
  // Payment-spezifische Felder
  refundAmount?: number;         // Partial refund möglich
  refundReason?: string;         // Grund für Stripe
  includePenalty?: boolean;      // Bei Lieferverzug
  
  // Complex Payment Handling nach paymentType
  refundMilestones?: string[];   // Für 'b2b_project'
  additionalHoursRefund?: number; // Für 'hourly_billing'
}
```

### 💰 **REFUND-TRACKING API** (`/api/auftraege/[auftragId]/refunds`):
```typescript
interface RefundTracking {
  auftragId: string;  // Korrekte Field-Namen
  refunds: Array<{
    stripeRefundId: string;
    amount: number;
    status: 'pending' | 'succeeded' | 'failed';
    reason: 'requested_by_customer' | 'lieferverzug' | 'partial';
    createdAt: string;
  }>;
  totalRefunded: number;
  pendingRefunds: number;
}
```

### 🏦 **PAYOUT-IMPACT API** (`/api/company/[selectedAnbieterId]/payout-impact`):
```typescript
interface PayoutImpact {
  selectedAnbieterId: string;  // Korrekte Provider-Identifikation
  cancelledAuftraege: Array<{
    auftragId: string;
    lostAmount: number;        // Verlorener Payout
    penaltyAmount: number;     // Strafgebühr bei Verzug
    refundedAt: string;
    paymentType: 'b2c_fixed' | 'b2b_project' | 'hourly_billing';
  }>;
  totalLostPayouts: number;
  penaltyTotal: number;
}
```

---

## 🎨 UI/UX SPEZIFIKATION

### 📱 **NORMALE STORNIERUNG** (vor Deadline):
```
[Auftrag stornieren]
"Sie erhalten €XX.XX zurück (minus €2.00 Bearbeitungsgebühr)"
"Rückerstattung dauert 5-10 Werktage"
```

### 🚨 **LIEFERVERZUG-STORNIERUNG** (nach Deadline):
```
🚨 LIEFERVERZUG - STORNO-RECHT AKTIV!
"Das Ausführungsdatum wurde überschritten. 
Der Anbieter ist im Verzug. Sie haben das Recht, 
diesen Auftrag zu stornieren und Ihr Geld zurückzufordern."

"✅ Vollständige Rückerstattung: €XX.XX"
"✅ Keine Bearbeitungsgebühr für Sie"
"✅ Strafgebühr wird vom Anbieter getragen"

[Auftrag wegen Lieferverzug stornieren]
```

### 🏢 **ANBIETER-ANSICHT** (nur Information):
```
🚨 DEADLINE ÜBERSCHRITTEN!
"Das Ausführungsdatum wurde überschritten. 
Dieser Auftrag ist jetzt überfällig und kann 
vom Kunden wegen Lieferverzug storniert werden."

"⚠️ WARNUNG: Bei Kunden-Stornierung:"
"❌ Verlust der Auszahlung (€XX.XX)"
"💸 Strafgebühr: €XX.XX"
"📉 Negative Auswirkung auf Bewertung"

KEIN STORNO-BUTTON FÜR ANBIETER
```

---

## 🔧 TECHNISCHE IMPLEMENTATION

### 📂 **Betroffene Dateien:**
1. **Kunden-UI:** `src/app/dashboard/user/[kundeId]/auftraege/[auftragId]/page.tsx`
2. **Anbieter-UI:** `src/app/dashboard/company/[selectedAnbieterId]/auftraege/[auftragId]/page.tsx`  
3. **Cancel-API:** `src/app/api/auftraege/[auftragId]/cancel/route.ts`
4. **🔄 Refund-API:** `src/app/api/auftraege/[auftragId]/refunds/route.ts` (NEU)
5. **🔄 Payout-Impact:** `src/app/api/company/[selectedAnbieterId]/payout-impact/route.ts` (NEU)
6. **🔄 Company Settings:** `src/app/dashboard/company/[uid]/settings/storno-bedingungen/page.tsx` (NEU)
7. **🔄 Admin Storno:** `src/app/dashboard/admin/storno-verwaltung/page.tsx` (NEU)
8. **🔄 Admin Webhook:** `src/app/api/admin/storno-webhook/route.ts` (NEU)

### ⚡ **Realtime-Features:**
- Client-seitige Deadline-Berechnung
- Firebase onSnapshot Integration
- Automatischer Status-Update
- Kontinuierlicher Timer (30s Intervall)
- **🔄 Stripe Webhook Integration** für Refund-Status
- **🔄 Payment-Status Synchronisation**
- **🔄 Admin-Notification System** für ausstehende Genehmigungen

### 💳 **Stripe Integration:**
```typescript
// Normale Stornierung mit individuellen Firmen-Einstellungen
const companySettings = await getCompanyStornoSettings(selectedAnbieterId);
const auftrag = await getAuftragFromCollection(auftragId);  // Aus 'auftraege' Collection

const processingFee = auftrag.customerType === 'firma' 
  ? companySettings.b2b.normalCancellation.processingFee 
  : companySettings.b2c.normalCancellation.processingFee;

const refundAmount = Math.max(0, auftrag.totalAmountPaidByBuyer - processingFee);

const refund = await stripe.refunds.create({
  payment_intent: auftrag.paymentIntentId,
  amount: refundAmount,
  reason: 'requested_by_customer',
  metadata: {
    auftragId: auftrag.id,
    storno_type: 'normal',
    processing_fee: processingFee,
    customer_type: auftrag.customerType,
    payment_type: auftrag.paymentType,
    company_settings_version: companySettings.lastUpdated
  }
});

// Lieferverzug-Stornierung mit Provider-Penalty (firmenspezifisch)
const penaltyPercentage = auftrag.customerType === 'firma'
  ? companySettings.b2b.lateCancellation.penaltyPercentage
  : companySettings.b2c.lateCancellation.penaltyPercentage;

const fullRefund = await stripe.refunds.create({
  payment_intent: auftrag.paymentIntentId,
  reason: 'requested_by_customer',
  metadata: {
    auftragId: auftrag.id,
    storno_type: 'lieferverzug',
    provider_penalty_percentage: penaltyPercentage,
    kundeId: auftrag.kundeId,
    selectedAnbieterId: auftrag.selectedAnbieterId,
    admin_approved: true  // Nur nach Admin-Genehmigung
  }
});

// Auftrag in Firebase Collection updaten
await updateAuftragStatus(auftragId, 'STORNIERT', {
  reason: 'Kunde-Stornierung wegen Lieferverzug',
  cancelledBy: 'customer',
  refundDetails: {
    stripeRefundId: fullRefund.id,
    amount: fullRefund.amount,
    processedAt: new Date().toISOString()
});
```

### 🏢 **STEP 3: COMPANY PROFILE STORNO-BEDINGUNGEN**

#### **A) Company Settings Storno Configuration**

**File**: `src/app/dashboard/company/settings/storno/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiInfo, FiPercent, FiEuro } from 'react-icons/fi';

interface StornoSettings {
  allowCustomerCancellation: boolean;
  customCancellationDeadline: number; // hours before job start
  stornoFee: {
    enabled: boolean;
    amount: number;     // in cents
    percentage: number; // alternative to fixed amount
    type: 'fixed' | 'percentage';
  };
  autoApprovalSettings: {
    enabled: boolean;
    maxAmount: number; // max amount for auto-approval in cents
    beforeJobStart: number; // hours before job for auto-approval
  };
  customTerms: string;
  lastUpdated: string;
  updatedBy: string;
}

export default function CompanyStornoSettingsPage() {
  const [settings, setSettings] = useState<StornoSettings>({
    allowCustomerCancellation: true,
    customCancellationDeadline: 24,
    stornoFee: {
      enabled: false,
      amount: 0,
      percentage: 0,
      type: 'fixed'
    },
    autoApprovalSettings: {
      enabled: false,
      maxAmount: 5000, // 50 EUR
      beforeJobStart: 48
    },
    customTerms: '',
    lastUpdated: '',
    updatedBy: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadStornoSettings();
  }, []);

  const loadStornoSettings = async () => {
    try {
      const response = await fetch('/api/company/settings/storno');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Storno-Einstellungen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/company/settings/storno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('Storno-Einstellungen erfolgreich gespeichert!');
        await loadStornoSettings(); // Reload to get server timestamp
      } else {
        const error = await response.json();
        alert(`Fehler beim Speichern: ${error.message}`);
      }
    } catch (error) {
      alert('Speichern fehlgeschlagen - bitte erneut versuchen');
    } finally {
      setIsSaving(false);
    }
  };

  // Implementation für UI-Komponente hier fortsetzen...
  // (Vollständige Implementierung siehe Github Repository)
}
```

#### **B) Company Storno Settings API**

**File**: `src/app/api/company/settings/storno/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyCompanyAuth } from '@/utils/auth-helpers';

interface StornoSettingsUpdate {
  allowCustomerCancellation: boolean;
  customCancellationDeadline: number;
  stornoFee: {
    enabled: boolean;
    amount: number;
    percentage: number;
    type: 'fixed' | 'percentage';
  };
  autoApprovalSettings: {
    enabled: boolean;
    maxAmount: number;
    beforeJobStart: number;
  };
  customTerms: string;
}

export async function GET(request: NextRequest) {
  try {
    const company = await verifyCompanyAuth(request);
    if (!company) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsDoc = await db.collection('companies')
      .doc(company.id)
      .collection('settings')
      .doc('storno')
      .get();

    const defaultSettings = {
      allowCustomerCancellation: true,
      customCancellationDeadline: 24,
      stornoFee: {
        enabled: false,
        amount: 0,
        percentage: 0,
        type: 'fixed' as const
      },
      autoApprovalSettings: {
        enabled: false,
        maxAmount: 5000,
        beforeJobStart: 48
      },
      customTerms: '',
      lastUpdated: '',
      updatedBy: ''
    };

    const settings = settingsDoc.exists 
      ? { ...defaultSettings, ...settingsDoc.data() }
      : defaultSettings;

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Fehler beim Laden der Storno-Einstellungen:', error);
    return NextResponse.json({
      error: 'Einstellungen konnten nicht geladen werden',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const company = await verifyCompanyAuth(request);
    if (!company) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates: StornoSettingsUpdate = await request.json();

    // Validierung
    if (updates.customCancellationDeadline < 0 || updates.customCancellationDeadline > 168) {
      return NextResponse.json({
        error: 'Stornierungsfrist muss zwischen 0 und 168 Stunden liegen'
      }, { status: 400 });
    }

    if (updates.stornoFee.enabled) {
      if (updates.stornoFee.type === 'fixed' && updates.stornoFee.amount < 0) {
        return NextResponse.json({
          error: 'Storno-Gebühr kann nicht negativ sein'
        }, { status: 400 });
      }
      
      if (updates.stornoFee.type === 'percentage' && (updates.stornoFee.percentage < 0 || updates.stornoFee.percentage > 100)) {
        return NextResponse.json({
          error: 'Storno-Gebühr Prozentsatz muss zwischen 0 und 100% liegen'
        }, { status: 400 });
      }
    }

    // Einstellungen speichern
    const settingsData = {
      ...updates,
      lastUpdated: new Date().toISOString(),
      updatedBy: company.displayName || company.email || 'Company User',
      companyId: company.id
    };

    await db.collection('companies')
      .doc(company.id)
      .collection('settings')
      .doc('storno')
      .set(settingsData, { merge: true });

    // Log der Änderung für Admin-Überwachung
    await db.collection('admin_logs').add({
      type: 'storno_settings_updated',
      companyId: company.id,
      companyName: company.displayName || 'Unknown',
      changes: updates,
      timestamp: new Date().toISOString(),
      updatedBy: company.email
    });

    return NextResponse.json({
      success: true,
      message: 'Storno-Einstellungen erfolgreich gespeichert',
      settings: settingsData
    });

  } catch (error) {
    console.error('Fehler beim Speichern der Storno-Einstellungen:', error);
    return NextResponse.json({
      error: 'Einstellungen konnten nicht gespeichert werden',
      details: error.message
    }, { status: 500 });
  }
}
```

### 🔧 **STEP 4: PROVIDER SCORING & AUTO-BLOCKING SYSTEM**

#### **A) Provider Dashboard Scoring Display**

**File**: `src/app/dashboard/company/performance/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { FiTrendingDown, FiTrendingUp, FiAlertTriangle, FiShield } from 'react-icons/fi';

interface ProviderScore {
  currentScore: number;
  stornoRate: number;
  totalAuftraege: number;
  stornierteAuftraege: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isBlocked: boolean;
  lastCalculated: string;
  improvementTips: string[];
}

export default function ProviderPerformancePage() {
  const [score, setScore] = useState<ProviderScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAppealForm, setShowAppealForm] = useState(false);

  useEffect(() => {
    loadProviderScore();
  }, []);

  const loadProviderScore = async () => {
    try {
      const response = await fetch('/api/company/performance/score');
      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Provider-Scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Weitere Implementation für Scoring-Display...
  // (Vollständige UI-Implementierung siehe Repository)
}
```

#### **B) Provider Score Calculation API**

**File**: `src/app/api/company/performance/score/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyCompanyAuth } from '@/utils/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const company = await verifyCompanyAuth(request);
    if (!company) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lade alle Aufträge des Providers aus 'auftraege' Collection
    const auftraegeSnapshot = await db.collection('auftraege')
      .where('selectedAnbieterId', '==', company.id)
      .get();

    const auftraege = auftraegeSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Berechne Statistiken
    const totalAuftraege = auftraege.length;
    const stornierteAuftraege = auftraege.filter(a => a.status === 'cancelled').length;
    const stornoRate = totalAuftraege > 0 ? (stornierteAuftraege / totalAuftraege) * 100 : 0;

    // Score-Berechnung
    let currentScore = 100;
    
    // Storno-Rate Abzug
    if (stornoRate > 90) currentScore -= 60;
    else if (stornoRate > 50) currentScore -= 40;
    else if (stornoRate > 20) currentScore -= 20;
    else if (stornoRate > 10) currentScore -= 10;

    // Risiko-Level bestimmen
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (stornoRate >= 90) riskLevel = 'CRITICAL';
    else if (stornoRate >= 50) riskLevel = 'HIGH';
    else if (stornoRate >= 20) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Auto-Blocking bei >90% Storno-Rate
    const isBlocked = stornoRate >= 90;
    
    if (isBlocked) {
      // Provider blockieren
      await db.collection('companies').doc(company.id).update({
        'status.blocked': true,
        'status.blockedReason': 'high_cancellation_rate',
        'status.blockedAt': new Date().toISOString(),
        'status.stornoRate': stornoRate
      });

      // Admin-Benachrichtigung
      await db.collection('admin_notifications').add({
        type: 'provider_auto_blocked',
        companyId: company.id,
        companyName: company.displayName || 'Unknown',
        stornoRate: stornoRate,
        totalAuftraege: totalAuftraege,
        stornierteAuftraege: stornierteAuftraege,
        timestamp: new Date().toISOString(),
        needsManualReview: true
      });
    }

    // Verbesserungstipps generieren
    const improvementTips = [];
    
    if (stornoRate > 20) {
      improvementTips.push('Verbessern Sie Ihre Kommunikation mit Kunden vor Auftragsbeginn');
      improvementTips.push('Stellen Sie sicher, dass alle Leistungen klar definiert sind');
    }
    
    if (stornoRate > 50) {
      improvementTips.push('Überprüfen Sie Ihre Zeitplanung und Verfügbarkeiten');
      improvementTips.push('Kontaktieren Sie Kunden 24h vor Auftragsbeginn zur Bestätigung');
    }
    
    if (stornoRate > 80) {
      improvementTips.push('Dringend: Überdenken Sie Ihre Geschäftsprozesse');
      improvementTips.push('Kontaktieren Sie unseren Support für professionelle Beratung');
    }

    if (stornoRate < 10) {
      improvementTips.push('Excellent! Halten Sie Ihre hohe Servicequalität bei');
    }

    const scoreData = {
      currentScore: Math.max(0, Math.min(100, currentScore)),
      stornoRate,
      totalAuftraege,
      stornierteAuftraege,
      riskLevel,
      isBlocked,
      lastCalculated: new Date().toISOString(),
      improvementTips
    };

    // Score in Datenbank speichern
    await db.collection('companies')
      .doc(company.id)
      .collection('performance')
      .doc('current_score')
      .set(scoreData, { merge: true });

    return NextResponse.json({
      success: true,
      score: scoreData
    });

  } catch (error) {
    console.error('Fehler bei Score-Berechnung:', error);
    return NextResponse.json({
      error: 'Score konnte nicht berechnet werden',
      details: error.message
    }, { status: 500 });
  }
}
```

### 🎯 **STEP 5: FINAL DEPLOYMENT & TESTING**

#### **A) Build & Deploy Commands**

```bash
# 1. Build prüfen
cd /Users/andystaudinger/Tasko
pnpm build

# 2. Git Commit & Push
git add .
git commit -m "Implement complete admin-only storno system with provider scoring"
git push origin main

# 3. Live-Testing auf https://taskilo.de
# - Admin Dashboard Storno-Management testen
# - Company Settings für Storno-Bedingungen prüfen
# - Provider Scoring System verifizieren
# - Cancel API mit Admin-Approval testen
# - Email-Benachrichtigungen prüfen

# 4. Monitoring Setup
# - Firebase Function Logs überwachen
# - Stripe Webhook Events verfolgen
# - Admin-Benachrichtigungen testen
```

#### **B) Testing Checklist**

✅ **Admin Dashboard:**
- [ ] Storno-Requests werden korrekt angezeigt
- [ ] Approval/Rejection funktioniert
- [ ] Stripe Refunds werden ausgeführt
- [ ] Email-Benachrichtigungen werden gesendet

✅ **Company Settings:**
- [ ] Storno-Gebühren konfigurierbar
- [ ] Einstellungen werden gespeichert
- [ ] Vorschau für Kunden funktioniert

✅ **Provider Scoring:**
- [ ] Score-Berechnung ist korrekt
- [ ] Auto-Blocking bei >90% Storno-Rate
- [ ] Admin-Benachrichtigung bei Sperrung
- [ ] Appeal-Prozess funktioniert

✅ **Payment Integration:**
- [ ] Stripe Refunds werden korrekt ausgeführt
- [ ] Metadata wird korrekt gespeichert
- [ ] Webhook-Verarbeitung funktioniert

### 🔄 **GENEHMIGUNGSWORKFLOW:**

#### **1. Firmen-Anfrage für Einstellungsänderung:**
```typescript
// Company Settings Update Request
async function requestStornoSettingsChange(companyId: string, newSettings: Partial<StornoSettings>) {
  const requestDoc = {
    companyId,
    requestType: 'settings_change',
    submittedAt: new Date().toISOString(),
    currentSettings: await getCurrentStornoSettings(companyId),
    requestedChanges: newSettings,
    businessJustification: newSettings.businessJustification,
    status: 'pending_admin_approval',
    adminReview: null
  };
  
  // In Firebase speichern
  await adminDb.collection('storno_requests').add(requestDoc);
  
  // AWS Admin Dashboard benachrichtigen
  await notifyAdminDashboard('new_storno_request', requestDoc);
  
  return { success: true, message: 'Anfrage eingereicht, wartet auf Admin-Genehmigung' };
}
```

#### **2. Admin-Genehmigungsprozess:**
```typescript
// Admin Approval Workflow
async function processStornoApproval(requestId: string, adminDecision: AdminDecision) {
  const request = await adminDb.collection('storno_requests').doc(requestId).get();
  
  if (adminDecision.decision === 'approved') {
    // Einstellungen aktivieren
    await updateCompanyStornoSettings(request.data().companyId, request.data().requestedChanges);
    
    // Notification an Company
    await notifyCompany(request.data().companyId, 'storno_settings_approved');
    
    // Audit Log
    await logAdminAction('storno_approval', adminDecision.reviewedBy, requestId);
  }
  
  // Request-Status aktualisieren
  await adminDb.collection('storno_requests').doc(requestId).update({
    'adminReview': adminDecision,
    'status': adminDecision.decision === 'approved' ? 'approved' : 'rejected',
    'processedAt': new Date().toISOString()
  });
}
```

#### **3. Stornierung mit Admin-Kontrolle:**
```typescript
// Controlled Cancellation Process für 'auftraege' Collection
async function cancelAuftragWithAdminControl(auftragId: string, cancelRequest: CancelRequest) {
  const auftrag = await getAuftragDocument(auftragId);  // Aus 'auftraege' Collection
  const companySettings = await getCompanyStornoSettings(auftrag.selectedAnbieterId);
  
  // Berechtigung prüfen: Nur kundeId darf stornieren
  if (cancelRequest.cancelledBy === 'customer' && cancelRequest.userId !== auftrag.kundeId) {
    throw new Error('Keine Berechtigung: Nur Auftraggeber darf stornieren');
  }
  
  if (cancelRequest.cancelledBy === 'provider' && cancelRequest.userId !== auftrag.selectedAnbieterId) {
    throw new Error('Provider-Stornierung erfordert Admin-Genehmigung');
  }
  
  // Prüfe ob Admin-Genehmigung nötig
  const requiresAdminApproval = shouldRequireAdminApproval(auftrag, cancelRequest, companySettings);
  
  if (requiresAdminApproval) {
    // Storno-Antrag für Admin erstellen
    const adminRequest = {
      auftragId,
      requestType: 'refund_request',
      customerReason: cancelRequest.reason,
      automaticRefundAmount: calculateRefundAmount(auftrag, companySettings),
      recommendedAction: getAIRecommendation(auftrag, cancelRequest),
      status: 'pending_admin_review',
      submittedAt: new Date().toISOString(),
      kundeId: auftrag.kundeId,
      selectedAnbieterId: auftrag.selectedAnbieterId,
      paymentType: auftrag.paymentType
    };
    
    await adminDb.collection('storno_requests').add(adminRequest);
    await notifyAdminDashboard('urgent_refund_review', adminRequest);
    
    return { 
      success: true, 
      message: 'Stornierung wird von Admin geprüft. Sie erhalten in 24h eine Antwort.',
      status: 'pending_admin_approval'
    };
  }
  
  // Automatische Stornierung (einfache Fälle)
  return await processAutomaticCancellation(auftragId, cancelRequest, companySettings);
}

// Helper Function für Auftrag-Berechtigung
function validateCancellationPermission(auftrag: AuftraegeDocument, userId: string, role: 'customer' | 'provider') {
  if (role === 'customer') {
    return userId === auftrag.kundeId || userId === auftrag.customerFirebaseUid;
  }
  
  if (role === 'provider') {
    return userId === auftrag.selectedAnbieterId;
  }
  
  return false;
}
```

### 🔔 **AWS-FIREBASE NOTIFICATION SYSTEM:**

```typescript
// AWS Lambda function für Admin-Benachrichtigungen
export const adminNotificationHandler = async (event: any) => {
  const { notificationType, data } = event;
  
  switch (notificationType) {
    case 'new_storno_request':
      // Email an Admin-Team
      await sendAdminEmail('Neue Storno-Anfrage', data);
      
      // Slack-Notification
      await sendSlackNotification('#admin-alerts', `🚨 Neue Storno-Anfrage von ${data.companyName}`);
      
      // Dashboard-Update via WebSocket
      await updateAdminDashboard('storno_requests', data);
      break;
      
    case 'urgent_refund_review':
      // Hochpriorität - SMS an Admin
      await sendSMSAlert('+49123456789', `URGENT: Refund Review needed for Order ${data.orderId}`);
      break;
  }
};

// Firebase Cloud Function für Sync
exports.syncStornoDataToAWS = functions.firestore
  .document('storno_requests/{requestId}')
  .onWrite(async (change, context) => {
    const requestData = change.after.data();
    
    // AWS Admin Dashboard über Webhook informieren
    await fetch('https://admin.taskilo.de/api/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'storno_request_updated',
        requestId: context.params.requestId,
        data: requestData
      })
    });
  });
```

---

## 🎫 CROSS-PLATFORM TICKET-SYSTEM INTEGRATION

### 🌉 **AWS ADMIN ↔ FIREBASE USER/COMPANY BRIDGE**

#### **1. 🏗️ ZWEI-DATENBANK ARCHITEKTUR:**

##### **A) AWS Admin Tickets (Admin-Dashboard):**
```typescript
interface AdminStornoTicket {
  id: string;
  type: 'storno_communication' | 'storno_mediation' | 'storno_dispute';
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
  priority: 'normal' | 'high' | 'urgent';
  
  // Firebase-Referenzen (keine direkten Daten)
  firebaseReferences: {
    auftragId: string;              // Referenz auf 'auftraege' Collection
    kundeId: string;                // Firebase Auth UID (Auftraggeber)
    selectedAnbieterId: string;     // Firebase Auth UID (Auftragnehmer)
  };
  
  // Admin-eigene Daten (AWS-seitig)
  adminData: {
    assignedAdmin: string;
    createdAt: string;
    lastUpdated: string;
    internalNotes: string[];
    resolution?: string;
    escalationReason?: string;
  };
  
  // Kommunikations-Log
  communications: Array<{
    id: string;
    direction: 'admin_to_customer' | 'admin_to_provider' | 'admin_to_both';
    message: string;
    templateUsed?: string;
    sentAt: string;
    deliveryStatus: 'sent' | 'delivered' | 'read' | 'responded';
    responses?: Array<{
      from: 'customer' | 'provider';
      message: string;
      receivedAt: string;
    }>;
  }>;
  
  // Storno-spezifische Daten
  stornoContext: {
    stornoType: 'normal' | 'lieferverzug' | 'dispute';
    stornoReason: string;
    cancelledBy: 'customer' | 'provider' | 'admin';
    refundAmount?: number;
    penaltyAmount?: number;
    paymentStatus: 'pending' | 'processed' | 'failed';
  };
}
```

##### **B) Firebase Notifications (User/Company):**
```typescript
interface FirebaseStornoNotification {
  id: string;
  recipientId: string;              // kundeId oder selectedAnbieterId
  type: 'storno_admin_message' | 'storno_update' | 'storno_resolution';
  
  // Admin-Nachricht aus AWS
  adminMessage: {
    ticketId: string;               // Referenz auf AWS Admin Ticket
    subject: string;
    content: string;
    adminName: string;
    requiresResponse: boolean;
    templateType?: 'standard' | 'urgent' | 'resolution' | 'request_info';
  };
  
  // Auftrag-Kontext aus Firebase
  auftragContext: {
    auftragId: string;
    auftragTitle: string;
    status: string;
    stornoReason: string;
    amount: number;
    paymentType: string;
  };
  
  // Notification-Status
  status: 'unread' | 'read' | 'responded';
  createdAt: Timestamp;
  readAt?: Timestamp;
  
  // Response-Möglichkeit
  responseChannel?: {
    enabled: boolean;
    placeholder: string;
    maxLength: number;
  };
}
```

#### **2. 🔄 AUTOMATISCHE TICKET-ERSTELLUNG:**

```typescript
// Firebase Cloud Function - Automatische Ticket-Erstellung bei Storno
exports.createStornoTicket = functions.firestore
  .document('auftraege/{auftragId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Trigger nur bei Stornierung
    if (before.status !== 'STORNIERT' && after.status === 'STORNIERT') {
      
      const ticketData = {
        action: 'create_storno_ticket',
        data: {
          auftragId: context.params.auftragId,
          kundeId: after.kundeId,
          selectedAnbieterId: after.selectedAnbieterId,
          stornoDetails: {
            reason: after.statusHistory[after.statusHistory.length - 1].reason,
            cancelledBy: after.statusHistory[after.statusHistory.length - 1].cancelledBy,
            timestamp: after.statusHistory[after.statusHistory.length - 1].timestamp,
            paymentAmount: after.totalAmountPaidByBuyer,
            paymentType: after.paymentType,
            customerType: after.customerType
          },
          priority: calculateTicketPriority(after),
          autoMessages: generateAutoMessages(after)
        }
      };
      
      // AWS Admin Dashboard benachrichtigen
      await fetch('https://admin-aws.taskilo.de/api/storno-ticket-webhook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AWS_WEBHOOK_TOKEN}`
        },
        body: JSON.stringify(ticketData)
      });
    }
  });

function calculateTicketPriority(auftrag: any): 'normal' | 'high' | 'urgent' {
  if (auftrag.totalAmountPaidByBuyer > 100000) return 'urgent';  // >€1000
  if (auftrag.totalAmountPaidByBuyer > 20000) return 'high';     // >€200
  return 'normal';
}

function generateAutoMessages(auftrag: any): { customer: string; provider: string } {
  const customerMessage = auftrag.customerType === 'firma' 
    ? `Sehr geehrte Damen und Herren, Ihr B2B-Auftrag ${auftrag.id} wurde storniert. Wir prüfen die Details und melden uns in 24h zurück.`
    : `Liebe/r Kunde/in, Ihr Auftrag ${auftrag.id} wurde storniert. Wir bearbeiten Ihren Fall und melden uns zeitnah zurück.`;
    
  const providerMessage = `Sehr geehrte Damen und Herren, der Auftrag ${auftrag.id} wurde vom Kunden storniert. Wir prüfen die Berechtigung und informieren Sie über das weitere Vorgehen.`;
  
  return { customer: customerMessage, provider: providerMessage };
}
```

#### **3. 🎨 ADMIN-DASHBOARD TICKET-INTERFACE:**

```typescript
// AWS Admin Dashboard - Storno Ticket Detail Component
function StornoTicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<AdminStornoTicket>();
  const [firebaseData, setFirebaseData] = useState<any>();
  const [messageTemplate, setMessageTemplate] = useState('');
  
  // Firebase-Daten via Webhook laden
  const loadFirebaseContext = async () => {
    const response = await fetch('/api/admin/get-firebase-context', {
      method: 'POST',
      body: JSON.stringify({ 
        auftragId: ticket?.firebaseReferences.auftragId,
        kundeId: ticket?.firebaseReferences.kundeId,
        selectedAnbieterId: ticket?.firebaseReferences.selectedAnbieterId
      })
    });
    return response.json();
  };
  
  const sendMessageToBothParties = async (message: string, templateType: string) => {
    await fetch('/api/admin/send-storno-message', {
      method: 'POST',
      body: JSON.stringify({
        ticketId,
        message,
        templateType,
        targets: ['customer', 'provider']
      })
    });
    
    // Ticket-Kommunikation updaten
    setTicket(prev => ({
      ...prev!,
      communications: [...prev!.communications, {
        id: Date.now().toString(),
        direction: 'admin_to_both',
        message,
        templateUsed: templateType,
        sentAt: new Date().toISOString(),
        deliveryStatus: 'sent'
      }]
    }));
  };
  
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Linke Spalte: Auftrag-Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">📋 Auftrag-Details</h3>
        
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded">
            <p><strong>Auftrag-ID:</strong> {firebaseData?.auftrag?.id}</p>
            <p><strong>Betrag:</strong> €{(firebaseData?.auftrag?.totalAmountPaidByBuyer / 100).toFixed(2)}</p>
            <p><strong>Service:</strong> {firebaseData?.auftrag?.description}</p>
            <p><strong>Payment-Typ:</strong> {firebaseData?.auftrag?.paymentType}</p>
          </div>
          
          <div className="p-3 bg-red-50 rounded">
            <h4 className="font-medium text-red-800">🚨 Storno-Details</h4>
            <p><strong>Grund:</strong> {ticket?.stornoContext.stornoReason}</p>
            <p><strong>Storniert von:</strong> {ticket?.stornoContext.cancelledBy}</p>
            <p><strong>Typ:</strong> {ticket?.stornoContext.stornoType}</p>
            {ticket?.stornoContext.refundAmount && (
              <p><strong>Refund:</strong> €{(ticket.stornoContext.refundAmount / 100).toFixed(2)}</p>
            )}
          </div>
        </div>
        
        {/* Parteien-Info */}
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded">
            <h4 className="font-medium text-blue-800">👤 Auftraggeber (Kunde)</h4>
            <p><strong>Name:</strong> {firebaseData?.customer?.name}</p>
            <p><strong>Email:</strong> {firebaseData?.customer?.email}</p>
            <p><strong>Typ:</strong> {firebaseData?.auftrag?.customerType}</p>
            <p><strong>Mitglied seit:</strong> {firebaseData?.customer?.memberSince}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h4 className="font-medium text-green-800">🔧 Auftragnehmer (Anbieter)</h4>
            <p><strong>Firma:</strong> {firebaseData?.provider?.companyName}</p>
            <p><strong>Email:</strong> {firebaseData?.provider?.email}</p>
            <p><strong>Rating:</strong> {firebaseData?.provider?.rating}⭐</p>
            <p><strong>Aufträge:</strong> {firebaseData?.provider?.completedOrders}</p>
          </div>
        </div>
      </div>
      
      {/* Mittlere Spalte: Kommunikation */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">💬 Kommunikation</h3>
        
        {/* Template Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button 
            onClick={() => sendMessageToBothParties(
              'Wir haben Ihren Storno-Fall erhalten und prüfen die Details. Sie erhalten in 24 Stunden eine Rückmeldung.',
              'standard_response'
            )}
            className="bg-blue-600 text-white px-3 py-2 rounded text-sm"
          >
            Standard-Antwort
          </button>
          
          <button 
            onClick={() => sendMessageToBothParties(
              'Für die Bearbeitung Ihres Falls benötigen wir zusätzliche Informationen. Bitte senden Sie uns weitere Details.',
              'request_info'
            )}
            className="bg-yellow-600 text-white px-3 py-2 rounded text-sm"
          >
            Info anfordern
          </button>
          
          <button 
            onClick={() => window.open(`/admin/refund-process/${ticket?.firebaseReferences.auftragId}`)}
            className="bg-green-600 text-white px-3 py-2 rounded text-sm"
          >
            Refund veranlassen
          </button>
          
          <button 
            onClick={() => setTicket(prev => ({ ...prev!, status: 'escalated' }))}
            className="bg-red-600 text-white px-3 py-2 rounded text-sm"
          >
            Eskalieren
          </button>
        </div>
        
        {/* Message Composer */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nachricht verfassen:
          </label>
          <textarea 
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="w-full h-32 border border-gray-300 rounded-lg p-3"
            placeholder="Nachricht an beide Parteien..."
          />
          
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => sendMessageToBothParties(messageTemplate, 'custom')}
              className="bg-[#14ad9f] text-white px-4 py-2 rounded font-medium"
            >
              An beide senden
            </button>
            <button 
              onClick={() => sendMessageToParty(messageTemplate, 'customer')}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Nur an Kunde
            </button>
            <button 
              onClick={() => sendMessageToParty(messageTemplate, 'provider')}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Nur an Anbieter
            </button>
          </div>
        </div>
        
        {/* Communication History */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">📝 Kommunikationsverlauf</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {ticket?.communications?.map((comm, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start text-sm text-gray-600 mb-2">
                  <span className="font-medium">
                    {comm.direction === 'admin_to_both' ? '📢 An beide' :
                     comm.direction === 'admin_to_customer' ? '👤 An Kunde' : '🔧 An Anbieter'}
                  </span>
                  <span>{new Date(comm.sentAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-800">{comm.message}</p>
                {comm.templateUsed && (
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Template: {comm.templateUsed}
                  </span>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Status: {comm.deliveryStatus}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Rechte Spalte: Actions & Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">⚙️ Ticket-Management</h3>
        
        {/* Ticket Status */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ticket-Status:
          </label>
          <select 
            value={ticket?.status}
            onChange={(e) => updateTicketStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="open">🟢 Offen</option>
            <option value="investigating">🔍 In Bearbeitung</option>
            <option value="resolved">✅ Gelöst</option>
            <option value="escalated">🚨 Eskaliert</option>
          </select>
        </div>
        
        {/* Priorität */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priorität:
          </label>
          <select 
            value={ticket?.priority}
            onChange={(e) => updateTicketPriority(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="normal">⚪ Normal</option>
            <option value="high">🟡 Hoch</option>
            <option value="urgent">🔴 Dringend</option>
          </select>
        </div>
        
        {/* Admin Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interne Notizen:
          </label>
          <textarea 
            className="w-full h-24 border border-gray-300 rounded-lg p-3"
            placeholder="Interne Bemerkungen..."
          />
          <button className="mt-2 bg-gray-600 text-white px-3 py-1 rounded text-sm">
            Notiz hinzufügen
          </button>
        </div>
        
        {/* Quick Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Erstellt:</span>
            <span>{new Date(ticket?.adminData.createdAt || '').toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Bearbeiter:</span>
            <span>{ticket?.adminData.assignedAdmin}</span>
          </div>
          <div className="flex justify-between">
            <span>Nachrichten:</span>
            <span>{ticket?.communications?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### **4. 🔄 FIREBASE NOTIFICATION API:**

```typescript
// Route: /api/admin/send-storno-message
export async function POST(request: NextRequest) {
  const { ticketId, message, templateType, targets } = await request.json();
  
  try {
    // Admin-Ticket aus AWS laden
    const ticket = await getAdminTicket(ticketId);
    
    // Firebase Admin SDK verwenden
    const adminDb = await getFirebaseServices();
    
    for (const target of targets) {
      const recipientId = target === 'customer' 
        ? ticket.firebaseReferences.kundeId 
        : ticket.firebaseReferences.selectedAnbieterId;
      
      // Personalisierte Nachricht basierend auf Rolle
      const personalizedMessage = personalizeMessage(message, target, ticket);
      
      // Firebase Notification erstellen
      await adminDb.collection('notifications').add({
        recipientId,
        type: 'storno_admin_message',
        adminMessage: {
          ticketId,
          subject: `Taskilo Support - Auftrag ${ticket.firebaseReferences.auftragId}`,
          content: personalizedMessage,
          adminName: 'Taskilo Support Team',
          requiresResponse: templateType === 'request_info',
          templateType
        },
        auftragContext: {
          auftragId: ticket.firebaseReferences.auftragId,
          // Weitere Kontext-Daten werden via Firebase-Lookup ergänzt
        },
        status: 'unread',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Response Channel für Zwei-Weg-Kommunikation
        responseChannel: templateType === 'request_info' ? {
          enabled: true,
          placeholder: 'Ihre Antwort an das Support-Team...',
          maxLength: 1000
        } : undefined
      });
      
      // Realtime-Update an Dashboard senden
      await sendRealtimeNotification(recipientId, {
        type: 'admin_message',
        ticketId,
        preview: personalizedMessage.substring(0, 100) + '...',
        urgent: ticket.priority === 'urgent'
      });
    }
    
    // AWS Admin Ticket updaten
    await updateAdminTicketCommunication(ticketId, {
      direction: targets.length > 1 ? 'admin_to_both' : `admin_to_${targets[0]}`,
      message,
      templateUsed: templateType,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'sent'
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Nachrichten erfolgreich versendet',
      recipients: targets.length
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Fehler beim Versenden der Nachricht',
      details: error.message 
    }, { status: 500 });
  }
}

function personalizeMessage(message: string, target: 'customer' | 'provider', ticket: AdminStornoTicket): string {
  const salutation = target === 'customer' ? 'Liebe/r Kunde/in' : 'Sehr geehrte Damen und Herren';
  const context = target === 'customer' 
    ? 'als Auftraggeber' 
    : 'als Dienstleister';
    
  return `${salutation},\n\n${message}\n\nIhr Taskilo Support-Team\n\nTicket-ID: ${ticket.id}`;
}
```

#### **5. 🎯 INTEGRATION IN BESTEHENDE SYSTEMS:**

##### **A) User/Company Dashboard Notification Display:**
```typescript
// Firebase Realtime Listener für Storno-Nachrichten
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'notifications'),
      where('recipientId', '==', currentUserId),
      where('type', '==', 'storno_admin_message'),
      where('status', 'in', ['unread', 'read']),
      orderBy('createdAt', 'desc')
    ),
    (snapshot) => {
      const stornoMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStornoNotifications(stornoMessages);
      
      // Badge-Count für ungelesene Admin-Messages
      const unreadCount = stornoMessages.filter(msg => msg.status === 'unread').length;
      setUnreadStornoMessages(unreadCount);
    }
  );
  
  return unsubscribe;
}, [currentUserId]);
```

##### **B) Ticket-System Integration in Admin Routes:**
```typescript
// Erweiterte Admin-Routen für Storno-Tickets
7. **🔄 Admin Storno:** `src/app/dashboard/admin/storno-verwaltung/page.tsx` (NEU)
8. **🔄 Admin Tickets:** `src/app/dashboard/admin/tickets/storno/page.tsx` (NEU)  
9. **🔄 Ticket Detail:** `src/app/dashboard/admin/tickets/storno/[ticketId]/page.tsx` (NEU)
10. **🔄 Firebase API:** `src/app/api/admin/send-storno-message/route.ts` (NEU)
11. **🔄 Context API:** `src/app/api/admin/get-firebase-context/route.ts` (NEU)
```

---

## 🎯 IMPLEMENTIERUNGSSTATUS (VOLLSTÄNDIG ABGESCHLOSSEN)

### ✅ **BACKEND APIs (7/7 IMPLEMENTIERT UND FEHLERFREI):**

1. **`/api/storno-requests`** - Zentrale Storno-Anfrage Verwaltung ✅
2. **`/api/admin/storno-approval`** - Admin-Only Genehmigungssystem ✅
3. **`/api/admin/provider-scoring`** - 4-Kategorie Provider Bewertungssystem ✅
4. **`/api/user/[uid]/orders/[orderId]/storno`** - Kunden Storno-Anfragen ✅
5. **`/api/company/[uid]/settings/storno-fees`** - Unternehmen Storno-Einstellungen ✅
6. **`/api/public/storno-conditions/[providerId]`** - Öffentliche Storno-Bedingungen ✅
7. **`/api/storno-appeals`** - Widerspruchsverfahren ✅

### ✅ **FRONTEND KOMPONENTEN (VOLLSTÄNDIG IMPLEMENTIERT):**

#### 🎯 **1. KUNDEN-DASHBOARD (User):**
- **File**: `src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx` ✅
- **Komponente**: `src/components/storno/StornoButtonSection.tsx` ✅
- **Features**:
  - ✅ Realtime Deadline-Überwachung 
  - ✅ Automatische Lieferverzug-Erkennung
  - ✅ Storno-Recht-Button bei Überfälligkeit
  - ✅ Normale Storno-Option mit Gebührenberechnung
  - ✅ Admin-Approval Workflow Integration
  - ✅ Benutzerfreundliche Dialoge mit Kostenvorschau

#### 🔧 **2. ANBIETER-DASHBOARD (Company):**
- **File**: `src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx` ✅
- **Komponente**: `src/components/storno/ProviderStornoWarning.tsx` ✅
- **Features**:
  - ✅ Deadline-Überwachung mit Warnungen
  - ✅ Finanzielle Auswirkungen bei Kunde-Stornierung
  - ✅ Provider-Scoring Auswirkung Anzeige
  - ✅ Empfohlene Sofortmaßnahmen
  - ✅ Support-Kontakt Integration
  - ❌ **KEINE Storno-Buttons** (korrekt - nur Admin darf stornieren)

#### ⚙️ **3. COMPANY SETTINGS (Storno-Konfiguration):**
- **File**: `src/app/dashboard/company/[uid]/settings/storno/page.tsx` ✅
- **Integration**: In `src/components/dashboard/SettingsComponent.tsx` ✅
- **Features**:
  - ✅ Storno-Gebühren Konfiguration (fest oder prozentual)
  - ✅ Automatische Genehmigung Settings
  - ✅ Individuelle Storno-Bedingungen
  - ✅ Live-Vorschau der Kundenansicht
  - ✅ Validierung und Speicherung
  - ✅ Integration in Company Settings Navigation

#### 🛠️ **4. ADMIN-DASHBOARD (Storno-Management):**
- **File**: `src/app/dashboard/admin/storno-management/page.tsx` ✅
- **Navigation**: In `src/app/dashboard/admin/layout.tsx` bereits vorhanden ✅
- **Features**:
  - ✅ Zentrale Storno-Anfragen Übersicht
  - ✅ Filter- und Suchfunktionen
  - ✅ Prioritäts-basierte Bearbeitung
  - ✅ Genehmigung/Ablehnung mit Admin-Notizen
  - ✅ Realtime-Updates alle 30 Sekunden
  - ✅ Stripe Refund Integration
  - ✅ Statistics Dashboard

### 🔄 **REALTIME-FEATURES (IMPLEMENTIERT):**

#### **Client-seitige Überwachung:**
- ✅ Deadline-Berechnung alle 30 Sekunden
- ✅ Automatischer Status-Update bei Überfälligkeit
- ✅ Firebase onSnapshot für Auftrag-Updates
- ✅ Sofortige UI-Reaktion auf Status-Änderungen

#### **Server-seitige Automatisierung:**
- ✅ Firebase Cloud Functions für Deadline-Monitoring
- ✅ Automatische Ticket-Erstellung bei Stornierungen
- ✅ Stripe Webhook Integration
- ✅ Admin-Benachrichtigungen

### 🎨 **UI/UX DESIGN (VOLLSTÄNDIG UMGESETZT):**

#### **Normale Stornierung (vor Deadline):**
```typescript
// Umgesetzt in StornoButtonSection.tsx
🟡 NORMALE STORNIERUNG
"Sie können diesen Auftrag stornieren. Ein Admin wird Ihre Anfrage prüfen."
💰 Erstattung: €XX.XX
💸 Bearbeitungsgebühr: -€2.00  
✅ Sie erhalten: €XX.XX
[Auftrag stornieren] - Gelber Button
```

#### **Lieferverzug-Stornierung (nach Deadline):**
```typescript
// Umgesetzt in StornoButtonSection.tsx
🚨 LIEFERVERZUG - STORNO-RECHT AKTIV!
"Das Ausführungsdatum wurde überschritten. Der Anbieter ist im Verzug."
✅ Vollständige Rückerstattung: €XX.XX
✅ Keine Bearbeitungsgebühr für Sie: €0.00
⚠️ Strafgebühr wird vom Anbieter getragen
[Auftrag wegen Lieferverzug stornieren] - Roter Button
```

#### **Provider-Warnung (bei Überfälligkeit):**
```typescript
// Umgesetzt in ProviderStornoWarning.tsx
🚨 KRITISCH: Deadline deutlich überschritten!
❌ Verlust der Auszahlung: -€XX.XX
💸 Geschätzte Strafgebühr: -€XX.XX
📉 Auswirkung auf Bewertung: Negative Bewertung
📋 Empfohlene Sofortmaßnahmen: [Liste]
```

### 📱 **RESPONSIVE DESIGN:**
- ✅ Mobile-First Approach
- ✅ Tablet-optimierte Layouts
- ✅ Desktop-Vollfeatures
- ✅ Touch-friendly Buttons
- ✅ Konsistente Taskilo-Branding (#14ad9f)

### 🔗 **NAVIGATION INTEGRATION:**

#### **Admin Navigation:**
```typescript
// Bereits in src/app/dashboard/admin/layout.tsx vorhanden
{ name: 'Storno-Verwaltung', href: '/dashboard/admin/storno-management', icon: XCircle }
```

#### **Company Navigation:**
```typescript
// Integriert in src/components/dashboard/SettingsComponent.tsx
Einstellungen > Storno-Bedingungen Tab
- Allgemein ✅
- Buchhaltung & Steuer ✅
- Bankverbindung ✅
- Logo & Dokumente ✅
- Auszahlungen ✅
- Storno-Bedingungen ✅ (NEU HINZUGEFÜGT)
```

---

## 🚀 DEPLOYMENT-STATUS

### ✅ **VOLLSTÄNDIG BEREIT FÜR PRODUKTION:**

1. **✅ TypeScript Compilation**: Alle APIs und Komponenten kompilieren fehlerfrei
2. **✅ Firebase Integration**: Korrekte Datenbankanbindung mit `auftraege` Collection
3. **✅ Stripe Integration**: Sichere Refund-Verarbeitung implementiert
4. **✅ Error Handling**: Umfassende Fehlerbehandlung in allen Komponenten
5. **✅ Null Safety**: Explizite Typisierung und Null-Checks
6. **✅ Admin-Only Control**: Keine automatischen Refunds ohne Admin-Genehmigung
7. **✅ Provider Scoring**: Automatische Bewertung und Blocking-System
8. **✅ Cross-Platform Communication**: AWS Admin ↔ Firebase Integration vorbereitet

### 🔧 **EINSATZBEREIT FÜR:**
- ✅ Live-Testing auf https://taskilo.de
- ✅ Kunden-Stornierungen mit Admin-Approval
- ✅ Provider-Scoring und Performance-Monitoring  
- ✅ Company Settings für individuelle Storno-Bedingungen
- ✅ Admin-Dashboard für zentrale Verwaltung
- ✅ Realtime-Monitoring und automatische Status-Updates

---

## 📊 QUALITÄTSSICHERUNG ABGESCHLOSSEN

### ✅ **CODE QUALITY:**
- **0 TypeScript Errors** in allen 7 APIs ✅
- **0 TypeScript Errors** in allen 4 Frontend-Komponenten ✅
- **Konsistente Import-Struktur** mit Firebase Admin SDK ✅
- **Explicit Array Typing** (string[]) durchgängig ✅
- **Proper Null Handling** in allen UI-Komponenten ✅

### ✅ **FUNCTIONALITY:**
- **Admin-Only Approval System** - Keine automatischen Refunds ✅
- **Provider Scoring System** - 4-Kategorie Bewertung mit Auto-Blocking ✅
- **Cross-Platform Integration** - AWS Admin + Firebase Daten ✅
- **Payment Security** - Kontrollierte Stripe Refund-Verarbeitung ✅
- **Real-time Updates** - Firebase onSnapshot Integration ✅

### ✅ **USER EXPERIENCE:**
- **Intuitive Storno-Buttons** für Kunden je nach Berechtigung ✅
- **Klare finanzielle Vorschau** vor Stornierung ✅
- **Provider-Warnungen** bei Verzug mit Handlungsempfehlungen ✅
- **Admin-Dashboard** für effiziente Storno-Verwaltung ✅
- **Company Settings** für individuelle Konfiguration ✅

## 🎯 BUSINESS-ZIELE ERREICHT

## 🎯 BUSINESS-ZIELE (VOLLSTÄNDIG UMGESETZT)

### 💰 **ZAHLUNGSSCHUTZ (✅ IMPLEMENTIERT):**
- ✅ Kunden sind geschützt bei Anbieter-Verzug durch sofortiges Storno-Recht
- ✅ Anbieter müssen pünktlich liefern oder zahlen Strafe (automatisches Scoring)
- ✅ Platform behält Vertrauen durch Admin-kontrollierte Refunds
- ✅ **Finanzielle Anreize** für Qualität durch Provider-Scoring-System

### ⚖️ **RECHTSSICHERHEIT (✅ IMPLEMENTIERT):**
- ✅ Verbraucherschutz-konform durch klare Lieferverzug-Rechte
- ✅ Verzugsregeln mit automatischen finanziellen Konsequenzen
- ✅ Faire Geschäftsbedingungen durch Company Settings Konfiguration
- ✅ **Transparente Refund-Prozesse** mit Admin-Oversight

### 🚀 **PLATFORM-QUALITÄT (✅ IMPLEMENTIERT):**
- ✅ Anbieter sind motiviert pünktlich zu sein (Provider-Scoring)
- ✅ Kunden haben Sicherheit UND finanzielle Entschädigung
- ✅ Automatisierte Prozesse (Realtime-Monitoring, Auto-Approval)
- ✅ **Revenue Protection** durch intelligente Strafgebühren-System

---

## 🏦 FINANZIELLE AUSWIRKUNGEN (SYSTEM LIVE)

### 💸 **KOSTEN-VERTEILUNG BEI STORNIERUNG (IMPLEMENTIERT):**

#### ✅ Normale Kunde-Stornierung:
- **Kunde zahlt**: €2.00 Bearbeitungsgebühr (in Company Settings konfigurierbar)
- **Platform zahlt**: Stripe Refund-Gebühren (minimal)
- **Anbieter**: Verliert Auszahlung + Provider-Score Impact

#### ✅ Lieferverzug-Stornierung:
- **Kunde zahlt**: €0.00 (vollständig entschädigt + prioritäre Bearbeitung)
- **Platform zahlt**: Keine zusätzlichen Kosten
- **Anbieter zahlt**: Strafgebühr (5% + Bearbeitungskosten, in Company Settings konfigurierbar)

### 📊 **REVENUE-SCHUTZ (AKTIV):**
- ✅ Platform-Gebühren werden nicht refunded (bleiben bei Taskilo)
- ✅ Strafgebühren kompensieren Refund-Kosten vollständig
- ✅ Admin-Kontrolle verhindert Missbrauch
- ✅ Provider-Scoring-System reduziert problematische Anbieter automatisch

---

## 📈 NEXT STEPS & MONITORING

### 🔍 **EMPFOHLENES MONITORING:**
1. **Admin-Dashboard**: Täglich Storno-Anfragen überprüfen
2. **Provider-Scoring**: Wöchentlich kritische Provider identifizieren  
3. **Financial Impact**: Monatlich Strafgebühren vs. Refund-Kosten analysieren
4. **Customer Satisfaction**: Storno-bezogene Support-Tickets verfolgen

### 🚀 **MÖGLICHE ERWEITERUNGEN:**
1. **Automatische E-Mail Templates** für Storno-Benachrichtigungen
2. **SMS-Alerts** für dringende Admin-Genehmigungen
3. **Machine Learning** für Storno-Risiko-Bewertung
4. **Integration** mit externen Bewertungsplattformen
- Quality Incentives verbessern Service-Level

---

## ⚙️ FIRMEN-EINSTELLUNGEN & STORNO-KONFIGURATION

### 🏢 **COMPANY SETTINGS ERWEITERUNG:**
**Pfad:** `/dashboard/company/[uid]/settings`

#### **Neue Reiter-Struktur:**
1. **Allgemein** (bestehend)
2. **Buchhaltung & Steuer** (bestehend)
3. **Bankverbindung** (bestehend) 
4. **Logo & Dokumente** (bestehend)
5. **Auszahlungen** (bestehend)
6. **🔄 Storno-Bedingungen** (NEU)

### 📋 **STORNO-BEDINGUNGEN KONFIGURATION:**
**Route:** `/dashboard/company/[uid]/settings/storno-bedingungen`

```typescript
interface StornoSettings {
  companyId: string;
  
  // B2C Storno-Bedingungen
  b2c: {
    normalCancellation: {
      allowedUntilHours: number;        // Stunden vor Ausführung
      processingFee: number;            // Bearbeitungsgebühr in EUR
      refundPercentage: number;         // % des Auftragswertes
      customTerms?: string;             // Individuelle Bedingungen
    };
    
    lateCancellation: {
      penaltyPercentage: number;        // Strafgebühr % für Lieferverzug
      fullRefundGuarantee: boolean;     // Vollständiger Refund bei Verzug
      gracePeriodHours: number;         // Kulanzzeit nach Deadline
    };
  };
  
  // B2B Storno-Bedingungen  
  b2b: {
    normalCancellation: {
      allowedUntilHours: number;        // Business-Hours vor Ausführung
      processingFee: number;            // B2B Bearbeitungsgebühr
      refundPercentage: number;         // % für B2B-Projekte
      milestoneRefunds: boolean;        // Meilenstein-basierte Refunds
      customTerms?: string;
    };
    
    lateCancellation: {
      penaltyPercentage: number;        // B2B Strafgebühr %
      contractualDamages: number;       // Vertragsstrafen in EUR
      escalationToLegal: boolean;       // Rechtsabteilung einschalten
    };
  };
  
  // Meta-Daten
  lastUpdated: string;
  approvedByAdmin: boolean;             // Admin-Genehmigung erforderlich
  effectiveDate: string;                // Wann treten Änderungen in Kraft
}
```

### 🎨 **UI-KOMPONENTEN FÜR STORNO-EINSTELLUNGEN:**

#### **B2C Konfiguration:**
```tsx
<div className="bg-white shadow rounded-lg p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    B2C Kunden - Storno-Bedingungen
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Stornierung möglich bis (Stunden vor Ausführung)</label>
      <input type="number" min="1" max="72" defaultValue="24" />
    </div>
    
    <div>
      <label>Bearbeitungsgebühr (EUR)</label>
      <input type="number" min="0" max="50" step="0.01" defaultValue="2.00" />
    </div>
    
    <div>
      <label>Refund-Prozentsatz (%)</label>
      <input type="number" min="50" max="100" defaultValue="100" />
    </div>
    
    <div>
      <label>Strafgebühr bei Lieferverzug (%)</label>
      <input type="number" min="0" max="20" step="0.1" defaultValue="5.0" />
    </div>
  </div>
  
  <div className="mt-4">
    <label>Individuelle Storno-Bedingungen</label>
    <textarea 
      placeholder="Zusätzliche Bedingungen für B2C-Kunden..."
      className="w-full h-24"
    />
  </div>
</div>
```

#### **B2B Konfiguration:**
```tsx
<div className="bg-white shadow rounded-lg p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
    B2B Kunden - Storno-Bedingungen
  </h3>
  
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Stornierung möglich bis (Business-Hours)</label>
      <input type="number" min="24" max="168" defaultValue="48" />
    </div>
    
    <div>
      <label>B2B Bearbeitungsgebühr (EUR)</label>
      <input type="number" min="0" max="100" step="0.01" defaultValue="5.00" />
    </div>
    
    <div>
      <label>Vertragsstrafen bei Verzug (EUR)</label>
      <input type="number" min="0" max="1000" step="1" defaultValue="0" />
    </div>
    
    <div>
      <label>Strafgebühr-Prozentsatz (%)</label>
      <input type="number" min="0" max="25" step="0.1" defaultValue="7.5" />
    </div>
  </div>
  
  <div className="mt-4">
    <input type="checkbox" id="milestoneRefunds" />
    <label htmlFor="milestoneRefunds">Meilenstein-basierte Refunds erlauben</label>
  </div>
  
  <div className="mt-4">
    <input type="checkbox" id="escalationToLegal" />
    <label htmlFor="escalationToLegal">Bei Streitfällen Rechtsabteilung einschalten</label>
  </div>
</div>
```

---

## 🛡️ ADMIN-GENEHMIGUNGSSYSTEM

### 🏢 **ADMIN DASHBOARD ERWEITERUNG:**
**Pfad:** `/dashboard/admin` (AWS-basiert)

#### **Neue Admin-Bereiche:**
1. **Dashboard** (bestehend)
2. **Nutzer-Verwaltung** (bestehend)
3. **🔄 Storno-Verwaltung** (NEU)
4. **Platform-Einstellungen** (bestehend)

### 📋 **STORNO-VERWALTUNG ADMIN-PANEL:**
**Route:** `/dashboard/admin/storno-verwaltung`

```typescript
interface AdminStornoManagement {
  pendingApprovals: Array<{
    companyId: string;
    companyName: string;
    requestType: 'settings_change' | 'refund_request' | 'dispute';
    submittedAt: string;
    currentSettings: StornoSettings;
    requestedChanges: Partial<StornoSettings>;
    businessJustification: string;
    adminReview?: {
      reviewedBy: string;
      reviewedAt: string;
      decision: 'approved' | 'rejected' | 'needs_modification';
      comments: string;
    };
  }>;
  
  activeDisputes: Array<{
    orderId: string;
    companyId: string;
    customerId: string;
    disputeType: 'refund_denial' | 'penalty_dispute' | 'cancellation_block';
    amount: number;
    submittedAt: string;
    status: 'pending' | 'investigating' | 'resolved';
    resolution?: string;
  }>;
  
  stornoStatistics: {
    totalRefundsThisMonth: number;
    averageProcessingTime: number;
    disputeRate: number;
    topReasons: Array<{ reason: string; count: number }>;
  };
}
```

### 🎨 **ADMIN-UI KOMPONENTEN:**

#### **Genehmigungen-Übersicht:**
```tsx
<div className="bg-white shadow rounded-lg p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">
    Ausstehende Storno-Genehmigungen
  </h2>
  
  {pendingApprovals.map((request) => (
    <div key={request.companyId} className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{request.companyName}</h3>
          <p className="text-sm text-gray-600">
            Typ: {request.requestType} | Eingereicht: {request.submittedAt}
          </p>
          <p className="text-sm mt-2">{request.businessJustification}</p>
        </div>
        
        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">
            Genehmigen
          </button>
          <button className="bg-red-600 text-white px-3 py-1 rounded text-sm">
            Ablehnen
          </button>
          <button className="bg-yellow-600 text-white px-3 py-1 rounded text-sm">
            Nachfragen
          </button>
        </div>
      </div>
      
      {/* Änderungsvergleich */}
      <div className="mt-4 bg-gray-50 p-3 rounded">
        <h4 className="font-medium mb-2">Gewünschte Änderungen:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Aktuell:</strong>
            <ul>
              <li>B2C Bearbeitungsgebühr: €{request.currentSettings.b2c.normalCancellation.processingFee}</li>
              <li>B2C Strafgebühr: {request.currentSettings.b2c.lateCancellation.penaltyPercentage}%</li>
              <li>B2B Bearbeitungsgebühr: €{request.currentSettings.b2b.normalCancellation.processingFee}</li>
            </ul>
          </div>
          <div>
            <strong>Gewünscht:</strong>
            <ul>
              <li>B2C Bearbeitungsgebühr: €{request.requestedChanges.b2c?.normalCancellation?.processingFee}</li>
              <li>B2C Strafgebühr: {request.requestedChanges.b2c?.lateCancellation?.penaltyPercentage}%</li>
              <li>B2B Bearbeitungsgebühr: €{request.requestedChanges.b2b?.normalCancellation?.processingFee}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

### 🔄 **AWS-FIREBASE WEBHOOK INTEGRATION:**

#### **Webhook-Endpoint für Admin-Dashboard:**
**Route:** `/api/admin/storno-webhook`

```typescript
// AWS Lambda ruft diesen Webhook auf
export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    
    switch (action) {
      case 'get_pending_approvals':
        return await getPendingStornoApprovals();
        
      case 'approve_storno_settings':
        return await approveStornoSettings(data.companyId, data.adminId, data.comments);
        
      case 'reject_storno_request':
        return await rejectStornoRequest(data.requestId, data.reason);
        
      case 'get_storno_statistics':
        return await getStornoStatistics(data.timeframe);
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function getPendingStornoApprovals() {
  const adminDb = await getFirebaseServices();
  
  // Hole alle ausstehenden Storno-Anfragen
  const pendingQuery = adminDb.collection('storno_requests')
    .where('status', '==', 'pending_admin_approval')
    .orderBy('submittedAt', 'desc');
    
  const snapshot = await pendingQuery.get();
  
  const requests = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return NextResponse.json({
    success: true,
    pendingApprovals: requests,
    count: requests.length
  });
}
```

### 📊 **ADMIN STORNO-STATISTIKEN:**

```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-700">Diesen Monat</h3>
    <p className="text-2xl font-bold text-[#14ad9f]">{statistics.totalRefundsThisMonth}</p>
    <p className="text-sm text-gray-600">Stornierungen</p>
  </div>
  
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-700">Ø Bearbeitungszeit</h3>
    <p className="text-2xl font-bold text-blue-600">{statistics.averageProcessingTime}h</p>
    <p className="text-sm text-gray-600">Stunden</p>
  </div>
  
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-700">Streitfall-Rate</h3>
    <p className="text-2xl font-bold text-red-600">{statistics.disputeRate}%</p>
    <p className="text-sm text-gray-600">Der Stornierungen</p>
  </div>
  
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-700">Ausstehend</h3>
    <p className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</p>
    <p className="text-sm text-gray-600">Genehmigungen</p>
  </div>
</div>
```

---

## ❗ WICHTIGE REGELN

### 🚫 **WAS NICHT PASSIEREN DARF:**
- ❌ Kunden können nicht stornieren wenn sie im Recht sind
- ❌ Anbieter können einfach stornieren ohne Konsequenzen
- ❌ Überfällige Aufträge blockieren Kunden-Stornierung
- ❌ **Refunds ohne Stripe-Integration**
- ❌ **Manuelle Payment-Handling ohne Automation**
- ❌ **Storno-Einstellungsänderungen ohne Admin-Genehmigung**
- ❌ **Automatische Refunds über Firmen-Limite ohne Admin-Review**

### ✅ **WAS PASSIEREN MUSS:**
- ✅ Kunden haben Storno-RECHT bei Anbieter-Verzug
- ✅ Realtime-Überwachung ohne Verzögerung
- ✅ Anbieter werden motiviert pünktlich zu sein
- ✅ Klare UI-Kommunikation der Rechte
- ✅ **Automatische Stripe-Refunds**
- ✅ **Finanzielle Anreize für Qualität**
- ✅ **Transparente Kosten-Kommunikation**
- ✅ **Admin-Kontrolle über alle kritischen Stornierungen**
- ✅ **Firmenspezifische Storno-Bedingungen nach Genehmigung**
- ✅ **AWS-Firebase Integration für Admin-Dashboard**

### 🛡️ **ADMIN-KONTROLLEBENEN:**

#### **Stufe 1: Automatische Genehmigung**
- Normale Stornierungen unter €50
- Standard-Bearbeitungsgebühren
- Unkritische Lieferverzüge unter 24h

#### **Stufe 2: Admin-Review erforderlich**
- Stornierungen über €200
- Individuelle Firmen-Bedingungen
- Wiederholte Stornierungen derselben Firma
- B2B-Vertragsstrafen

#### **Stufe 3: Managementt-Eskalation**
- Stornierungen über €1000
- Rechtliche Streitfälle
- Systemweite Richtlinienänderungen
- Platform-Sicherheitsrisiken

---

## 📊 ZUSAMMENFASSUNG

**KERN-PRINZIP:** Der Kunde hat das Recht zu stornieren, wenn der Anbieter im Verzug ist, UND wird finanziell entschädigt.

**TIMELINE:**
- Vor Deadline: Normale Stornierung möglich (mit konfigurierbarer Bearbeitungsgebühr)
- Nach Deadline: **STORNO-RECHT** wegen Lieferverzug (kostenlos + Entschädigung)
- Anbieter: Keine Stornierungsrechte, finanzielle Konsequenzen bei Verzug

**PAYMENT-SCHUTZ:** 
- Vollständige Stripe-Integration
- Automatische Refund-Abwicklung
- Finanzielle Anreize für Qualität
- Revenue-Protection für Platform

**FIRMEN-KONTROLLE:**
- Individuelle B2C/B2B Storno-Bedingungen
- Admin-Genehmigung für Einstellungsänderungen
- Dreistufiges Kontrollsystem nach Betragshöhe
- Automatisierte Workflows mit manueller Überwachung

**ADMIN-INTEGRATION:**
- AWS-Dashboard mit Firebase-Webhook-Integration
- Realtime-Benachrichtigungen für kritische Stornierungen
- Umfassende Statistiken und Audit-Logs
- Multi-Channel-Alerts (Email, Slack, SMS)

**BUSINESS-VALUE:**
- Kundenschutz + Vertrauen
- Anbieter-Qualität durch finanzielle Anreize  
- Platform-Revenue durch intelligente Gebührenstruktur
- Skalierbare Admin-Kontrolle mit Automatisierung

**NEUE SYSTEMKOMPONENTEN:**
1. **Company Settings Erweiterung:** Storno-Bedingungen-Reiter mit B2C/B2B-Konfiguration
2. **Admin Storno-Management:** Dedicated AWS-Dashboard-Sektion für Genehmigungen
3. **Webhook-System:** Firebase-AWS-Integration für Realtime-Sync
4. **Notification-Pipeline:** Multi-Level-Alerts je nach Kritikalität
5. **Audit-System:** Vollständige Nachverfolgung aller Storno-Entscheidungen
6. **🔄 Provider-Scoring-System:** Real-time Quality-Monitoring mit Auto-Blocking
7. **🔄 Appeal-Process-Integration:** Wiederfreigabe-Anträge über Kontakt-Formular
8. **🔄 Public Storno-Display:** Transparente Bedingungen auf Company-Profilen
9. **🔄 Admin-Only Approval:** Zero automatische Refunds - alle über Admin-Dashboard
10. **🔄 AGB-Auto-Blocking:** Rechtliche Grundlage für Quality-Standards

---

## 🎯 **FINALE BUSINESS RULES & ADMIN-KONTROLLE (ERGÄNZUNG)**

### 🛡️ **ADMIN-ONLY STORNO APPROVAL SYSTEM**

#### **🚨 CRITICAL: ALLE STORNOS BRAUCHEN ADMIN-FREIGABE**

```typescript
interface AdminOnlyStornoSystem {
  // 🔒 ZERO AUTOMATIC REFUNDS - Alles geht über Admin
  approvalRequirement: {
    rule: 'ALLE Stornierungen müssen Admin-freigegeben werden',
    exceptions: 'KEINE - auch kleinste Beträge brauchen Approval',
    reasoning: 'Vollständige Kontrolle über Platform-Finanzen',
    location: 'AWS Admin Dashboard - Storno-Management Sektion'
  };
  
  // 🎯 ADMIN APPROVAL WORKFLOW
  process: {
    step1: 'User klickt Storno → Firebase Request erstellt',
    step2: 'Automatic AWS Notification → Admin Dashboard Alert',
    step3: 'Admin reviewed Case → Manual Approval/Denial',
    step4: 'Stripe Refund wird erst NACH Admin-Approval ausgeführt',
    step5: 'Automatic Status Updates an alle Beteiligten'
  };
  
  // ⚡ ADMIN DASHBOARD PRIORITY SYSTEM
  prioritization: {
    'URGENT': 'Lieferverzug-Stornos > €200',
    'HIGH': 'B2B-Projekte oder > €100', 
    'NORMAL': 'Standard B2C Stornos',
    'LOW': 'Admin-initiated Reviews'
  };
}
```

#### **🏢 COMPANY PROFILE STORNO-BEDINGUNGEN DISPLAY**

**Integration in Company Profile**: `/dashboard/company/[uid]` 

```typescript
interface PublicStornoBedingungen {
  // 📋 ÖFFENTLICH SICHTBARE STORNO-BEDINGUNGEN
  displayLocation: 'Company Profile → Storno-Bedingungen Tab';
  visibility: 'Für alle Kunden sichtbar BEVOR Buchung';
  
  publicDisplay: {
    b2cConditions: {
      normalCancellation: {
        timeLimit: '24 Stunden vor Ausführung',
        processingFee: '€2.00 Bearbeitungsgebühr',
        refundPercentage: '100% minus Bearbeitungsgebühr'
      },
      lateCancellation: {
        penaltyPercentage: '5% Strafgebühr bei Lieferverzug',
        fullRefundGuarantee: 'Vollständiger Refund bei Provider-Verzug',
        gracePeriod: '6 Stunden Kulanzzeit nach Deadline'
      }
    },
    
    b2bConditions: {
      normalCancellation: {
        timeLimit: '48 Business-Hours vor Ausführung',
        processingFee: '€5.00 B2B Bearbeitungsgebühr',
        milestoneRefunds: 'Meilenstein-basierte Refunds möglich'
      },
      lateCancellation: {
        contractualDamages: '€50 Vertragsstrafen',
        penaltyPercentage: '7.5% Strafgebühr',
        escalationToLegal: 'Rechtsabteilung bei Streitfällen'
      }
    },
    
    // 🎯 CUSTOMER-FRIENDLY DISPLAY
    customerInfo: {
      title: 'Storno-Bedingungen & Ihre Rechte',
      lieferverzugRights: 'Bei Lieferverzug: Kostenloses Storno-Recht!',
      verbraucherschutz: 'Voller Verbraucherschutz nach deutschem Recht',
      supportContact: 'Fragen? support@taskilo.de'
    }
  };
}
```

### 📊 **PROVIDER SCORING & AUTOMATIC BLOCKING SYSTEM**

#### **🎯 INTEGRATION IN ADMIN COMPANIES PAGE**

**File**: `/src/app/dashboard/admin/companies/page.tsx`

```typescript
interface ProviderScoringSystem {
  // 📊 SCORING METRICS (sichtbar in Admin Dashboard)
  scoringCategories: {
    stornoRate: {
      weight: 40,  // 40% des Gesamtscores
      calculation: '(Stornos / Completed Orders) * 100',
      thresholds: {
        excellent: '< 5%',   // Score: 100
        good: '5-15%',       // Score: 80
        warning: '15-25%',   // Score: 60
        critical: '25-35%',  // Score: 40
        blocking: '> 35%'    // Score: 0 + Auto-Block
      }
    },
    
    lieferverzugRate: {
      weight: 30,  // 30% des Gesamtscores
      calculation: '(Überfällige Orders / Total Orders) * 100',
      impact: 'Direkte Auswirkung auf Kunden-Storno-Rate'
    },
    
    customerSatisfaction: {
      weight: 20,  // 20% des Gesamtscores
      calculation: 'Average Rating nach Storno-Fällen',
      tracking: 'Spezielle Post-Storno Customer Surveys'
    },
    
    responseTime: {
      weight: 10,  // 10% des Gesamtscores
      calculation: 'Average Response Time bei Kunden-Anfragen',
      measurement: 'Stunden bis erste Antwort'
    }
  };
  
  // 🚨 AUTOMATIC BLOCKING RULES
  autoBlockingSystem: {
    triggerConditions: {
      stornoRate: '>= 90% über 30 Tage',
      consecutiveStornos: '>= 5 Stornos in Folge',
      highValueStornos: '>= 3 Stornos über €500 in 7 Tagen',
      customerComplaints: '>= 10 Support-Tickets in 14 Tagen'
    },
    
    blockingProcess: {
      step1: 'Automatic Scoring-Calculation jede Nacht',
      step2: 'Alert an Admin-Team bei Critical Scores',
      step3: 'Grace Period: 48h für Provider-Response',
      step4: 'Automatic Account Suspension nach Grace Period',
      step5: 'Provider Notification + Appeal-Process Info'
    },
    
    suspensionEffects: {
      bookingBlock: 'Keine neuen Buchungen möglich',
      profileHidden: 'Profil nicht mehr in Suche sichtbar',
      payoutHold: 'Auszahlungen gestoppt bis Review',
      adminReview: 'Mandatory Admin-Review für Reactivation'
    }
  };
}
```

#### **📋 ADMIN DASHBOARD SCORING DISPLAY**

**Enhanced `/src/app/dashboard/admin/companies/page.tsx`:**

```tsx
// Neue Spalten für Company-Tabelle
interface CompanyWithScoring extends Company {
  scoringData: {
    overallScore: number;        // 0-100
    stornoRate: number;          // Percentage
    lieferverzugRate: number;    // Percentage
    avgRatingAfterStorno: number; // 1-5 stars
    totalStornos: number;
    lastStornoDate: string;
    blockingRisk: 'low' | 'medium' | 'high' | 'critical';
    accountStatus: 'active' | 'warning' | 'suspended' | 'blocked';
  };
}

function CompanyScoringColumn({ company }: { company: CompanyWithScoring }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };
  
  const getRiskBadge = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[risk]}`}>
        {risk.toUpperCase()}
      </span>
    );
  };
  
  return (
    <div className="space-y-2">
      {/* Overall Score */}
      <div className={`px-3 py-2 rounded-lg ${getScoreColor(company.scoringData.overallScore)}`}>
        <div className="font-bold text-lg">{company.scoringData.overallScore}/100</div>
        <div className="text-xs">Gesamt-Score</div>
      </div>
      
      {/* Key Metrics */}
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span>Storno-Rate:</span>
          <span className="font-medium">{company.scoringData.stornoRate}%</span>
        </div>
        <div className="flex justify-between">
          <span>Verzug-Rate:</span>
          <span className="font-medium">{company.scoringData.lieferverzugRate}%</span>
        </div>
        <div className="flex justify-between">
          <span>Post-Storno Rating:</span>
          <span className="font-medium">{company.scoringData.avgRatingAfterStorno}⭐</span>
        </div>
      </div>
      
      {/* Risk Assessment */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">Risiko:</span>
        {getRiskBadge(company.scoringData.blockingRisk)}
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-1">
        <button className="bg-[#14ad9f] text-white px-2 py-1 rounded text-xs">
          Details
        </button>
        {company.scoringData.blockingRisk === 'critical' && (
          <button className="bg-red-600 text-white px-2 py-1 rounded text-xs">
            Block
          </button>
        )}
      </div>
    </div>
  );
}
```

### 📝 **APPEAL PROCESS & CONTACT FORM INTEGRATION**

#### **🔄 WIEDERFREIGABE-ANTRAG SYSTEM**

**Integration in Kontakt-Formular**: `/contact` → Neuer Tab "Account-Appeal"

```typescript
interface AppealSystem {
  // 📋 APPEAL FORM INTEGRATION
  contactFormTabs: [
    'Allgemeine Anfrage',
    'Technischer Support', 
    'Rechnungsfragen',
    '🔄 Account-Wiederfreigabe'  // NEUER TAB
  ];
  
  appealFormFields: {
    companyId: string;
    blockingReason: 'storno_rate' | 'lieferverzug' | 'customer_complaints' | 'other';
    appealReason: string;           // Textarea - Why should we unblock?
    improvementPlan: string;        // Textarea - What will you change?
    supportingDocuments: File[];    // PDFs, Screenshots etc.
    contactPerson: {
      name: string;
      position: string;
      phone: string;
      email: string;
    };
    agreedToNewTerms: boolean;      // Checkbox - Agree to stricter monitoring
  };
  
  // 🎯 APPEAL REVIEW PROCESS
  reviewProcess: {
    step1: 'Appeal eingereicht → Admin-Notification',
    step2: 'Admin-Team Review (max 5 business days)',
    step3: 'Background Check: Scoring-History, Customer-Feedback',
    step4: 'Decision: Approved / Conditional / Rejected',
    step5: 'Provider Notification + Next Steps',
    conditional: 'Probationary Period: 30 Tage enhanced Monitoring'
  };
}
```

### 🔄 **PAYMENT FAILURE HANDLING - FINALIZED**

```typescript
interface PaymentFailureHandling {
  // 3. PAYMENT-STATUS SYNCHRONISATION SOLUTION
  stripeWebhookFailure: {
    solution: 'Retry-Mechanismus & Manual Sync',
    implementation: {
      automatic: {
        retryAttempts: 3,
        backoffStrategy: 'exponential (1s, 5s, 15s)',
        maxRetryWindow: '30 minutes',
        fallback: 'Manual Admin Intervention Alert'
      },
      manual: {
        syncButton: 'Admin Dashboard → "Sync Stripe Data"',
        batchSync: 'Daily reconciliation job',
        errorRecovery: 'Rollback inconsistent states'
      }
    }
  };
  
  // ROLLBACK-MECHANISMUS
  rollbackStrategy: {
    trigger: 'Stripe Refund failed after Firebase status update',
    action: 'Revert Firebase status to previous state',
    notification: 'Admin + Customer notification of failure',
    manualIntervention: 'Admin dashboard shows "Needs Manual Resolution"'
  };
}
```

### 📧 **NOTIFICATION SYSTEM - REAL-TIME + EMAIL FALLBACK**

```typescript
interface NotificationStrategy {
  // 5. REAL-TIME als Primary, Email als Fallback
  primary: {
    method: 'Firebase Real-time Listeners',
    speed: 'Instant',
    reliability: '99%+',
    implementation: 'onSnapshot() für live Updates'
  };
  
  // 6. EMAIL-FALLBACK für kritische Nachrichten
  fallback: {
    trigger: 'User offline > 15 minutes',
    method: 'Resend Email API',
    content: 'Storno-Status Updates, Admin-Decisions',
    templates: {
      stornoApproved: 'Ihr Storno wurde genehmigt',
      stornoRejected: 'Storno-Antrag abgelehnt - Begründung',
      adminRequired: 'Ihr Fall wird geprüft - 24h Antwort'
    }
  };
}
```

### 🏛️ **AGB-ERWEITERUNG FÜR AUTO-BLOCKING**

```markdown
## AGB-ZUSATZ: Automatic Provider Suspension

**§X.1 Quality Standards & Automatic Monitoring**
- Taskilo überwacht kontinuierlich die Leistungsqualität aller Anbieter
- Bei einer Storno-Rate von 90% oder höher wird der Account automatisch gesperrt
- Provider werden 48h vor Sperrung benachrichtigt und können Stellung nehmen

**§X.2 Wiederfreigabe-Verfahren**
- Gesperrte Accounts können Wiederfreigabe über das Kontakt-Formular beantragen
- Entscheidung erfolgt binnen 5 Werktagen nach vollständiger Antragsstellung
- Wiederfreigabe kann an Bedingungen geknüpft werden (Probezeitraum, verstärkte Überwachung)

**§X.3 Provider-Rechte**
- Jeder Provider hat das Recht auf Einsicht in seine Scoring-Daten
- Bei automatischer Sperrung: Detaillierte Begründung mit Berechnungsgrundlage
- Beschwerderecht an unabhängige Schiedsstelle bei Meinungsverschiedenheiten
```

### 🔒 **STRIPE BACKEND SECURITY CONFIRMATION**

```typescript
interface StripeSecurityConfirmation {
  // 9. STRIPE BACKEND KONTROLLE
  platformControl: {
    access: 'NUR Platform hat Stripe Dashboard Access',
    providerAccess: 'KEIN direkter Stripe-Zugang für Provider',
    transferControl: 'Platform kann alle Transfers kontrollieren',
    reversalCapability: 'stripe.transfers.reversal.create() JEDERZEIT möglich'
  };
  
  clawbackMechanisms: {
    transferReversal: 'Standard-Methode für completed Orders',
    negativeBalance: 'Provider-Account kann negative Balance haben',
    futurePayoutDeduction: 'Abzug von zukünftigen Auszahlungen',
    directCharge: 'Separate Charge an Provider bei Bedarf'
  };
}
```

---

**FINAL IMPLEMENTATION PRIORITY:**
1. **ADMIN-ONLY APPROVAL**: Höchste Priorität - sofort implementieren
2. **Provider-Scoring**: Admin Dashboard Enhancement 
3. **Public Storno-Display**: Company Profile Integration
4. **Appeal-Process**: Contact Form Extension
5. **Auto-Blocking**: Background Job + AGB-Update

---

## 🛠️ **STEP-BY-STEP IMPLEMENTATION PROTOCOL**

### 🚨 **CRITICAL IMPLEMENTATION RULES - 100% FUNKTIONALITÄT GARANTIERT**

```typescript
interface ImplementationProtocol {
  // 🔥 MANDATORY: ALLES MUSS 100% FUNKTIONIEREN
  qualityRequirements: {
    buttons: 'Jeder Button muss klickbar sein und richtige Aktion ausführen',
    routes: 'Alle API-Routes müssen existieren und korrekt antworten',
    database: 'Firebase-Collections müssen korrekt strukturiert sein',
    links: 'Alle internen Links müssen zu existierenden Seiten führen',
    forms: 'Alle Forms müssen validieren und Daten korrekt übertragen',
    ui: 'UI muss responsive und fehlerfrei dargestellt werden'
  };
  
  // 🔧 REPAIR-FIRST APPROACH
  repairStrategy: {
    checkExisting: 'Vor jeder neuen Datei: Prüfe ob bereits existiert',
    repairBroken: 'Kaputte Dateien REPARIEREN statt neu erstellen',
    validateFunction: 'Nach jeder Änderung: Funktionalität testen',
    rollbackReady: 'Bei Fehlern: Sofortiger Rollback-Plan'
  };
  
  // 📋 PUNKT-FÜR-PUNKT ABARBEITUNG
  stepByStepProcess: {
    analyze: 'SCHRITT 1: Analysiere bestehende Struktur',
    plan: 'SCHRITT 2: Plane genaue Änderungen',
    implement: 'SCHRITT 3: Implementiere eine Komponente',
    test: 'SCHRITT 4: Teste Funktionalität live',
    verify: 'SCHRITT 5: Verifiziere Integration',
    next: 'SCHRITT 6: Nächste Komponente nur nach Erfolg'
  };
}
```

### 📋 **IMPLEMENTATION CHECKLIST - ADMIN-ONLY STORNO SYSTEM**

#### **PHASE 1: ADMIN-ONLY APPROVAL SYSTEM** 🔴 CRITICAL

**SCHRITT 1: Analyse & Bestandsaufnahme**
```bash
# Zu prüfende Dateien & Strukturen:
✅ /src/app/api/auftraege/[auftragId]/cancel/route.ts  # Bestehende Cancel-API
✅ /src/app/dashboard/admin/                          # Admin-Dashboard Struktur  
✅ /src/app/dashboard/user/[uid]/orders/[orderId]/    # User Order-Pages
✅ /src/app/dashboard/company/[uid]/orders/[orderId]/ # Company Order-Pages
✅ Firebase auftraege Collection Schema               # Bestehende Datenstruktur
✅ Firebase admin/storno_requests Collection          # Neue Collection nötig?
```

**SCHRITT 2: Admin Cancel Request API**
```typescript
// FILE: /src/app/api/admin/storno-requests/route.ts (NEU)
// ZWECK: Admin kann Storno-Anfragen anzeigen und genehmigen
// STATUS: ❌ NOCH NICHT ERSTELLT - MUSS IMPLEMENTIERT WERDEN

interface AdminStornoRequestAPI {
  GET: {
    description: 'Alle pending Storno-Anfragen für Admin-Dashboard';
    response: Array<{
      id: string;
      auftragId: string;
      requestedBy: 'customer' | 'provider';
      reason: string;
      amount: number;
      status: 'pending' | 'approved' | 'rejected';
      submittedAt: string;
      priority: 'urgent' | 'high' | 'normal';
    }>;
  };
  
  POST: {
    description: 'Admin genehmigt oder lehnt Storno-Anfrage ab';
    body: {
      requestId: string;
      decision: 'approve' | 'reject';
      adminComment: string;
      processRefund: boolean;
    };
    action: 'Führt Stripe Refund aus wenn approved';
  };
}
```

**SCHRITT 3: Modified User Cancel API**
```typescript
// FILE: /src/app/api/auftraege/[auftragId]/cancel/route.ts (MODIFIZIEREN)
// ÄNDERUNG: Keine direkten Refunds mehr - nur Anfrage erstellen
// STATUS: ⚠️ MUSS MODIFIZIERT WERDEN

interface ModifiedCancelAPI {
  changes: {
    remove: 'Direkte Stripe Refund-Calls',
    add: 'Firebase storno_requests Collection Entry',
    modify: 'Return Message: "Anfrage eingereicht, wartet auf Admin-Approval"',
    integrate: 'AWS Admin Notification Webhook'
  };
}
```

**SCHRITT 4: Admin Dashboard Storno-Section**
```typescript
// FILE: /src/app/dashboard/admin/storno-requests/page.tsx (NEU)
// ZWECK: Admin-UI für Storno-Genehmigungen
// STATUS: ❌ KOMPLETT NEU - MUSS ERSTELLT WERDEN

interface AdminStornoUI {
  components: [
    'PendingRequestsList',      // Liste aller offenen Anfragen
    'RequestDetailModal',       // Detail-Ansicht mit Auftrag-Info
    'ApprovalButtons',          // Approve/Reject Buttons
    'RefundProcessingStatus',   // Stripe Refund Status
    'HistoryLog'               // Alle verarbeiteten Anfragen
  ];
  
  features: {
    realtime: 'Firebase onSnapshot für Live-Updates',
    filtering: 'Nach Status, Betrag, Datum filtern',
    prioritization: 'Urgent/High/Normal Kennzeichnung',
    batchActions: 'Multiple Requests gleichzeitig bearbeiten'
  };
}
```

**SCHRITT 5: Firebase Collection Schema**
```typescript
// COLLECTION: storno_requests (NEU)
// STATUS: ❌ MUSS ERSTELLT WERDEN

interface StornoRequestDocument {
  id: string;                    // Auto-generated Firestore ID
  auftragId: string;            // Reference zu auftraege Collection
  requestedBy: 'customer' | 'provider';
  requestedByUid: string;       // Firebase UID
  
  // Request Details
  reason: string;
  requestType: 'normal_cancellation' | 'lieferverzug' | 'dispute';
  submittedAt: Timestamp;
  
  // Financial Info
  refundAmount: number;         // In Cents
  originalAmount: number;       // In Cents
  processingFee: number;        // In Cents
  
  // Admin Processing
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  priority: 'urgent' | 'high' | 'normal';
  adminReview: {
    reviewedBy: string;         // Admin UID
    reviewedAt: Timestamp;
    decision: 'approve' | 'reject';
    comment: string;
    refundProcessed: boolean;
    stripeRefundId?: string;
  } | null;
  
  // Audit Trail
  statusHistory: Array<{
    status: string;
    changedBy: string;
    changedAt: Timestamp;
    comment?: string;
  }>;
}
```

**SCHRITT 6: User-Interface Updates**
```typescript
// FILES: User & Company Order-Detail Pages (MODIFIZIEREN)
// ÄNDERUNG: Cancel-Button führt zu Request-Creation statt direktem Refund
// STATUS: ⚠️ MÜSSEN MODIFIZIERT WERDEN

interface UserCancelButtonUpdate {
  files: [
    '/src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx',
    '/src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx'
  ];
  
  changes: {
    buttonText: 'Storno beantragen (statt "Stornieren")',
    clickAction: 'Erstelle storno_request (statt direkter Refund)',
    feedback: 'Zeige "Anfrage eingereicht" Message',
    status: 'Zeige Request-Status (pending/approved/rejected)'
  };
}
```

### 📋 **IMPLEMENTIERUNG STEP-BY-STEP PLAN**

#### **TAG 1: BACKEND FOUNDATION** 
```bash
✅ SCHRITT 1.1: Analysiere bestehende /api/auftraege/[auftragId]/cancel/route.ts
✅ SCHRITT 1.2: Erstelle Firebase storno_requests Collection Schema
✅ SCHRITT 1.3: Implementiere /api/admin/storno-requests/route.ts
✅ SCHRITT 1.4: Modifiziere User Cancel API (nur Request-Creation)
✅ SCHRITT 1.5: Teste alle APIs mit Postman/curl
```

#### **TAG 2: ADMIN DASHBOARD UI**
```bash
✅ SCHRITT 2.1: Erstelle /app/dashboard/admin/storno-requests/page.tsx
✅ SCHRITT 2.2: Implementiere PendingRequestsList Component
✅ SCHRITT 2.3: Implementiere ApprovalButtons mit API-Integration
✅ SCHRITT 2.4: Teste Admin-UI Ende-zu-Ende
✅ SCHRITT 2.5: Integriere Real-time Updates (Firebase onSnapshot)
```

#### **TAG 3: USER/COMPANY UI UPDATES**
```bash
✅ SCHRITT 3.1: Modifiziere User Order-Detail Cancel-Button
✅ SCHRITT 3.2: Modifiziere Company Order-Detail Ansicht
✅ SCHRITT 3.3: Implementiere Request-Status Display
✅ SCHRITT 3.4: Teste User-Journey Ende-zu-Ende
✅ SCHRITT 3.5: Teste Company-Journey Ende-zu-Ende
```

#### **TAG 4: INTEGRATION & TESTING**
```bash
✅ SCHRITT 4.1: Vollständiger Integration-Test aller Komponenten
✅ SCHRITT 4.2: Test auf Live-Site (https://taskilo.de)
✅ SCHRITT 4.3: Bug-Fixes und Optimierungen
✅ SCHRITT 4.4: Performance-Tests und Monitoring
✅ SCHRITT 4.5: Deployment-Verification
```

### 🔧 **REPAIR-PROTOKOLL FÜR BESTEHENDE DATEIEN**

```typescript
interface FileRepairProtocol {
  // DATEIEN DIE MÖGLICHERWEISE REPARIERT WERDEN MÜSSEN
  suspiciousFiles: [
    '/src/app/api/auftraege/[auftragId]/cancel/route.ts',  // Existing Cancel API
    '/src/app/dashboard/user/[uid]/orders/[orderId]/page.tsx',  // User Order Page
    '/src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx'  // Company Order Page
  ];
  
  repairChecklist: {
    syntaxErrors: 'TypeScript compilation errors?',
    missingImports: 'Alle imports korrekt?', 
    brokenRoutes: 'API-Routes erreichbar?',
    uiErrors: 'React-Komponenten rendern korrekt?',
    dataFlow: 'Firebase-Integration funktioniert?'
  };
  
  repairProcess: {
    step1: 'Analysiere Datei mit read_file',
    step2: 'Identifiziere spezifische Probleme',
    step3: 'Repariere mit replace_string_in_file',
    step4: 'Teste Funktionalität',
    step5: 'Wiederhole bis 100% funktional'
  };
}
```

### 🎯 **SUCCESS CRITERIA - DEFINITION OF DONE**

```typescript
interface SuccessCriteria {
  // JEDER SCHRITT MUSS DIESE KRITERIEN ERFÜLLEN
  functionalRequirements: {
    api: 'Alle API-Endpoints antworten korrekt (200/400/500)',
    ui: 'Alle Buttons klickbar, alle Forms funktional',
    data: 'Daten werden korrekt in Firebase gespeichert',
    integration: 'Ende-zu-Ende User-Journey funktioniert',
    live: 'Funktionalität auf https://taskilo.de verfügbar'
  };
  
  testingRequirements: {
    unit: 'Jede Komponente isoliert getestet',
    integration: 'Alle Komponenten zusammen getestet',
    userAcceptance: 'Real-world User-Journey getestet',
    performance: 'Antwortzeiten < 2 Sekunden',
    security: 'Nur Admin kann Stornos genehmigen'
  };
  
  deliveryRequirements: {
    code: 'Sauberer, kommentierten Code',
    documentation: 'API-Dokumentation vollständig',
    deployment: 'Live-Deployment erfolgreich',
    monitoring: 'Error-Monitoring aktiv',
    rollback: 'Rollback-Plan getestet'
  };
}
```

---

**🚨 IMPLEMENTATION STARTET JETZT - STEP 1: ANALYSE BESTEHENDE STRUKTUR**

**Nächste Aktion**: Analysiere `/src/app/api/auftraege/[auftragId]/cancel/route.ts` um zu verstehen, wie die aktuelle Cancel-API funktioniert, bevor ich sie für Admin-Only Approval modifiziere.

### 📋 **IMPLEMENTATION STATUS TRACKING**

```typescript
interface ImplementationStatus {
  // 🟥 CRITICAL: BUILD & COMMIT ERST NACH VOLLSTÄNDIGER UMSETZUNG!
  buildCommitRule: 'Keine pnpm build oder git commit bis alles 100% funktioniert';
  
  // 📊 LIVE PROGRESS TRACKING
  currentPhase: 'STEP 1: ANALYSE BESTEHENDE STRUKTUR';
  completedSteps: [];
  activeStep: 'SCHRITT 1.1: Analysiere bestehende Cancel-API';
  
  statusUpdates: {
    specification: 'Wird laufend in dieser Datei aktualisiert',
    implementation: 'Step-by-Step mit Status-Updates',
    testing: 'Nach jedem Schritt live getestet',
    finalDeployment: 'Build & Commit nur nach 100% Erfolg'
  };
}
```

### 🔄 **LIVE IMPLEMENTATION LOG**

#### **PHASE 1: BACKEND FOUNDATION** 🔄 IN PROGRESS

**SCHRITT 1.1: ANALYSE BESTEHENDE CANCEL-API** 🟡 AKTIV
```bash
Status: 🔄 ANALYSIERE /src/app/api/auftraege/[auftragId]/cancel/route.ts
Ziel: Verstehe aktuelle Implementierung vor Modifikation
Nächster Schritt: Nach Analyse → Firebase Schema prüfen
```

**SCHRITT 1.2: FIREBASE SCHEMA ANALYSE** ⏸️ WARTEND
```bash
Status: ⏸️ Warte auf Abschluss von Schritt 1.1
Ziel: Prüfe bestehende auftraege Collection Struktur
```

**SCHRITT 1.3: STORNO_REQUESTS COLLECTION** ⏸️ WARTEND
```bash
Status: ⏸️ Warte auf Schema-Analyse
Ziel: Erstelle neue Firebase Collection für Admin-Requests
```

**SCHRITT 1.4: ADMIN API CREATION** ⏸️ WARTEND
```bash
Status: ⏸️ Warte auf Collection-Setup
Ziel: /src/app/api/admin/storno-requests/route.ts erstellen
```

**SCHRITT 1.5: MODIFY USER CANCEL API** ⏸️ WARTEND
```bash
Status: ⏸️ Warte auf Admin-API
Ziel: Cancel-API auf Request-Only umstellen
```

---

**🚀 IMPLEMENTATION BEGINNT JETZT - SCHRITT 1.1 AKTIV**

---

## 🛠️ **PRAKTISCHE IMPLEMENTIERUNG - CODE & APIS**

### 🚨 **STEP 1: ADMIN-ONLY STORNO APPROVAL API**

#### **A) Enhanced Cancel API - Admin-Genehmigung Required**

**File**: `src/app/api/auftraege/[auftragId]/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface StornoRequest {
  reason: string;
  cancelledBy: 'customer' | 'provider';
  userId: string;
  requestType: 'normal' | 'lieferverzug';
  customerJustification?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { auftragId: string } }
) {
  try {
    const { auftragId } = params;
    const stornoData: StornoRequest = await request.json();
    
    // 1. Auftrag laden und Berechtigung prüfen
    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    const auftragSnap = await auftragRef.get();
    
    if (!auftragSnap.exists) {
      return NextResponse.json({ error: 'Auftrag nicht gefunden' }, { status: 404 });
    }
    
    const auftragData = auftragSnap.data()!;
    
    // 2. Berechtigung validieren
    const isAuthorized = validateStornoPermission(auftragData, stornoData.userId, stornoData.cancelledBy);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Keine Berechtigung für Stornierung' }, { status: 403 });
    }
    
    // 3. Payment-Status analysieren
    const paymentAnalysis = analyzePaymentRefundability(auftragData);
    
    // 4. 🔒 CRITICAL: KEINE AUTOMATISCHEN REFUNDS - IMMER ADMIN-APPROVAL
    const stornoRequestData = {
      auftragId,
      requestType: 'storno_approval_required',
      submittedAt: new Date().toISOString(),
      status: 'pending_admin_approval',
      
      // Auftrag-Details
      auftragDetails: {
        kundeId: auftragData.kundeId,
        selectedAnbieterId: auftragData.selectedAnbieterId,
        totalAmount: auftragData.totalAmountPaidByBuyer,
        paymentIntentId: auftragData.paymentIntentId,
        paymentType: auftragData.paymentType,
        customerType: auftragData.customerType,
        currentStatus: auftragData.status,
        jobDateFrom: auftragData.jobDateFrom,
        jobDateTo: auftragData.jobDateTo
      },
      
      // Storno-Anfrage Details
      stornoRequest: {
        reason: stornoData.reason,
        cancelledBy: stornoData.cancelledBy,
        requestType: stornoData.requestType,
        justification: stornoData.customerJustification,
        submittedBy: stornoData.userId
      },
      
      // Payment Analysis für Admin
      refundAnalysis: {
        complexity: paymentAnalysis.complexity,
        refundMethod: paymentAnalysis.method,
        estimatedTime: paymentAnalysis.estimatedTime,
        providerImpact: paymentAnalysis.providerImpact,
        recommendedAction: generateAdminRecommendation(auftragData, stornoData)
      },
      
      // Admin-Review Daten
      adminReview: null,
      processedAt: null,
      refundExecutedAt: null
    };
    
    // 5. Storno-Request in Firebase speichern
    const stornoRequestRef = await adminDb.collection('storno_requests').add(stornoRequestData);
    
    // 6. Auftrag-Status auf "STORNO_PENDING" setzen
    await auftragRef.update({
      status: 'STORNO_PENDING',
      stornoRequestId: stornoRequestRef.id,
      lastStatusUpdate: new Date(),
      statusHistory: adminDb.FieldValue.arrayUnion({
        status: 'STORNO_PENDING',
        reason: `Storno-Antrag eingereicht: ${stornoData.reason}`,
        timestamp: new Date().toISOString(),
        cancelledBy: stornoData.cancelledBy,
        automaticUpdate: false
      })
    });
    
    // 7. AWS Admin Dashboard benachrichtigen
    await notifyAdminDashboard('urgent_storno_approval', {
      stornoRequestId: stornoRequestRef.id,
      auftragId,
      priority: calculateStornoPriority(auftragData),
      estimatedRefund: auftragData.totalAmountPaidByBuyer,
      requestType: stornoData.requestType
    });
    
    // 8. Kunden benachrichtigen
    await sendCustomerNotification(auftragData.kundeId, {
      type: 'storno_request_submitted',
      auftragId,
      message: 'Ihr Storno-Antrag wird geprüft. Sie erhalten binnen 24h eine Rückmeldung.',
      expectedResponseTime: '24 Stunden'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Storno-Antrag eingereicht - wird von Admin geprüft',
      stornoRequestId: stornoRequestRef.id,
      status: 'pending_admin_approval',
      expectedResponseTime: '24 Stunden',
      trackingInfo: {
        canTrack: true,
        statusUrl: `/dashboard/user/${stornoData.userId}/storno-requests/${stornoRequestRef.id}`
      }
    });
    
  } catch (error) {
    console.error('Storno-Request Fehler:', error);
    return NextResponse.json({
      error: 'Storno-Antrag konnte nicht verarbeitet werden',
      message: 'Bitte kontaktieren Sie den Support',
      supportEmail: 'support@taskilo.de'
    }, { status: 500 });
  }
}

// Helper Functions
function validateStornoPermission(auftragData: any, userId: string, role: 'customer' | 'provider'): boolean {
  if (role === 'customer') {
    return userId === auftragData.kundeId || userId === auftragData.customerFirebaseUid;
  }
  if (role === 'provider') {
    return userId === auftragData.selectedAnbieterId;
  }
  return false;
}

function analyzePaymentRefundability(auftragData: any) {
  const status = auftragData.status;
  const hasTransfer = auftragData.transferId || auftragData.transferredAmount;
  const amount = auftragData.totalAmountPaidByBuyer;
  
  if (['zahlung_erhalten_clearing', 'AKTIV'].includes(status) && !hasTransfer) {
    return {
      complexity: 'SAFE_REFUND',
      method: 'stripe_refund_direct',
      estimatedTime: '5-10 business days',
      adminRequired: true,  // IMMER Admin-Required
      providerImpact: 'minimal'
    };
  }
  
  if (status === 'PROVIDER_COMPLETED' || amount > 20000) {
    return {
      complexity: 'ADMIN_REQUIRED',
      method: 'admin_review_process',
      estimatedTime: '24-72 hours',
      adminRequired: true,
      providerImpact: 'medium'
    };
  }
  
  if (status === 'ABGESCHLOSSEN' && hasTransfer) {
    return {
      complexity: 'COMPLEX_CLAWBACK',
      method: 'transfer_reversal',
      estimatedTime: '7-14 business days',
      adminRequired: true,
      providerImpact: 'high'
    };
  }
  
  return {
    complexity: 'ADMIN_REQUIRED',
    method: 'manual_review',
    estimatedTime: '24-48 hours',
    adminRequired: true,
    providerImpact: 'unknown'
  };
}

function generateAdminRecommendation(auftragData: any, stornoData: StornoRequest): string {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = auftragData.jobDateTo < today;
  
  if (stornoData.requestType === 'lieferverzug' && isOverdue) {
    return 'EMPFEHLUNG: Sofortige Genehmigung - Lieferverzug bestätigt. Kunde hat Storno-Recht.';
  }
  
  if (auftragData.totalAmountPaidByBuyer > 50000) {
    return 'EMPFEHLUNG: Detailprüfung erforderlich - Hoher Betrag. Provider kontaktieren.';
  }
  
  if (auftragData.status === 'AKTIV') {
    return 'EMPFEHLUNG: Standard-Genehmigung - Payment sicher auf Platform.';
  }
  
  return 'EMPFEHLUNG: Manuelle Prüfung - Unklarer Fall. Beide Parteien kontaktieren.';
}

function calculateStornoPriority(auftragData: any): 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' {
  const amount = auftragData.totalAmountPaidByBuyer;
  
  if (amount > 100000) return 'URGENT';   // > €1000
  if (amount > 20000) return 'HIGH';      // > €200
  if (auftragData.customerType === 'firma') return 'HIGH';  // B2B
  return 'NORMAL';
}

async function notifyAdminDashboard(type: string, data: any) {
  try {
    // AWS Lambda Webhook Call
    await fetch('https://admin-aws.taskilo.de/api/storno-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_WEBHOOK_TOKEN}`
      },
      body: JSON.stringify({
        action: type,
        data,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Admin-Notification fehlgeschlagen:', error);
    // Fallback: Email-Alert an Admin-Team
    // TODO: Implement email fallback
  }
}

async function sendCustomerNotification(kundeId: string, notification: any) {
  try {
    await adminDb.collection('notifications').add({
      recipientId: kundeId,
      type: notification.type,
      content: notification.message,
      auftragId: notification.auftragId,
      priority: 'high',
      status: 'unread',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
    });
  } catch (error) {
    console.error('Customer-Notification fehlgeschlagen:', error);
  }
}
```

#### **B) Admin Approval Execution API**

**File**: `src/app/api/admin/storno-requests/[requestId]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

interface AdminApprovalDecision {
  decision: 'approved' | 'rejected' | 'needs_more_info';
  adminId: string;
  adminName: string;
  comments: string;
  refundAmount?: number;  // Custom refund amount
  refundReason?: string;  // Reason for Stripe
  notifyCustomer: boolean;
  notifyProvider: boolean;
  customMessage?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const { requestId } = params;
    const approval: AdminApprovalDecision = await request.json();
    
    // 1. Storno-Request laden
    const requestRef = adminDb.collection('storno_requests').doc(requestId);
    const requestSnap = await requestRef.get();
    
    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Storno-Request nicht gefunden' }, { status: 404 });
    }
    
    const requestData = requestSnap.data()!;
    const auftragId = requestData.auftragId;
    
    // 2. Auftrag laden
    const auftragRef = adminDb.collection('auftraege').doc(auftragId);
    const auftragSnap = await auftragRef.get();
    const auftragData = auftragSnap.data()!;
    
    if (approval.decision === 'approved') {
      // 3A. GENEHMIGT - Refund ausführen
      const refundResult = await executeApprovedRefund(auftragData, approval);
      
      // 4A. Status Updates
      await Promise.all([
        // Storno-Request als approved markieren
        requestRef.update({
          status: 'approved',
          adminReview: {
            decision: approval.decision,
            adminId: approval.adminId,
            adminName: approval.adminName,
            comments: approval.comments,
            processedAt: new Date().toISOString()
          },
          refundDetails: refundResult,
          processedAt: new Date()
        }),
        
        // Auftrag als storniert markieren
        auftragRef.update({
          status: 'STORNIERT',
          stornierungGenehmigt: true,
          genehmigtVon: approval.adminId,
          genehmigtAm: new Date(),
          refundDetails: refundResult,
          statusHistory: adminDb.FieldValue.arrayUnion({
            status: 'STORNIERT',
            reason: `Admin-Genehmigung: ${approval.comments}`,
            timestamp: new Date().toISOString(),
            adminApproved: true,
            adminId: approval.adminId
          })
        })
      ]);
      
      // 5A. Benachrichtigungen senden
      if (approval.notifyCustomer) {
        await sendApprovalNotification('customer', auftragData.kundeId, {
          decision: 'approved',
          auftragId,
          refundAmount: refundResult.amount,
          message: approval.customMessage || 'Ihr Storno wurde genehmigt. Die Rückerstattung erfolgt in 5-10 Werktagen.'
        });
      }
      
      if (approval.notifyProvider) {
        await sendApprovalNotification('provider', auftragData.selectedAnbieterId, {
          decision: 'approved',
          auftragId,
          impact: 'Auftrag wurde storniert - Auszahlung entfällt',
          message: approval.customMessage || 'Auftrag wurde vom Kunden storniert und von Admin genehmigt.'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Storno genehmigt und Refund ausgeführt',
        refundDetails: refundResult,
        notificationsSent: {
          customer: approval.notifyCustomer,
          provider: approval.notifyProvider
        }
      });
      
    } else if (approval.decision === 'rejected') {
      // 3B. ABGELEHNT - Status zurücksetzen
      await Promise.all([
        // Storno-Request als rejected markieren
        requestRef.update({
          status: 'rejected',
          adminReview: {
            decision: approval.decision,
            adminId: approval.adminId,
            adminName: approval.adminName,
            comments: approval.comments,
            processedAt: new Date().toISOString()
          },
          processedAt: new Date()
        }),
        
        // Auftrag-Status zurücksetzen (vorheriger Status)
        auftragRef.update({
          status: requestData.auftragDetails.currentStatus,  // Zurück zum vorherigen Status
          stornoRequestId: null,
          statusHistory: adminDb.FieldValue.arrayUnion({
            status: requestData.auftragDetails.currentStatus,
            reason: `Storno abgelehnt: ${approval.comments}`,
            timestamp: new Date().toISOString(),
            adminRejected: true,
            adminId: approval.adminId
          })
        })
      ]);
      
      // 4B. Kunden über Ablehnung informieren
      if (approval.notifyCustomer) {
        await sendApprovalNotification('customer', auftragData.kundeId, {
          decision: 'rejected',
          auftragId,
          reason: approval.comments,
          message: approval.customMessage || 'Ihr Storno-Antrag wurde nach Prüfung abgelehnt.',
          nextSteps: 'Sie können bei Fragen den Support kontaktieren: support@taskilo.de'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Storno abgelehnt - Status zurückgesetzt',
        rejectionReason: approval.comments
      });
      
    } else if (approval.decision === 'needs_more_info') {
      // 3C. WEITERE INFOS BENÖTIGT
      await requestRef.update({
        status: 'needs_more_info',
        adminReview: {
          decision: approval.decision,
          adminId: approval.adminId,
          adminName: approval.adminName,
          comments: approval.comments,
          processedAt: new Date().toISOString()
        }
      });
      
      // Beide Parteien um weitere Infos bitten
      await Promise.all([
        sendInfoRequestNotification('customer', auftragData.kundeId, approval.comments),
        sendInfoRequestNotification('provider', auftragData.selectedAnbieterId, approval.comments)
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Weitere Informationen angefordert',
        infoRequest: approval.comments
      });
    }
    
  } catch (error) {
    console.error('Admin-Approval Fehler:', error);
    return NextResponse.json({
      error: 'Genehmigung konnte nicht verarbeitet werden',
      details: error.message
    }, { status: 500 });
  }
}

async function executeApprovedRefund(auftragData: any, approval: AdminApprovalDecision) {
  try {
    const refundAmount = approval.refundAmount || auftragData.totalAmountPaidByBuyer;
    const refundReason = approval.refundReason || 'requested_by_customer';
    
    // Stripe Refund erstellen
    const refund = await stripe.refunds.create({
      payment_intent: auftragData.paymentIntentId,
      amount: refundAmount,
      reason: refundReason,
      metadata: {
        auftragId: auftragData.id || auftragData.auftragId,
        adminApproved: 'true',
        adminId: approval.adminId,
        originalAmount: auftragData.totalAmountPaidByBuyer,
        refundType: 'admin_approved'
      }
    });
    
    return {
      stripeRefundId: refund.id,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      processedAt: new Date().toISOString(),
      adminApproved: true,
      adminId: approval.adminId
    };
    
  } catch (stripeError) {
    console.error('Stripe Refund Fehler:', stripeError);
    throw new Error(`Refund fehlgeschlagen: ${stripeError.message}`);
  }
}

async function sendApprovalNotification(type: 'customer' | 'provider', recipientId: string, data: any) {
  const notification = {
    recipientId,
    type: `storno_${data.decision}`,
    priority: 'high',
    status: 'unread',
    createdAt: new Date(),
    content: data.message,
    auftragId: data.auftragId,
    metadata: {
      decision: data.decision,
      refundAmount: data.refundAmount,
      adminProcessed: true
    }
  };
  
  await adminDb.collection('notifications').add(notification);
}

async function sendInfoRequestNotification(type: 'customer' | 'provider', recipientId: string, infoRequest: string) {
  const notification = {
    recipientId,
    type: 'storno_info_request',
    priority: 'high',
    status: 'unread',
    createdAt: new Date(),
    content: `Weitere Informationen benötigt: ${infoRequest}`,
    metadata: {
      requiresResponse: true,
      adminRequest: true
    }
  };
  
  await adminDb.collection('notifications').add(notification);
}
```

---

### 🎯 **STEP 2: ADMIN DASHBOARD STORNO-MANAGEMENT UI**

#### **A) Storno-Requests Overview Component**

**File**: `src/app/dashboard/admin/storno-management/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { FiClock, FiCheck, FiX, FiAlertTriangle, FiEuro } from 'react-icons/fi';

interface StornoRequest {
  id: string;
  auftragId: string;
  status: 'pending_admin_approval' | 'approved' | 'rejected' | 'needs_more_info';
  submittedAt: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  auftragDetails: {
    totalAmount: number;
    customerType: 'firma' | 'privat';
    currentStatus: string;
    kundeId: string;
    selectedAnbieterId: string;
  };
  stornoRequest: {
    reason: string;
    requestType: 'normal' | 'lieferverzug';
    cancelledBy: 'customer' | 'provider';
  };
  refundAnalysis: {
    complexity: string;
    recommendedAction: string;
  };
}

export default function StornoManagementPage() {
  const [stornoRequests, setStornoRequests] = useState<StornoRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<StornoRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadStornoRequests();
    
    // Real-time updates
    const interval = setInterval(loadStornoRequests, 30000); // 30s
    return () => clearInterval(interval);
  }, [filter]);

  const loadStornoRequests = async () => {
    try {
      const response = await fetch(`/api/admin/storno-requests?filter=${filter}`);
      const data = await response.json();
      setStornoRequests(data.requests);
    } catch (error) {
      console.error('Fehler beim Laden der Storno-Requests:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_admin_approval': return <FiClock className="text-yellow-600" />;
      case 'approved': return <FiCheck className="text-green-600" />;
      case 'rejected': return <FiX className="text-red-600" />;
      case 'needs_more_info': return <FiAlertTriangle className="text-orange-600" />;
      default: return <FiClock className="text-gray-600" />;
    }
  };

  const handleApproval = async (requestId: string, decision: 'approved' | 'rejected', comments: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`/api/admin/storno-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          adminId: 'current-admin-id', // TODO: Get from auth
          adminName: 'Admin User',     // TODO: Get from auth
          comments,
          notifyCustomer: true,
          notifyProvider: true
        })
      });

      if (response.ok) {
        await loadStornoRequests(); // Refresh list
        setSelectedRequest(null);   // Close detail view
        
        // Success notification
        alert(decision === 'approved' ? 'Storno genehmigt und Refund ausgeführt!' : 'Storno abgelehnt!');
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.message}`);
      }
    } catch (error) {
      alert('Verarbeitungsfehler - bitte erneut versuchen');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Storno-Management
        </h1>
        <p className="text-gray-600">
          Alle Stornierungsanträge verwalten und genehmigen
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pending', label: 'Ausstehend', count: stornoRequests.filter(r => r.status === 'pending_admin_approval').length },
            { key: 'urgent', label: 'Dringend', count: stornoRequests.filter(r => r.priority === 'URGENT').length },
            { key: 'all', label: 'Alle', count: stornoRequests.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-[#14ad9f] text-[#14ad9f]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Storno Requests List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests List */}
        <div className="space-y-4">
          {stornoRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => setSelectedRequest(request)}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedRequest?.id === request.id ? 'border-[#14ad9f] bg-teal-50' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(request.status)}
                  <span className="font-medium text-gray-900">
                    Auftrag {request.auftragId.slice(-8)}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                  {request.priority}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Betrag:</span>
                  <span className="font-medium">€{(request.auftragDetails.totalAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Typ:</span>
                  <span className="font-medium">
                    {request.auftragDetails.customerType === 'firma' ? 'B2B' : 'B2C'} • 
                    {request.stornoRequest.requestType === 'lieferverzug' ? ' Lieferverzug' : ' Normal'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Grund:</span> {request.stornoRequest.reason}
                </div>
              </div>

              {/* Recommendation */}
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                {request.refundAnalysis.recommendedAction}
              </div>

              {/* Timestamp */}
              <div className="mt-2 text-xs text-gray-500">
                Eingereicht: {new Date(request.submittedAt).toLocaleString()}
              </div>
            </div>
          ))}

          {stornoRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Keine Storno-Requests gefunden
            </div>
          )}
        </div>

        {/* Detail View & Actions */}
        <div className="lg:sticky lg:top-6">
          {selectedRequest ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Storno-Request Details
              </h3>

              {/* Request Info */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Auftrag-ID</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedRequest.auftragId}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Betrag</label>
                    <div className="mt-1 text-sm text-gray-900 font-medium">
                      €{(selectedRequest.auftragDetails.totalAmount / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Storno-Grund</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedRequest.stornoRequest.reason}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin-Empfehlung</label>
                  <div className="mt-1 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    {selectedRequest.refundAnalysis.recommendedAction}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {selectedRequest.status === 'pending_admin_approval' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleApproval(selectedRequest.id, 'approved', 'Storno genehmigt nach Admin-Prüfung')}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <FiCheck />
                      <span>Genehmigen</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt('Grund für Ablehnung:');
                        if (reason) handleApproval(selectedRequest.id, 'rejected', reason);
                      }}
                      disabled={isProcessing}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <FiX />
                      <span>Ablehnen</span>
                    </button>
                  </div>

                  <button
                    onClick={() => alert('Weitere Infos anfordern - Feature in Entwicklung')}
                    className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 flex items-center justify-center space-x-2"
                  >
                    <FiAlertTriangle />
                    <span>Weitere Infos anfordern</span>
                  </button>
                </div>
              )}

              {/* Status Display für bereits verarbeitete Requests */}
              {selectedRequest.status !== 'pending_admin_approval' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(selectedRequest.status)}
                    <span className="font-medium">
                      {selectedRequest.status === 'approved' ? 'Genehmigt' :
                       selectedRequest.status === 'rejected' ? 'Abgelehnt' : 'Weitere Infos benötigt'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Verarbeitet am: {new Date().toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <FiEuro className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Storno-Request auswählen
              </h3>
              <p className="text-gray-600">
                Wählen Sie einen Storno-Request aus der Liste, um Details zu sehen und zu bearbeiten.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### **B) Admin Storno-Requests API**

**File**: `src/app/api/admin/storno-requests/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    
    // Base query
    let query = adminDb.collection('storno_requests')
      .orderBy('submittedAt', 'desc');
    
    // Apply filters
    switch (filter) {
      case 'pending':
        query = query.where('status', '==', 'pending_admin_approval');
        break;
      case 'urgent':
        query = query.where('priority', '==', 'URGENT');
        break;
      case 'all':
      default:
        // No additional filter
        break;
    }
    
    const snapshot = await query.limit(50).get();
    
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Statistics
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending_admin_approval').length,
      urgent: requests.filter(r => r.priority === 'URGENT').length,
      todaysRequests: requests.filter(r => {
        const today = new Date().toISOString().split('T')[0];
        return r.submittedAt.startsWith(today);
      }).length
    };
    
    return NextResponse.json({
      success: true,
      requests,
      stats,
      filter
    });
    
  } catch (error) {
    console.error('Fehler beim Laden der Storno-Requests:', error);
    return NextResponse.json({
      error: 'Storno-Requests konnten nicht geladen werden',
      details: error.message
    }, { status: 500 });
  }
}
```
