import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'dart:math' show cos, sqrt, asin;
import '../models/job_posting.dart';

class JobService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<List<JobPosting>> getJobs({
    String? searchTerm,
    String? location,
    String? category,
    String? type,
    double? lat,
    double? lng,
    double radiusKm = 50.0,
  }) async {
    try {
      Query query = _db
          .collectionGroup('jobs')
          .where('status', isEqualTo: 'active')
          .orderBy('postedAt', descending: true);

      // Note: Firestore doesn't support multiple inequality filters or complex text search natively.
      // We will fetch the active jobs and filter them client-side for search terms and location radius
      // if we can't do it efficiently with queries.
      // For exact matches like category or type, we can add where clauses.

      if (category != null && category.isNotEmpty) {
        query = query.where('category', isEqualTo: category);
      }

      if (type != null && type.isNotEmpty) {
        query = query.where('type', isEqualTo: type);
      }

      final querySnapshot = await query.get();
      List<JobPosting> jobs = querySnapshot.docs
          .map((doc) => JobPosting.fromFirestore(doc))
          .toList();

      // Client-side filtering for search term and location
      if (searchTerm != null && searchTerm.isNotEmpty) {
        final term = searchTerm.toLowerCase();
        jobs = jobs.where((job) {
          return job.title.toLowerCase().contains(term) ||
              job.companyName.toLowerCase().contains(term) ||
              job.description.toLowerCase().contains(term);
        }).toList();
      }

      if (location != null && location.isNotEmpty) {
        // Simple string match if no coordinates provided
        if (lat == null || lng == null) {
          jobs = jobs
              .where(
                (job) =>
                    job.location.toLowerCase().contains(location.toLowerCase()),
              )
              .toList();
        }
      }

      // Radius filtering
      if (lat != null && lng != null) {
        jobs = jobs.where((job) {
          if (job.coordinates == null) return false;
          final distance = _calculateDistance(
            lat,
            lng,
            job.coordinates!['lat']!,
            job.coordinates!['lng']!,
          );
          return distance <= radiusKm;
        }).toList();
      }

      return jobs;
    } catch (e) {
      debugPrint('Error fetching jobs: $e');
      return [];
    }
  }

  Future<JobPosting?> getJobById(String jobId, {String? companyId}) async {
    try {
      debugPrint('JobService: Loading job with ID: $jobId, companyId: $companyId');
      
      // Wenn wir die companyId haben, direkt zugreifen
      if (companyId != null && companyId.isNotEmpty) {
        final docSnapshot = await _db
            .collection('companies')
            .doc(companyId)
            .collection('jobs')
            .doc(jobId)
            .get();
        
        if (docSnapshot.exists) {
          debugPrint('JobService: Job found directly: ${docSnapshot.id}');
          return JobPosting.fromFirestore(docSnapshot);
        }
      }
      
      // Fallback: Versuche über collectionGroup
      debugPrint('JobService: Trying collectionGroup query...');
      final querySnapshot = await _db
          .collectionGroup('jobs')
          .get();

      debugPrint('JobService: Found ${querySnapshot.docs.length} total jobs');

      // Suche nach der passenden Document ID
      for (final doc in querySnapshot.docs) {
        if (doc.id == jobId) {
          debugPrint('JobService: Job found via collectionGroup: ${doc.id}');
          return JobPosting.fromFirestore(doc);
        }
      }
      
      debugPrint('JobService: Job not found with ID: $jobId');
      return null;
    } catch (e) {
      debugPrint('Error fetching job by ID: $e');
      return null;
    }
  }

  double _calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a =
        0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }
}
