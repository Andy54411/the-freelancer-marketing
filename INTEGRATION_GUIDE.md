# 🤖 Enhanced Chatbot Integration Guide

## 📋 Übersicht
Die erweiterte Tasko-KI ist jetzt live und bietet folgende Funktionen:
- **Automatisches Lernen** aus Kundenanfragen
- **Intelligente Eskalation** bei komplexen Problemen
- **Nahtlose Handover** zu Support-Mitarbeitern
- **Echtzeit-Dashboard** für das Support-Team

## 🚀 Live-APIs

### Chatbot API
```
POST https://europe-west1-tilvo-f142f.cloudfunctions.net/enhancedChatbot
```

### Support Dashboard API
```
GET https://europe-west1-tilvo-f142f.cloudfunctions.net/supportDashboard
```

## 🔧 Frontend-Integration

### 1. Chat-Widget Integration

```tsx
import { useChatbot } from '@/lib/enhanced-chatbot-api';

function ChatWidget({ customerId, customerName, customerEmail }) {
    const sessionId = `session-${customerId}-${Date.now()}`;
    const { sessionStatus, sendMessage, isLoading, isHumanActive, sessionType } = useChatbot(
        sessionId, 
        customerId, 
        customerName, 
        customerEmail
    );

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        // Nachricht zur UI hinzufügen
        setMessages(prev => [...prev, { sender: 'user', text: input }]);
        
        const result = await sendMessage(input);
        
        if (result.success) {
            if (result.shouldEscalate) {
                // Eskalations-Nachricht anzeigen
                setMessages(prev => [...prev, { 
                    sender: 'system', 
                    text: result.escalationMessage,
                    type: 'escalation' 
                }]);
            }
        }
        
        setInput('');
    };

    return (
        <div className="chat-widget">
            {/* Status-Banner */}
            {sessionType === 'human_takeover' && (
                <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-md mb-4">
                    👤 Sie chatten jetzt mit {sessionStatus?.supportAgentName} (Support-Team)
                </div>
            )}
            
            {sessionType === 'ai_with_escalation' && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-md mb-4">
                    ⏰ Ein Support-Mitarbeiter wird sich in Kürze bei Ihnen melden
                </div>
            )}

            {/* Chat-Nachrichten */}
            <div className="messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        <div className={`${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'} p-3 rounded-lg`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            {/* Eingabefeld */}
            <div className="input-area flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Nachricht eingeben..."
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                    {isLoading ? '...' : 'Senden'}
                </button>
            </div>
        </div>
    );
}
```

### 2. Support Dashboard Integration

```tsx
import { useSupportDashboard } from '@/lib/enhanced-chatbot-api';

