import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/project.dart';

class ProjectService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get all projects for a user
  Stream<List<Project>> getProjectsForUser(String userId) {
    return _firestore
        .collection('project_requests')
        .where('customerUid', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => 
            snapshot.docs.map((doc) => Project.fromFirestore(doc)).toList());
  }

  // Get all quotes for a user
  Stream<List<Quote>> getQuotesForUser(String userId) {
    return _firestore
        .collection('quotes')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => 
            snapshot.docs.map((doc) => Quote.fromFirestore(doc)).toList());
  }

  // Get combined projects and quotes for a user
  Stream<List<dynamic>> getAllProjectsAndQuotesForUser(String userId) {
    // Combine both streams
    return _firestore
        .collection('project_requests')
        .where('customerUid', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .asyncMap((projectSnapshot) async {
      
      // Get projects from project_requests collection
      final projects = projectSnapshot.docs
          .map((doc) => Project.fromFirestore(doc))
          .toList();

      // Get quotes from quotes collection  
      final quotesSnapshot = await _firestore
          .collection('quotes')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      final quotes = quotesSnapshot.docs
          .map((doc) => Quote.fromFirestore(doc))
          .toList();

      // Combine both lists and sort by creation date
      final combined = <dynamic>[...projects, ...quotes];
      combined.sort((a, b) {
        final aDate = a is Project ? a.createdAt : (a as Quote).createdAt;
        final bDate = b is Project ? b.createdAt : (b as Quote).createdAt;
        return bDate.compareTo(aDate); // descending order
      });

      return combined;
    });
  }

  // Group projects by theme
  List<ProjectGroup> groupProjectsByTheme(List<Project> projects) {
    final Map<String, List<Project>> grouped = {};
    
    for (final project in projects) {
      final theme = project.theme ?? 'Sonstige';
      grouped[theme] = grouped[theme] ?? [];
      grouped[theme]!.add(project);
    }

    return grouped.entries
        .map((entry) => ProjectGroup(
              theme: entry.key,
              projects: entry.value,
            ))
        .toList();
  }

  // Create a new project
  Future<String> createProject({
    required String title,
    required String description,
    required String userId,
    String status = 'planning',
    String? category,
    String? priority,
    double? estimatedBudget,
    String? theme,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final project = Project(
        id: '', // Wird von Firestore generiert
        title: title,
        description: description,
        status: status,
        category: category,
        priority: priority,
        estimatedBudget: estimatedBudget,
        createdAt: DateTime.now(),
        theme: theme,
        userId: userId,
        metadata: metadata,
      );

      final docRef = await _firestore
          .collection('project_requests')
          .add({
            ...project.toFirestore(),
            'customerUid': userId, // Explizit customerUid setzen für Query
          });

      debugPrint('Project created with ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      debugPrint('Error creating project: $e');
      rethrow;
    }
  }

  // Update project
  Future<void> updateProject(String projectId, Map<String, dynamic> updates) async {
    try {
      await _firestore
          .collection('project_requests')
          .doc(projectId)
          .update({
            ...updates,
            'updatedAt': Timestamp.fromDate(DateTime.now()),
          });
      debugPrint('Project updated: $projectId');
    } catch (e) {
      debugPrint('Error updating project: $e');
      rethrow;
    }
  }

  // Delete project
  Future<void> deleteProject(String projectId) async {
    try {
      await _firestore
          .collection('project_requests')
          .doc(projectId)
          .delete();
      debugPrint('Project deleted: $projectId');
    } catch (e) {
      debugPrint('Error deleting project: $e');
      rethrow;
    }
  }

  // Delete quote
  Future<void> deleteQuote(String quoteId) async {
    try {
      await _firestore
          .collection('quotes')
          .doc(quoteId)
          .delete();
      debugPrint('Quote deleted: $quoteId');
    } catch (e) {
      debugPrint('Error deleting quote: $e');
      rethrow;
    }
  }

  // Get provider information by ID
  Future<Map<String, dynamic>?> getProviderById(String providerId) async {
    try {
      debugPrint('Getting provider by ID: $providerId');
      
      // First try to get from companies collection
      final companyDoc = await _firestore
          .collection('companies')
          .doc(providerId)
          .get();
      
      if (companyDoc.exists) {
        final data = companyDoc.data() as Map<String, dynamic>;
        debugPrint('Company data found: $data');
        
        return {
          'name': data['companyName'] ?? data['name'] ?? 'Unbekanntes Unternehmen',
          'companyName': data['companyName'],
          'email': data['email'],
          'phone': data['phone'] ?? data['phoneNumber'],
          'profileImage': data['profileImage'],
          'profilePictureURL': data['profilePictureURL'],
          'profilePictureFirebaseUrl': data['profilePictureFirebaseUrl'],
          'companyCity': data['companyCity'],
          'companyPostalCode': data['companyPostalCode'],
          'location': data['location'],
          'rating': data['rating'],
          'isVerified': data['isVerified'] ?? false,
          'adminApproved': data['adminApproved'] ?? false,
          'description': data['description'],
          'selectedCategory': data['selectedCategory'],
          'selectedSubcategory': data['selectedSubcategory'],
          'completedOrders': data['completedOrders'],
          'type': 'company',
          ...data, // Include all other fields
        };
      }

      // If not found in companies, try users collection
      final userDoc = await _firestore
          .collection('users')
          .doc(providerId)
          .get();
      
      if (userDoc.exists) {
        final data = userDoc.data() as Map<String, dynamic>;
        debugPrint('User data found: $data');
        
        return {
          'name': data['displayName'] ?? data['name'] ?? '${data['firstName'] ?? ''} ${data['lastName'] ?? ''}'.trim(),
          'companyName': data['companyName'] ?? data['company'],
          'email': data['email'],
          'phone': data['phone'] ?? data['phoneNumber'],
          'profileImage': data['profileImage'],
          'profilePictureURL': data['profilePictureURL'],
          'profilePictureFirebaseUrl': data['profilePictureFirebaseUrl'],
          'companyCity': data['city'] ?? data['companyCity'],
          'companyPostalCode': data['postalCode'] ?? data['companyPostalCode'],
          'location': data['location'],
          'rating': data['rating'],
          'isVerified': data['isVerified'] ?? false,
          'description': data['description'],
          'completedOrders': data['completedOrders'],
          'type': 'user',
          ...data, // Include all other fields
        };
      }
      
      debugPrint('Provider not found with ID: $providerId');
      return null;
    } catch (e) {
      debugPrint('Error getting provider: $e');
      return null;
    }
  }

  // Get project by ID
  Future<Project?> getProjectById(String projectId) async {
    try {
      final doc = await _firestore
          .collection('project_requests')
          .doc(projectId)
          .get();
      
      if (doc.exists) {
        return Project.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting project: $e');
      return null;
    }
  }

  // Get project statistics
  Map<String, int> getProjectStatistics(List<Project> projects) {
    final stats = {
      'total': projects.length,
      'planning': 0,
      'active': 0,
      'completed': 0,
      'paused': 0,
    };

    for (final project in projects) {
      stats[project.status] = (stats[project.status] ?? 0) + 1;
    }

    return stats;
  }

  // Get combined statistics for projects and quotes
  Map<String, int> getCombinedStatistics(List<Project> projects, List<Quote> quotes) {
    final stats = {
      'total': projects.length + quotes.length,
      'planning': 0,
      'active': 0,
      'completed': 0,
      'paused': 0,
      'pending': 0,
      'cancelled': 0,
    };

    // Count projects
    for (final project in projects) {
      stats[project.status] = (stats[project.status] ?? 0) + 1;
    }

    // Count quotes
    for (final quote in quotes) {
      stats[quote.status] = (stats[quote.status] ?? 0) + 1;
    }

    return stats;
  }

  // Search projects
  List<Project> searchProjects(List<Project> projects, String query) {
    if (query.isEmpty) return projects;
    
    final lowerQuery = query.toLowerCase();
    return projects.where((project) {
      return project.title.toLowerCase().contains(lowerQuery) ||
             project.description.toLowerCase().contains(lowerQuery) ||
             (project.category?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }

  // Filter projects by status
  List<Project> filterProjectsByStatus(List<Project> projects, String? status) {
    if (status == null || status.isEmpty) return projects;
    return projects.where((project) => project.status == status).toList();
  }

  // Convert Quote to public Project Request
  Future<String> shareQuoteAsPublicProject({
    required Quote quote,
    required String userId,
  }) async {
    try {
      debugPrint('Converting quote ${quote.id} to public project request');
      
      // Create a new project request from quote data
      final projectData = {
        'title': quote.title,
        'description': quote.description,
        'category': quote.category,
        'subcategory': quote.subcategory,
        'estimatedBudget': quote.estimatedBudget,
        'timeline': quote.timeline,
        'createdAt': Timestamp.fromDate(DateTime.now()),
        'updatedAt': Timestamp.fromDate(DateTime.now()),
        'customerUid': userId,
        'userId': userId,
        'status': 'active', // Public projects start as active
        'isPublic': true,
        'allowsProposals': true,
        'maxProposals': 10, // Default max proposals
        'proposalCount': 0,
        'source': 'shared_from_quote',
        'originalQuoteId': quote.id,
        'priority': quote.priority ?? 'medium',
        'projectType': 'public_request',
        // Include location if available
        if (quote.location != null) 'location': quote.location,
        // Include required services if available
        if (quote.requiredServices != null) 'requiredServices': quote.requiredServices,
        // Include original AI prompt if available
        if (quote.originalPrompt != null) 'originalPrompt': quote.originalPrompt,
        if (quote.aiGenerated == true) 'aiGenerated': true,
      };

      final docRef = await _firestore
          .collection('project_requests')
          .add(projectData);

      debugPrint('Public project request created with ID: ${docRef.id}');
      return docRef.id;
    } catch (e) {
      debugPrint('Error sharing quote as public project: $e');
      rethrow;
    }
  }

  // Update Quote
  Future<void> updateQuote(String quoteId, Map<String, dynamic> updates) async {
    try {
      await _firestore
          .collection('quotes')
          .doc(quoteId)
          .update({
            ...updates,
            'updatedAt': Timestamp.fromDate(DateTime.now()),
          });
      debugPrint('Quote updated: $quoteId');
    } catch (e) {
      debugPrint('Error updating quote: $e');
      rethrow;
    }
  }

  // Get Quote by ID
  Future<Quote?> getQuoteById(String quoteId) async {
    try {
      final doc = await _firestore
          .collection('quotes')
          .doc(quoteId)
          .get();
      
      if (doc.exists) {
        return Quote.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting quote: $e');
      return null;
    }
  }
}
