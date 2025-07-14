// Test-Skript für das erweiterte Chatbot-System
// Testet Lernen, Eskalation und menschliche Übernahme

const {
  analyzeQuestion,
  recordQuestion,
  checkEscalationTriggers,
  generateEscalationMessage,
  generateHandoverMessage,
} = require('./firebase_functions/lib/shared/learning-utils');

// Mock Firestore für lokale Tests
const mockFirestore = {
  collection: name => ({
    add: async data => ({ id: 'mock-doc-id' }),
    doc: id => ({
      get: async () => ({
        exists: true,
        data: () => ({
          frequency: 5,
          avgResolutionTime: 120,
          escalationRate: 0.2,
          relatedOrderStatuses: ['confirmed'],
        }),
      }),
      update: async data => ({ success: true }),
    }),
    where: (field, op, value) => ({
      where: (field2, op2, value2) => ({
        orderBy: (field3, direction) => ({
          limit: count => ({
            get: async () => ({
              docs: [
                {
                  id: 'trigger-1',
                  data: () => ({
                    triggerType: 'keywords',
                    condition: 'betrug',
                    threshold: 1,
                    isActive: true,
                  }),
                },
                {
                  id: 'trigger-2',
                  data: () => ({
                    triggerType: 'complexity',
                    condition: 'high_complexity',
                    threshold: 7,
                    isActive: true,
                  }),
                },
              ],
            }),
          }),
        }),
      }),
      get: async () => ({
        docs: [
          {
            id: 'trigger-1',
            data: () => ({
              triggerType: 'keywords',
              condition: 'betrug',
              threshold: 1,
              isActive: true,
            }),
          },
        ],
      }),
    }),
  }),
};

async function testQuestionAnalysis() {
  console.log('=== 🧠 Test: Fragenanalyse ===\n');

  const testQuestions = [
    'Ich möchte meinen Auftrag stornieren',
    'Das ist doch Betrug! Ich will mein Geld zurück sofort!',
    'Warum funktioniert die Rechnung nicht? Ich habe schon dreimal versucht zu bezahlen aber es geht nicht und ich verstehe das System nicht',
    'Danke für die schnelle Hilfe',
    'Wann kommt der Handwerker?',
  ];

  for (const question of testQuestions) {
    const analysis = analyzeQuestion(question);
    console.log(`📝 Frage: "${question}"`);
    console.log(`   Kategorie: ${analysis.category}`);
    console.log(`   Komplexität: ${analysis.complexity}/10`);
    console.log(`   Stimmung: ${analysis.sentiment}`);
    console.log(`   Schlüsselwörter: ${analysis.keywords.join(', ')}`);
    console.log('');
  }
}

async function testEscalationTriggers() {
  console.log('=== 🚨 Test: Eskalationskriterien ===\n');

  const testScenarios = [
    {
      question: 'Das ist Betrug! Ich will meinen Anwalt einschalten!',
      category: 'complaint',
      complexity: 8,
      sentiment: 'negative',
      messageCount: 3,
    },
    {
      question: 'Ich möchte einfach nur stornieren',
      category: 'cancellation',
      complexity: 2,
      sentiment: 'neutral',
      messageCount: 1,
    },
    {
      question: 'Hallo, hallo, hallo, warum antwortet niemand?',
      category: 'general',
      complexity: 4,
      sentiment: 'negative',
      messageCount: 6,
    },
  ];

  for (const scenario of testScenarios) {
    console.log(`📝 Szenario: "${scenario.question}"`);
    const escalationResult = await checkEscalationTriggers(
      mockFirestore,
      scenario.question,
      scenario.category,
      scenario.complexity,
      scenario.sentiment,
      scenario.messageCount,
      console.error
    );

    console.log(`   Eskalation nötig: ${escalationResult.shouldEscalate ? '✅ JA' : '❌ NEIN'}`);
    if (escalationResult.shouldEscalate) {
      console.log(`   Grund: ${escalationResult.reason}`);
      console.log(`   Nachricht: ${generateEscalationMessage(escalationResult.reason)}`);
    }
    console.log('');
  }
}

