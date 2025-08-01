import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import '../models/order_model.dart';
import '../config/firebase_options.dart';

class FirebaseService extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instanceFor(region: functionsRegion);
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  // Orders für Provider laden (wie in der Web-App)
  Future<List<OrderModel>> getProviderOrders(String providerId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      // Rufe die gleiche Cloud Function auf wie im Web
      final callable = _functions.httpsCallable('getProviderOrders');
      final result = await callable.call({'providerId': providerId});
      
      final List<dynamic> ordersData = result.data['orders'] ?? [];
      
      return ordersData.map((orderData) {
        return OrderModel.fromMap(orderData);
      }).toList();
      
    } catch (e) {
      _errorMessage = 'Fehler beim Laden der Aufträge: $e';
      return [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Orders für User laden
  Future<List<OrderModel>> getUserOrders(String userId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final callable = _functions.httpsCallable('getUserOrders');
      final result = await callable.call({'userId': userId});
      
      final List<dynamic> ordersData = result.data['orders'] ?? [];
      
      return ordersData.map((orderData) {
        return OrderModel.fromMap(orderData);
      }).toList();
      
    } catch (e) {
      _errorMessage = 'Fehler beim Laden der Aufträge: $e';
      return [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Auftrag annehmen (wie in der Web-App)
  Future<bool> acceptOrder(String orderId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final callable = _functions.httpsCallable('acceptOrderHTTP');
      await callable.call({'orderId': orderId});
      
      return true;
    } catch (e) {
      _errorMessage = 'Fehler beim Annehmen des Auftrags: $e';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Auftrag ablehnen
  Future<bool> rejectOrder(String orderId, String reason) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final callable = _functions.httpsCallable('rejectOrder');
      await callable.call({
        'orderId': orderId,
        'reason': reason,
      });
      
      return true;
    } catch (e) {
      _errorMessage = 'Fehler beim Ablehnen des Auftrags: $e';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Real-time Orders Stream für Live-Updates
  Stream<List<OrderModel>> getProviderOrdersStream(String providerId) {
    return _firestore
        .collection('auftraege')
        .where('selectedAnbieterId', isEqualTo: providerId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        final data = doc.data();
        data['id'] = doc.id;
        return OrderModel.fromMap(data);
      }).toList();
    });
  }

  // Real-time Chat Messages
  Stream<QuerySnapshot> getChatMessages(String orderId) {
    return _firestore
        .collection('auftraege')
        .doc(orderId)
        .collection('messages')
        .orderBy('timestamp', descending: true)
        .snapshots();
  }

  // Nachricht senden
  Future<bool> sendMessage(String orderId, String message, String senderId) async {
    try {
      await _firestore
          .collection('auftraege')
          .doc(orderId)
          .collection('messages')
          .add({
        'message': message,
        'senderId': senderId,
        'timestamp': FieldValue.serverTimestamp(),
        'type': 'text',
      });
      
      return true;
    } catch (e) {
      _errorMessage = 'Fehler beim Senden der Nachricht: $e';
      return false;
    }
  }

  // Zeiterfassung starten/stoppen (basierend auf TimeTrackingManager)
  Future<bool> startTimeTracking(String orderId, String description) async {
    try {
      final callable = _functions.httpsCallable('startTimeTracking');
      await callable.call({
        'orderId': orderId,
        'description': description,
      });
      
      return true;
    } catch (e) {
      _errorMessage = 'Fehler beim Starten der Zeiterfassung: $e';
      return false;
    }
  }

  Future<bool> stopTimeTracking(String orderId) async {
    try {
      final callable = _functions.httpsCallable('stopTimeTracking');
      await callable.call({'orderId': orderId});
      
      return true;
    } catch (e) {
      _errorMessage = 'Fehler beim Stoppen der Zeiterfassung: $e';
      return false;
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
