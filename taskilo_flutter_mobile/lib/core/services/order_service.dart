import 'package:cloud_functions/cloud_functions.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../firebase_service.dart';
import '../../models/order_model.dart';
import '../../models/time_tracking_model.dart';

class OrderService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  OrderService() {
    // Set Firebase Functions region to match backend
    _functions.useFunctionsEmulator('localhost', 5001); // Only for development
  }

  /// Get orders for a user (B2C)
  Future<List<OrderModel>> getUserOrders({
    required String userId,
    String? status,
  }) async {
    try {
      final getUserOrdersFunction = _functions.httpsCallable('getUserOrders');
      
      final result = await getUserOrdersFunction.call({
        'userId': userId,
        if (status != null) 'status': status,
      });

      final List<dynamic> ordersData = result.data['orders'] ?? [];
      
      return ordersData.map((orderData) => OrderModel.fromFirestore(
        orderData['id'],
        orderData,
      )).toList();
    } catch (e) {
      print('Error getting user orders: $e');
      throw Exception('Fehler beim Laden der Aufträge: $e');
    }
  }

  /// Get orders for a provider/company (B2B)
  Future<List<OrderModel>> getProviderOrders({
    required String providerId,
    String? status,
  }) async {
    try {
      final getProviderOrdersFunction = _functions.httpsCallable('getProviderOrders');
      
      final result = await getProviderOrdersFunction.call({
        'providerId': providerId,
        if (status != null) 'status': status,
      });

      final List<dynamic> ordersData = result.data['orders'] ?? [];
      
      return ordersData.map((orderData) => OrderModel.fromFirestore(
        orderData['id'],
        orderData,
      )).toList();
    } catch (e) {
      print('Error getting provider orders: $e');
      throw Exception('Fehler beim Laden der Anbieter-Aufträge: $e');
    }
  }

  /// Get specific order details with participant information
  Future<OrderModel?> getOrderDetails(String orderId) async {
    try {
      // Get order document
      final orderDoc = await _firestore
          .collection('auftraege')
          .doc(orderId)
          .get();

      if (!orderDoc.exists) {
        return null;
      }

      // Get participant details using Cloud Function
      final getParticipantDetailsFunction = 
          _functions.httpsCallable('getOrderParticipantDetails');
      
      final participantResult = await getParticipantDetailsFunction.call({
        'orderId': orderId,
      });

      final orderData = orderDoc.data()!;
      final providerDetails = participantResult.data['provider'];
      final customerDetails = participantResult.data['customer'];

      // Create enhanced order model with participant details
      return OrderModel.fromFirestore(orderId, {
        ...orderData,
        'providerName': providerDetails['name'],
        'providerAvatarUrl': providerDetails['avatarUrl'],
        'customerName': customerDetails['name'],
        'customerAvatarUrl': customerDetails['avatarUrl'],
      });
    } catch (e) {
      print('Error getting order details: $e');
      throw Exception('Fehler beim Laden der Auftragsdetails: $e');
    }
  }

  /// Accept an order (Provider action)
  Future<void> acceptOrder(String orderId) async {
    try {
      final acceptOrderFunction = _functions.httpsCallable('acceptOrder');
      
      await acceptOrderFunction.call({
        'orderId': orderId,
      });
    } catch (e) {
      print('Error accepting order: $e');
      throw Exception('Fehler beim Annehmen des Auftrags: $e');
    }
  }

  /// Reject an order (Provider action)
  Future<void> rejectOrder(String orderId, String reason) async {
    try {
      final rejectOrderFunction = _functions.httpsCallable('rejectOrder');
      
      await rejectOrderFunction.call({
        'orderId': orderId,
        'reason': reason,
      });
    } catch (e) {
      print('Error rejecting order: $e');
      throw Exception('Fehler beim Ablehnen des Auftrags: $e');
    }
  }

  /// Initialize time tracking for an order
  Future<void> initializeTimeTracking({
    required String orderId,
    required double originalPlannedHours,
    required double hourlyRate,
  }) async {
    try {
      final initTimeTrackingFunction = 
          _functions.httpsCallable('initializeTimeTracking');
      
      await initTimeTrackingFunction.call({
        'orderId': orderId,
        'originalPlannedHours': originalPlannedHours,
        'hourlyRate': hourlyRate,
      });
    } catch (e) {
      print('Error initializing time tracking: $e');
      throw Exception('Fehler beim Initialisieren der Zeiterfassung: $e');
    }
  }

  /// Log a time entry
  Future<void> logTimeEntry({
    required String orderId,
    required DateTime date,
    required String startTime,
    String? endTime,
    required double hours,
    required String description,
    required String category, // 'original' or 'additional'
    bool isBreakTime = false,
    int? breakMinutes,
    String? notes,
  }) async {
    try {
      final logTimeEntryFunction = _functions.httpsCallable('logTimeEntry');
      
      await logTimeEntryFunction.call({
        'orderId': orderId,
        'date': '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
        'startTime': startTime,
        if (endTime != null) 'endTime': endTime,
        'hours': hours,
        'description': description,
        'category': category,
        'isBreakTime': isBreakTime,
        if (breakMinutes != null) 'breakMinutes': breakMinutes,
        if (notes != null) 'notes': notes,
      });
    } catch (e) {
      print('Error logging time entry: $e');
      throw Exception('Fehler beim Erfassen der Arbeitszeit: $e');
    }
  }

  /// Submit time entries for customer approval
  Future<void> submitForCustomerApproval({
    required String orderId,
    required List<String> entryIds,
    String? providerMessage,
  }) async {
    try {
      final submitForApprovalFunction = 
          _functions.httpsCallable('submitForCustomerApproval');
      
      await submitForApprovalFunction.call({
        'orderId': orderId,
        'entryIds': entryIds,
        if (providerMessage != null) 'providerMessage': providerMessage,
      });
    } catch (e) {
      print('Error submitting for approval: $e');
      throw Exception('Fehler beim Einreichen zur Genehmigung: $e');
    }
  }

  /// Process customer approval/rejection
  Future<void> processCustomerApproval({
    required String approvalRequestId,
    required String decision, // 'approved', 'rejected', 'partially_approved'
    List<String>? approvedEntryIds,
    String? customerFeedback,
  }) async {
    try {
      final processApprovalFunction = 
          _functions.httpsCallable('processCustomerApproval');
      
      await processApprovalFunction.call({
        'approvalRequestId': approvalRequestId,
        'decision': decision,
        if (approvedEntryIds != null) 'approvedEntryIds': approvedEntryIds,
        if (customerFeedback != null) 'customerFeedback': customerFeedback,
      });
    } catch (e) {
      print('Error processing approval: $e');
      throw Exception('Fehler beim Verarbeiten der Genehmigung: $e');
    }
  }

  /// Bill approved additional hours
  Future<Map<String, dynamic>> billApprovedAdditionalHours({
    required String orderId,
    required List<String> approvedEntryIds,
  }) async {
    try {
      final billHoursFunction = 
          _functions.httpsCallable('billApprovedAdditionalHours');
      
      final result = await billHoursFunction.call({
        'orderId': orderId,
        'approvedEntryIds': approvedEntryIds,
      });

      return {
        'paymentIntentId': result.data['paymentIntentId'],
        'clientSecret': result.data['clientSecret'],
        'customerPays': result.data['customerPays'],
        'totalHours': result.data['totalHours'],
      };
    } catch (e) {
      print('Error billing approved hours: $e');
      throw Exception('Fehler beim Abrechnen der genehmigten Stunden: $e');
    }
  }

  /// Get time tracking data for an order
  Future<TimeTrackingModel?> getTimeTrackingData(String orderId) async {
    try {
      final timeTrackingDoc = await _firestore
          .collection('orders')
          .doc(orderId)
          .collection('timeTracking')
          .doc('summary')
          .get();

      if (!timeTrackingDoc.exists) {
        return null;
      }

      return TimeTrackingModel.fromFirestore(timeTrackingDoc.data()!);
    } catch (e) {
      print('Error getting time tracking data: $e');
      throw Exception('Fehler beim Laden der Zeiterfassungsdaten: $e');
    }
  }

  /// Stream order updates
  Stream<OrderModel?> streamOrderUpdates(String orderId) {
    return _firestore
        .collection('auftraege')
        .doc(orderId)
        .snapshots()
        .map((snapshot) {
      if (!snapshot.exists) return null;
      
      return OrderModel.fromFirestore(
        snapshot.id,
        snapshot.data()!,
      );
    });
  }

  /// Stream orders for a user/provider
  Stream<List<OrderModel>> streamUserOrders({
    required String userId,
    String? status,
    bool isProvider = false,
  }) {
    Query query = _firestore.collection('auftraege');
    
    if (isProvider) {
      query = query.where('selectedAnbieterId', isEqualTo: userId);
    } else {
      query = query.where('customerFirebaseUid', isEqualTo: userId);
    }

    if (status != null) {
      query = query.where('status', isEqualTo: status);
    }

    query = query.orderBy('createdAt', descending: true);

    return query.snapshots().map((snapshot) {
      return snapshot.docs.map((doc) {
        return OrderModel.fromFirestore(doc.id, doc.data() as Map<String, dynamic>);
      }).toList();
    });
  }

  /// Create a new order (B2C/B2B)
  Future<String> createOrder({
    required String serviceId,
    required String providerId,
    required String customerId,
    required String description,
    required DateTime jobDateFrom,
    DateTime? jobDateTo,
    required String timePreference,
    required double totalHours,
    required double hourlyRate,
    required String category,
    required String subcategory,
    required String jobStreet,
    required String jobCity,
    required String jobPostalCode,
    required String jobCountry,
    String customerType = 'private', // 'private' or 'business'
  }) async {
    try {
      final orderData = {
        'serviceId': serviceId,
        'selectedAnbieterId': providerId,
        'customerFirebaseUid': customerId,
        'description': description,
        'jobDateFrom': jobDateFrom.toIso8601String().split('T')[0],
        'jobDateTo': jobDateTo?.toIso8601String().split('T')[0],
        'jobTimePreference': timePreference,
        'jobTotalCalculatedHours': totalHours,
        'jobCalculatedPriceInCents': (totalHours * hourlyRate * 100).round(),
        'selectedCategory': category,
        'selectedSubcategory': subcategory,
        'jobStreet': jobStreet,
        'jobCity': jobCity,
        'jobPostalCode': jobPostalCode,
        'jobCountry': jobCountry,
        'customerType': customerType,
        'status': 'IN BEARBEITUNG',
        'createdAt': FieldValue.serverTimestamp(),
        'lastUpdatedAt': FieldValue.serverTimestamp(),
      };

      final docRef = await _firestore.collection('auftraege').add(orderData);
      return docRef.id;
    } catch (e) {
      print('Error creating order: $e');
      throw Exception('Fehler beim Erstellen des Auftrags: $e');
    }
  }

  /// Search for available providers
  Future<List<Map<String, dynamic>>> searchAvailableProviders({
    required String category,
    required String subcategory,
    required String postalCode,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final searchProvidersFunction = 
          _functions.httpsCallable('searchAvailableProviders');
      
      final result = await searchProvidersFunction.call({
        'category': category,
        'subcategory': subcategory,
        'postalCode': postalCode,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      });

      return List<Map<String, dynamic>>.from(result.data['providers'] ?? []);
    } catch (e) {
      print('Error searching providers: $e');
      throw Exception('Fehler beim Suchen nach Anbietern: $e');
    }
  }
}
