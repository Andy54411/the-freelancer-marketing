# 🚫 Feature Blocking Implementation Plan

## Status: MIDDLEWARE ✅ | FEATURE-LEVEL ❌

### Was funktioniert bereits:
- ✅ Dashboard-Zugriff komplett blockiert für nicht-approved Companies
- ✅ Admin-Approval-System funktional  
- ✅ Legacy-Company-Grandfathering implementiert

### Was noch implementiert werden muss:

#### 1. **Auftrag-Annahme Blocking**
**Datei**: `/src/app/dashboard/company/[uid]/orders/[orderId]/page.tsx`
**Zeile**: ~676 (handleAcceptOrder function)
**Needed**: Onboarding-Status Check vor Auftragsannahme

```typescript
// HINZUFÜGEN vor handleAcceptOrder:
const { canAccessDashboard } = await import('@/lib/onboarding-progress');
const canAccept = await canAccessDashboard(companyUid);

if (!canAccept) {
  setActionError('Ihr Account muss erst von einem Administrator freigegeben werden.');
  return;
}
```

#### 2. **Service-Buchungen Blocking**  
**Datei**: `/src/app/dashboard/company/[uid]/provider/[id]/components/ProviderBookingModal.tsx`
**Zeile**: ~76 (handlePaymentConfirm function)
**Needed**: Provider-Status Check vor Buchungsabschluss

#### 3. **Öffentliche Profil-Sichtbarkeit**
**Dateien**: Provider-Listing und Public-Profile Pages
**Needed**: Filter nur approved/grandfathered Companies in öffentlichen Listen

#### 4. **Zahlungsabwicklung Blocking**
**Dateien**: Payment-Flow Components  
**Needed**: Status-Check vor Payment-Intent-Erstellung

#### 5. **Chat/Kommunikation Blocking**
**Datei**: ChatComponent
**Needed**: Chat-Zugriff nur für approved Companies

### Implementation Priority:
1. 🔴 **HIGH**: Auftrag-Annahme (verhindert Service-Disruption)
2. 🟡 **MEDIUM**: Öffentliche Sichtbarkeit (verhindert falsche Buchungen)  
3. 🟢 **LOW**: Payment/Chat (bereits durch Dashboard-Block abgedeckt)

### Testing Required:
- [ ] New Company Registration → Dashboard-Block
- [ ] Order Acceptance → Feature-Block  
- [ ] Public Profile → Visibility-Block
- [ ] Admin Approval → Feature-Unlock

**Status**: Dokumentation stimmt mit geplanter Implementierung überein ✅
**Next Action**: Feature-Level Blocking implementieren für vollständige Umsetzung
