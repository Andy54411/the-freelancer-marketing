import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

/// Service für Chat-System
/// Synchronisiert mit der Web-Version DirectChatModal
class ChatService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Startet einen Chat mit einem Provider
  static Future<String> startChatWithProvider({
    required String providerId,
    required String providerName,
    required String customerId,
    required String customerName,
  }) async {
    try {
      debugPrint('💬 Starte Chat: $customerName -> $providerName');
      
      // Chat-ID erstellen (konsistent mit Web-Version)
      final chatId = _generateChatId(customerId, providerId);
      
      // Chat-Dokument erstellen/aktualisieren
      final chatRef = _firestore.collection('directChats').doc(chatId);
      
      await chatRef.set({
        'participants': [customerId, providerId],
        'customerInfo': {
          'id': customerId,
          'name': customerName,
        },
        'providerInfo': {
          'id': providerId,
          'name': providerName,
        },
        'lastMessage': '',
        'lastMessageSenderId': '',
        'lastMessageSenderName': '',
        'lastUpdated': FieldValue.serverTimestamp(),
        'createdAt': FieldValue.serverTimestamp(),
        'isActive': true,
      }, SetOptions(merge: true));
      
      debugPrint('✅ Chat erstellt/aktualisiert: $chatId');
      return chatId;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Starten des Chats: $e');
      throw Exception('Chat konnte nicht gestartet werden');
    }
  }

  /// Validiert eine Nachricht auf verbotene Inhalte (E-Mails, Telefonnummern)
  static String? _validateMessage(String message) {
    // E-Mail-Validierung mit verschiedenen Umgehungsversuchen
    final sanitizedText = message
        .toLowerCase()
        .replaceAll(RegExp(r'\s+at\s+'), '@')
        .replaceAll('(at)', '@')
        .replaceAll(RegExp(r'\s+dot\s+'), '.')
        .replaceAll('(dot)', '.')
        .replaceAll(RegExp(r'\s'), ''); // Entfernt ALLE Leerzeichen
    
    final emailRegex = RegExp(r'([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)', caseSensitive: false);
    if (emailRegex.hasMatch(sanitizedText)) {
      return 'E-Mail-Adresse wurde blockiert';
    }
    
    // Telefonnummer-Validierung
    final digitsOnly = message.replaceAll(RegExp(r'\D'), '');
    final phoneRegex = RegExp(r'\d{8,}'); // 8 oder mehr aufeinanderfolgende Ziffern
    if (phoneRegex.hasMatch(digitsOnly)) {
      return 'Telefonnummer wurde blockiert';
    }
    
    // URL-Validierung
    final urlRegex = RegExp(r'(https?:\/\/[^\s]+)', caseSensitive: false);
    if (urlRegex.hasMatch(message)) {
      return 'Links wurden blockiert';
    }
    
    // NEUE ADRESS-VALIDIERUNG
    final addressPatterns = [
      RegExp(r'\b\d{5}\s+[a-zA-ZäöüÄÖÜß]+\b', caseSensitive: false), // PLZ + Ort (z.B. "12345 Berlin")
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+straße\s+\d+', caseSensitive: false), // Straßenname + Nummer
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+str\.\s+\d+', caseSensitive: false), // Abgekürzte Straße
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+weg\s+\d+', caseSensitive: false), // Weg + Nummer
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+platz\s+\d+', caseSensitive: false), // Platz + Nummer
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+allee\s+\d+', caseSensitive: false), // Allee + Nummer
      RegExp(r'\b[a-zA-ZäöüÄÖÜß]+gasse\s+\d+', caseSensitive: false), // Gasse + Nummer
      RegExp(r'\bsiedlung\s+[a-zA-ZäöüÄÖÜß\s]+\d+', caseSensitive: false), // Siedlung + Name + Nummer
      RegExp(r'\b[a-zA-ZäöüÄÖÜß\s]+\d+\s+\d{5}\s+[a-zA-ZäöüÄÖÜß]+', caseSensitive: false), // Vollständige Adresse
    ];
    
    for (final pattern in addressPatterns) {
      if (pattern.hasMatch(message)) {
        return 'Adresse wurde blockiert';
      }
    }
    
    // Weitere verbotene Muster
    final forbiddenPatterns = [
      RegExp(r'\b\d{4,}\s*\d{4,}\b'), // Kartennummern-ähnliche Muster
      RegExp(r'\biban\b', caseSensitive: false),
      RegExp(r'\bpaypal\b', caseSensitive: false),
      RegExp(r'\bvenmo\b', caseSensitive: false),
      RegExp(r'\bwhatsapp\b', caseSensitive: false),
      RegExp(r'\btelegram\b', caseSensitive: false),
      RegExp(r'\bskype\b', caseSensitive: false),
      RegExp(r'\bdiscord\b', caseSensitive: false),
    ];
    
    for (final pattern in forbiddenPatterns) {
      if (pattern.hasMatch(message)) {
        return 'Nachricht enthält verbotene Inhalte';
      }
    }
    
    return null; // Nachricht ist gültig
  }

  /// Sendet eine Nachricht in einem Auftragschat
  static Future<void> sendOrderChatMessage({
    required String orderId,
    required String senderId,
    required String senderName,
    required String senderType, // 'kunde' oder 'anbieter'
    required String message,
    required String customerId,
    required String providerId,
  }) async {
    try {
      debugPrint('📤 Sende Auftragschat-Nachricht für Order: $orderId');
      
      // SICHERHEITS-VALIDIERUNG: Nachricht auf verbotene Inhalte prüfen
      final validationError = _validateMessage(message);
      if (validationError != null) {
        debugPrint('❌ Nachricht blockiert: $validationError');
        throw Exception(validationError);
      }
      
      // Nachricht zur nachrichten-Subcollection hinzufügen
      final messagesRef = _firestore
          .collection('auftraege')
          .doc(orderId)
          .collection('nachrichten');
      
      await messagesRef.add({
        'senderId': senderId,
        'senderName': senderName,
        'senderType': senderType,
        'text': message,
        'timestamp': FieldValue.serverTimestamp(),
        'chatUsers': [customerId, providerId], // Für Firestore-Regeln
      });
      
      // Chat-Dokument mit letzter Nachricht aktualisieren
      await _firestore.collection('chats').doc(orderId).set({
        'users': [customerId, providerId],
        'lastMessage': {
          'text': message,
          'senderId': senderId,
          'timestamp': FieldValue.serverTimestamp(),
          'isRead': false,
        },
        'lastUpdated': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      
      debugPrint('✅ Auftragschat-Nachricht gesendet');
      
    } catch (e) {
      debugPrint('❌ Fehler beim Senden der Auftragschat-Nachricht: $e');
      throw Exception('Auftragschat-Nachricht konnte nicht gesendet werden');
    }
  }

  /// Sendet eine Nachricht (für DirectChats)
  static Future<void> sendMessage({
    required String chatId,
    required String senderId,
    required String senderName,
    required String senderType, // 'customer' oder 'provider'
    required String message,
  }) async {
    try {
      debugPrint('📤 Sende Nachricht in Chat: $chatId');
      
      // SICHERHEITS-VALIDIERUNG: Nachricht auf verbotene Inhalte prüfen
      final validationError = _validateMessage(message);
      if (validationError != null) {
        debugPrint('❌ Nachricht blockiert: $validationError');
        throw Exception(validationError);
      }
      
      // Nachricht zur Messages-Subcollection hinzufügen
      final messagesRef = _firestore
          .collection('directChats')
          .doc(chatId)
          .collection('messages');
      
      await messagesRef.add({
        'senderId': senderId,
        'senderName': senderName,
        'senderType': senderType,
        'text': message,
        'timestamp': FieldValue.serverTimestamp(),
        'read': false,
      });
      
      // Chat-Dokument mit letzter Nachricht aktualisieren
      await _firestore.collection('directChats').doc(chatId).update({
        'lastMessage': message,
        'lastMessageSenderId': senderId,
        'lastMessageSenderName': senderName,
        'lastUpdated': FieldValue.serverTimestamp(),
      });
      
      debugPrint('✅ Nachricht gesendet');
      
    } catch (e) {
      debugPrint('❌ Fehler beim Senden der Nachricht: $e');
      throw Exception('Nachricht konnte nicht gesendet werden');
    }
  }

  /// Lädt Chat-Nachrichten für Auftragschats
  static Stream<List<Map<String, dynamic>>> getOrderChatMessages(String orderId) {
    debugPrint('📥 Lade Auftragschat-Nachrichten für: $orderId');
    
    return _firestore
        .collection('auftraege')
        .doc(orderId)
        .collection('nachrichten')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .handleError((error) {
      debugPrint('❌ FEHLER beim Laden der Auftragschat-Nachrichten: $error');
      debugPrint('❌ Error Type: ${error.runtimeType}');
      debugPrint('❌ OrderId: $orderId');
      debugPrint('❌ Query: auftraege/$orderId/nachrichten orderBy timestamp');
      throw error;
    })
        .map((snapshot) {
      try {
        debugPrint('✅ Auftragschat-Nachrichten-Snapshot erhalten: ${snapshot.docs.length} Nachrichten');
        List<Map<String, dynamic>> messages = [];
        
        for (final doc in snapshot.docs) {
          try {
            final data = doc.data();
            
            // Validierung der erforderlichen Felder mit detailliertem Logging
            final missingFields = <String>[];
            if (data['senderId'] == null || data['senderId'].toString().isEmpty) missingFields.add('senderId');
            if (data['text'] == null || data['text'].toString().isEmpty) missingFields.add('text');
            
            // Spezielle Behandlung für timestamp: Firebase serverTimestamp() kann initial null sein
            if (data['timestamp'] == null) {
              // Wenn timestamp null ist, verwende die aktuelle Zeit als Fallback
              debugPrint('⚠️ Timestamp ist null für Nachricht ${doc.id}, verwende Fallback');
              // Überspringe diese Nachricht nicht - Firebase wird sie beim nächsten Snapshot korrigieren
            }
            
            if (data['senderName'] == null || data['senderName'].toString().isEmpty) missingFields.add('senderName');
            if (data['senderType'] == null || data['senderType'].toString().isEmpty) missingFields.add('senderType');
            
            if (missingFields.isNotEmpty) {
              debugPrint('⚠️ Ungültige Nachricht übersprungen: ${doc.id}');
              debugPrint('   Fehlende Felder: ${missingFields.join(', ')}');
              debugPrint('   Vorhandene Daten: ${data.keys.toList()}');
              continue;
            }
            
            messages.add({
              'id': doc.id,
              'senderId': data['senderId'],
              'senderName': data['senderName'],
              'senderType': data['senderType'],
              'text': data['text'],
              'timestamp': data['timestamp'] ?? Timestamp.now(), // Fallback für null-Timestamps
            });
          } catch (e) {
            debugPrint('⚠️ Fehler beim Verarbeiten der Nachricht ${doc.id}: $e');
          }
        }
        
        debugPrint('✅ ${messages.length} gültige Auftragschat-Nachrichten geladen');
        return messages;
      } catch (e) {
        debugPrint('❌ Fehler beim Verarbeiten der Auftragschat-Nachrichten: $e');
        return <Map<String, dynamic>>[];
      }
    });
  }

  /// Lädt Chat-Nachrichten (für DirectChats)
  static Stream<List<Map<String, dynamic>>> getChatMessages(String chatId) {
    debugPrint('📥 Lade Chat-Nachrichten für: $chatId');
    
    return _firestore
        .collection('directChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .handleError((error) {
      debugPrint('❌ FEHLER beim Laden der Chat-Nachrichten: $error');
      debugPrint('❌ Error Type: ${error.runtimeType}');
      debugPrint('❌ ChatId: $chatId');
      debugPrint('❌ Query: directChats/$chatId/messages orderBy timestamp');
      throw error;
    })
        .map((snapshot) {
      try {
        debugPrint('✅ Nachrichten-Snapshot erhalten: ${snapshot.docs.length} Nachrichten');
        List<Map<String, dynamic>> messages = [];
        
        for (final doc in snapshot.docs) {
          try {
            final data = doc.data();
            
            final message = {
              'id': doc.id,
              'senderId': data['senderId'] ?? '',
              'senderName': data['senderName'] ?? '',
              'senderType': data['senderType'] ?? '',
              'text': data['text'] ?? '',
              'timestamp': data['timestamp']?.toDate() ?? DateTime.now(),
              'read': data['read'] ?? false,
              ...data,
            };
            
            messages.add(message);
          } catch (e) {
            debugPrint('❌ Fehler beim Verarbeiten von Nachrichten-Dokument ${doc.id}: $e');
          }
        }
        
        debugPrint('✅ Nachrichten erfolgreich geladen: ${messages.length} Nachrichten');
        return messages;
      } catch (e) {
        debugPrint('❌ Fehler beim Verarbeiten der Nachrichten-Snapshots: $e');
        return <Map<String, dynamic>>[];
      }
    });
  }

  /// Lädt Chat-Liste für einen Benutzer
  static Stream<List<Map<String, dynamic>>> getUserChats(String userId) {
    debugPrint('📋 Lade Chat-Liste für User: $userId');
    
    return _firestore
        .collection('directChats')
        .where('participants', arrayContains: userId)
        .orderBy('lastUpdated', descending: true)
        .snapshots()
        .handleError((error) {
      debugPrint('❌ FEHLER beim Laden der Chat-Liste: $error');
      debugPrint('❌ Error Type: ${error.runtimeType}');
      debugPrint('❌ Error Details: ${error.toString()}');
      debugPrint('❌ Query: directChats where participants array-contains $userId orderBy lastUpdated desc');
      throw error;
    })
        .map((snapshot) {
      try {
        debugPrint('✅ Chat-Snapshot erhalten: ${snapshot.docs.length} Chats');
        List<Map<String, dynamic>> chats = [];
        
        for (final doc in snapshot.docs) {
          try {
            final data = doc.data();
            debugPrint('📄 Chat-Dokument: ${doc.id}');
            if (kDebugMode) {
              debugPrint('📄 Chat-Dokument: ${doc.id}');
              debugPrint('📄 Participants: ${data['participants']}');
              debugPrint('📄 LastUpdated: ${data['lastUpdated']}');
            }
            final chat = {
              'id': doc.id,
              'participants': data['participants'] as List<dynamic>? ?? [],
              'customerInfo': data['customerInfo'] as Map<String, dynamic>? ?? {},
              'providerInfo': data['providerInfo'] as Map<String, dynamic>? ?? {},
              'lastMessage': data['lastMessage'] ?? '',
              'lastMessageSenderId': data['lastMessageSenderId'] ?? '',
              'lastMessageSenderName': data['lastMessageSenderName'] ?? '',
              'lastUpdated': data['lastUpdated']?.toDate() ?? DateTime.now(),
              'isActive': data['isActive'] ?? true,
              ...data,
            };
            
            chats.add(chat);
          } catch (e) {
            debugPrint('❌ Fehler beim Verarbeiten von Chat-Dokument ${doc.id}: $e');
          }
        }
        
        debugPrint('✅ Chat-Liste erfolgreich geladen: ${chats.length} Chats');
        return chats;
      } catch (e) {
        debugPrint('❌ Fehler beim Verarbeiten der Chat-Snapshots: $e');
        return <Map<String, dynamic>>[];
      }
    });
  }

  /// Markiert Nachrichten als gelesen
  static Future<void> markMessagesAsRead({
    required String chatId,
    required String userId,
  }) async {
    try {
      debugPrint('👁️ Markiere Nachrichten als gelesen: $chatId');
      
      final messagesQuery = await _firestore
          .collection('directChats')
          .doc(chatId)
          .collection('messages')
          .where('senderId', isNotEqualTo: userId)
          .where('read', isEqualTo: false)
          .get();

      final batch = _firestore.batch();
      
      for (final doc in messagesQuery.docs) {
        batch.update(doc.reference, {'read': true});
      }
      
      await batch.commit();
      debugPrint('✅ Nachrichten als gelesen markiert');
      
    } catch (e) {
      debugPrint('❌ Fehler beim Markieren der Nachrichten: $e');
    }
  }

  /// Prüft ob ein Chat zwischen zwei Benutzern existiert
  static Future<String?> findExistingChat(String userId1, String userId2) async {
    try {
      final chatId = _generateChatId(userId1, userId2);
      
      final chatDoc = await _firestore.collection('directChats').doc(chatId).get();
      
      if (chatDoc.exists) {
        return chatId;
      }
      
      return null;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Suchen des Chats: $e');
      return null;
    }
  }

  /// Generiert konsistente Chat-ID (wie in Web-Version)
  static String _generateChatId(String userId1, String userId2) {
    final sortedIds = [userId1, userId2]..sort();
    return '${sortedIds[0]}_${sortedIds[1]}';
  }

  /// Lädt ungelesene Nachrichten-Anzahl
  static Future<int> getUnreadMessageCount(String userId) async {
    try {
      final chats = await _firestore
          .collection('directChats')
          .where('participants', arrayContains: userId)
          .get();

      int totalUnread = 0;
      
      for (final chatDoc in chats.docs) {
        final unreadQuery = await chatDoc.reference
            .collection('messages')
            .where('senderId', isNotEqualTo: userId)
            .where('read', isEqualTo: false)
            .get();
            
        totalUnread += unreadQuery.docs.length;
      }
      
      return totalUnread;
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der ungelesenen Nachrichten: $e');
      return 0;
    }
  }
}
