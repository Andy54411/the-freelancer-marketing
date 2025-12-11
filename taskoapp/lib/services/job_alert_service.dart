import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

/// Service für Job-Alerts / Jobfinder
/// Ermöglicht Benutzern, Suchkriterien zu speichern und
/// bei neuen passenden Jobs benachrichtigt zu werden
class JobAlertService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Erstellt einen neuen Job-Alert
  Future<String> createJobAlert({
    required String name,
    String? searchTerm,
    String? location,
    String? category,
    String? jobType,
    double? radiusKm,
    bool emailNotification = false,
    bool pushNotification = true,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User nicht eingeloggt');

    final alertRef = _db
        .collection('users')
        .doc(user.uid)
        .collection('jobfinder')  // Gleiche Collection wie Web-Version
        .doc();

    final alertData = {
      'id': alertRef.id,
      'userId': user.uid,
      'name': name,
      'searchTerm': searchTerm,
      'location': location,
      'category': category,
      'jobType': jobType,
      'radiusKm': radiusKm ?? 50.0,
      'emailNotification': emailNotification,
      'pushNotification': pushNotification,
      'active': true,  // Web-Version nutzt 'active' statt 'isActive'
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastNotifiedAt': null,
      'matchCount': 0,
    };

    await alertRef.set(alertData);
    debugPrint('✅ Job-Alert erstellt: ${alertRef.id}');

    return alertRef.id;
  }

  /// Lädt alle Job-Alerts des aktuellen Benutzers
  Future<List<Map<String, dynamic>>> getJobAlerts() async {
    final user = _auth.currentUser;
    if (user == null) return [];

    try {
      final snapshot = await _db
          .collection('users')
          .doc(user.uid)
          .collection('jobfinder')
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data();
        // Füge die Document-ID hinzu falls nicht vorhanden
        if (!data.containsKey('id')) {
          data['id'] = doc.id;
        }
        return data;
      }).toList();
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Job-Alerts: $e');
      return [];
    }
  }

  /// Aktualisiert einen Job-Alert
  Future<void> updateJobAlert({
    required String alertId,
    String? name,
    String? searchTerm,
    String? location,
    String? category,
    String? jobType,
    double? radiusKm,
    bool? emailNotification,
    bool? pushNotification,
    bool? isActive,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User nicht eingeloggt');

    final updateData = <String, dynamic>{
      'updatedAt': FieldValue.serverTimestamp(),
    };

    if (name != null) updateData['name'] = name;
    if (searchTerm != null) updateData['searchTerm'] = searchTerm;
    if (location != null) updateData['location'] = location;
    if (category != null) updateData['category'] = category;
    if (jobType != null) updateData['jobType'] = jobType;
    if (radiusKm != null) updateData['radiusKm'] = radiusKm;
    if (emailNotification != null) {
      updateData['emailNotification'] = emailNotification;
    }
    if (pushNotification != null) {
      updateData['pushNotification'] = pushNotification;
    }
    if (isActive != null) updateData['active'] = isActive;

    await _db
        .collection('users')
        .doc(user.uid)
        .collection('jobfinder')
        .doc(alertId)
        .update(updateData);

    debugPrint('✅ Job-Alert aktualisiert: $alertId');
  }

  /// Löscht einen Job-Alert
  Future<void> deleteJobAlert(String alertId) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User nicht eingeloggt');

    await _db
        .collection('users')
        .doc(user.uid)
        .collection('jobfinder')
        .doc(alertId)
        .delete();

    debugPrint('✅ Job-Alert gelöscht: $alertId');
  }

  /// Aktiviert/Deaktiviert einen Job-Alert
  Future<void> toggleJobAlert(String alertId, bool isActive) async {
    await updateJobAlert(alertId: alertId, isActive: isActive);
  }

  /// Stream für Job-Alerts (für Echtzeit-Updates)
  Stream<List<Map<String, dynamic>>> watchJobAlerts() {
    final user = _auth.currentUser;
    if (user == null) return Stream.value([]);

    return _db
        .collection('users')
        .doc(user.uid)
        .collection('jobfinder')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) {
          final data = doc.data();
          if (!data.containsKey('id')) {
            data['id'] = doc.id;
          }
          return data;
        }).toList());
  }

  /// Prüft ob ein Job zu einem Alert passt
  bool doesJobMatchAlert(Map<String, dynamic> job, Map<String, dynamic> alert) {
    // Suchbegriff prüfen
    final searchTerm = alert['searchTerm'] as String?;
    if (searchTerm != null && searchTerm.isNotEmpty) {
      final term = searchTerm.toLowerCase();
      final title = (job['title'] as String? ?? '').toLowerCase();
      final description = (job['description'] as String? ?? '').toLowerCase();
      final company = (job['companyName'] as String? ?? '').toLowerCase();

      if (!title.contains(term) &&
          !description.contains(term) &&
          !company.contains(term)) {
        return false;
      }
    }

    // Kategorie prüfen
    final category = alert['category'] as String?;
    if (category != null && category.isNotEmpty) {
      if (job['category'] != category) return false;
    }

    // Job-Typ prüfen
    final jobType = alert['jobType'] as String?;
    if (jobType != null && jobType.isNotEmpty) {
      if (job['type'] != jobType) return false;
    }

    // Standort prüfen (einfacher String-Vergleich)
    final location = alert['location'] as String?;
    if (location != null && location.isNotEmpty) {
      final jobLocation = (job['location'] as String? ?? '').toLowerCase();
      if (!jobLocation.contains(location.toLowerCase())) return false;
    }

    return true;
  }

  /// Holt die Anzahl der aktiven Job-Alerts
  Future<int> getActiveAlertCount() async {
    final user = _auth.currentUser;
    if (user == null) return 0;

    try {
      final snapshot = await _db
          .collection('users')
          .doc(user.uid)
          .collection('jobfinder')
          .where('active', isEqualTo: true)
          .count()
          .get();

      return snapshot.count ?? 0;
    } catch (e) {
      debugPrint('❌ Fehler beim Zählen der Job-Alerts: $e');
      return 0;
    }
  }
}
