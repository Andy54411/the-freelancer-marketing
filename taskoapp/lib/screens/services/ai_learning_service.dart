import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

/// Service für KI-Lernen und Training
/// Sammelt Konversationsdaten und verbessert die KI kontinuierlich
class AILearningService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // Collection References
  static final CollectionReference _conversationsRef = 
      _firestore.collection('ai_conversations');
  static final CollectionReference _learningPatternsRef = 
      _firestore.collection('ai_learning_patterns');

  /// Speichert eine komplette Konversation für das Lernen
  static Future<void> saveConversation({
    required String userId,
    required String serviceType,
    required List<Map<String, dynamic>> messages,
    required Map<String, dynamic> extractedData,
    required Map<String, dynamic> finalTask,
    required bool wasSuccessful,
  }) async {
    try {
      debugPrint('💾 === SPEICHERE KONVERSATION FÜR KI-LERNEN ===');
      debugPrint('👤 User ID: $userId');
      debugPrint('🔧 Service Type: $serviceType');
      debugPrint('💬 Messages Count: ${messages.length}');
      debugPrint('📊 Extracted Data Keys: ${extractedData.keys}');
      
      final conversationData = {
        'userId': userId,
        'serviceType': serviceType,
        'messages': messages,
        'extractedData': extractedData,
        'finalTask': finalTask,
        'wasSuccessful': wasSuccessful,
        'timestamp': FieldValue.serverTimestamp(),
        'conversationLength': messages.length,
        'extractionSuccess': extractedData.isNotEmpty,
        'version': '1.0', // Für zukünftige Migrations
      };
      
      debugPrint('📦 Conversation Data to save: $conversationData');
      
      final docRef = await _conversationsRef.add(conversationData);
      debugPrint('✅ Konversation gespeichert mit ID: ${docRef.id}');
      
      // Analysiere und speichere Lernmuster
      await _analyzeAndSaveLearningPatterns(
        serviceType, 
        messages, 
        extractedData
      );
      
      debugPrint('✅ Konversation erfolgreich gespeichert');
      
      // Teste ob die Collection existiert
      await _testCollectionAccess();
      
    } catch (e, stackTrace) {
      debugPrint('❌ Fehler beim Speichern der Konversation: $e');
      debugPrint('📍 Stack Trace: $stackTrace');
      
      // Versuche eine einfache Test-Collection zu erstellen
      await _createTestDocument();
    }
  }

  /// Testet den Zugriff auf die AI Collections
  static Future<void> _testCollectionAccess() async {
    try {
      debugPrint('🧪 === TESTE COLLECTION ZUGRIFF ===');
      
      // Teste ai_conversations
      final conversationCount = await _conversationsRef.limit(1).get();
      debugPrint('📊 AI Conversations Collection: ${conversationCount.docs.length} docs gefunden');
      
      // Teste ai_learning_patterns
      final patternCount = await _learningPatternsRef.limit(1).get();
      debugPrint('📊 AI Learning Patterns Collection: ${patternCount.docs.length} docs gefunden');
      
      debugPrint('✅ Collection-Zugriff erfolgreich');
    } catch (e) {
      debugPrint('❌ Fehler beim Collection-Zugriff: $e');
    }
  }

  /// Erstellt ein Test-Dokument um sicherzustellen, dass die Collections funktionieren
  static Future<void> _createTestDocument() async {
    try {
      debugPrint('🧪 === ERSTELLE TEST-DOKUMENT ===');
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        debugPrint('⚠️ Kein angemeldeter Benutzer - verwende Test-User');
      }
      
      final userId = user?.uid ?? 'test_user';
      
      // Erstelle Test-Konversation
      final testConversation = {
        'userId': userId,
        'serviceType': 'test_service',
        'messages': [
          {
            'text': 'Test Nachricht',
            'isUser': true,
            'timestamp': DateTime.now().toIso8601String(),
          }
        ],
        'extractedData': {'test': 'data'},
        'finalTask': {'test': 'task'},
        'wasSuccessful': true,
        'timestamp': FieldValue.serverTimestamp(),
        'conversationLength': 1,
        'extractionSuccess': true,
        'version': '1.0',
        'isTestData': true, // Markierung für später Löschung
      };
      
      final docRef = await _conversationsRef.add(testConversation);
      debugPrint('✅ Test-Dokument erstellt mit ID: ${docRef.id}');
      
      // Erstelle Test-Pattern (vereinfacht für bessere Kompatibilität)
      final testPattern = {
        'serviceType': 'test_service',
        'keyword': 'test_keyword',
        'occurrences': 1,
        'firstSeen': FieldValue.serverTimestamp(),
        'lastSeen': FieldValue.serverTimestamp(),
        'extractionResults': [{'test': 'data'}],
        'isTestData': true,
      };
      
      final patternRef = await _learningPatternsRef.add(testPattern);
      debugPrint('✅ Test-Pattern erstellt mit ID: ${patternRef.id}');
      
    } catch (e) {
      debugPrint('❌ Fehler beim Erstellen der Test-Dokumente: $e');
      debugPrint('📝 Das ist normal bei der ersten Verwendung. Collections werden beim ersten echten Gebrauch erstellt.');
    }
  }

  /// Analysiert Konversationsmuster und speichert Lernregeln
  static Future<void> _analyzeAndSaveLearningPatterns(
    String serviceType,
    List<Map<String, dynamic>> messages,
    Map<String, dynamic> extractedData,
  ) async {
    try {
      debugPrint('🧠 === ANALYSIERE LERNMUSTER ===');
      
      // Finde häufige Keyword-Patterns
      final userMessages = messages
          .where((msg) => msg['isUser'] == true)
          .map((msg) => msg['text'] as String)
          .toList();
      
      for (final message in userMessages) {
        final keywords = _extractKeywords(message.toLowerCase());
        
        for (final keyword in keywords) {
          await _updateKeywordPattern(serviceType, keyword, extractedData);
        }
      }
      
      debugPrint('✅ Lernmuster analysiert und gespeichert');
    } catch (e) {
      debugPrint('❌ Fehler bei Lernmuster-Analyse: $e');
    }
  }

  /// Extrahiert wichtige Keywords aus einem Text
  static List<String> _extractKeywords(String text) {
    final commonWords = {'ich', 'bin', 'das', 'ist', 'und', 'oder', 'für', 'mit', 'bei', 'zu', 'von', 'der', 'die', 'ein', 'eine'};
    
    return text
        .split(RegExp(r'\s+'))
        .where((word) => word.length > 2 && !commonWords.contains(word))
        .take(10) // Limitiere auf 10 Keywords pro Nachricht
        .toList();
  }

  /// Aktualisiert Keyword-Patterns für bessere Extraktion
  static Future<void> _updateKeywordPattern(
    String serviceType,
    String keyword,
    Map<String, dynamic> extractedData,
  ) async {
    try {
      final patternId = '${serviceType}_$keyword';
      final patternRef = _learningPatternsRef.doc(patternId);
      
      await _firestore.runTransaction((transaction) async {
        final doc = await transaction.get(patternRef);
        
        if (doc.exists) {
          // Aktualisiere existierendes Pattern
          final currentData = doc.data() as Map<String, dynamic>;
          final occurrences = (currentData['occurrences'] ?? 0) + 1;
          
          transaction.update(patternRef, {
            'occurrences': occurrences,
            'lastSeen': FieldValue.serverTimestamp(),
            'extractionResults': FieldValue.arrayUnion([extractedData]),
          });
        } else {
          // Erstelle neues Pattern
          transaction.set(patternRef, {
            'serviceType': serviceType,
            'keyword': keyword,
            'occurrences': 1,
            'firstSeen': FieldValue.serverTimestamp(),
            'lastSeen': FieldValue.serverTimestamp(),
            'extractionResults': [extractedData],
          });
        }
      });
    } catch (e) {
      debugPrint('❌ Fehler beim Aktualisieren des Keyword-Patterns: $e');
    }
  }

  /// Lädt intelligente Extraktionsregeln basierend auf gelernten Mustern
  static Future<Map<String, dynamic>> getIntelligentExtractionRules(
    String serviceType
  ) async {
    try {
      debugPrint('🔍 === LADE INTELLIGENTE EXTRAKTIONSREGELN ===');
      
      final snapshot = await _learningPatternsRef
          .where('serviceType', isEqualTo: serviceType)
          .where('occurrences', isGreaterThan: 2) // Nur häufige Patterns
          .orderBy('occurrences', descending: true)
          .limit(50)
          .get();
      
      final rules = <String, dynamic>{
        'locationKeywords': <String>[],
        'timeKeywords': <String>[],
        'budgetKeywords': <String>[],
        'urgencyKeywords': <String>[],
        'serviceSpecificKeywords': <String>[],
      };
      
      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        final keyword = data['keyword'] as String;
        final extractionResults = data['extractionResults'] as List;
        
        // Kategorisiere Keywords basierend auf Extraktionsergebnissen
        _categorizeKeyword(keyword, extractionResults, rules);
      }
      
      debugPrint('✅ ${snapshot.docs.length} Extraktionsregeln geladen');
      debugPrint('📊 Regeln: $rules');
      
      return rules;
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Extraktionsregeln: $e');
      return {};
    }
  }

  /// Kategorisiert Keywords basierend auf historischen Extraktionsergebnissen
  static void _categorizeKeyword(
    String keyword,
    List extractionResults,
    Map<String, dynamic> rules,
  ) {
    var locationCount = 0;
    var timeCount = 0;
    var budgetCount = 0;
    var urgencyCount = 0;
    
    for (final result in extractionResults) {
      if (result is Map<String, dynamic>) {
        if (result.containsKey('location')) locationCount++;
        if (result.containsKey('timing')) timeCount++;
        if (result.containsKey('budget')) budgetCount++;
        if (result.containsKey('urgency')) urgencyCount++;
      }
    }
    
    final totalResults = extractionResults.length;
    
    // Kategorisiere basierend auf Häufigkeit (> 30% Threshold)
    if (locationCount / totalResults > 0.3) {
      (rules['locationKeywords'] as List<String>).add(keyword);
    }
    if (timeCount / totalResults > 0.3) {
      (rules['timeKeywords'] as List<String>).add(keyword);
    }
    if (budgetCount / totalResults > 0.3) {
      (rules['budgetKeywords'] as List<String>).add(keyword);
    }
    if (urgencyCount / totalResults > 0.3) {
      (rules['urgencyKeywords'] as List<String>).add(keyword);
    }
  }

  /// Speichert Feedback zur KI-Performance für weiteres Lernen
  static Future<void> saveFeedback({
    required String conversationId,
    required bool wasHelpful,
    required int rating,
    String? userComment,
  }) async {
    try {
      await _firestore.collection('ai_feedback').add({
        'conversationId': conversationId,
        'wasHelpful': wasHelpful,
        'rating': rating,
        'userComment': userComment,
        'timestamp': FieldValue.serverTimestamp(),
      });
      
      debugPrint('✅ AI-Feedback gespeichert: Rating $rating/5');
    } catch (e) {
      debugPrint('❌ Fehler beim Speichern des Feedbacks: $e');
    }
  }

  /// Erstelle eine Test-Konversation um die AI Learning Collections zu initialisieren
  static Future<void> initializeCollections() async {
    try {
      debugPrint('🚀 === INITIALISIERE AI LEARNING COLLECTIONS ===');
      
      await _createTestDocument();
      
      // Warte kurz und teste dann den Zugriff
      await Future.delayed(const Duration(seconds: 2));
      await _testCollectionAccess();
      
      debugPrint('✅ AI Learning Collections initialisiert');
    } catch (e) {
      debugPrint('❌ Fehler beim Initialisieren der Collections: $e');
    }
  }

  /// Löscht alle Test-Dokumente (Cleanup-Funktion)
  static Future<void> deleteTestDocuments() async {
    try {
      debugPrint('🧹 === LÖSCHE TEST-DOKUMENTE ===');
      
      // Lösche Test-Konversationen
      final testConversations = await _conversationsRef
          .where('isTestData', isEqualTo: true)
          .get();
      
      for (final doc in testConversations.docs) {
        await doc.reference.delete();
        debugPrint('🗑️ Test-Konversation gelöscht: ${doc.id}');
      }
      
      // Lösche Test-Patterns
      final testPatterns = await _learningPatternsRef
          .where('isTestData', isEqualTo: true)
          .get();
      
      for (final doc in testPatterns.docs) {
        await doc.reference.delete();
        debugPrint('🗑️ Test-Pattern gelöscht: ${doc.id}');
      }
      
      debugPrint('✅ Alle Test-Dokumente gelöscht');
    } catch (e) {
      debugPrint('❌ Fehler beim Löschen der Test-Dokumente: $e');
    }
  }
}
