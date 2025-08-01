import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import 'firebase_functions_service.dart';
import 'payment_service.dart';
import 'time_tracking_service.dart';

class TaskiloService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Service Categories
  static const List<String> serviceCategories = [
    'Haushalt & Reinigung',
    'Handwerk & Reparaturen',
    'Garten & Landschaftsbau',
    'Transport & Umzug',
    'Betreuung & Pflege',
    'Unterricht & Nachhilfe',
    'IT & Technik',
    'Beauty & Wellness',
    'Fotografie & Video',
    'Veranstaltungen',
    'Sonstiges'
  ];

  // Get all service providers
  Stream<List<TaskiloUser>> getServiceProviders() {
    return _firestore
        .collection('users')
        .where('userType', isEqualTo: 'serviceProvider')
        .where('profile.isAvailable', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TaskiloUser.fromFirestore(doc))
            .toList());
  }

  // Get service providers by category
  Stream<List<TaskiloUser>> getServiceProvidersByCategory(String category) {
    return _firestore
        .collection('users')
        .where('userType', isEqualTo: 'serviceProvider')
        .where('profile.skills', arrayContains: category)
        .where('profile.isAvailable', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TaskiloUser.fromFirestore(doc))
            .toList());
  }

  // Search service providers
  Future<List<TaskiloUser>> searchServiceProviders(String query) async {
    final snapshot = await _firestore
        .collection('users')
        .where('userType', isEqualTo: 'serviceProvider')
        .where('profile.isAvailable', isEqualTo: true)
        .get();

    return snapshot.docs
        .map((doc) => TaskiloUser.fromFirestore(doc))
        .where((user) {
          final profile = user.profile;
          if (profile == null) return false;
          
          final searchText = query.toLowerCase();
          return profile.skills?.any((skill) => 
              skill.toLowerCase().contains(searchText)) == true ||
              profile.bio?.toLowerCase().contains(searchText) == true ||
              profile.fullName.toLowerCase().contains(searchText);
        })
        .toList();
  }

  // Update user to service provider
  Future<void> becomeServiceProvider(String userId, UserProfile profile) async {
    await _firestore.collection('users').doc(userId).update({
      'userType': 'serviceProvider',
      'profile': profile.copyWith(
        isAvailable: true,
        completedJobs: 0,
        rating: 0.0,
      ).toMap(),
    });
  }

  // Update service provider availability
  Future<void> updateAvailability(String userId, bool isAvailable) async {
    await _firestore.collection('users').doc(userId).update({
      'profile.isAvailable': isAvailable,
    });
  }

  // Get user statistics
  Future<Map<String, dynamic>> getUserStats(String userId) async {
    final userDoc = await _firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) return {};

    final user = TaskiloUser.fromFirestore(userDoc);
    final profile = user.profile;

    return {
      'rating': profile?.rating ?? 0.0,
      'completedJobs': profile?.completedJobs ?? 0,
      'isAvailable': profile?.isAvailable ?? false,
      'activeOrders': await _getActiveOrdersCount(userId),
    };
  }

  // ===== ORDER MANAGEMENT =====

  /// Holt Orders für User Dashboard
  Future<List<Map<String, dynamic>>> getUserOrders({
    String? status,
    int? limit,
  }) async {
    return await FirebaseFunctionsService.getUserOrders(
      status: status,
      limit: limit,
    );
  }

  /// Holt Orders für Provider Dashboard
  Future<List<Map<String, dynamic>>> getProviderOrders({
    String? status,
    int? limit,
  }) async {
    return await FirebaseFunctionsService.getProviderOrders(
      status: status,
      limit: limit,
    );
  }

  /// Aktualisiert Order Status
  Future<bool> updateOrderStatus({
    required String orderId,
    required String status,
    String? message,
  }) async {
    return await FirebaseFunctionsService.updateOrderStatus(
      orderId: orderId,
      status: status,
      message: message,
    );
  }

  // ===== PAYMENT INTEGRATION =====

  /// Verarbeitet B2C Service-Payment
  Future<PaymentResult> processServicePayment({
    required String providerId,
    required String serviceTitle,
    required String serviceDescription,
    required double amount,
  }) async {
    return await TaskiloPaymentService.processB2CPayment(
      providerId: providerId,
      serviceTitle: serviceTitle,
      serviceDescription: serviceDescription,
      amount: amount,
      metadata: {
        'type': 'service_booking',
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Verarbeitet B2B Projekt-Payment
  Future<PaymentResult> processProjectPayment({
    required String providerId,
    required String projectTitle,
    required String projectDescription,
    required double totalAmount,
    required List<ProjectMilestone> milestones,
  }) async {
    return await TaskiloPaymentService.processB2BProjectPayment(
      providerId: providerId,
      projectTitle: projectTitle,
      projectDescription: projectDescription,
      totalAmount: totalAmount,
      milestones: milestones,
      metadata: {
        'type': 'project_booking',
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Verarbeitet Stunden-Payment
  Future<PaymentResult> processHourlyPayment({
    required String providerId,
    required String orderId,
    required double hoursWorked,
    required double hourlyRate,
  }) async {
    return await TaskiloPaymentService.processHourlyPayment(
      providerId: providerId,
      orderId: orderId,
      hoursWorked: hoursWorked,
      hourlyRate: hourlyRate,
    );
  }

  // ===== TIME TRACKING =====

  /// Startet Zeiterfassung für einen Order
  Future<TimeTrackingResult> startTimeTracking({
    required String orderId,
    required String taskDescription,
    String? notes,
  }) async {
    return await TimeTrackingService.startTracking(
      orderId: orderId,
      taskDescription: taskDescription,
      notes: notes,
    );
  }

  /// Stoppt aktuelle Zeiterfassung
  Future<TimeTrackingResult> stopTimeTracking({
    String? finalNotes,
  }) async {
    return await TimeTrackingService.stopTracking(
      finalNotes: finalNotes,
    );
  }

  /// Holt Time Tracking History
  Future<List<TimeTrackingSession>> getTimeTrackingHistory({
    required String orderId,
  }) async {
    return await TimeTrackingService.getTrackingHistory(
      orderId: orderId,
    );
  }

  // ===== AI ASSISTANT =====

  /// AI Project Assistant für Service-Matching
  Future<Map<String, dynamic>> getAIAssistance({
    required String message,
    required String context,
    Map<String, dynamic>? orderData,
  }) async {
    return await FirebaseFunctionsService.getAIAssistance(
      message: message,
      context: context,
      orderData: orderData,
    );
  }

  // ===== PROVIDER ONBOARDING =====

  /// Erstellt Stripe Connected Account für Provider
  Future<Map<String, dynamic>> createProviderAccount({
    required String email,
    required String businessName,
    required String businessType,
    required Map<String, dynamic> address,
  }) async {
    return await FirebaseFunctionsService.createProviderAccount(
      email: email,
      businessName: businessName,
      businessType: businessType,
      address: address,
    );
  }

  /// Prüft Provider Account Status
  Future<Map<String, dynamic>> getProviderAccountStatus() async {
    return await FirebaseFunctionsService.getProviderAccountStatus();
  }

  // ===== ANALYTICS =====

  /// Holt Dashboard Analytics
  Future<Map<String, dynamic>> getDashboardAnalytics({
    required String userType,
    String? timeframe,
  }) async {
    return await FirebaseFunctionsService.getDashboardAnalytics(
      userType: userType,
      timeframe: timeframe,
    );
  }

  // ===== PRIVATE HELPERS =====

  Future<int> _getActiveOrdersCount(String userId) async {
    final ordersSnapshot = await _firestore
        .collection('orders')
        .where('customerId', isEqualTo: userId)
        .where('status', whereIn: ['pending', 'in_progress'])
        .get();
    
    return ordersSnapshot.docs.length;
  }
}

extension UserProfileExtension on UserProfile {
  UserProfile copyWith({
    String? firstName,
    String? lastName,
    String? address,
    String? city,
    String? postalCode,
    String? country,
    String? bio,
    List<String>? skills,
    double? rating,
    int? completedJobs,
    bool? isAvailable,
  }) {
    return UserProfile(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      address: address ?? this.address,
      city: city ?? this.city,
      postalCode: postalCode ?? this.postalCode,
      country: country ?? this.country,
      bio: bio ?? this.bio,
      skills: skills ?? this.skills,
      rating: rating ?? this.rating,
      completedJobs: completedJobs ?? this.completedJobs,
      isAvailable: isAvailable ?? this.isAvailable,
    );
  }
}
