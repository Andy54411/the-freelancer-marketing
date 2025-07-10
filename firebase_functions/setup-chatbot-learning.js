// Skript zum Konfigurieren der Standard-Eskalationskriterien
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json');

// Firebase initialisieren
const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: 'tilvo-f142f'
});

const db = getFirestore(app);

async function setupEscalationTriggers() {
    console.log('🔄 Konfiguriere Eskalationskriterien...');

    const triggers = [
        {
            triggerType: 'keywords',
            condition: 'rechtsanwalt',
            threshold: 1,
            isActive: true,
            description: 'Rechtliche Bedrohung'
        },
        {
            triggerType: 'keywords',
            condition: 'anzeige',
            threshold: 1,
            isActive: true,
            description: 'Rechtliche Bedrohung'
        },
        {
            triggerType: 'keywords',
            condition: 'unverschämtheit',
            threshold: 1,
            isActive: true,
            description: 'Starke Unzufriedenheit'
        },
        {
            triggerType: 'keywords',
            condition: 'betrug',
            threshold: 1,
            isActive: true,
            description: 'Betrugsvorwurf'
        },
        {
            triggerType: 'keywords',
            condition: 'skandal',
            threshold: 1,
            isActive: true,
            description: 'Starke Unzufriedenheit'
        },
        {
            triggerType: 'complexity',
            condition: 'high_complexity',
            threshold: 7,
            isActive: true,
            description: 'Hohe Komplexität der Anfrage'
        },
        {
            triggerType: 'repetition',
            condition: 'repeated_messages',
            threshold: 5,
            isActive: true,
            description: 'Kunde schreibt zu oft'
        },
        {
            triggerType: 'sentiment',
            condition: 'negative_sentiment',
            threshold: 1,
            isActive: false, // Zunächst deaktiviert
            description: 'Negative Stimmung erkannt'
        },
        {
            triggerType: 'keywords',
            condition: 'sofort',
            threshold: 1,
            isActive: true,
            description: 'Dringende Anfrage'
        },
        {
            triggerType: 'keywords',
            condition: 'notfall',
            threshold: 1,
            isActive: true,
            description: 'Notfall-Situation'
        }
    ];

    for (const trigger of triggers) {
        try {
            const docRef = await db.collection('escalation_triggers').add({
                ...trigger,
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Trigger erstellt: ${trigger.description} (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Fehler beim Erstellen von Trigger ${trigger.description}:`, error);
        }
    }
}

async function setupChatAnalytics() {
    console.log('🔄 Konfiguriere Chat-Analytics...');

    // Beispiel-Analytics für häufige Fragen
    const commonQuestions = [
        {
            question: 'wie kann ich stornieren',
            questionCategory: 'cancellation',
            frequency: 25,
            lastAsked: new Date().toISOString(),
            avgResolutionTime: 120, // Sekunden
            escalationRate: 0.2,
            commonAnswers: [
                'Stornierung ist bis 24h vor Termin möglich',
                'Status prüfen und Stornierungsrichtlinien befolgen'
            ],
            relatedOrderStatuses: ['zahlung_erhalten_clearing', 'confirmed'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            question: 'wo ist mein auftrag',
            questionCategory: 'tracking',
            frequency: 18,
            lastAsked: new Date().toISOString(),
            avgResolutionTime: 90,
            escalationRate: 0.1,
            commonAnswers: [
                'Auftragsstatus im Dashboard prüfen',
                'Auftragsnummer für weitere Informationen erforderlich'
            ],
            relatedOrderStatuses: ['in_progress', 'confirmed'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            question: 'rechnung problem',
            questionCategory: 'billing',
            frequency: 12,
            lastAsked: new Date().toISOString(),
            avgResolutionTime: 180,
            escalationRate: 0.4,
            commonAnswers: [
                'Rechnungsprobleme an Support weiterleiten',
                'Stripe-Zahlung prüfen und Transaktions-ID bereitstellen'
            ],
            relatedOrderStatuses: ['completed', 'zahlung_erhalten_clearing'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    for (const question of commonQuestions) {
        try {
            const docRef = await db.collection('chat_analytics').add(question);
            console.log(`✅ Analytics erstellt: ${question.question} (${docRef.id})`);
        } catch (error) {
            console.error(`❌ Fehler beim Erstellen von Analytics für ${question.question}:`, error);
        }
    }
}

async function main() {
    console.log('🚀 Initialisiere Chatbot-Lernsystem...');

    try {
        await setupEscalationTriggers();
        await setupChatAnalytics();

        console.log('\n✅ Chatbot-Lernsystem erfolgreich konfiguriert!');
        console.log('\n📊 Verfügbare Features:');
        console.log('- Automatische Eskalation bei kritischen Begriffen');
        console.log('- Tracking häufiger Fragen');
        console.log('- Komplexitätsanalyse');
        console.log('- Support-Dashboard für Mitarbeiter');
        console.log('- Klare Kennzeichnung bei menschlicher Übernahme');

    } catch (error) {
        console.error('❌ Fehler beim Konfigurieren:', error);
    }

    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { setupEscalationTriggers, setupChatAnalytics };
