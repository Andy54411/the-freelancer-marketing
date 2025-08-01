import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/time_tracking_model.dart';

class TimeTrackingService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Start time tracking for an order
  Future<String> startTimeTracking({
    required String orderId,
    required String providerId,
    String? description,
  }) async {
    try {
      final timeTracking = TimeTrackingModel(
        id: '', // Will be set by Firestore
        orderId: orderId,
        providerId: providerId,
        startTime: DateTime.now(),
        endTime: null,
        totalHours: 0.0,
        status: 'active',
        description: description,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final docRef = await _firestore
          .collection('timeTracking')
          .add(timeTracking.toMap());

      return docRef.id;
    } catch (e) {
      throw Exception('Failed to start time tracking: $e');
    }
  }

  // Stop time tracking
  Future<void> stopTimeTracking({
    required String timeTrackingId,
    String? description,
  }) async {
    try {
      final doc = await _firestore
          .collection('timeTracking')
          .doc(timeTrackingId)
          .get();

      if (!doc.exists) {
        throw Exception('Time tracking entry not found');
      }

      final data = doc.data()!;
      final startTime = (data['startTime'] as Timestamp).toDate();
      final endTime = DateTime.now();
      final totalHours = endTime.difference(startTime).inMinutes / 60.0;

      await _firestore
          .collection('timeTracking')
          .doc(timeTrackingId)
          .update({
        'endTime': Timestamp.fromDate(endTime),
        'totalHours': totalHours,
        'status': 'completed',
        'description': description ?? data['description'],
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
    } catch (e) {
      throw Exception('Failed to stop time tracking: $e');
    }
  }

  // Get time entries for a provider
  Future<List<TimeTrackingModel>> getTimeEntriesForProvider(String providerId) async {
    try {
      final querySnapshot = await _firestore
          .collection('timeTracking')
          .where('providerId', isEqualTo: providerId)
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => TimeTrackingModel.fromMap(doc.data(), doc.id))
          .toList();
    } catch (e) {
      throw Exception('Failed to get time entries: $e');
    }
  }

  // Get time entries for an order
  Future<List<TimeTrackingModel>> getTimeEntriesForOrder(String orderId) async {
    try {
      final querySnapshot = await _firestore
          .collection('timeTracking')
          .where('orderId', isEqualTo: orderId)
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => TimeTrackingModel.fromMap(doc.data(), doc.id))
          .toList();
    } catch (e) {
      throw Exception('Failed to get time entries for order: $e');
    }
  }

  // Approve time entry (for customers)
  Future<void> approveTimeEntry(String timeTrackingId) async {
    try {
      await _firestore
          .collection('timeTracking')
          .doc(timeTrackingId)
          .update({
        'status': 'approved',
        'approvedAt': Timestamp.fromDate(DateTime.now()),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
    } catch (e) {
      throw Exception('Failed to approve time entry: $e');
    }
  }

  // Reject time entry (for customers)
  Future<void> rejectTimeEntry(String timeTrackingId, String reason) async {
    try {
      await _firestore
          .collection('timeTracking')
          .doc(timeTrackingId)
          .update({
        'status': 'rejected',
        'rejectionReason': reason,
        'rejectedAt': Timestamp.fromDate(DateTime.now()),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
    } catch (e) {
      throw Exception('Failed to reject time entry: $e');
    }
  }

  // Update time entry description
  Future<void> updateDescription(String timeTrackingId, String description) async {
    try {
      await _firestore
          .collection('timeTracking')
          .doc(timeTrackingId)
          .update({
        'description': description,
        'updatedAt': Timestamp.fromDate(DateTime.now()),
      });
    } catch (e) {
      throw Exception('Failed to update description: $e');
    }
  }

  // Get active time tracking session for provider
  Future<TimeTrackingModel?> getActiveSession(String providerId) async {
    try {
      final querySnapshot = await _firestore
          .collection('timeTracking')
          .where('providerId', isEqualTo: providerId)
          .where('status', isEqualTo: 'active')
          .limit(1)
          .get();

      if (querySnapshot.docs.isEmpty) {
        return null;
      }

      final doc = querySnapshot.docs.first;
      return TimeTrackingModel.fromMap(doc.data(), doc.id);
    } catch (e) {
      throw Exception('Failed to get active session: $e');
    }
  }

  // Get total hours for an order
  Future<double> getTotalHoursForOrder(String orderId) async {
    try {
      final querySnapshot = await _firestore
          .collection('timeTracking')
          .where('orderId', isEqualTo: orderId)
          .where('status', whereIn: ['completed', 'approved'])
          .get();

      double totalHours = 0.0;
      for (final doc in querySnapshot.docs) {
        final data = doc.data();
        totalHours += (data['totalHours'] as num?)?.toDouble() ?? 0.0;
      }

      return totalHours;
    } catch (e) {
      throw Exception('Failed to get total hours: $e');
    }
  }

  // Get time tracking statistics for provider
  Future<Map<String, dynamic>> getProviderStats(String providerId) async {
    try {
      final querySnapshot = await _firestore
          .collection('timeTracking')
          .where('providerId', isEqualTo: providerId)
          .get();

      double totalHours = 0.0;
      double totalEarnings = 0.0;
      int completedSessions = 0;
      int approvedSessions = 0;

      for (final doc in querySnapshot.docs) {
        final data = doc.data();
        final status = data['status'] as String;
        final hours = (data['totalHours'] as num?)?.toDouble() ?? 0.0;
        final hourlyRate = (data['hourlyRate'] as num?)?.toDouble() ?? 0.0;

        if (status == 'completed' || status == 'approved') {
          totalHours += hours;
          totalEarnings += hours * hourlyRate;
          
          if (status == 'completed') completedSessions++;
          if (status == 'approved') approvedSessions++;
        }
      }

      return {
        'totalHours': totalHours,
        'totalEarnings': totalEarnings,
        'completedSessions': completedSessions,
        'approvedSessions': approvedSessions,
        'totalSessions': querySnapshot.docs.length,
      };
    } catch (e) {
      throw Exception('Failed to get provider stats: $e');
    }
  }

  // Stream time entries for real-time updates
  Stream<List<TimeTrackingModel>> streamTimeEntriesForProvider(String providerId) {
    return _firestore
        .collection('timeTracking')
        .where('providerId', isEqualTo: providerId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TimeTrackingModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // Stream time entries for an order
  Stream<List<TimeTrackingModel>> streamTimeEntriesForOrder(String orderId) {
    return _firestore
        .collection('timeTracking')
        .where('orderId', isEqualTo: orderId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TimeTrackingModel.fromMap(doc.data(), doc.id))
            .toList());
  }
}
