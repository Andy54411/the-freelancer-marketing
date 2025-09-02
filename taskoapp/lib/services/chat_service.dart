import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

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

  /// Sendet eine Nachricht
  static Future<void> sendMessage({
    required String chatId,
    required String senderId,
    required String senderName,
    required String senderType, // 'customer' oder 'provider'
    required String message,
  }) async {
    try {
      debugPrint('📤 Sende Nachricht in Chat: $chatId');
      
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

  /// Lädt Chat-Nachrichten
  static Stream<List<Map<String, dynamic>>> getChatMessages(String chatId) {
    debugPrint('📥 Lade Chat-Nachrichten für: $chatId');
    
    return _firestore
        .collection('directChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) {
      List<Map<String, dynamic>> messages = [];
      
      for (final doc in snapshot.docs) {
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
      }
      
      return messages;
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
        .map((snapshot) {
      List<Map<String, dynamic>> chats = [];
      
      for (final doc in snapshot.docs) {
        final data = doc.data();
        
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
      }
      
      return chats;
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
