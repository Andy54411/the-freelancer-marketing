import 'package:flutter/material.dart';

class AIChatWidget extends StatefulWidget {
  final String title;
  final String subtitle;
  final Function(Map<String, dynamic>) onTaskGenerated;
  final Map<String, dynamic>? initialContext;

  const AIChatWidget({
    super.key,
    required this.title,
    required this.subtitle,
    required this.onTaskGenerated,
    this.initialContext,
  });

  @override
  State<AIChatWidget> createState() => _AIChatWidgetState();
}

class _AIChatWidgetState extends State<AIChatWidget> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isGenerating = false;
  String _currentStep = 'initial'; // initial, questions, generating
  final Map<String, dynamic> _collectedData = {};
  int _currentQuestionIndex = 0;
  
  final List<Map<String, String>> _questions = [
    {'key': 'location', 'question': 'Wo soll der Auftrag durchgeführt werden?'},
    {'key': 'timing', 'question': 'Wann benötigen Sie das? (z.B. nächste Woche, am Wochenende)'},
    {'key': 'budget', 'question': 'Was ist Ihr Budget für diesen Auftrag? (in EUR)'},
    {'key': 'urgency', 'question': 'Wie dringend ist es? (sofort, normal, flexibel)'},
    {'key': 'special', 'question': 'Gibt es besondere Anforderungen oder Wünsche?'},
  ];

  @override
  void initState() {
    super.initState();
    _addWelcomeMessage();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _addWelcomeMessage() {
    setState(() {
      _messages.add(ChatMessage(
        text: 'Hallo! Ich helfe Ihnen dabei, Ihren Auftrag zu erstellen. Beschreiben Sie mir einfach, was Sie benötigen.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    if (_inputController.text.trim().isEmpty || _isGenerating) return;

    final userMessage = _inputController.text.trim();
    setState(() {
      _messages.add(ChatMessage(
        text: userMessage,
        isUser: true,
        timestamp: DateTime.now(),
      ));
      _isGenerating = true;
    });

    _inputController.clear();
    _scrollToBottom();

    try {
      if (_currentStep == 'initial') {
        await _processInitialRequest(userMessage);
      } else if (_currentStep == 'questions') {
        await _processAnswer(userMessage);
      }
    } catch (e) {
      setState(() {
        _messages.add(ChatMessage(
          text: 'Entschuldigung, es gab einen Fehler. Können Sie es noch einmal versuchen?',
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
    } finally {
      setState(() => _isGenerating = false);
      _scrollToBottom();
    }
  }

  Future<void> _processInitialRequest(String request) async {
    // Simuliere KI-Verarbeitung der initialen Anfrage
    await Future.delayed(const Duration(seconds: 1));
    
    setState(() {
      _messages.add(ChatMessage(
        text: 'Perfekt! Lassen Sie mich einige Fragen stellen, um Ihren Auftrag optimal zu gestalten.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _currentStep = 'questions';
      _collectedData['initialDescription'] = request;
    });

    // Erste Frage stellen
    await _askNextQuestion();
  }

  Future<void> _processAnswer(String answer) async {
    // Speichere die Antwort zur aktuellen Frage
    if (_currentQuestionIndex > 0) {
      final currentQuestion = _questions[_currentQuestionIndex - 1];
      _collectedData[currentQuestion['key']!] = answer;
      
      debugPrint('💾 Gespeichert: ${currentQuestion['key']} = $answer');
    }
    
    // Stelle nächste Frage oder generiere Auftrag
    if (_currentQuestionIndex < _questions.length) {
      await _askNextQuestion();
    } else {
      await _generateFinalTask();
    }
  }

  Future<void> _askNextQuestion() async {
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (_currentQuestionIndex < _questions.length) {
      final question = _questions[_currentQuestionIndex];
      setState(() {
        _messages.add(ChatMessage(
          text: question['question']!,
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
      _currentQuestionIndex++;
      debugPrint('❓ Stelle Frage $_currentQuestionIndex: ${question['question']}');
    }
  }

  Future<void> _generateFinalTask() async {
    setState(() {
      _messages.add(ChatMessage(
        text: 'Perfekt! Ich erstelle jetzt Ihren optimierten Auftrag und ergänze fehlende Details...',
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _currentStep = 'generating';
    });

    await Future.delayed(const Duration(seconds: 2));

    debugPrint('🎯 Generiere Task mit gesammelten Daten: $_collectedData');

    // Intelligente KI-Verarbeitung der gesammelten Daten
    final taskData = _generateIntelligentTask();

    debugPrint('✅ Generierte Task-Daten: $taskData');

    final title = taskData['title'] as String;
    final location = taskData['location'] as String;
    final budget = taskData['budget'] as double;

    setState(() {
      _messages.add(ChatMessage(
        text: 'Großartig! Ihr Auftrag wurde erstellt:\n\n📝 Titel: $title\n📍 Ort: $location\n💰 Budget: €${budget.toStringAsFixed(0)}\n\nSie können ihn jetzt überprüfen und anpassen.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
    });

    // Übertrage die generierten Daten zurück
    widget.onTaskGenerated(taskData);
  }

  /// Intelligente Task-Generierung mit automatischer Vervollständigung fehlender Felder
  Map<String, dynamic> _generateIntelligentTask() {
    final serviceInfo = widget.initialContext ?? {};
    
    // Extrahiere und verarbeite die gesammelten Daten
    final title = _generateTitle(_collectedData['initialDescription'] ?? '', serviceInfo);
    final description = _generateEnhancedDescription(_collectedData, serviceInfo);
    final location = _enhanceLocation(_collectedData['location'] ?? 'Nicht angegeben');
    final budget = _extractBudget(_collectedData['budget'] ?? '100');
    final urgency = _normalizeUrgency(_collectedData['urgency'] ?? 'normal');
    final tags = _generateSmartTags(_collectedData, urgency);

    // Generiere Aufgabendaten basierend auf der echten Konversation
    return {
      'title': title,
      'description': description,
      'location': location,
      'budget': budget,
      'urgency': urgency,
      'tags': tags,
      'aiGenerated': true,
      'rawData': _collectedData, // Für Debugging
    };
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF14ad9f).withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome, color: Color(0xFF14ad9f), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        color: Color(0xFF14ad9f),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      widget.subtitle,
                      style: const TextStyle(
                        color: Color(0xFF14ad9f),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Chat-Bereich
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                // Nachrichten
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isGenerating ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isGenerating) {
                        return _buildTypingIndicator();
                      }
                      return _buildMessageBubble(_messages[index]);
                    },
                  ),
                ),
                
                // Input-Bereich
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      top: BorderSide(color: Colors.grey[200]!),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _inputController,
                          decoration: InputDecoration(
                            hintText: 'Ihre Antwort...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: BorderSide(color: Colors.grey[300]!),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: BorderSide(color: Colors.grey[300]!),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: const BorderSide(color: Color(0xFF14ad9f)),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          enabled: !_isGenerating && _currentStep != 'generating',
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: (!_isGenerating && _currentStep != 'generating') ? _sendMessage : null,
                        icon: const Icon(Icons.send),
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF14ad9f),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF14ad9f),
              child: const Icon(Icons.smart_toy, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: message.isUser ? const Color(0xFF14ad9f) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                message.text,
                style: TextStyle(
                  color: message.isUser ? Colors.white : Colors.black87,
                ),
              ),
            ),
          ),
          if (message.isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey[300],
              child: const Icon(Icons.person, color: Colors.grey, size: 16),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF14ad9f),
            child: const Icon(Icons.smart_toy, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
                  ),
                ),
                const SizedBox(width: 8),
                const Text('KI tippt...'),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  // Intelligente KI-Hilfsmethoden für automatische Vervollständigung
  String _generateEnhancedDescription(Map<String, dynamic> data, Map<String, dynamic> serviceInfo) {
    final initialDesc = data['initialDescription'] ?? '';
    final timing = data['timing'] ?? '';
    final special = data['special'] ?? '';
    
    // Erstelle eine strukturierte, professionelle Beschreibung
    List<String> sections = [initialDesc];
    
    if (timing.isNotEmpty && !initialDesc.toLowerCase().contains(timing.toLowerCase())) {
      sections.add('Zeitfenster: $timing');
    }
    
    if (special.isNotEmpty) {
      sections.add('Besondere Anforderungen: $special');
    }
    
    // Füge automatische Details hinzu basierend auf Service-Typ
    final serviceName = serviceInfo['displayName'] ?? serviceInfo['companyName'] ?? '';
    if (serviceName.toLowerCase().contains('koch') && !special.toLowerCase().contains('person')) {
      // Versuche Personenanzahl aus anderen Feldern zu extrahieren
      final personCount = _extractPersonCount(data);
      if (personCount > 0) {
        sections.add('Anzahl Personen: $personCount');
      }
    }
    
    return sections.join('\n\n');
  }

  String _enhanceLocation(String location) {
    if (location.isEmpty || location == 'Nicht angegeben') {
      return 'Beim Kunden vor Ort';
    }
    return location;
  }

  String _normalizeUrgency(String urgency) {
    final urgencyLower = urgency.toLowerCase();
    
    // Normalisiere verschiedene Urgency-Begriffe auf App-Standards
    if (urgencyLower.contains('dringend') || urgencyLower.contains('sofort') || urgencyLower.contains('urgent')) {
      return 'high';
    } else if (urgencyLower.contains('flexibel') || urgencyLower.contains('entspannt')) {
      return 'low';
    } else {
      return 'normal';
    }
  }

  List<String> _generateSmartTags(Map<String, dynamic> data, String urgency) {
    List<String> tags = ['KI-erstellt'];
    
    // Urgency-basierte Tags
    if (urgency == 'high') {
      tags.add('Dringend');
    }
    
    // Timing-basierte Tags
    final timing = data['timing']?.toString().toLowerCase() ?? '';
    if (timing.contains('morgen') || timing.contains('früh')) {
      tags.add('Morgens');
    } else if (timing.contains('abend')) {
      tags.add('Abends');
    } else if (timing.contains('wochenende')) {
      tags.add('Wochenende');
    }
    
    // Special requirements Tags
    final special = data['special']?.toString().toLowerCase() ?? '';
    if (special.isNotEmpty) {
      tags.add('Spezielle Anforderungen');
      if (special.contains('pünktlich')) {
        tags.add('Pünktlichkeit wichtig');
      }
    }
    
    // Service-spezifische Tags
    final initialDesc = data['initialDescription']?.toString().toLowerCase() ?? '';
    if (initialDesc.contains('person')) {
      tags.add('Mehrere Personen');
    }
    
    return tags;
  }

  int _extractPersonCount(Map<String, dynamic> data) {
    // Versuche Personenanzahl aus verschiedenen Feldern zu extrahieren
    final texts = [
      data['initialDescription'] ?? '',
      data['special'] ?? '',
      data['timing'] ?? '',
    ];
    
    for (final text in texts) {
      final match = RegExp(r'(\d+)\s*person', caseSensitive: false).firstMatch(text.toString());
      if (match != null) {
        return int.tryParse(match.group(1) ?? '0') ?? 0;
      }
    }
    
    return 0;
  }
  
  // Hilfsmethoden zur Datenverarbeitung
  String _generateTitle(String initialDescription, Map<String, dynamic> serviceInfo) {
    final serviceName = serviceInfo['displayName'] ?? serviceInfo['companyName'] ?? 'Service';
    final timing = _collectedData['timing'] ?? '';
    
    // Generiere einen aussagekräftigen, kurzen Titel
    String title = '';
    
    if (serviceName.contains('Mietkoch') || serviceName.toLowerCase().contains('koch')) {
      if (timing.isNotEmpty && timing.toLowerCase().contains('morgen')) {
        title = 'Mietkoch für morgen';
      } else {
        title = 'Mietkoch-Service';
      }
      
      // Füge Personenanzahl hinzu falls verfügbar
      final special = _collectedData['special'] ?? '';
      final personenMatch = RegExp(r'(\d+)\s*(personen|leute|gäste)', caseSensitive: false).firstMatch(special);
      if (personenMatch != null) {
        title += ' für ${personenMatch.group(1)} Personen';
      }
    } else {
      // Fallback für andere Services
      if (initialDescription.isNotEmpty) {
        final words = initialDescription.split(' ').take(4).join(' ');
        title = words.length > 25 ? '${words.substring(0, 25)}...' : words;
      } else {
        title = 'Auftrag für $serviceName';
      }
    }
    
    // Stelle sicher, dass der Titel nicht zu lang ist
    return title.length > 40 ? '${title.substring(0, 37)}...' : title;
  }
  
  double _extractBudget(String budgetText) {
    // Extrahiere Zahlen aus dem Text
    final regex = RegExp(r'\d+');
    final match = regex.firstMatch(budgetText);
    if (match != null) {
      return double.tryParse(match.group(0)!) ?? 100.0;
    }
    return 100.0;
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
  });
}
