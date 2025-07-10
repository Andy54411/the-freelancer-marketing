// Test-Script um die neue Auftragserkennung zu testen

// Test 1: Auftragsnummer-Erkennung
function extractOrderIds(text) {
    const orderIdPattern = /#([A-Za-z0-9]+)/g;
    const matches = text.matchAll(orderIdPattern);
    return Array.from(matches).map(match => match[1]);
}

function formatOrderForChat(order) {
    const formatDate = (dateString) => {
        if (!dateString) return 'Nicht angegeben';
        try {
            return new Date(dateString).toLocaleDateString('de-DE');
        } catch {
            return dateString;
        }
    };

    const formatStatus = (status) => {
        const statusMap = {
            'zahlung_erhalten_clearing': 'Zahlung erhalten - Clearing',
            'pending': 'Ausstehend',
            'cancelled': 'Storniert',
            'completed': 'Abgeschlossen',
            'confirmed': 'Bestätigt',
            'in_progress': 'In Bearbeitung',
            'draft': 'Entwurf'
        };
        return statusMap[status?.toLowerCase() || ''] || status || 'Unbekannt';
    };

    return `
**Auftrag #${order.id}**
- Kunde: ${order.customerName || 'Unbekannt'}
- E-Mail: ${order.customerEmail || 'Nicht verfügbar'}
- Status: ${formatStatus(order.status)}
- Beschreibung: ${order.description || 'Keine Beschreibung'}
- Kategorie: ${order.selectedCategory || 'Nicht angegeben'}
- Service: ${order.selectedSubcategory || 'Nicht angegeben'}
- Anbieter: ${order.providerName || 'Nicht angegeben'}
- Preis: ${order.priceInEuro} €
- Zeitraum: ${formatDate(order.jobDateFrom)} bis ${formatDate(order.jobDateTo)}
- Uhrzeit: ${order.jobTimePreference || 'Nicht angegeben'}
- Dauer: ${order.jobDurationString || 'Nicht angegeben'} Stunden
- Ort: ${order.jobCity || 'Nicht angegeben'}${order.jobPostalCode ? ` (${order.jobPostalCode})` : ''}
- Erstellt am: ${formatDate(order.createdAt)}
- Bezahlt am: ${formatDate(order.paidAt)}
- Clearing-Ende: ${formatDate(order.clearingPeriodEndsAt)}
- Zahlung: ${order.paymentIntentId}
`.trim();
}

console.log('=== Test 1: Auftragsnummer-Erkennung ===');
const testMessages = [
    'Hallo ich habe ein Problem mit dem Auftrag #Bw0brkeOrQU7oGTJuTop',
    'mit dem auftrag Auftrag #Bw0brkeOrQU7oGTJuTop',
    'Kann ich #ABC123 stornieren?',
    'Ich habe Probleme mit Auftrag #DEF456 und #GHI789',
    'Kein Auftrag hier'
];

testMessages.forEach((message, index) => {
    const orderIds = extractOrderIds(message);
    console.log(`Message ${index + 1}: "${message}"`);
    console.log(`Gefundene Aufträge: ${orderIds.length > 0 ? orderIds.join(', ') : 'Keine'}`);
    console.log('---');
});

// Test 2: Formatierung von Mock-Auftragsdaten
console.log('\n=== Test 2: Auftragsformatierung ===');
const mockOrder = {
    id: 'Bw0brkeOrQU7oGTJuTop',
    customerName: 'Andy Test Staudinger',
    customerEmail: 'a.staudinger32@gmail.com',
    status: 'zahlung_erhalten_clearing',
    description: 'Mietkoch für Hochzeit',
    selectedCategory: 'Hotel & Gastronomie',
    selectedSubcategory: 'Mietkoch',
    providerName: 'Mietkoch Andy',
    jobDateFrom: '2025-07-14',
    jobDateTo: '2025-07-20',
    jobTimePreference: '18:00',
    jobDurationString: '8',
    jobTotalCalculatedHours: 56,
    priceInEuro: '2856.00',
    jobCity: 'Berlin',
    jobPostalCode: '18586',
    createdAt: '2025-07-10T14:33:10.131Z',
    paidAt: '2025-07-10T14:33:29.152Z',
    clearingPeriodEndsAt: '2025-07-24T14:33:28.650Z',
    paymentIntentId: 'Vorhanden'
};

const formattedOrder = formatOrderForChat(mockOrder);
console.log('Formatierter Auftrag für Chat:');
console.log(formattedOrder);

console.log('\n=== Test abgeschlossen ===');
console.log('Die KI kann jetzt Auftragsnummern erkennen und relevante Daten anzeigen!');