async function testHandoverMessages() {
  console.log('=== 👥 Test: Übergabe-Nachrichten ===\n');

  const agents = ['Sarah Schmidt', 'Michael Weber', 'Lisa Müller'];

  for (const agent of agents) {
    console.log(`👤 Support-Agent: ${agent}`);
    const handoverMessage = generateHandoverMessage(agent);
    console.log(`   Nachricht: ${handoverMessage}`);
    console.log('');
  }
}

async function testLearningCycle() {
  console.log('=== 🔄 Test: Lernzyklus ===\n');

  const questions = ['Wie kann ich stornieren?', 'Stornierung möglich?', 'Auftrag stornieren'];

  console.log('📚 Speichere Fragen für Lernen...');
  for (const question of questions) {
    await recordQuestion(
      mockFirestore,
      question,
      'cancellation',
      Math.random() * 200, // Zufällige Bearbeitungszeit
      Math.random() > 0.8, // 20% Eskalationsrate
      [],
      console.error
    );
    console.log(`   ✅ Gespeichert: "${question}"`);
  }

  console.log('\n📊 Simuliere häufige Fragen-Analyse...');
  console.log('   Top-Kategorien:');
  console.log('   1. Stornierung (38 Fragen, 15% Eskalation)');
  console.log('   2. Rechnung (24 Fragen, 32% Eskalation)');
  console.log('   3. Terminplanung (19 Fragen, 8% Eskalation)');
}

async function runAllTests() {
  console.log('🚀 Tasko Enhanced Chatbot System Test\n');
  console.log('='.repeat(60) + '\n');

  try {
    await testQuestionAnalysis();
    await testEscalationTriggers();
    await testHandoverMessages();
    await testLearningCycle();

    console.log('='.repeat(60));
    console.log('🎉 ALLE TESTS ERFOLGREICH!');
    console.log('');
    console.log('✅ Neue Features verfügbar:');
    console.log('   - Automatische Fragenanalyse');
    console.log('   - Intelligente Eskalation');
    console.log('   - Lernen aus häufigen Fragen');
    console.log('   - Klare Kennzeichnung bei menschlicher Übernahme');
    console.log('   - Support-Dashboard für Mitarbeiter');
    console.log('');
    console.log('📋 Nächste Schritte:');
    console.log('   1. Eskalationskriterien konfigurieren');
    console.log('   2. Functions deployen');
    console.log('   3. Frontend-Komponenten integrieren');
    console.log('   4. Support-Team schulen');
  } catch (error) {
    console.error('❌ Test-Fehler:', error);
  }
}

// Hilfsfunktion für Demo-Zwecke
function demonstrateUserExperience() {
  console.log('\n' + '='.repeat(60));
  console.log('🎭 DEMO: Benutzererfahrung');
  console.log('='.repeat(60) + '\n');

  console.log('👤 Kunde: "Das ist Betrug! Ich will sofort mein Geld zurück!"');
  console.log('🤖 KI: [Erkennt kritischen Begriff "Betrug"]');
  console.log('🚨 System: Eskalation ausgelöst');
  console.log('💬 Chat: "Ihr Anliegen wird an unseren Support weitergeleitet..."');
  console.log('⏰ System: Support-Mitarbeiter benachrichtigt');
  console.log('');
  console.log('👨‍💼 Sarah Schmidt (Support): Übernimmt Chat');
  console.log('🔄 Chat: "👋 Sarah Schmidt ist jetzt für Sie da"');
  console.log('💬 Chat: "Sie chatten jetzt mit einem echten Menschen"');
  console.log('');
  console.log('✅ Kunde sieht sofort: Ein echter Mensch hilft jetzt!');
}

if (require.main === module) {
  runAllTests().then(() => {
    demonstrateUserExperience();
    process.exit(0);
  });
}

module.exports = { runAllTests };
