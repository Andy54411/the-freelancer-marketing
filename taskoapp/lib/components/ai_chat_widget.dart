import 'package:flutter/material.dart';
import '../screens/services/ai_learning_service.dart';
import '../services/categories_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

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
  String _currentStep = 'initial'; // initial, conversation, generating
  final Map<String, dynamic> _collectedData = {};
  final Set<String> _askedTopics = {}; // Verhindert doppelte Fragen
  String? _conversationId; // Für AI Learning
  Map<String, dynamic> _intelligentRules = {}; // Gelernte Regeln
  double? _providerHourlyRate; // Stundensatz des Anbieters
  
  // Dynamische KI-Analyse: Was fehlt noch für einen vollständigen Auftrag?
  final Map<String, bool> _requiredInfo = {
    'description': false,
    'category': false, // Hauptkategorie
    'subcategory': false, // Unterkategorie/Service
    'location': false,
    'timing': false,
    'specificTime': false, // Neue Kategorie für spezifische Uhrzeiten
    'startTime': false, // Von-Zeit
    'endTime': false, // Bis-Zeit
    'budget': false,
    'urgency': false,
    'bookingType': false, // Festbuchung vs. Angebot
  };

  @override
  void initState() {
    super.initState();
    debugPrint('🚀 === AI CHAT WIDGET INITIALISIERT ===');
    
    // Generiere Konversations-ID für AI Learning
    _conversationId = DateTime.now().millisecondsSinceEpoch.toString();
    
    // Extrahiere bereits bekannte Informationen aus initialContext
    _extractInitialContext();
    
    // Initialisiere AI Learning Collections
    _initializeAICollections();
    
    // Lade intelligente Regeln asynchron
    _loadIntelligentRules();
    
    // Lade Anbieter-Stundensatz (falls nicht bereits aus Context verfügbar)
    _loadProviderHourlyRate();
    
    // Verzögere die Willkommensnachricht um sicherzustellen, dass das Widget gerendert ist
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _addWelcomeMessage();
    });
  }

  /// Initialisiert die AI Learning Collections in Firebase
  Future<void> _initializeAICollections() async {
    try {
      debugPrint('🚀 Initialisiere AI Learning Collections...');
      await AILearningService.initializeCollections();
      debugPrint('✅ AI Learning Collections initialisiert');
    } catch (e) {
      debugPrint('⚠️ AI Collections Initialisierung fehlgeschlagen: $e');
    }
  }

  /// Lädt gelernte KI-Regeln für bessere Informationsextraktion
  Future<void> _loadIntelligentRules() async {
    try {
      final serviceType = widget.initialContext?['category'] ?? 'general';
      debugPrint('🧠 Lade intelligente Regeln für Service-Typ: $serviceType');
      
      _intelligentRules = await AILearningService.getIntelligentExtractionRules(serviceType);
      
      debugPrint('✅ Intelligente Regeln geladen: ${_intelligentRules.keys}');
    } catch (e) {
      debugPrint('⚠️ Fallback: Verwende Standard-Regeln - $e');
      _intelligentRules = {};
    }
  }

  /// Lädt den Stundensatz des Anbieters für genaue Preisberechnung
  Future<void> _loadProviderHourlyRate() async {
    try {
      final providerId = widget.initialContext?['id'] ?? widget.initialContext?['providerId'];
      if (providerId == null) {
        debugPrint('⚠️ Keine Provider-ID verfügbar für Stundensatz-Abfrage');
        return;
      }

      debugPrint('💰 === LADE ANBIETER-STUNDENSATZ ===');
      debugPrint('🔍 Provider ID: $providerId');

      // Versuche zuerst companies Collection
      final companyDoc = await FirebaseFirestore.instance
          .collection('companies')
          .doc(providerId)
          .get();

      if (companyDoc.exists) {
        final companyData = companyDoc.data() as Map<String, dynamic>;
        _providerHourlyRate = (companyData['hourlyRate'] as num?)?.toDouble();
        debugPrint('💰 Stundensatz aus companies: €$_providerHourlyRate/h');
      } else {
        // Fallback auf users Collection
        final userDoc = await FirebaseFirestore.instance
            .collection('users')
            .doc(providerId)
            .get();

        if (userDoc.exists) {
          final userData = userDoc.data() as Map<String, dynamic>;
          _providerHourlyRate = (userData['hourlyRate'] as num?)?.toDouble();
          debugPrint('💰 Stundensatz aus users: €$_providerHourlyRate/h');
        }
      }

      if (_providerHourlyRate == null) {
        debugPrint('⚠️ Kein Stundensatz gefunden - verwende Fallback');
        _providerHourlyRate = 50.0; // Fallback-Stundensatz
      }

      debugPrint('✅ Finaler Stundensatz: €$_providerHourlyRate/h');
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Stundensatzes: $e');
      _providerHourlyRate = 50.0; // Fallback
    }
  }

  /// Extrahiert bereits bekannte Informationen aus dem initialContext
  void _extractInitialContext() {
    if (widget.initialContext == null) return;
    
    final context = widget.initialContext!;
    debugPrint('🎯 === EXTRAHIERE INITIAL CONTEXT ===');
    debugPrint('📋 Verfügbare Context-Keys: ${context.keys.toList()}');
    
    // 1. KATEGORIE & UNTERKATEGORIE
    final subcategory = context['selectedSubcategory'] as String?;
    if (subcategory != null) {
      _collectedData['subcategory'] = subcategory;
      _requiredInfo['subcategory'] = true;
      debugPrint('✅ Unterkategorie erkannt: $subcategory');
      
      // Finde die Hauptkategorie basierend auf der Unterkategorie
      final category = _findMainCategory(subcategory);
      if (category != null) {
        _collectedData['category'] = category;
        _requiredInfo['category'] = true;
        debugPrint('✅ Hauptkategorie ermittelt: $category');
      }
    }
    
    // 2. PROVIDER INFORMATIONEN
    final providerId = context['id'] ?? context['providerId'];
    if (providerId != null) {
      _collectedData['providerId'] = providerId;
      debugPrint('✅ Provider-ID: $providerId');
    }
    
    final providerName = context['providerName'] ?? context['companyName'] ?? context['displayName'];
    if (providerName != null) {
      _collectedData['providerName'] = providerName;
      debugPrint('✅ Provider-Name: $providerName');
    }
    
    // 3. STUNDENSATZ (falls bereits im Context verfügbar)
    final hourlyRate = context['hourlyRate'];
    if (hourlyRate != null) {
      _providerHourlyRate = double.tryParse(hourlyRate.toString());
      debugPrint('✅ Stundensatz aus Context: €$_providerHourlyRate/h');
    }
    
    // 4. WEITERE NÜTZLICHE INFORMATIONEN
    final description = context['description'] ?? context['about'] ?? context['companyDescription'];
    if (description != null && description.toString().isNotEmpty) {
      _collectedData['providerDescription'] = description;
      debugPrint('✅ Provider-Beschreibung verfügbar');
    }
    
    debugPrint('🎯 Context-Extraktion abgeschlossen. Bereits verfügbar: ${_collectedData.keys.toList()}');
  }

  /// Findet die Hauptkategorie basierend auf der Unterkategorie
  String? _findMainCategory(String subcategory) {
    // Importiere das CategoriesService-Mapping
    const categories = {
      'Handwerk': [
        'Elektroinstallation', 'Heizungstechnik', 'Klempnerei', 'Malerei', 'Tischlerei',
        'Fliesenleger', 'Dachdecker', 'Gerüstbau', 'Winterdienst'
      ],
      'Reinigung': [
        'Haushaltsreinigung', 'Gebäudereinigung', 'Fensterreinigung', 'Teppichreinigung'
      ],
      'Transport': [
        'Umzugsservice', 'Kurierservice', 'Lieferservice', 'Expressdienst'
      ],
      'Technologie': [
        'Webentwicklung', 'App-Entwicklung', 'IT-Support', 'Systemadministration',
        'Cybersecurity', 'Softwareentwicklung', 'Datenanalyse', 'Cloud Services', 'Netzwerktechnik'
      ],
      'Garten': [
        'Gartenpflege', 'Landschaftsgärtner', 'Rasenpflege', 'Heckenschnitt',
        'Baumpflege', 'Gartenplanung', 'Bewässerungsanlagen'
      ],
      'Wellness': [
        'Massage', 'Physiotherapie', 'Ernährungsberatung', 'Kosmetik',
        'Friseur', 'FitnessTraining', 'Seniorenbetreuung'
      ],
      'Hotel & Gastronomie': [
        'Mietkoch', 'Mietkellner', 'Catering'
      ],
      'Marketing & Vertrieb': [
        'OnlineMarketing', 'Social Media Marketing', 'ContentMarketing',
        'Marketingberater', 'Marktforschung'
      ],
      'Finanzen & Recht': [
        'Buchhaltung', 'Steuerberatung', 'Rechtsberatung', 'Finanzberatung',
        'Versicherungsberatung', 'Rechnungswesen', 'Unternehmensberatung', 'Verwaltung'
      ],
      'Bildung & Unterstützung': [
        'Nachhilfe', 'Nachhilfelehrer', 'Sprachunterricht', 'Musikunterricht',
        'Übersetzer', 'Kinderbetreuung'
      ],
      'Tiere & Pflanzen': [
        'Tierbetreuung', 'Hundetrainer', 'TierarztAssistenz', 'Tierpflege'
      ],
      'Kreativ & Kunst': [
        'Fotograf', 'Videograf', 'Grafiker', 'Musiker', 'Texter', 'Dekoration'
      ],
      'Event & Veranstaltung': [
        'Eventplanung', 'Sicherheitsdienst', 'DJService', 'Musiker'
      ],
      'Büro & Administration': [
        'Telefonservice', 'Inventur', 'Recherche'
      ],
    };
    
    for (final entry in categories.entries) {
      if (entry.value.contains(subcategory)) {
        return entry.key;
      }
    }
    return null;
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _addWelcomeMessage() {
    debugPrint('🎉 === WILLKOMMENSNACHRICHT HINZUFÜGEN ===');
    
    final serviceName = widget.initialContext?['displayName'] ?? 'Service';
    final providerName = _collectedData['providerName'];
    final subcategory = _collectedData['subcategory'];
    final category = _collectedData['category'];
    
    debugPrint('🔧 Service Name: $serviceName');
    debugPrint('🏢 Provider Name: $providerName');
    debugPrint('📂 Kategorie: $category > $subcategory');
    
    // Erstelle personalisierte Willkommensnachricht basierend auf bereits bekannten Informationen
    String welcomeText = 'Hallo! 👋 Ich bin Ihr KI-Assistent';
    
    if (providerName != null) {
      welcomeText += ' für $providerName';
    }
    
    if (subcategory != null) {
      welcomeText += ' ($subcategory-Service)';
    }
    
    welcomeText += '.\n\n';
    
    // Bereits bekannte Informationen anzeigen
    if (_collectedData.isNotEmpty) {
      welcomeText += 'Ich habe bereits folgende Informationen:\n';
      
      if (subcategory != null && category != null) {
        welcomeText += '• Service: $category > $subcategory\n';
      }
      
      if (providerName != null) {
        welcomeText += '• Anbieter: $providerName\n';
      }
      
      if (_providerHourlyRate != null) {
        welcomeText += '• Stundensatz: €$_providerHourlyRate/h\n';
      }
      
      welcomeText += '\n';
    }
    
    welcomeText += 'Beschreiben Sie mir einfach Ihren Auftrag und ich helfe Ihnen dabei, alle weiteren Details zu optimieren! 🚀';
    
    debugPrint('💬 Welcome Text: "$welcomeText"');
    
    setState(() {
      _messages.add(ChatMessage(
        text: welcomeText,
        isUser: false,
        timestamp: DateTime.now(),
      ));
    });
    
    debugPrint('✅ Willkommensnachricht hinzugefügt. Messages count: ${_messages.length}');
    
    // Scroll nach dem Hinzufügen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
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
    debugPrint('📤 === NACHRICHT SENDEN ===');
    debugPrint('💬 User Message: "$userMessage"');
    debugPrint('🔄 Current Step: $_currentStep');
    debugPrint('📊 Benötigte Info Status: $_requiredInfo');
    debugPrint('📋 Collected Data bisher: $_collectedData');
    
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
        debugPrint('🚀 Verarbeite erste Eingabe...');
        await _processInitialRequest(userMessage);
      } else if (_currentStep == 'conversation') {
        debugPrint('💬 Verarbeite Konversation...');
        await _processConversation(userMessage);
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Verarbeiten der Nachricht: $e');
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
    debugPrint('🚀 === ERSTE EINGABE VERARBEITUNG STARTET ===');
    debugPrint('📝 User Input (Erste Eingabe): "$request"');
    debugPrint('📋 Service Context: ${widget.initialContext?['displayName'] ?? 'Unbekannt'}');
    
    // Speichere die initiale Beschreibung
    _collectedData['initialDescription'] = request;
    
    // Analysiere was bereits gegeben wurde
    _analyzeAndExtractInformation(request);
    
    // Simuliere KI-Verarbeitung
    await Future.delayed(const Duration(seconds: 1));
    
    // Intelligente Antwort basierend auf dem was erkannt wurde
    final response = _generateIntelligentResponse();
    
    setState(() {
      _messages.add(ChatMessage(
        text: response,
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _currentStep = 'conversation';
    });

    debugPrint('✅ Erste Eingabe verarbeitet. Wechsle zu Konversations-Modus');
    debugPrint('📊 Aktueller Status: $_requiredInfo');

    // Prüfe ob bereits alles vorhanden ist oder stelle intelligente Frage
    await _continueConversation();
  }

  /// Analysiert und extrahiert Informationen aus jedem User-Input
  void _analyzeAndExtractInformation(String text) {
    debugPrint('🧠 === INTELLIGENTE ANALYSE ===');
    debugPrint('📝 Eingabe: "$text"');
    final lowerText = text.toLowerCase();
    
    // Beschreibung ist immer vorhanden, wenn Text eingegeben wurde
    if (text.trim().isNotEmpty) {
      _requiredInfo['description'] = true;
      debugPrint('✅ Beschreibung erkannt');
    }

    // Kategorie und Unterkategorie-Erkennung
    _detectCategoryAndSubcategory(text);
    
    // Ort-Erkennung (erweitert und robuster)
    final locationKeywords = ['sellin', 'berlin', 'hamburg', 'münchen', 'köln', 'bei mir', 'zu hause', 'zuhause', 'siedlung', 'straße', 'plz'];
    bool locationFound = false;
    
    for (final keyword in locationKeywords) {
      if (lowerText.contains(keyword)) {
        final extractedLocation = _extractLocationFromText(text);
        _collectedData['location'] = extractedLocation;
        
        // Spezielle Behandlung für "bei mir" Varianten
        if (lowerText.contains('bei mir') || lowerText.contains('zu hause') || lowerText.contains('zuhause')) {
          _requiredInfo['location'] = true; // Markiere als vorhanden für Chat-Flow
          debugPrint('📍 "Bei mir" Variante erkannt - lade SOFORT echte Adresse...');
          // Lade SOFORT die echte Adresse (synchron)
          _fetchUserAddressAsync();
        } else {
          _requiredInfo['location'] = true;
          debugPrint('📍 Spezifischer Ort erkannt: ${_collectedData['location']}');
        }
        locationFound = true;
        break;
      }
    }
    
    // Debug-Output für Ort-Erkennung
    if (!locationFound) {
      debugPrint('📍 Kein Ort-Keyword gefunden in: "$lowerText"');
      debugPrint('📍 Suchte nach: $locationKeywords');
    }
    
    // Zeit-Erkennung (erweitert für Datum vs. Uhrzeit)
    final timeKeywords = ['morgen', 'heute', 'übermorgen', 'nächste woche', 'am wochenende', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
    bool hasTimeKeyword = false;
    for (final keyword in timeKeywords) {
      if (lowerText.contains(keyword)) {
        hasTimeKeyword = true;
        break;
      }
    }
    
    // IMMER die erweiterte Zeit-Extraktion aufrufen wenn Zeit-bezogene Inhalte vorhanden sind
    final timePattern = RegExp(r'(\d{1,2})[:\.]?(\d{0,2})\s*(?:uhr|bis|von)?', caseSensitive: false);
    if (hasTimeKeyword || timePattern.hasMatch(text)) {
      final extractedTiming = _extractTimingFromText(text);
      if (extractedTiming.isNotEmpty) {
        _collectedData['timing'] = extractedTiming;
        _requiredInfo['timing'] = true;
        debugPrint('⏰ Erweiterte Zeit-Extraktion: $extractedTiming');
      }
    }
    
    // Fallback: Spezifische Uhrzeit-Erkennung (nur wenn noch keine Zeit erkannt)
    if (!_requiredInfo['timing']!) {
      final simpleTimePattern = RegExp(r'(\d{1,2}):(\d{2})(?:\s*uhr)?', caseSensitive: false);
      final timeMatch = simpleTimePattern.firstMatch(text);
      if (timeMatch != null) {
        final hour = int.tryParse(timeMatch.group(1)!) ?? 0;
        final minute = int.tryParse(timeMatch.group(2)!) ?? 0;
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          final formattedTime = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} Uhr';
          _collectedData['timing'] = formattedTime;
          _requiredInfo['timing'] = true;
          _requiredInfo['specificTime'] = true;
          debugPrint('🕐 Fallback Uhrzeit erkannt: $formattedTime');
        }
      }
    }
    
    // Falls nur Datum aber keine Uhrzeit vorhanden ist, merke das
    if (_requiredInfo['timing']! && !_requiredInfo['specificTime']!) {
      debugPrint('⏰ Nur Datum vorhanden, Uhrzeit fehlt noch');
    }
    
    // Budget-Erkennung (VERBESSERT - erkennt auch nur Zahlen)
    // Erst prüfen ob es Euro/€ explizit gibt
    var budgetMatch = RegExp(r'(\d+)\s*(euro|€|eur)', caseSensitive: false).firstMatch(text);
    if (budgetMatch != null) {
      _collectedData['budget'] = budgetMatch.group(1)!;
      _requiredInfo['budget'] = true;
      debugPrint('💰 Budget mit Währung erkannt: ${_collectedData['budget']} EUR');
    } else {
      // Wenn keine Währung, prüfe ob es eine reine Zahl ist (und der Kontext Budget-Frage war)
      final numberMatch = RegExp(r'^\s*(\d+)\s*$').firstMatch(text.trim());
      if (numberMatch != null && _askedTopics.contains('budget')) {
        _collectedData['budget'] = numberMatch.group(1)!;
        _requiredInfo['budget'] = true;
        debugPrint('💰 Budget als Zahl erkannt: ${_collectedData['budget']} EUR');
      }
      // Auch nach Zahlen im längeren Text suchen, wenn Budget-Kontext
      else if (_askedTopics.contains('budget')) {
        final anyNumberMatch = RegExp(r'(\d+)').firstMatch(text);
        if (anyNumberMatch != null) {
          _collectedData['budget'] = anyNumberMatch.group(1)!;
          _requiredInfo['budget'] = true;
          debugPrint('💰 Budget aus Text extrahiert: ${_collectedData['budget']} EUR');
        }
      }
    }
    
    // Dringlichkeit-Erkennung (flexibel)
    final urgencyKeywords = ['dringend', 'sofort', 'schnell', 'eilig', 'asap', 'heute noch'];
    for (final keyword in urgencyKeywords) {
      if (lowerText.contains(keyword)) {
        _collectedData['urgency'] = 'hoch';
        _requiredInfo['urgency'] = true;
        debugPrint('⚡ Hohe Dringlichkeit erkannt');
        break;
      }
    }
    final normalKeywords = ['normal', 'zeit', 'flexibel', 'entspannt'];
    for (final keyword in normalKeywords) {
      if (lowerText.contains(keyword)) {
        _collectedData['urgency'] = 'normal';
        _requiredInfo['urgency'] = true;
        debugPrint('⚡ Normale Dringlichkeit erkannt');
        break;
      }
    }
    
    debugPrint('📊 Status nach Analyse: $_requiredInfo');
    debugPrint('💾 Gesammelte Daten: $_collectedData');
  }

  /// Erkennt Kategorie und Unterkategorie aus dem Text
  void _detectCategoryAndSubcategory(String text) {
    final lowerText = text.toLowerCase();
    
    // Suche nach Unterkategorien (Services)
    final allSubcategories = CategoriesService.getAllSubcategories();
    String? detectedSubcategory;
    String? detectedCategory;
    
    // Direkte Übereinstimmung mit Unterkategorien
    for (final subcategory in allSubcategories) {
      final subcategoryLower = subcategory.toLowerCase();
      if (lowerText.contains(subcategoryLower) || 
          _checkSimilarTerms(lowerText, subcategoryLower)) {
        detectedSubcategory = subcategory;
        detectedCategory = CategoriesService.findCategoryBySubcategory(subcategory);
        break;
      }
    }
    
    // Fallback: Suche nach Hauptkategorien
    if (detectedCategory == null) {
      final categories = CategoriesService.getCategoryNames();
      for (final category in categories) {
        final categoryLower = category.toLowerCase();
        if (lowerText.contains(categoryLower) || 
            _checkSimilarTerms(lowerText, categoryLower)) {
          detectedCategory = category;
          // Setze erste Unterkategorie als Default
          final subcategories = CategoriesService.getSubcategories(category);
          if (subcategories.isNotEmpty) {
            detectedSubcategory = subcategories.first;
          }
          break;
        }
      }
    }
    
    // Spezielle Service-Keywords für bessere Erkennung
    final Map<String, String> serviceKeywords = {
      'koch': 'Mietkoch',
      'mietkoch': 'Mietkoch',
      'kochen': 'Mietkoch',
      'kellner': 'Mietkellner', 
      'bedienung': 'Mietkellner',
      'putzen': 'Reinigungskraft',
      'reinigung': 'Reinigungskraft',
      'sauber': 'Reinigungskraft',
      'reparatur': 'Autoreparatur',
      'reparieren': 'Montageservice',
      'montage': 'Montageservice',
      'umzug': 'Umzugshelfer',
      'transport': 'Transportdienstleistungen',
      'garten': 'Gartenpflege',
      'rasen': 'Rasenpflege',
      'website': 'Webentwicklung',
      'app': 'App-Entwicklung',
      'programmierung': 'Softwareentwicklung',
      'steuer': 'Steuerberatung',
      'buchhaltung': 'Buchhaltung',
      'massage': 'Massage',
      'foto': 'Fotograf',
      'bilder': 'Fotograf',
    };
    
    for (final keyword in serviceKeywords.keys) {
      if (lowerText.contains(keyword)) {
        detectedSubcategory = serviceKeywords[keyword]!;
        detectedCategory = CategoriesService.findCategoryBySubcategory(detectedSubcategory);
        break;
      }
    }
    
    // Speichere erkannte Informationen
    if (detectedCategory != null) {
      _collectedData['category'] = detectedCategory;
      _requiredInfo['category'] = true;
      debugPrint('📂 Kategorie erkannt: $detectedCategory');
    }
    
    if (detectedSubcategory != null) {
      _collectedData['subcategory'] = detectedSubcategory;
      _requiredInfo['subcategory'] = true;
      debugPrint('🎯 Service/Unterkategorie erkannt: $detectedSubcategory');
      
      // Lade Stundensatz für den erkannten Service
      _loadProviderHourlyRate();
    }
  }
  
  /// Überprüft ähnliche Begriffe für bessere Kategorisierung
  bool _checkSimilarTerms(String text, String target) {
    // Einfache Ähnlichkeitsprüfung
    if (target.length < 4) return false;
    
    final targetWords = target.split(' ');
    for (final word in targetWords) {
      if (word.length >= 4 && text.contains(word.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /// Extrahiert Ort aus Text und holt echte Adresse für "bei mir"
  String _extractLocationFromText(String text) {
    final lowerText = text.toLowerCase();
    
    // Spezialbehandlung für "bei mir" - gib temporären Text zurück
    if (lowerText.contains('bei mir') || lowerText.contains('zu hause') || lowerText.contains('zuhause')) {
      debugPrint('📍 "Bei mir" erkannt - gebe temporären Text zurück');
      return 'Bei mir (Adresse wird geladen...)';
    }
    
    // Versuche spezifische Ort-Patterns zu extrahieren
    final locationPatterns = [
      RegExp(r'(sellin[^,.\n]*)', caseSensitive: false),
      RegExp(r'(siedlung[^,.\n]*)', caseSensitive: false),
      RegExp(r'(\d{5}\s+\w+)', caseSensitive: false), // PLZ + Stadt
      RegExp(r'([a-zA-ZäöüÄÖÜß]+straße\s*\d*)', caseSensitive: false), // Straßenname
      RegExp(r'([a-zA-ZäöüÄÖÜß]+\s+\d+[a-zA-Z]?)', caseSensitive: false), // Straße + Hausnummer
    ];
    
    for (final pattern in locationPatterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        final location = match.group(1)?.trim() ?? '';
        debugPrint('📍 Spezifische Adresse erkannt: "$location"');
        return location;
      }
    }
    
    debugPrint('📍 Fallback: Ganzer Text als Ort: "$text"');
    return text.trim();
  }

  /// Holt die echte Benutzeradresse asynchron und aktualisiert UI
  /// WICHTIG: Darf nie location auf false setzen wenn bereits "bei mir" akzeptiert wurde
  Future<void> _fetchUserAddressAsync() async {
    try {
      debugPrint('🏠 === LADE BENUTZERADRESSE ASYNCHRON ===');
      
      // KRITISCH: Wenn location bereits als true markiert ist (durch "bei mir"), 
      // dürfen wir es NIEMALS auf false zurücksetzen
      if (_requiredInfo['location'] == true) {
        debugPrint('✅ Location bereits als vollständig markiert - erweitere nur die Adresse');
      }
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        debugPrint('❌ Kein angemeldeter Benutzer');
        // NUR setzen wenn location noch nicht akzeptiert wurde
        if (_requiredInfo['location'] != true) {
          setState(() {
            _collectedData['location'] = 'Bitte geben Sie Ihre Adresse an';
            _requiredInfo['location'] = false;
          });
        }
        return;
      }

      debugPrint('👤 Lade Daten für Benutzer: ${user.uid}');
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      debugPrint('📄 Dokument erhalten. Existiert: ${userDoc.exists}');

      if (userDoc.exists) {
        final userData = userDoc.data() as Map<String, dynamic>;
        debugPrint('📋 Benutzerdaten: $userData');
        
        // Baue vollständige Adresse zusammen - Prüfe alle möglichen Adressfelder
        final addressParts = <String>[];
        
        // 1. Versuche Profil-Adresse (neue Struktur)
        final profile = userData['profile'] as Map<String, dynamic>?;
        String? street = profile?['street']?.toString();
        String? postalCode = profile?['postalCode']?.toString();
        String? city = profile?['city']?.toString();
        
        // 2. Fallback auf direkte Felder
        street ??= userData['street']?.toString();
        street ??= userData['personalStreet']?.toString();
        street ??= userData['companyStreet']?.toString();
        
        postalCode ??= userData['zipCode']?.toString();
        postalCode ??= userData['postalCode']?.toString();
        postalCode ??= userData['personalPostalCode']?.toString();
        postalCode ??= userData['companyPostalCode']?.toString();
        
        city ??= userData['city']?.toString();
        city ??= userData['personalCity']?.toString();
        city ??= userData['companyCity']?.toString();
        
        if (street != null && street.isNotEmpty) {
          String streetLine = street;
          // Versuche Hausnummer zu finden
          final houseNumber = userData['houseNumber']?.toString() ?? 
                             userData['personalHouseNumber']?.toString() ??
                             profile?['houseNumber']?.toString();
          if (houseNumber != null && houseNumber.isNotEmpty) {
            streetLine += ' $houseNumber';
          }
          addressParts.add(streetLine);
          debugPrint('🛣️ Straße hinzugefügt: $streetLine');
        } else {
          debugPrint('⚠️ Keine Straße in verfügbaren Feldern gefunden');
        }
        
        if (postalCode != null && postalCode.isNotEmpty) {
          String cityLine = postalCode;
          if (city != null && city.isNotEmpty) {
            cityLine += ' $city';
          }
          addressParts.add(cityLine);
          debugPrint('🏙️ Stadt hinzugefügt: $cityLine');
        } else {
          debugPrint('⚠️ Keine PLZ in verfügbaren Feldern gefunden');
        }
        
        debugPrint('📍 Adressteile gesammelt: $addressParts');
        
        if (addressParts.isNotEmpty) {
          final fullAddress = addressParts.join(', ');
          debugPrint('✅ Vollständige Adresse geladen: "$fullAddress"');
          
          // Aktualisiere die Location in den gesammelten Daten UND bestätige als vollständig
          setState(() {
            _collectedData['location'] = fullAddress;
            _requiredInfo['location'] = true; // Bestätige als vollständig!
          });
          
          debugPrint('📍 Location aktualisiert: ${_collectedData['location']}');
          debugPrint('✅ Location als vollständig bestätigt');
          
          // Zeige KURZE Bestätigung in der UI (nur wenn nicht schon eine ähnliche Nachricht da ist)
          final lastMessage = _messages.isNotEmpty ? _messages.last.text : '';
          if (!lastMessage.contains('Adresse wurde automatisch geladen') && !lastMessage.contains('Adresse geladen')) {
            setState(() {
              _messages.add(ChatMessage(
                text: 'Perfekt! Adresse geladen: $fullAddress 🏠',
                isUser: false,
                timestamp: DateTime.now(),
              ));
            });
            _scrollToBottom();
          }
          
        } else {
          debugPrint('⚠️ Keine vollständige Adresse in Benutzerdaten gefunden');
          // KRITISCH: Nur zurücksetzen wenn location noch nicht durch "bei mir" akzeptiert wurde
          if (_requiredInfo['location'] != true) {
            setState(() {
              _collectedData['location'] = 'Adresse unvollständig - bitte ergänzen';
              _requiredInfo['location'] = false; // Bleibt unvollständig
            });
            
            // Informiere den Benutzer NUR wenn nicht bereits eine Fehlermeldung da ist
            final lastMessage = _messages.isNotEmpty ? _messages.last.text : '';
            if (!lastMessage.contains('Adresse ist leider unvollständig')) {
              setState(() {
                _messages.add(ChatMessage(
                  text: 'Ihre Adresse ist unvollständig. Bitte geben Sie Ihre vollständige Adresse an. 📍',
                  isUser: false,
                  timestamp: DateTime.now(),
                ));
              });
              _scrollToBottom();
            }
          } else {
            debugPrint('✅ Location bereits durch "bei mir" akzeptiert - keine Änderung');
          }
        }
      } else {
        debugPrint('❌ Benutzer-Dokument nicht gefunden für UID: ${user.uid}');
        // NUR zurücksetzen wenn location noch nicht durch "bei mir" akzeptiert wurde
        if (_requiredInfo['location'] != true) {
          setState(() {
            _collectedData['location'] = 'Bitte geben Sie Ihre Adresse an';
            _requiredInfo['location'] = false;
          });
        } else {
          debugPrint('✅ Location bereits durch "bei mir" akzeptiert - keine Änderung');
        }
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Benutzeradresse: $e');
      // NUR zurücksetzen wenn location noch nicht durch "bei mir" akzeptiert wurde
      if (_requiredInfo['location'] != true) {
        setState(() {
          _collectedData['location'] = 'Bitte geben Sie Ihre Adresse an';
          _requiredInfo['location'] = false;
        });
      } else {
        debugPrint('✅ Location bereits durch "bei mir" akzeptiert - Fehler ignoriert');
      }
    }
  }

  /// Extrahiert Zeitangaben aus Text (erweitert für Von-Bis Zeiten und Preisberechnung)
  String _extractTimingFromText(String text) {
    final lowerText = text.toLowerCase();
    final timeMatches = <String>[];
    
    debugPrint('🕐 === ERWEITERTE ZEIT-EXTRAKTION ===');
    debugPrint('📝 Input: "$text"');
    
    // VON-BIS ZEITEN EXTRAKTION (Spezifische Patterns)
    String? startTime, endTime;
    double? duration;
    
    // Pattern 1: "von X:XX bis Y:YY" oder "von X:XX uhr bis Y:YY uhr"
    final vonBisPattern1 = RegExp(
      r'von\s+(\d{1,2}):(\d{2})(?:\s*uhr)?\s+bis\s+(\d{1,2}):(\d{2})(?:\s*uhr)?',
      caseSensitive: false
    );
    
    // Pattern 2: "X:XX Uhr bis Y:YY Uhr"
    final vonBisPattern2 = RegExp(
      r'(\d{1,2}):(\d{2})\s*uhr\s+bis\s+(\d{1,2}):(\d{2})\s*uhr',
      caseSensitive: false
    );
    
    // Pattern 3: "von X:XX - Y:YY" oder "X:XX - Y:YY"
    final vonBisPattern3 = RegExp(
      r'(?:von\s+)?(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})(?:\s*uhr)?',
      caseSensitive: false
    );
    
    // Probiere alle Patterns
    final patterns = [vonBisPattern1, vonBisPattern2, vonBisPattern3];
    RegExpMatch? vonBisMatch;
    
    for (final pattern in patterns) {
      vonBisMatch = pattern.firstMatch(text);
      if (vonBisMatch != null) {
        debugPrint('🎯 Von-Bis Pattern gefunden mit: ${pattern.pattern}');
        break;
      }
    }
    
    if (vonBisMatch != null) {
      final startHour = int.tryParse(vonBisMatch.group(1) ?? '');
      final startMinute = int.tryParse(vonBisMatch.group(2) ?? '0') ?? 0;
      final endHour = int.tryParse(vonBisMatch.group(3) ?? '');
      final endMinute = int.tryParse(vonBisMatch.group(4) ?? '0') ?? 0;
      
      if (startHour != null && startHour >= 0 && startHour <= 23) {
        startTime = '${startHour.toString().padLeft(2, '0')}:${startMinute.toString().padLeft(2, '0')}';
        debugPrint('🕐 Start-Zeit extrahiert: $startTime');
      }
      
      if (endHour != null && endHour >= 0 && endHour <= 23) {
        endTime = '${endHour.toString().padLeft(2, '0')}:${endMinute.toString().padLeft(2, '0')}';
        debugPrint('🕐 End-Zeit extrahiert: $endTime');
        
        // Berechne Dauer für Preisschätzung
        if (startTime != null && endTime != null && startHour != null) {
          double hours = (endHour + endMinute / 60.0) - (startHour + startMinute / 60.0);
          if (hours < 0) hours += 24; // Über Mitternacht
          duration = hours;
          debugPrint('⌛ Dauer berechnet: ${hours.toStringAsFixed(1)} Stunden');
          
          // Speichere für Preisberechnung
          _collectedData['startTime'] = startTime;
          _collectedData['endTime'] = endTime;
          _collectedData['duration'] = duration;
          
          // Markiere Start- und Endzeit als erkannt
          _requiredInfo['startTime'] = true;
          _requiredInfo['endTime'] = true;
          _requiredInfo['specificTime'] = true;
          
          debugPrint('✅ Start- und Endzeit als erkannt markiert');
          
          // Preisschätzung wenn Stundensatz verfügbar
          if (_providerHourlyRate != null) {
            final estimatedPrice = _providerHourlyRate! * duration;
            _collectedData['estimatedPrice'] = estimatedPrice;
            debugPrint('💰 Geschätzter Preis: €${estimatedPrice.toStringAsFixed(2)} (${duration}h x €$_providerHourlyRate/h)');
          }
          
          timeMatches.add('$startTime - $endTime Uhr');
        }
      }
    }
    
    // Falls kein Von-Bis gefunden: Suche nach einzelnen Zeiten
    if (startTime == null) {
      final timePattern = RegExp(r'(\d{1,2}):(\d{2})(?:\s*uhr)?', caseSensitive: false);
      final timeMatchesList = timePattern.allMatches(text).toList();
      
      if (timeMatchesList.length >= 2) {
        // Mehrere Zeiten gefunden - nimm erste als Start, letzte als Ende
        final firstMatch = timeMatchesList.first;
        final lastMatch = timeMatchesList.last;
        
        final hour1 = int.tryParse(firstMatch.group(1)!) ?? 0;
        final minute1 = int.tryParse(firstMatch.group(2)!) ?? 0;
        final hour2 = int.tryParse(lastMatch.group(1)!) ?? 0;
        final minute2 = int.tryParse(lastMatch.group(2)!) ?? 0;
        
        // Bestimme welche Zeit früher ist
        if (hour1 < hour2 || (hour1 == hour2 && minute1 < minute2)) {
          startTime = '${hour1.toString().padLeft(2, '0')}:${minute1.toString().padLeft(2, '0')}';
          endTime = '${hour2.toString().padLeft(2, '0')}:${minute2.toString().padLeft(2, '0')}';
        } else {
          startTime = '${hour2.toString().padLeft(2, '0')}:${minute2.toString().padLeft(2, '0')}';
          endTime = '${hour1.toString().padLeft(2, '0')}:${minute1.toString().padLeft(2, '0')}';
        }
        
        debugPrint('🕐 Mehrere Zeiten erkannt - Start: $startTime, Ende: $endTime');
        
        // Berechne Dauer und speichere
        final startHour = int.parse(startTime.split(':')[0]);
        final startMinute = int.parse(startTime.split(':')[1]);
        final endHour = int.parse(endTime.split(':')[0]);
        final endMinute = int.parse(endTime.split(':')[1]);
        
        double hours = (endHour + endMinute / 60.0) - (startHour + startMinute / 60.0);
        if (hours < 0) hours += 24;
        duration = hours;
        
        _collectedData['startTime'] = startTime;
        _collectedData['endTime'] = endTime;
        _collectedData['duration'] = duration;
        _requiredInfo['startTime'] = true;
        _requiredInfo['endTime'] = true;
        _requiredInfo['specificTime'] = true;
        
        if (_providerHourlyRate != null) {
          final estimatedPrice = _providerHourlyRate! * duration;
          _collectedData['estimatedPrice'] = estimatedPrice;
          debugPrint('💰 Geschätzter Preis: €${estimatedPrice.toStringAsFixed(2)}');
        }
        
        timeMatches.add('$startTime - $endTime Uhr');
      } else if (timeMatchesList.isNotEmpty) {
        // Nur eine Zeit gefunden
        final match = timeMatchesList.first;
        final hour = int.tryParse(match.group(1)!) ?? 0;
        final minute = int.tryParse(match.group(2)!) ?? 0;
        final formattedTime = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} Uhr';
        timeMatches.add(formattedTime);
        debugPrint('🕐 Einzelne Uhrzeit erkannt: $formattedTime');
      }
    }

    // BUCHUNGSTYP-ERKENNUNG
    if (lowerText.contains('angebot') || 
        lowerText.contains('kostenvoranschlag') ||
        lowerText.contains('preis anfragen') ||
        lowerText.contains('was kostet')) {
      _collectedData['bookingType'] = 'quote';
      debugPrint('📋 Buchungstyp erkannt: Angebot anfragen');
    } else if (lowerText.contains('fix buchen') ||
               lowerText.contains('direkt buchen') ||
               lowerText.contains('sofort buchen')) {
      _collectedData['bookingType'] = 'direct';
      debugPrint('📋 Buchungstyp erkannt: Direkt buchen');
    }
    
    // Relative Zeitangaben (bestehende Logik)
    final relativeTimeMap = {
      'morgen': 'morgen',
      'heute': 'heute', 
      'übermorgen': 'übermorgen',
      'nächste woche': 'nächste Woche',
      'am wochenende': 'Wochenende',
      'montag': 'Montag',
      'dienstag': 'Dienstag', 
      'mittwoch': 'Mittwoch',
      'donnerstag': 'Donnerstag',
      'freitag': 'Freitag',
      'samstag': 'Samstag',
      'sonntag': 'Sonntag',
    };
    
    for (final entry in relativeTimeMap.entries) {
      if (lowerText.contains(entry.key)) {
        timeMatches.add(entry.value);
        debugPrint('📅 Relative Zeit erkannt: ${entry.value}');
      }
    }
    
    // Fallback für einzelne Uhrzeiten (wenn nicht schon erfasst)
    if (startTime == null) {
      final timePattern = RegExp(r'(\d{1,2}):(\d{2})(?:\s*uhr)?', caseSensitive: false);
      final timeMatch = timePattern.firstMatch(text);
      if (timeMatch != null) {
        final hour = int.tryParse(timeMatch.group(1)!) ?? 0;
        final minute = int.tryParse(timeMatch.group(2)!) ?? 0;
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          final formattedTime = '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} Uhr';
          timeMatches.add(formattedTime);
          debugPrint('🕐 Einzelne Uhrzeit erkannt: $formattedTime');
        }
      }
    }
    
    // Entferne Duplikate und gib sinnvoll formatierten String zurück
    final uniqueMatches = timeMatches.toSet().toList();
    final result = uniqueMatches.join(' ');
    
    debugPrint('✅ Finale Zeitangabe: "$result"');
    debugPrint('💾 Zusätzlich gespeichert: Start($startTime), End($endTime), Dauer(${duration?.toStringAsFixed(1) ?? 'null'}h)');
    
    return result;
  }

  /// Generiert intelligente Antwort basierend auf erkannten Informationen
  String _generateIntelligentResponse() {
    final recognizedItems = <String>[];
    
    if (_requiredInfo['location']!) {
      recognizedItems.add('📍 Ort: ${_collectedData['location']}');
    }
    if (_requiredInfo['timing']!) {
      recognizedItems.add('⏰ Zeit: ${_collectedData['timing']}');
    }
    if (_requiredInfo['budget']!) {
      recognizedItems.add('💰 Budget: ${_collectedData['budget']} EUR');
    }
    if (_requiredInfo['urgency']!) {
      recognizedItems.add('⚡ Dringlichkeit: ${_collectedData['urgency']}');
    }
    
    if (recognizedItems.isNotEmpty) {
      return 'Verstanden! Ich habe folgende Details erkannt:\n\n${recognizedItems.join('\n')}\n\n✨ Lassen Sie mich noch die fehlenden Informationen erfragen...';
    } else {
      return 'Perfekt! Ich helfe Ihnen gerne bei Ihrem Auftrag. Lassen Sie mich ein paar Details erfragen...';
    }
  }

  /// Führt die intelligente Konversation fort
  Future<void> _continueConversation() async {
    await Future.delayed(const Duration(milliseconds: 800));
    
    // Finde die wichtigste fehlende Information
    final nextQuestion = _generateNextIntelligentQuestion();
    
    if (nextQuestion != null) {
      setState(() {
        _messages.add(ChatMessage(
          text: nextQuestion,
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
    } else {
      // Alle Informationen vorhanden
      await _generateFinalTask();
    }
  }

  /// Generiert die nächste intelligente Frage basierend auf dem was fehlt
  String? _generateNextIntelligentQuestion() {
    debugPrint('🤔 === GENERIERE NÄCHSTE INTELLIGENTE FRAGE ===');
    debugPrint('📊 Aktueller Status: $_requiredInfo');
    debugPrint('🔍 Bereits gefragt: $_askedTopics');
    debugPrint('🎯 Bereits bekannt: ${_collectedData.keys.toList()}');
    
    // Da Kategorie und Unterkategorie bereits aus Context bekannt sind, überspringen wir diese Fragen
    // Priorisierung: Description > Location > Timing > TimeRange > BookingType > Budget > Urgency
    
    // Erste Priorität: Beschreibung des Auftrags
    if (!_requiredInfo['description']! && !_askedTopics.contains('description')) {
      _askedTopics.add('description');
      final subcategory = _collectedData['subcategory'];
      final providerName = _collectedData['providerName'];
      debugPrint('❓ Frage nach Beschreibung');
      
      if (subcategory != null && providerName != null) {
        return 'Perfekt! Beschreiben Sie mir bitte Ihren $subcategory-Auftrag. Was genau soll $providerName für Sie erledigen? 📝';
      } else if (subcategory != null) {
        return 'Beschreiben Sie mir bitte Ihren $subcategory-Auftrag. Was genau soll erledigt werden? 📝';
      } else {
        return 'Beschreiben Sie mir bitte Ihren Auftrag. Was genau soll erledigt werden? 📝';
      }
    }
    
    // Zweite Priorität: Ort
    if (!_requiredInfo['location']! && !_askedTopics.contains('location')) {
      _askedTopics.add('location');
      debugPrint('❓ Frage nach Ort');
      return 'Wo genau soll der Service durchgeführt werden? 📍';
    }
    
    // Dritte Priorität: Timing
    if (!_requiredInfo['timing']! && !_askedTopics.contains('timing')) {
      _askedTopics.add('timing');
      debugPrint('❓ Frage nach Zeit');
      return 'Wann hätten Sie es gerne? Haben Sie einen konkreten Termin im Kopf? ⏰';
    }
    
    // NEUE Frage nach Von-Bis Zeiten für Stundenbasis-Services
    // Nur fragen wenn timing erkannt wurde ABER keine konkreten Start/End-Zeiten vorhanden
    if (_requiredInfo['timing']! && 
        !_collectedData.containsKey('startTime') && 
        !_collectedData.containsKey('endTime') &&
        !_requiredInfo['startTime']! && 
        !_requiredInfo['endTime']! &&
        !_askedTopics.contains('timeRange')) {
      _askedTopics.add('timeRange');
      debugPrint('❓ Frage nach Von-Bis Zeiten (keine konkreten Zeiten erkannt)');
      if (_providerHourlyRate != null) {
        return 'Von wann bis wann soll der Service dauern? Zum Beispiel "von 14:00 bis 18:00 Uhr"? (Stundensatz: €$_providerHourlyRate/h) ⏰';
      } else {
        return 'Von wann bis wann soll der Service dauern? Zum Beispiel "von 14:00 bis 18:00 Uhr"? ⏰';
      }
    }
    
    // NEUE Frage nach Buchungstyp
    if (!_collectedData.containsKey('bookingType') && !_askedTopics.contains('bookingType')) {
      _askedTopics.add('bookingType');
      debugPrint('❓ Frage nach Buchungstyp');
      return 'Möchten Sie direkt buchen oder erst ein unverbindliches Angebot anfragen? 📋';
    }
    
    // NEUE Frage nach spezifischer Uhrzeit, wenn Datum vorhanden aber Uhrzeit fehlt
    if (_requiredInfo['timing']! && !_requiredInfo['specificTime']! && !_askedTopics.contains('specificTime')) {
      _askedTopics.add('specificTime');
      debugPrint('❓ Frage nach spezifischer Uhrzeit');
      return 'Zu welcher Uhrzeit soll es stattfinden? Zum Beispiel 15:00 Uhr? 🕒';
    }
    
    if (!_requiredInfo['budget']! && !_askedTopics.contains('budget')) {
      _askedTopics.add('budget');
      debugPrint('❓ Frage nach Budget');
      
      // Intelligente Budget-Frage mit Preisschätzung
      if (_collectedData.containsKey('estimatedPrice')) {
        final price = _collectedData['estimatedPrice'] as double;
        return 'Basierend auf der Zeit würde der Service ca. €${price.toStringAsFixed(2)} kosten. Passt das für Sie? 💰';
      } else {
        return 'Was haben Sie sich budgetmäßig vorgestellt? 💰';
      }
    }
    
    if (!_requiredInfo['urgency']! && !_askedTopics.contains('urgency')) {
      _askedTopics.add('urgency');
      debugPrint('❓ Frage nach Dringlichkeit');
      return 'Wie zeitkritisch ist es für Sie? ⚡';
    }
    
    debugPrint('✅ Alle Informationen vorhanden oder bereits gefragt!');
    return null; // Alle Informationen vorhanden
  }

  /// Verarbeitet die laufende Konversation
  Future<void> _processConversation(String message) async {
    debugPrint('💬 === KONVERSATION VERARBEITUNG ===');
    debugPrint('📝 User Message: "$message"');
    
    // Analysiere die neue Nachricht
    _analyzeAndExtractInformation(message);
    
    // Simuliere KI-Verarbeitung
    await Future.delayed(const Duration(milliseconds: 800));
    
    // Bestätige erkannte Informationen
    final confirmation = _generateConfirmation(message);
    if (confirmation.isNotEmpty) {
      setState(() {
        _messages.add(ChatMessage(
          text: confirmation,
          isUser: false,
          timestamp: DateTime.now(),
        ));
      });
      
      await Future.delayed(const Duration(milliseconds: 600));
    }
    
    // Führe Konversation fort
    await _continueConversation();
  }

  /// Generiert Bestätigung für erkannte Informationen
  String _generateConfirmation(String message) {
    final lowerMessage = message.toLowerCase();
    
    // Spezifische Bestätigungen basierend auf erkannten Informationen
    if (RegExp(r'^\s*\d+\s*$').hasMatch(message.trim()) && _askedTopics.contains('budget')) {
      return 'Alles klar, ${message.trim()} EUR Budget notiert! 💰';
    } else if (lowerMessage.contains('euro') || lowerMessage.contains('€')) {
      final match = RegExp(r'(\d+)').firstMatch(message);
      if (match != null) {
        return 'Perfekt, ${match.group(1)} EUR Budget ist notiert! 💰';
      }
      return 'Budget verstanden! 💰';
    } else if (RegExp(r'\d{1,2}:\d{2}').hasMatch(message) && _askedTopics.contains('specificTime')) {
      // Uhrzeit erkannt und bestätigt
      final timeMatch = RegExp(r'(\d{1,2}):(\d{2})').firstMatch(message);
      if (timeMatch != null) {
        return 'Perfekt! ${timeMatch.group(0)} Uhr ist notiert! 🕒';
      }
      return 'Uhrzeit verstanden! 🕒';
    } else if (lowerMessage.contains('morgen') || lowerMessage.contains('heute')) {
      return 'Zeitpunkt verstanden! ⏰';
    } else if (lowerMessage.contains('dringend') || lowerMessage.contains('sofort')) {
      return 'Verstanden, ist notiert als dringend! ⚡';
    } else if (_askedTopics.contains('location') && (lowerMessage.contains('bei mir') || lowerMessage.contains('zu hause'))) {
      // Für "bei mir" keine sofortige Bestätigung, da Adresse erst geladen werden muss
      return '';
    } else if (_askedTopics.contains('location') && _requiredInfo['location']!) {
      return 'Ort notiert! 📍';
    } else if (_askedTopics.contains('timing') && !_requiredInfo['timing']!) {
      return 'Zeitfenster verstanden! ⏰';
    }
    
    return 'Verstanden! 👍';
  }

  Future<void> _generateFinalTask() async {
    debugPrint('🏁 === GENERIERE FINALEN TASK ===');
    debugPrint('📊 Alle gesammelten Daten: $_collectedData');
    debugPrint('🔧 Service Context: ${widget.initialContext}');
    
    setState(() {
      _messages.add(ChatMessage(
        text: 'Perfekt! 🎉 Ich erstelle jetzt Ihren optimierten Auftrag...',
        isUser: false,
        timestamp: DateTime.now(),
      ));
      _currentStep = 'generating';
    });

    // WICHTIG: Prüfe ob echte Adresse noch geladen wird
    String currentLocation = _collectedData['location'] ?? '';
    if (currentLocation.contains('Adresse wird geladen') || currentLocation == 'Bei mir (Adresse wird geladen...)') {
      debugPrint('⏳ Warte auf echte Adresse...');
      // Warte bis zu 3 Sekunden auf die echte Adresse
      int attempts = 0;
      while (attempts < 6 && (_collectedData['location'] ?? '').contains('Adresse wird geladen')) {
        await Future.delayed(Duration(milliseconds: 500));
        attempts++;
        debugPrint('⏳ Versuch $attempts - Adresse: ${_collectedData['location']}');
      }
      debugPrint('📍 Finale Adresse nach Warten: ${_collectedData['location']}');
    }

    await Future.delayed(const Duration(seconds: 1));

    debugPrint('🎯 Generiere Task mit gesammelten Daten: $_collectedData');

    // Intelligente KI-Verarbeitung der gesammelten Daten
    final taskData = _generateIntelligentTask();

    debugPrint('✅ Generierte Task-Daten: $taskData');

    final title = taskData['title'] as String;
    final location = taskData['location'] as String;
    final budget = taskData['budget'] as double;

    debugPrint('📝 Finale Task Details:');
    debugPrint('  - Titel: $title');
    debugPrint('  - Ort: $location');
    debugPrint('  - Budget: €${budget.toStringAsFixed(0)}');

    setState(() {
      _messages.add(ChatMessage(
        text: 'Großartig! Ihr Auftrag wurde erstellt:\n\n📝 Titel: $title\n📍 Ort: $location\n💰 Budget: €${budget.toStringAsFixed(0)}\n\nSie können ihn jetzt überprüfen und anpassen.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
    });

    debugPrint('🔄 Übertrage Daten an Parent Widget...');
    // Übertrage die generierten Daten zurück
    widget.onTaskGenerated(taskData);
    debugPrint('✅ Task-Generierung abgeschlossen');

    // Setze Status auf completed und zeige Bewertungs-Widget
    setState(() {
      _currentStep = 'completed';
    });

    // 🧠 SPEICHERE KONVERSATION FÜR AI-LERNEN
    _saveConversationForLearning(taskData);
  }

  /// Speichert die Konversation für AI-Lernen und kontinuierliche Verbesserung
  Future<void> _saveConversationForLearning(Map<String, dynamic> taskData) async {
    try {
      debugPrint('🧠 === SPEICHERE KONVERSATION FÜR AI-LERNEN ===');
      
      final userId = FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';
      final serviceType = widget.initialContext?['category'] ?? 'general';
      
      // Konvertiere Messages zu Map-Format für Firestore
      final messagesForStorage = _messages.map((msg) => {
        'text': msg.text,
        'isUser': msg.isUser,
        'timestamp': msg.timestamp.toIso8601String(),
      }).toList();
      
      debugPrint('💾 Speichere ${messagesForStorage.length} Nachrichten für Service-Typ: $serviceType');
      
      await AILearningService.saveConversation(
        userId: userId,
        serviceType: serviceType,
        messages: messagesForStorage,
        extractedData: _collectedData,
        finalTask: taskData,
        wasSuccessful: true, // Erfolgreiche Konversation
      );
      
      debugPrint('✅ Konversation erfolgreich für AI-Lernen gespeichert');
    } catch (e) {
      debugPrint('⚠️ Fehler beim Speichern für AI-Lernen: $e');
      // Fehler beim Lernen sollten die normale Funktionalität nicht beeinträchtigen
    }
  }

  /// Gibt Feedback zur KI-Performance für kontinuierliches Lernen
  Future<void> provideFeedbackToAI({
    required bool wasHelpful,
    required int rating,
    String? userComment,
  }) async {
    try {
      if (_conversationId != null) {
        await AILearningService.saveFeedback(
          conversationId: _conversationId!,
          wasHelpful: wasHelpful,
          rating: rating,
          userComment: userComment,
        );
        debugPrint('✅ AI-Feedback gespeichert: $rating/5 Sterne');
      }
    } catch (e) {
      debugPrint('⚠️ Fehler beim Speichern des AI-Feedbacks: $e');
    }
  }

  /// Intelligente Task-Generierung mit automatischer Vervollständigung fehlender Felder
  Map<String, dynamic> _generateIntelligentTask() {
    debugPrint('🧠 === INTELLIGENTE TASK-GENERIERUNG ===');
    
    final serviceInfo = widget.initialContext ?? {};
    debugPrint('🔧 Service Info: $serviceInfo');
    debugPrint('📋 Collected Data: $_collectedData');
    
    // Extrahiere und verarbeite die gesammelten Daten
    final initialDesc = _collectedData['initialDescription'] ?? '';
    debugPrint('📝 Initial Description: "$initialDesc"');
    
    final title = _generateTitle(initialDesc, serviceInfo);
    debugPrint('📌 Generierter Titel: "$title"');
    
    final description = _generateEnhancedDescription(_collectedData, serviceInfo);
    debugPrint('📄 Generierte Beschreibung: "$description"');
    
    // WICHTIG: Prüfe ob echte Adresse verfügbar ist oder verwende sinnvollen Fallback
    String currentLocation = _collectedData['location'] ?? 'Nicht angegeben';
    debugPrint('🏠 Aktuelle Location vor Enhancement: "$currentLocation"');
    
    if (currentLocation.contains('Adresse wird geladen') || currentLocation == 'Bei mir (Adresse wird geladen...)') {
      debugPrint('⚠️ Adresse noch nicht geladen - verwende "Bei mir vor Ort"');
      currentLocation = 'Bei mir vor Ort';
    }
    
    final location = _enhanceLocation(currentLocation);
    debugPrint('📍 Enhanced Location: "$location"');
    
    // Budget: Verwende estimatedPrice wenn verfügbar, sonst budget, sonst Fallback
    final rawBudget = _collectedData['budget'] ?? 
                      (_collectedData['estimatedPrice']?.toString() ?? '100');
    debugPrint('💰 Raw Budget Input: "$rawBudget"');
    final budget = _extractBudget(rawBudget);
    debugPrint('💰 Extracted Budget: €$budget');
    
    final rawUrgency = _collectedData['urgency'] ?? 'normal';
    debugPrint('⚡ Raw Urgency Input: "$rawUrgency"');
    final urgency = _normalizeUrgency(rawUrgency);
    debugPrint('⚡ Normalized Urgency: "$urgency"');
    final tags = _generateSmartTags(_collectedData, urgency);
    debugPrint('🏷️ Generated Tags: $tags');

    // Extrahiere Zeitinformationen
    final startTime = _collectedData['startTime'];
    final endTime = _collectedData['endTime'];
    final duration = _collectedData['duration'];
    final timing = _collectedData['timing'];
    
    debugPrint('⏰ Zeit-Daten für Task:');
    debugPrint('  - Start: $startTime');
    debugPrint('  - Ende: $endTime');
    debugPrint('  - Dauer: $duration h');
    debugPrint('  - Timing: $timing');

    final taskData = {
      'title': title,
      'description': description,
      'location': location,
      'budget': budget,
      'urgency': urgency,
      'tags': tags,
      'aiGenerated': true,
      'rawData': _collectedData, // Für Debugging
      // NEUE: Zeit-Informationen hinzufügen
      if (startTime != null) 'startTime': startTime,
      if (endTime != null) 'endTime': endTime,
      if (duration != null) 'duration': duration,
      if (timing != null) 'timing': timing,
    };
    
    debugPrint('🎯 Finale Task Data:');
    debugPrint('  - Title: $title');
    debugPrint('  - Description: $description');
    debugPrint('  - Location: $location');
    debugPrint('  - Budget: €$budget');
    debugPrint('  - Urgency: $urgency');
    debugPrint('  - Tags: $tags');
    debugPrint('  - AI Generated: true');
    debugPrint('✅ Task-Generierung erfolgreich abgeschlossen');

    // Generiere Aufgabendaten basierend auf der echten Konversation
    return taskData;
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
                    itemCount: _messages.length + (_isGenerating ? 1 : 0) + (_currentStep == 'completed' ? 1 : 0),
                    itemBuilder: (context, index) {
                      debugPrint('📱 Rendering message $index/${_messages.length} (isGenerating: $_isGenerating)');
                      
                      // Bewertungs-Widget am Ende anzeigen (nur wenn noch kein Feedback abgegeben)
                      if (index == _messages.length + (_isGenerating ? 1 : 0) && _currentStep == 'completed') {
                        return _buildFeedbackWidget();
                      }
                      
                      if (index == _messages.length && _isGenerating) {
                        debugPrint('⏳ Showing typing indicator');
                        return _buildTypingIndicator();
                      }
                      
                      final message = _messages[index];
                      debugPrint('💬 Message $index: "${message.text.substring(0, message.text.length > 50 ? 50 : message.text.length)}..." (isUser: ${message.isUser})');

                      return _buildMessageBubble(message);
                    },
                  ),
                ),                // Input-Bereich
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
    
    debugPrint('⚡ === DRINGLICHKEITS-NORMALISIERUNG ===');
    debugPrint('📝 Input: "$urgency"');
    debugPrint('🔍 Lowercase: "$urgencyLower"');
    
    // Normalisiere verschiedene Urgency-Begriffe auf App-Standards
    if (urgencyLower.contains('dringend') || 
        urgencyLower.contains('sofort') || 
        urgencyLower.contains('urgent') ||
        urgencyLower.contains('schnell') ||
        urgencyLower.contains('eilig') ||
        urgencyLower.contains('asap') ||
        urgencyLower == 'hoch') {
      debugPrint('🚨 Erkannt als: HIGH');
      return 'high';
    } else if (urgencyLower.contains('flexibel') || 
               urgencyLower.contains('entspannt') ||
               urgencyLower.contains('zeit') ||
               urgencyLower.contains('niedrig') ||
               urgencyLower == 'low') {
      debugPrint('😌 Erkannt als: LOW'); 
      return 'low';
    } else {
      debugPrint('⚖️ Erkannt als: NORMAL');
      return 'normal';
    }
  }

  List<String> _generateSmartTags(Map<String, dynamic> data, String urgency) {
    List<String> tags = ['KI-erstellt'];
    
    debugPrint('🏷️ === INTELLIGENTE TAG-GENERIERUNG ===');
    debugPrint('📊 Input Data: $data');
    debugPrint('⚡ Urgency: $urgency');
    
    // Urgency-basierte Tags (verbessert)
    if (urgency == 'high' || urgency == 'hoch') {
      tags.add('Dringend');
      debugPrint('🚨 Dringend-Tag hinzugefügt');
    } else if (urgency == 'low' || urgency == 'niedrig') {
      tags.add('Flexibel');
      debugPrint('😌 Flexibel-Tag hinzugefügt');
    }
    
    // Timing-basierte Tags (verbessert)
    final timing = data['timing']?.toString().toLowerCase() ?? '';
    debugPrint('⏰ Timing Text: "$timing"');
    
    if (timing.contains('morgen')) {
      tags.add('Für morgen');
      debugPrint('📅 Morgen-Tag hinzugefügt');
    } else if (timing.contains('heute')) {
      tags.add('Heute noch');
      debugPrint('🏃 Heute-Tag hinzugefügt');
    }
    
    // Uhrzeit-basierte Tags  
    if (timing.contains('15:00') || timing.contains('15.00')) {
      tags.add('Nachmittags (15:00)');
      debugPrint('🕒 Nachmittags-Tag hinzugefügt');
    } else if (RegExp(r'1[0-4]:\d{2}').hasMatch(timing)) {
      tags.add('Vormittags');
      debugPrint('🌅 Vormittags-Tag hinzugefügt');
    } else if (RegExp(r'1[5-9]:\d{2}').hasMatch(timing)) {
      tags.add('Nachmittags');
      debugPrint('🌤️ Nachmittags-Tag hinzugefügt');
    } else if (RegExp(r'[2-9]\d:\d{2}|0\d:\d{2}').hasMatch(timing)) {
      tags.add('Abends');
      debugPrint('🌆 Abends-Tag hinzugefügt');
    }
    
    if (timing.contains('wochenende') || timing.contains('samstag') || timing.contains('sonntag')) {
      tags.add('Wochenende');
      debugPrint('🎉 Wochenende-Tag hinzugefügt');
    }
    
    // Location-basierte Tags
    final location = data['location']?.toString().toLowerCase() ?? '';
    debugPrint('📍 Location Text: "$location"');
    
    if (location.contains('bei mir') || location.contains('zu hause') || location.contains('zuhause')) {
      tags.add('Vor Ort');
      debugPrint('🏠 Vor-Ort-Tag hinzugefügt');
    }
    
    // Budget-basierte Tags
    final budget = data['budget']?.toString() ?? '';
    if (budget.isNotEmpty) {
      final budgetValue = double.tryParse(budget) ?? 0;
      debugPrint('💰 Budget Wert: $budgetValue EUR');
      
      if (budgetValue >= 1000) {
        tags.add('Premium Service');
        debugPrint('⭐ Premium-Tag hinzugefügt');
      } else if (budgetValue >= 500) {
        tags.add('Standard Service');
        debugPrint('✨ Standard-Tag hinzugefügt');
      }
    }
    
    // Service-spezifische Tags (verbessert)
    final initialDesc = data['initialDescription']?.toString().toLowerCase() ?? '';
    debugPrint('📝 Initial Description: "$initialDesc"');
    
    if (initialDesc.contains('mietkoch') || initialDesc.contains('koch')) {
      tags.add('Mietkoch');
      debugPrint('👨‍🍳 Mietkoch-Tag hinzugefügt');
    }
    
    // Personen-Erkennung (verbessert)
    final personMatch = RegExp(r'(\d+)\s*person', caseSensitive: false).firstMatch(initialDesc);
    if (personMatch != null) {
      final personCount = int.tryParse(personMatch.group(1)!) ?? 0;
      if (personCount > 1) {
        tags.add('Mehrere Personen ($personCount)');
        debugPrint('👥 Personen-Tag hinzugefügt: $personCount Personen');
      }
    } else if (initialDesc.contains('person')) {
      tags.add('Mehrere Personen');
      debugPrint('👥 Allgemeiner Personen-Tag hinzugefügt');
    }
    
    // Special requirements Tags (verbessert)
    final special = data['special']?.toString().toLowerCase() ?? '';
    if (special.isNotEmpty) {
      tags.add('Spezielle Anforderungen');
      debugPrint('📋 Spezielle-Anforderungen-Tag hinzugefügt');
      
      if (special.contains('pünktlich')) {
        tags.add('Pünktlichkeit wichtig');
        debugPrint('⏱️ Pünktlichkeit-Tag hinzugefügt');
      }
      if (special.contains('sauber') || special.contains('hygiene')) {
        tags.add('Hygiene wichtig');
        debugPrint('🧽 Hygiene-Tag hinzugefügt');
      }
      if (special.contains('qualität') || special.contains('gut')) {
        tags.add('Qualität wichtig');
        debugPrint('⭐ Qualität-Tag hinzugefügt');
      }
    }
    
    debugPrint('✅ Finale Tags: $tags');
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

  /// Bewertungs-Widget für AI-Feedback am Ende der Konversation
  Widget _buildFeedbackWidget() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF14ad9f).withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                Icons.feedback_outlined,
                color: const Color(0xFF14ad9f),
                size: 24,
              ),
              const SizedBox(width: 8),
              const Text(
                'Wie hilfreich war der KI-Assistent?',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Beschreibung
          Text(
            'Ihr Feedback hilft uns, den KI-Assistenten zu verbessern',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Stern-Bewertung
          Row(
            children: [
              const Text(
                'Bewertung: ',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              ...List.generate(5, (index) {
                return GestureDetector(
                  onTap: () => _submitFeedback(index + 1),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Icon(
                      Icons.star_border,
                      color: const Color(0xFF14ad9f),
                      size: 28,
                    ),
                  ),
                );
              }),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Schnell-Bewertungen
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildQuickFeedbackChip(
                label: '👍 Sehr hilfreich',
                rating: 5,
                comment: 'Die KI hat alle Informationen gut erfasst und einen vollständigen Auftrag erstellt.',
              ),
              _buildQuickFeedbackChip(
                label: '👌 Gut',
                rating: 4,
                comment: 'Die KI war hilfreich, aber einige Details mussten nachbearbeitet werden.',
              ),
              _buildQuickFeedbackChip(
                label: '👎 Verbesserungsbedarf',
                rating: 2,
                comment: 'Die KI hat wichtige Informationen übersehen oder falsch interpretiert.',
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Schnell-Bewertungs-Chip
  Widget _buildQuickFeedbackChip({
    required String label,
    required int rating,
    required String comment,
  }) {
    return GestureDetector(
      onTap: () => _submitFeedback(rating, comment: comment),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: const Color(0xFF14ad9f).withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Color(0xFF14ad9f),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  /// Submittet das Feedback und zeigt eine Bestätigung
  void _submitFeedback(int rating, {String? comment}) {
    // Feedback an AI Learning Service senden
    provideFeedbackToAI(
      wasHelpful: rating >= 3,
      rating: rating,
      userComment: comment,
    );

    // Bestätigungsnachricht anzeigen
    setState(() {
      _messages.add(ChatMessage(
        text: 'Vielen Dank für Ihr Feedback! ($rating/5 Sterne)\n\nIhr Feedback hilft uns, den KI-Assistenten kontinuierlich zu verbessern.',
        isUser: false,
        timestamp: DateTime.now(),
      ));
      
      // Verstecke das Feedback-Widget
      _currentStep = 'feedback_submitted';
    });

    // Auto-Scroll zum Ende
    _scrollToBottom();

    debugPrint('✅ Benutzer-Feedback eingereicht: $rating/5 Sterne');
    if (comment != null) {
      debugPrint('💬 Kommentar: $comment');
    }
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
