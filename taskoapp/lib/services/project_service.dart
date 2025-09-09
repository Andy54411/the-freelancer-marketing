import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/project.dart';

class ProjectService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get all projects for a user
  Stream<List<Project>> getProjectsForUser(String userId) {
    return _firestore
        .collection('project_requests')
        .where('userId', isEqualTo: userId)
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
          .add(project.toFirestore());

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
}
