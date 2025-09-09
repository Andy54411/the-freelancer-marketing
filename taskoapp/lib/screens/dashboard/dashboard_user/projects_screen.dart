import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/project.dart';
import '../../../models/user_model.dart';
import '../../../services/project_service.dart';
import '../dashboard_layout.dart';
import 'project_assistant_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final ProjectService _projectService = ProjectService();

  String _searchQuery = '';
  String? _selectedStatus;

  void _showProjectAssistant() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ProjectAssistantScreen(
          userId: context.read<TaskiloUser?>()?.uid ?? '',
        ),
      ),
    );
  }

  void _showDeleteConfirmation(String projectId, String projectTitle) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Projekt löschen'),
          content: Text(
            'Sind Sie sicher, dass Sie das Projekt "$projectTitle" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Abbrechen'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _confirmDelete(projectId);
              },
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: const Text('Löschen'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _confirmDelete(String projectId) async {
    try {
      await _projectService.deleteProject(projectId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Projekt erfolgreich gelöscht'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Löschen: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildStatisticsCards(Map<String, int> stats) {
    final double cardWidth = (MediaQuery.of(context).size.width - 16 * 2 - 12) / 2;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        children: [
          SizedBox(
            width: cardWidth,
            height: 90,
            child: _buildStatCard(
              'Gesamt',
              (stats['total'] ?? 0).toString(),
              Colors.white,
              Icons.folder_outlined,
            ),
          ),
          SizedBox(
            width: cardWidth,
            height: 90,
            child: _buildStatCard(
              'Aktiv',
              (stats['active'] ?? 0).toString(),
              Colors.white,
              Icons.play_circle_outline,
            ),
          ),
          SizedBox(
            width: cardWidth,
            height: 90,
            child: _buildStatCard(
              'Abgeschlossen',
              (stats['completed'] ?? 0).toString(),
              Colors.white,
              Icons.check_circle_outline,
            ),
          ),
          SizedBox(
            width: cardWidth,
            height: 90,
            child: _buildStatCard(
              'Planung',
              (stats['planning'] ?? 0).toString(),
              Colors.white,
              Icons.schedule_outlined,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color.withValues(alpha: 0.8), size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    color: color.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        value: _selectedStatus,
        decoration: InputDecoration(
          labelText: 'Status Filter',
          labelStyle: const TextStyle(color: Colors.white70),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Colors.white30),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Colors.white30),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Colors.white),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.1),
        ),
        dropdownColor: const Color(0xFF14AD9F),
        style: const TextStyle(color: Colors.white),
        hint: const Text('Alle Status', style: TextStyle(color: Colors.white70)),
        items: const [
          DropdownMenuItem(
            value: null,
            child: Text('Alle', style: TextStyle(color: Colors.white)),
          ),
          DropdownMenuItem(
            value: 'planning',
            child: Text('Planung', style: TextStyle(color: Colors.white)),
          ),
          DropdownMenuItem(
            value: 'active',
            child: Text('Aktiv', style: TextStyle(color: Colors.white)),
          ),
          DropdownMenuItem(
            value: 'completed',
            child: Text('Abgeschlossen', style: TextStyle(color: Colors.white)),
          ),
          DropdownMenuItem(
            value: 'paused',
            child: Text('Pausiert', style: TextStyle(color: Colors.white)),
          ),
        ],
        onChanged: (value) {
          setState(() {
            _selectedStatus = value;
          });
        },
      ),
    );
  }

  Widget _buildProjectCard(Project project) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: const Border(
            left: BorderSide(color: Colors.white, width: 4),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white70),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            project.category ?? 'Projekt',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          project.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          project.description,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildStatusBadge(project.status),
                          const SizedBox(width: 8),
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert, size: 20, color: Colors.white),
                            color: Colors.white,
                            onSelected: (value) {
                              if (value == 'delete') {
                                _showDeleteConfirmation(project.id, project.title);
                              }
                            },
                            itemBuilder: (context) => [
                              const PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  children: [
                                    Icon(Icons.delete, color: Colors.red, size: 16),
                                    SizedBox(width: 8),
                                    Text('Löschen', style: TextStyle(color: Colors.red)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        project.createdAt.toLocal().toString().split(' ')[0],
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 16, color: Colors.white70),
                      const SizedBox(width: 4),
                      Text(
                        project.createdAt.toLocal().toString().split(' ')[0],
                        style: const TextStyle(fontSize: 14, color: Colors.white70),
                      ),
                    ],
                  ),
                  if (project.estimatedBudget != null && project.estimatedBudget! > 0) ...[
                    const SizedBox(width: 16),
                    Row(
                      children: [
                        const Text(
                          'Budget: ',
                          style: TextStyle(fontSize: 14, color: Colors.white70),
                        ),
                        Text(
                          '${project.estimatedBudget!.toStringAsFixed(0)}€',
                          style: const TextStyle(fontSize: 14, color: Colors.white70),
                        ),
                      ],
                    ),
                  ],
                  const Spacer(),
                  IconButton(
                    onPressed: () => _showDeleteConfirmation(project.id, project.title),
                    icon: const Icon(Icons.delete, color: Colors.red, size: 20),
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    padding: const EdgeInsets.all(4),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color backgroundColor;
    Color textColor = Colors.white;
    String displayText;

    switch (status) {
      case 'completed':
        backgroundColor = Colors.green;
        displayText = 'Abgeschlossen';
        break;
      case 'active':
        backgroundColor = const Color(0xFF14AD9F);
        displayText = 'Aktiv';
        break;
      case 'paused':
        backgroundColor = Colors.orange;
        displayText = 'Pausiert';
        break;
      case 'planning':
      default:
        backgroundColor = Colors.white30;
        textColor = Colors.white;
        displayText = 'Planung';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          fontSize: 12,
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildGroupedProjects(List<ProjectGroup> groups, List<Project> ungroupedProjects) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...groups.map((group) => Container(
          margin: const EdgeInsets.only(bottom: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.folder, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      group.theme,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${group.projects.length}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF14AD9F),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ...group.projects.map((project) => _buildProjectCard(project)),
            ],
          ),
        )),
        if (ungroupedProjects.isNotEmpty) ...[
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.folder_open, color: Colors.white.withValues(alpha: 0.8)),
                      const SizedBox(width: 8),
                      Text(
                        'Weitere Projekte',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${ungroupedProjects.length}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF14AD9F),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ...ungroupedProjects.map((project) => _buildProjectCard(project)),
              ],
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();

    if (user == null) {
      return DashboardLayout(
        title: 'Projekte',
        useGradientBackground: true,
        showBackButton: true,
        body: const Center(
          child: Text(
            'Bitte melden Sie sich an',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    return DashboardLayout(
      title: 'KI-Project Manager',
      useGradientBackground: true,
      showBackButton: true,
      hasSearchBar: true,
      searchHint: 'Projekte durchsuchen...',
      onSearchChanged: (value) => setState(() => _searchQuery = value),
      actions: [
        IconButton(
          onPressed: _showProjectAssistant,
          icon: const Icon(Icons.psychology, color: Colors.white),
          tooltip: 'KI-Assistent',
        ),
      ],
      body: StreamBuilder<List<Project>>(
        stream: _projectService.getProjectsForUser(user.uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Text(
                'Fehler: ${snapshot.error}',
                style: const TextStyle(color: Colors.white),
              ),
            );
          }

          final allProjects = snapshot.data ?? [];
          
          var filteredProjects = _projectService.searchProjects(allProjects, _searchQuery);
          filteredProjects = _projectService.filterProjectsByStatus(filteredProjects, _selectedStatus);
          
          final stats = _projectService.getProjectStatistics(allProjects);
          final groups = _projectService.groupProjectsByTheme(filteredProjects);
          final ungroupedProjects = filteredProjects
              .where((project) => !groups.any((group) => 
                  group.projects.any((p) => p.id == project.id)))
              .toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatisticsCards(stats),
                _buildFilterDropdown(),
                const SizedBox(height: 16),
                
                if (filteredProjects.isEmpty)
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 40),
                        Icon(
                          Icons.folder_open,
                          size: 64,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Keine Projekte gefunden',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.white.withValues(alpha: 0.8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Erstellen Sie Ihr erstes Projekt mit dem KI-Assistenten',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white.withValues(alpha: 0.6),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  )
                else
                  _buildGroupedProjects(groups, ungroupedProjects),
              ],
            ),
          );
        },
      ),
    );
  }
}
