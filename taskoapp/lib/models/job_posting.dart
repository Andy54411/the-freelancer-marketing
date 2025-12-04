import 'package:cloud_firestore/cloud_firestore.dart';

class JobPosting {
  final String id;
  final String companyId;
  final String companyName;
  final String title;
  final String? industry;
  final String? category;
  final String? region;
  final List<String>? languages;
  final String? careerLevel;
  final String description;
  final String? tasks;
  final String location;
  final Map<String, double>? coordinates;
  final String? geohash;
  final String type;
  final Map<String, dynamic>? salaryRange;
  final String? requirements;
  final String? benefits;
  final String? contactInfo;
  final String? headerImageUrl;
  final double headerImagePositionY;
  final String? logoUrl;
  final List<String>? galleryImages;
  final DateTime postedAt;
  final DateTime? expiresAt;
  final String status;

  JobPosting({
    required this.id,
    required this.companyId,
    required this.companyName,
    required this.title,
    this.industry,
    this.category,
    this.region,
    this.languages,
    this.careerLevel,
    required this.description,
    this.tasks,
    required this.location,
    this.coordinates,
    this.geohash,
    required this.type,
    this.salaryRange,
    this.requirements,
    this.benefits,
    this.contactInfo,
    this.headerImageUrl,
    this.headerImagePositionY = 50.0,
    this.logoUrl,
    this.galleryImages,
    required this.postedAt,
    this.expiresAt,
    required this.status,
  });

  factory JobPosting.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return JobPosting(
      id: doc.id,
      companyId: data['companyId'] ?? '',
      companyName: data['companyName'] ?? '',
      title: data['title'] ?? '',
      industry: data['industry'],
      category: data['category'],
      region: data['region'],
      languages: (data['languages'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      careerLevel: data['careerLevel'],
      description: data['description'] ?? '',
      tasks: data['tasks'],
      location: data['location'] ?? '',
      coordinates: data['coordinates'] != null
          ? {
              'lat': (data['coordinates']['lat'] as num).toDouble(),
              'lng': (data['coordinates']['lng'] as num).toDouble(),
            }
          : null,
      geohash: data['geohash'],
      type: data['type'] ?? '',
      salaryRange: data['salaryRange'],
      requirements: data['requirements'],
      benefits: data['benefits'],
      contactInfo: data['contactInfo'],
      headerImageUrl: data['headerImageUrl'],
      headerImagePositionY:
          (data['headerImagePositionY'] as num?)?.toDouble() ?? 50.0,
      logoUrl: data['logoUrl'],
      galleryImages: (data['galleryImages'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
      postedAt: (data['postedAt'] is Timestamp)
          ? (data['postedAt'] as Timestamp).toDate()
          : DateTime.tryParse(data['postedAt'] ?? '') ?? DateTime.now(),
      expiresAt: (data['expiresAt'] is Timestamp)
          ? (data['expiresAt'] as Timestamp).toDate()
          : (data['expiresAt'] != null
                ? DateTime.tryParse(data['expiresAt'])
                : null),
      status: data['status'] ?? 'draft',
    );
  }
}
