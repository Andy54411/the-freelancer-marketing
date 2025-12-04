import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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
    if (user == null) return null;

    final doc = await _db
        .collection('users')
        .doc(user.uid)
        .collection('candidate_profile')
        .doc('main')
        .get();

    if (doc.exists) {
      return doc.data();
    }
    return null;
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

  Future<void> applyForJob({
    required String jobId,
    required String companyId,
    required String jobTitle,
    required String companyName,
    required Map<String, dynamic> applicantProfile,
    String? message,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('User not logged in');

    final applicationId = _db
        .collection('users')
        .doc(user.uid)
        .collection('job_applications')
        .doc()
        .id;

    // Extract attachments from profile
    List<Map<String, dynamic>> attachments = [];

    if (applicantProfile['cvUrl'] != null &&
        applicantProfile['cvUrl'].toString().isNotEmpty) {
      attachments.add({
        'name': applicantProfile['cvName'] ?? 'Lebenslauf.pdf',
        'url': applicantProfile['cvUrl'],
        'type': 'Lebenslauf',
      });
    }

    if (applicantProfile['coverLetterUrl'] != null &&
        applicantProfile['coverLetterUrl'].toString().isNotEmpty) {
      attachments.add({
        'name': applicantProfile['coverLetterName'] ?? 'Anschreiben.pdf',
        'url': applicantProfile['coverLetterUrl'],
        'type': 'Anschreiben',
      });
    }

    final applicationData = {
      'id': applicationId,
      'jobId': jobId,
      'companyId': companyId,
      'applicantId': user.uid,
      'applicantProfile': applicantProfile,
      'personalData': {
        'firstName': applicantProfile['firstName'],
        'lastName': applicantProfile['lastName'],
        'email': applicantProfile['email'],
        'phone': applicantProfile['phone'],
        'city': applicantProfile['city'],
        'country': applicantProfile['country'],
      },
      'attachments': attachments,
      'message': message ?? '',
      'status': 'pending',
      'appliedAt': DateTime.now().toIso8601String(),
      'jobTitle': jobTitle,
      'companyName': companyName,
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
}
