import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

class ChatbotService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Enhanced Chatbot API Integration
  Future<Map<String, dynamic>> sendChatMessage({
    required String sessionId,
    required String userMessage,
    required String customerId,
    required String customerName,
    required String customerEmail,
  }) async {
    try {
      final callable = _functions.httpsCallable('enhancedChatbot');
      final result = await callable.call({
        'action': 'chat',
        'sessionId': sessionId,
        'userMessage': userMessage,
        'customerId': customerId,
        'customerName': customerName,
        'customerEmail': customerEmail,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to send chat message: $e');
    }
  }

  // Get chat session status
  Future<Map<String, dynamic>> getSessionStatus({
    required String sessionId,
    required String customerId,
  }) async {
    try {
      final callable = _functions.httpsCallable('enhancedChatbot');
      final result = await callable.call({
        'action': 'getStatus',
        'sessionId': sessionId,
        'customerId': customerId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get session status: $e');
    }
  }

  // Request human support handover
  Future<Map<String, dynamic>> requestHumanSupport({
    required String sessionId,
    required String customerId,
    required String customerName,
    required String customerEmail,
    String? reason,
  }) async {
    try {
      final callable = _functions.httpsCallable('enhancedChatbot');
      final result = await callable.call({
        'action': 'requestHuman',
        'sessionId': sessionId,
        'customerId': customerId,
        'customerName': customerName,
        'customerEmail': customerEmail,
        'reason': reason,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to request human support: $e');
    }
  }

  // Support Dashboard API
  Future<Map<String, dynamic>> getSupportDashboard({
    required String supportAgentId,
  }) async {
    try {
      final callable = _functions.httpsCallable('supportDashboard');
      final result = await callable.call({
        'supportAgentId': supportAgentId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to get support dashboard: $e');
    }
  }

  // Stream support chat messages
  Stream<List<Map<String, dynamic>>> streamSupportMessages(String chatId) {
    return _firestore
        .collection('supportChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => {'id': doc.id, ...doc.data()})
            .toList());
  }

  // Create support chat session
  Future<String> createSupportSession({
    required String customerId,
    required String customerName,
    required String customerEmail,
    String? initialMessage,
  }) async {
    try {
      final sessionRef = await _firestore.collection('supportChats').add({
        'customerId': customerId,
        'customerName': customerName,
        'customerEmail': customerEmail,
        'status': 'active',
        'assignedAgent': null,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'tags': [],
        'priority': 'normal',
      });

      if (initialMessage != null && initialMessage.isNotEmpty) {
        await sessionRef.collection('messages').add({
          'message': initialMessage,
          'senderId': customerId,
          'senderName': customerName,
          'senderType': 'customer',
          'timestamp': FieldValue.serverTimestamp(),
          'messageType': 'text',
        });
      }

      return sessionRef.id;
    } catch (e) {
      throw Exception('Failed to create support session: $e');
    }
  }

  // Send message in support chat
  Future<void> sendSupportMessage({
    required String chatId,
    required String message,
    required String senderId,
    required String senderName,
    required String senderType, // 'customer', 'support', 'bot'
  }) async {
    try {
      await _firestore
          .collection('supportChats')
          .doc(chatId)
          .collection('messages')
          .add({
        'message': message,
        'senderId': senderId,
        'senderName': senderName,
        'senderType': senderType,
        'timestamp': FieldValue.serverTimestamp(),
        'messageType': 'text',
      });

      // Update chat's last activity
      await _firestore.collection('supportChats').doc(chatId).update({
        'updatedAt': FieldValue.serverTimestamp(),
        'lastMessage': message,
        'lastMessageSender': senderName,
      });
    } catch (e) {
      throw Exception('Failed to send support message: $e');
    }
  }

  // Close support chat
  Future<void> closeSupportChat(String chatId) async {
    try {
      await _firestore.collection('supportChats').doc(chatId).update({
        'status': 'closed',
        'closedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to close support chat: $e');
    }
  }

  // Get customer's support chats
  Future<List<Map<String, dynamic>>> getCustomerSupportChats(String customerId) async {
    try {
      final querySnapshot = await _firestore
          .collection('supportChats')
          .where('customerId', isEqualTo: customerId)
          .orderBy('updatedAt', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();
    } catch (e) {
      throw Exception('Failed to get customer support chats: $e');
    }
  }
}
