import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class JobApplicationService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<bool> hasCandidateProfile() async {
    final user = _auth.currentUser;
    if (user == null) return false;

    final doc = await _db
        .collection('users')
        .doc(user.uid)
        .collection('candidate_profile')
        .doc('main')
        .get();

    return doc.exists;
  }

  Future<Map<String, dynamic>?> getCandidateProfile() async {
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint('JobApplicationService: User is null');
      return null;
    }

    debugPrint('JobApplicationService: Fetching profile for user ${user.uid}');

    try {
      // 1. Try 'candidate_profile/main' (Standard)
      final mainDoc = await _db
          .collection('users')
          .doc(user.uid)
          .collection('candidate_profile')
          .doc('main')
          .get();

      if (mainDoc.exists) {
        debugPrint('JobApplicationService: Found main profile document');
        return mainDoc.data();
      } else {
        debugPrint('JobApplicationService: Main profile document not found');
      }

      // 2. Fallback: Any doc in 'candidate_profile'
      final query = await _db
          .collection('users')
          .doc(user.uid)
          .collection('candidate_profile')
          .limit(1)
          .get();

      if (query.docs.isNotEmpty) {
        debugPrint(
          'JobApplicationService: Found fallback profile document: ${query.docs.first.id}',
        );
        return query.docs.first.data();
      }

      debugPrint(
        'JobApplicationService: No candidate_profile found. Checking user profile...',
      );

      // 3. Fallback: Basic user profile
      final userDoc = await _db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data() != null) {
        final userData = userDoc.data()!;
        if (userData.containsKey('profile')) {
          debugPrint('JobApplicationService: Found basic user profile');
          // Map basic profile to expected structure if needed, or just return it
          // The screen handles missing fields gracefully
          return userData['profile'] as Map<String, dynamic>;
        }
      }

      return null;
    } catch (e) {
      debugPrint('JobApplicationService: Error fetching profile: $e');
      return null;
    }
  }

  Future<void> updateCandidateProfile(Map<String, dynamic> data) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User not logged in');

    // Always save to 'main' doc in 'candidate_profile'
    await _db
        .collection('users')
        .doc(user.uid)
        .collection('candidate_profile')
        .doc('main')
        .set(data, SetOptions(merge: true));
  }

  Future<bool> hasApplied(String jobId) async {
    final user = _auth.currentUser;
    if (user == null) return false;

    final query = await _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .where('jobId', isEqualTo: jobId)
        .get();

    return query.docs.isNotEmpty;
  }

  Future<List<Map<String, dynamic>>> getUserApplications() async {
    final user = _auth.currentUser;
    if (user == null) return [];

    final query = await _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .orderBy('appliedAt', descending: true)
        .get();

    return query.docs.map((doc) => doc.data()).toList();
  }

  Future<void> acceptInterviewSlot(
    String applicationId,
    String companyId,
    String slot, {
    String? meetingType,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User not logged in');

    // Parse the slot to extract date and time for calendar display
    final DateTime slotDateTime = DateTime.parse(slot);
    final String confirmedDate =
        '${slotDateTime.day.toString().padLeft(2, '0')}.${slotDateTime.month.toString().padLeft(2, '0')}.${slotDateTime.year}';
    final String confirmedTime =
        '${slotDateTime.hour.toString().padLeft(2, '0')}:${slotDateTime.minute.toString().padLeft(2, '0')}';

    final updateData = {
      'status': 'interview_accepted',
      'acceptedSlot': slot,
      'confirmedInterviewDate': confirmedDate,
      'confirmedInterviewTime': confirmedTime,
      'updatedAt': DateTime.now().toIso8601String(),
    };

    // Meeting-Typ hinzufügen falls gewählt
    if (meetingType != null) {
      updateData['acceptedMeetingType'] = meetingType;
    }

    // Update User Subcollection
    await _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .doc(applicationId)
        .update(updateData);

    // Update Company Subcollection
    await _db
        .collection('companies')
        .doc(companyId)
        .collection('jobApplications')
        .doc(applicationId)
        .update(updateData);
  }

  Future<void> applyForJob({
    required String jobId,
    required String companyId,
    required String jobTitle,
    required String companyName,
    required Map<String, dynamic> applicantProfile,
    required Map<String, dynamic> personalData,
    required List<Map<String, dynamic>> attachments,
    String? message,
    Map<String, dynamic>? salaryExpectation,
    Map<String, dynamic>? noticePeriod,
    String? earliestStartDate,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User not logged in');

    final applicationId = _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .doc()
        .id;

    final applicationData = {
      'id': applicationId,
      'jobId': jobId,
      'companyId': companyId,
      'applicantId': user.uid,
      'applicantProfile': applicantProfile,
      'personalData': personalData,
      'attachments': attachments,
      'message': message ?? '',
      'status': 'pending',
      'appliedAt': DateTime.now().toIso8601String(),
      'jobTitle': jobTitle,
      'companyName': companyName,
      // Rahmenbedingungen
      if (salaryExpectation != null) 'salaryExpectation': salaryExpectation,
      if (noticePeriod != null) 'noticePeriod': noticePeriod,
      if (earliestStartDate != null && earliestStartDate.isNotEmpty)
        'earliestStartDate': earliestStartDate,
    };

    // 1. User Subcollection
    await _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .doc(applicationId)
        .set(applicationData);

    // 2. Company Subcollection
    await _db
        .collection('companies')
        .doc(companyId)
        .collection('jobApplications')
        .doc(applicationId)
        .set(applicationData);
  }

  /// Lädt Interview-Termine für den aktuellen Benutzer
  Future<List<Map<String, dynamic>>> getUserInterviewAppointments() async {
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint('JobApplicationService: User is null');
      return [];
    }

    try {
      debugPrint(
        'JobApplicationService: Loading interview appointments for user ${user.uid}',
      );

      // Lade Bewerbungen des Users mit bestätigten Interview-Terminen
      // Bewerbungen sind unter /companies/{companyId}/jobApplications/ gespeichert
      // Verwende collectionGroup für die Suche über alle Unternehmen
      final query = await _db
          .collectionGroup('jobApplications')
          .where('applicantId', isEqualTo: user.uid)
          .where(
            'status',
            whereIn: [
              'interview_scheduled',
              'interview_accepted',
              'interview_confirmed',
            ],
          )
          .get();

      List<Map<String, dynamic>> interviews = [];

      for (var doc in query.docs) {
        final data = doc.data();

        // Prüfe ob Interview-Datum und Zeit vorhanden sind
        if (data['confirmedInterviewDate'] != null &&
            data['confirmedInterviewTime'] != null) {
          // Parse Datum und Zeit
          String dateStr =
              data['confirmedInterviewDate']; // Format: "17.12.2025"
          String timeStr = data['confirmedInterviewTime']; // Format: "10:00"

          try {
            // Parse Datum (dd.MM.yyyy)
            List<String> dateParts = dateStr.split('.');
            if (dateParts.length == 3) {
              int day = int.parse(dateParts[0]);
              int month = int.parse(dateParts[1]);
              int year = int.parse(dateParts[2]);

              // Parse Zeit (HH:mm)
              List<String> timeParts = timeStr.split(':');
              if (timeParts.length == 2) {
                int hour = int.parse(timeParts[0]);
                int minute = int.parse(timeParts[1]);

                DateTime interviewDateTime = DateTime(
                  year,
                  month,
                  day,
                  hour,
                  minute,
                );

                interviews.add({
                  'id': doc.id,
                  'title': 'Interview: ${data['jobTitle'] ?? 'Bewerbung'}',
                  'companyName':
                      data['companyName'] ?? 'Unbekanntes Unternehmen',
                  'jobTitle': data['jobTitle'] ?? 'Offene Position',
                  'dateTime': interviewDateTime,
                  'status': data['status'] ?? 'interview_scheduled',
                  'type': 'interview',
                });

                debugPrint(
                  '✅ Interview gefunden: ${data['jobTitle']} am $dateStr $timeStr',
                );
              }
            }
          } catch (e) {
            debugPrint('❌ Fehler beim Parsen des Interview-Termins: $e');
          }
        }
      }

      debugPrint('📅 Geladene Interview-Termine: ${interviews.length}');
      return interviews;
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Interview-Termine: $e');
      return [];
    }
  }
}