function SupportDashboard() {
    const { dashboardData, isLoading, error, takeover, refresh } = useSupportDashboard();

    if (isLoading) return <div>Lädt Dashboard...</div>;
    if (error) return <div>Fehler: {error}</div>;

    return (
        <div className="support-dashboard p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Support Dashboard</h1>
                <button 
                    onClick={refresh}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                    Aktualisieren
                </button>
            </div>

            {/* Zusammenfassung */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Offene Eskalationen</h3>
                    <p className="text-3xl font-bold text-red-600">
                        {dashboardData?.summary?.totalEscalations || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Aktive Chats</h3>
                    <p className="text-3xl font-bold text-green-600">
                        {dashboardData?.summary?.totalActiveSessions || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Häufige Fragen</h3>
                    <p className="text-3xl font-bold text-blue-600">
                        {dashboardData?.frequentQuestions?.length || 0}
                    </p>
                </div>
            </div>

            {/* Eskalationen */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Offene Eskalationen</h2>
                </div>
                <div className="p-6">
                    {dashboardData?.escalations?.length > 0 ? (
                        <div className="space-y-4">
                            {dashboardData.escalations.map((escalation: any) => (
                                <div key={escalation.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold">{escalation.customerName}</h3>
                                            <p className="text-gray-600">{escalation.customerEmail}</p>
                                            <p className="text-sm text-gray-500">
                                                Grund: {escalation.reason}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Erstellt: {new Date(escalation.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => takeover(escalation.sessionId, 'agent-123', 'Sarah Schmidt')}
                                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                                        >
                                            Übernehmen
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Keine offenen Eskalationen</p>
                    )}
                </div>
            </div>

            {/* Häufige Fragen */}
            <div className="bg-white rounded-lg shadow mt-6">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">Häufige Fragen</h2>
                </div>
                <div className="p-6">
                    {dashboardData?.frequentQuestions?.length > 0 ? (
                        <div className="space-y-4">
                            {dashboardData.frequentQuestions.map((question: any) => (
                                <div key={question.id} className="border rounded-lg p-4">
                                    <h3 className="font-semibold">{question.question}</h3>
                                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                                        <span>Häufigkeit: {question.frequency}</span>
                                        <span>Kategorie: {question.questionCategory}</span>
                                        <span>Eskalationsrate: {(question.escalationRate * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Noch keine Daten verfügbar</p>
                    )}
                </div>
            </div>
        </div>
    );
}
```

## 📊 API-Verwendung

### Chat-Nachricht senden
```javascript
import { sendChatMessage } from '@/lib/enhanced-chatbot-api';

const result = await sendChatMessage(
    'session-123',
    'customer-456',
    'Hallo, ich habe ein Problem mit meiner Bestellung',
    'Max Mustermann',
    'max@example.com'
);

if (result.success) {
    if (result.shouldEscalate) {
        // Eskalation wurde ausgelöst
        console.log('Eskalation:', result.escalationMessage);
    }
}
```

### Session-Status abrufen
```javascript
import { getSessionStatus } from '@/lib/enhanced-chatbot-api';

const status = await getSessionStatus('session-123');
if (status.success) {
    console.log('Session-Typ:', status.sessionType);
    console.log('Support-Agent:', status.supportAgentName);
    console.log('Ist menschlich aktiv:', status.isHumanActive);
}
```

### Support-Agent übernimmt
```javascript
import { takeoverSession } from '@/lib/enhanced-chatbot-api';

const result = await takeoverSession('session-123', 'agent-456', 'Sarah Schmidt');
if (result.success) {
    console.log('Handover-Nachricht:', result.handoverMessage);
}
```

## 🎯 Eskalations-Trigger

Das System eskaliert automatisch bei:
- **Schlüsselwörtern**: "Problem", "Beschwerde", "Stornierung", "Fehler"
- **Negativer Stimmung**: Erkennung von Frustration oder Ärger
- **Hoher Komplexität**: Fragen mit vielen Details oder Unterfragen
- **Wiederholten Nachrichten**: Mehr als 3 Nachrichten ohne Lösung

## 🔄 Lernfunktion

Die KI lernt automatisch aus:
- Häufig gestellten Fragen
- Erfolgreichen Antworten
- Eskalationsmustern
- Kundenzufriedenheit

## 📈 Analytics

Das System trackt:
- **Fragenkategorien**: Automatische Kategorisierung
- **Antwortzeiten**: Durchschnittliche Bearbeitungszeit
- **Eskalationsraten**: Erfolg der KI-Antworten
- **Kundenzufriedenheit**: Bewertungen und Feedback

## 🛠️ Technische Details

### Firestore-Collections
- `chat_analytics`: Häufige Fragen und Kategorien
- `escalation_triggers`: Konfigurierbare Eskalationsbedingungen
- `support_sessions`: Aktive und historische Chat-Sessions
- `support_notifications`: Benachrichtigungen für Support-Team

### Umgebungsvariablen
```env
OPENAI_API_KEY=sk-...
FIREBASE_SERVICE_ACCOUNT_KEY=...
```

## 🚀 Nächste Schritte

1. **Index-Erstellung abwarten** (bereits in Arbeit)
2. **Frontend-Komponenten integrieren** (Chat-Widget & Dashboard)
3. **Support-Team schulen** (Neue Dashboard-Funktionen)
4. **Monitoring einrichten** (Erfolgsmessung)

## 📞 Support

Bei Fragen zur Integration wenden Sie sich an das Entwicklerteam.
