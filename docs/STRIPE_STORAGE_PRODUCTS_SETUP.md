# Stripe Storage Products - Erstellungsanleitung

## Neue Speicher-Pläne (ab Oktober 2025)

**Kostenlos**: 500 MB (Standardplan, kein Stripe-Produkt nötig)

Erstelle folgende Produkte im Stripe Dashboard (https://dashboard.stripe.com/products):

---

### 1. **1 GB Speicher**
- **Name**: 1 GB Speicher
- **Beschreibung**: Kleine Unternehmen - 1 GB Cloud-Speicher
- **Preis**: €0.99/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: 1gb
  - `storage_gb`: 1

Nach Erstellung → Kopiere **Price ID** (beginnt mit `price_...`)

---

### 2. **10 GB Speicher** (BELIEBT)
- **Name**: 10 GB Speicher
- **Beschreibung**: Wachsende Teams - 10 GB Cloud-Speicher (Beliebt)
- **Preis**: €2.99/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: 10gb
  - `storage_gb`: 10

Nach Erstellung → Kopiere **Price ID**

---

### 3. **30 GB Speicher**
- **Name**: 30 GB Speicher
- **Beschreibung**: Große Datenmengen - 30 GB Cloud-Speicher
- **Preis**: €5.99/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: 30gb
  - `storage_gb`: 30

Nach Erstellung → Kopiere **Price ID**

---

### 4. **50 GB Speicher**
- **Name**: 50 GB Speicher
- **Beschreibung**: Unternehmen - 50 GB Cloud-Speicher
- **Preis**: €9.99/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: 50gb
  - `storage_gb`: 50

Nach Erstellung → Kopiere **Price ID**

---

### 5. **100 GB Speicher**
- **Name**: 100 GB Speicher
- **Beschreibung**: Große Unternehmen - 100 GB Cloud-Speicher
- **Preis**: €14.99/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: 100gb
  - `storage_gb`: 100

Nach Erstellung → Kopiere **Price ID**

---

### 6. **Unlimited Speicher**
- **Name**: Unlimited Speicher
- **Beschreibung**: Ohne Limite - Unbegrenzter Cloud-Speicher
- **Preis**: €19.90/Monat
- **Typ**: Wiederkehrend (monatlich)
- **Metadata**:
  - `type`: storage
  - `storage_id`: unlimited
  - `storage_gb`: unlimited

Nach Erstellung → Kopiere **Price ID**

---

## Nach Erstellung

1. Sammle alle **6 Price IDs**
2. Öffne `/src/components/storage/StorageUpgradeModal.tsx`
3. Ersetze die `price_PLACEHOLDER_*` Werte mit den echten Price IDs
4. Teste den Upgrade-Flow

## Code-Update Beispiel

```typescript
const STORAGE_PLANS: StoragePlan[] = [
  {
    id: '1gb',
    name: '1 GB',
    storage: 1 * 1024 * 1024 * 1024,
    price: 0.99,
    description: 'Kleine Unternehmen',
    priceId: 'price_1XXXXxxxxxx', // ← Echte Price ID hier einfügen
  },
  // ... weitere Pläne
];
```

## Wichtig

- Alle neuen Firmen erhalten standardmäßig **500 MB kostenlos**
- Update auch das Standard-Limit in der Firma-Erstellung
- Alte 5GB-Kunden können auf dem alten Plan bleiben (Bestandsschutz)
