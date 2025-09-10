import 'package:flutter/material.dart';
import '../../../models/project.dart';
import '../../../services/project_service.dart';
import '../../../services/review_service.dart';
import '../dashboard_layout.dart';
import 'edit_project_screen.dart';
import 'provider_detail_screen.dart';

class ProjectDetailScreen extends StatefulWidget {
  final Project? project;
  final Quote? quote;

  const ProjectDetailScreen({
    super.key,
    this.project,
    this.quote,
  });

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final ProjectService _projectService = ProjectService();
  Map<String, dynamic>? _providerInfo;
  Map<String, dynamic>? _reviewStats;
  bool _loadingProvider = false;

  @override
  void initState() {
    super.initState();
    _loadProviderInfo();
  }

  Future<void> _loadProviderInfo() async {
    if (!isProject && widget.quote != null) {
      final providerId = widget.quote!.assignedTo ?? widget.quote!.providerId;
      debugPrint('Loading provider info for ID: $providerId'); // Debug
      debugPrint('AssignedTo: ${widget.quote!.assignedTo}'); // Debug  
      debugPrint('ProviderId: ${widget.quote!.providerId}'); // Debug
      
      if (providerId != null) {
        setState(() => _loadingProvider = true);
        try {
          // Provider-Informationen laden
          final info = await _projectService.getProviderById(providerId);
          debugPrint('Provider info loaded: $info'); // Debug
          
          // Review-Statistiken laden
          final reviewStats = await ReviewService.getReviewStats(providerId);
          debugPrint('Review stats loaded: $reviewStats'); // Debug
          
          if (mounted) {
            setState(() {
              _providerInfo = info;
              _reviewStats = reviewStats;
              _loadingProvider = false;
            });
          }
        } catch (e) {
          debugPrint('Error loading provider: $e'); // Debug
          if (mounted) {
            setState(() => _loadingProvider = false);
          }
        }
      } else {
        debugPrint('No provider ID found'); // Debug
      }
    }
  }

  bool get isProject => widget.project != null;
  
  String get title => isProject ? widget.project!.title : widget.quote!.title;
  String get description => isProject ? widget.project!.description : widget.quote!.description;
  String get status => isProject ? widget.project!.status : widget.quote!.status;
  DateTime get createdAt => isProject ? widget.project!.createdAt : widget.quote!.createdAt;
  double? get estimatedBudget => isProject ? widget.project!.estimatedBudget : widget.quote!.estimatedBudget;
  String? get category => isProject ? widget.project!.category : widget.quote!.category;

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return const Color(0xFF14AD9F);
      case 'completed':
        return Colors.green;
      case 'planning':
        return Colors.orange;
      case 'paused':
        return Colors.grey;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Aktiv';
      case 'completed':
        return 'Abgeschlossen';
      case 'planning':
        return 'Planung';
      case 'paused':
        return 'Pausiert';
      case 'pending':
        return 'Ausstehend';
      case 'cancelled':
        return 'Storniert';
      default:
        return status;
    }
  }

  Widget _buildDetailCard(String title, Widget content) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            content,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {IconData? icon}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: Colors.white70),
            const SizedBox(width: 8),
          ],
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.7),
              fontWeight: FontWeight.w500,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _editItem() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => EditProjectScreen(
          project: widget.project,
          quote: widget.quote,
        ),
      ),
    );

    // If edit was successful, we might want to refresh the data
    if (result == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${isProject ? 'Projekt' : 'Auftrag'} wurde aktualisiert'),
          backgroundColor: const Color(0xFF14AD9F),
        ),
      );
      // Optionally reload provider info if it was a quote
      if (!isProject) {
        _loadProviderInfo();
      }
    }
  }

  Future<void> _shareAsPublicProject() async {
    if (widget.quote == null) return;

    // Show confirmation dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Auftrag öffentlich teilen'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Möchten Sie diesen direkten Auftrag als öffentliche Anfrage teilen?',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF14AD9F).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF14AD9F)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Das bedeutet:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Builder(
                      builder: (context) {
                        final subcategory = widget.quote!.subcategory;
                        final category = widget.quote!.category;
                        debugPrint('Subcategory: $subcategory, Category: $category');
                        
                        // Try to get the real subcategory from provider data if available
                        String? targetCategory = subcategory;
                        
                        // If subcategory is same as category, try to get it from provider info
                        if (subcategory == category && _providerInfo != null) {
                          targetCategory = _providerInfo!['selectedSubcategory'] ?? subcategory;
                          debugPrint('Using provider selectedSubcategory: $targetCategory');
                        }
                        
                        // Fallback to subcategory or category
                        targetCategory = targetCategory?.isNotEmpty == true ? targetCategory : category;
                        
                        return Text('• Alle Anbieter der Subkategorie "$targetCategory" können Angebote abgeben');
                      },
                    ),
                    const SizedBox(height: 4),
                    const Text('• Ihr Auftrag wird in der öffentlichen Projektliste angezeigt'),
                    const SizedBox(height: 4),
                    const Text('• Sie können aus mehreren Angeboten wählen'),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14AD9F),
              ),
              child: const Text('Öffentlich teilen'),
            ),
          ],
        );
      },
    );

    if (confirm != true) return;

    try {
      setState(() => _loadingProvider = true);
      
      final projectId = await _projectService.shareQuoteAsPublicProject(
        quote: widget.quote!,
        userId: widget.quote!.userId,
      );

      debugPrint('Created public project with ID: $projectId'); // Use the projectId

      if (mounted) {
        setState(() => _loadingProvider = false);
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Auftrag wurde erfolgreich als öffentliche Anfrage geteilt!'),
            backgroundColor: Color(0xFF14AD9F),
          ),
        );
        
        // Optionally navigate to the new project
        Navigator.of(context).pop(); // Go back to projects list
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingProvider = false);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Teilen: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _shareProject() async {
    // For projects, implement a simple share functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Projekt-Sharing wird implementiert'),
        backgroundColor: Color(0xFF14AD9F),
      ),
    );
  }

  Future<void> _navigateToProviderProfile() async {
    if (_providerInfo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Anbieter-Informationen nicht verfügbar'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Bereite Provider-Daten für den ProviderDetailScreen vor
    final providerData = Map<String, dynamic>.from(_providerInfo!);
    
    // Stelle sicher, dass wichtige Felder vorhanden sind
    final providerId = widget.quote?.assignedTo ?? widget.quote?.providerId;
    if (providerId != null) {
      providerData['id'] = providerId;
      providerData['userId'] = providerId;
      providerData['uid'] = providerId;
    }

    try {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => ProviderDetailScreen(
            providerData: providerData,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Öffnen des Anbieter-Profils: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DashboardLayout(
      title: isProject ? 'Projekt Details' : 'Auftrag Details',
      useGradientBackground: true,
      showBackButton: true,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card with Title and Status
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: const Border(
                    left: BorderSide(color: Colors.white, width: 4),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isProject ? Icons.folder : Icons.assignment_turned_in,
                            color: Colors.white,
                            size: 24,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: _getStatusColor(status),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _getStatusText(status),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        description,
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withValues(alpha: 0.9),
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Basic Information
            _buildDetailCard(
              'Grundinformationen',
              Column(
                children: [
                  _buildInfoRow('Typ', isProject ? 'Öffentliches Projekt' : 'Direkter Auftrag', icon: Icons.info_outline),
                  if (category != null)
                    _buildInfoRow('Kategorie', category!, icon: Icons.category),
                  _buildInfoRow(
                    'Erstellt am', 
                    '${createdAt.day}.${createdAt.month}.${createdAt.year}',
                    icon: Icons.calendar_today,
                  ),
                  if (estimatedBudget != null && estimatedBudget! > 0)
                    _buildInfoRow(
                      'Budget', 
                      '${estimatedBudget!.toStringAsFixed(2)}€',
                      icon: Icons.euro,
                    ),
                ],
              ),
            ),

            // Project specific information
            if (isProject) ...[
              _buildDetailCard(
                'Projekt Details',
                Column(
                  children: [
                    if (widget.project!.priority != null)
                      _buildInfoRow('Priorität', widget.project!.priority!, icon: Icons.flag),
                    if (widget.project!.theme != null)
                      _buildInfoRow('Thema', widget.project!.theme!, icon: Icons.topic),
                    if (widget.project!.updatedAt != null)
                      _buildInfoRow(
                        'Zuletzt bearbeitet',
                        '${widget.project!.updatedAt!.day}.${widget.project!.updatedAt!.month}.${widget.project!.updatedAt!.year}',
                        icon: Icons.update,
                      ),
                  ],
                ),
              ),
            ],

            // Quote specific information
            if (!isProject) ...[
              _buildDetailCard(
                'Auftrag Details',
                Column(
                  children: [
                    if (widget.quote!.subcategory != null)
                      _buildInfoRow('Unterkategorie', widget.quote!.subcategory!, icon: Icons.subdirectory_arrow_right),
                    if (widget.quote!.timeline != null)
                      _buildInfoRow('Zeitrahmen', widget.quote!.timeline!, icon: Icons.schedule),
                    if (widget.quote!.aiGenerated == true)
                      _buildInfoRow('KI-Generiert', 'Ja', icon: Icons.psychology),
                    if (widget.quote!.originalPrompt != null)
                      _buildInfoRow('Original Anfrage', widget.quote!.originalPrompt!, icon: Icons.chat),
                    if (widget.quote!.priority != null)
                      _buildInfoRow('Priorität', widget.quote!.priority!, icon: Icons.flag),
                    if (widget.quote!.urgency != null)
                      _buildInfoRow('Dringlichkeit', widget.quote!.urgency!, icon: Icons.warning),
                    if (widget.quote!.isDirectQuest == true)
                      _buildInfoRow('Typ', 'Direktauftrag', icon: Icons.assignment_turned_in),
                    if (widget.quote!.location != null && widget.quote!.location!['address'] != null)
                      _buildInfoRow('Standort', widget.quote!.location!['address'], icon: Icons.location_on),
                    if (widget.quote!.requiredServices != null && widget.quote!.requiredServices!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.list, size: 16, color: Colors.white70),
                              const SizedBox(width: 8),
                              Text(
                                'Benötigte Services:',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.white.withValues(alpha: 0.7),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          ...widget.quote!.requiredServices!.map((service) => 
                            Padding(
                              padding: const EdgeInsets.only(left: 24, bottom: 2),
                              child: Text(
                                '• $service',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Provider Information Card
              if (_providerInfo != null || _loadingProvider)
                _buildDetailCard(
                  'Beauftragter Anbieter',
                  _loadingProvider
                      ? const Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Column(
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 25,
                                  backgroundColor: const Color(0xFF14AD9F),
                                  backgroundImage: (_providerInfo!['profilePictureFirebaseUrl'] != null && 
                                                   _providerInfo!['profilePictureFirebaseUrl'].toString().isNotEmpty)
                                      ? NetworkImage(_providerInfo!['profilePictureFirebaseUrl'])
                                      : (_providerInfo!['profilePictureURL'] != null && 
                                         _providerInfo!['profilePictureURL'].toString().isNotEmpty)
                                          ? NetworkImage(_providerInfo!['profilePictureURL'])
                                          : null,
                                  child: (_providerInfo!['profilePictureFirebaseUrl'] == null || 
                                         _providerInfo!['profilePictureFirebaseUrl'].toString().isEmpty) &&
                                        (_providerInfo!['profilePictureURL'] == null || 
                                         _providerInfo!['profilePictureURL'].toString().isEmpty)
                                      ? const Icon(Icons.person, color: Colors.white)
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              _providerInfo!['companyName'] ?? _providerInfo!['name'] ?? 'Unbekannter Anbieter',
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                          if (_providerInfo!['isVerified'] == true)
                                            const Icon(
                                              Icons.verified,
                                              color: Color(0xFF14AD9F),
                                              size: 20,
                                            ),
                                        ],
                                      ),
                                      if (_providerInfo!['companyName'] != null)
                                        Text(
                                          _providerInfo!['companyName'],
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.white.withValues(alpha: 0.8),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: Colors.white30),
                            const SizedBox(height: 8),
                            
                            // Provider Details
                            if (_providerInfo!['companyCity'] != null || _providerInfo!['companyPostalCode'] != null)
                              _buildInfoRow(
                                'Standort', 
                                '${_providerInfo!['companyCity'] ?? ''} ${_providerInfo!['companyPostalCode'] ?? ''}'.trim(),
                                icon: Icons.location_on,
                              ),
                            
                            // Rating und Reviews (echte Daten aus Firebase)
                            if (_reviewStats != null && _reviewStats!['totalReviews'] > 0)
                              _buildInfoRow(
                                'Bewertungen', 
                                '${_reviewStats!['averageRating']} ⭐ (${_reviewStats!['totalReviews']} Bewertungen)',
                                icon: Icons.star,
                              )
                            else
                              _buildInfoRow(
                                'Bewertungen', 
                                'Noch keine Bewertungen',
                                icon: Icons.star_border,
                              ),
                            
                            // Abgeschlossene Aufträge (wird später mit echten Daten ergänzt)
                            if (_providerInfo!['completedOrders'] != null)
                              _buildInfoRow(
                                'Abgeschlossene Aufträge', 
                                '${_providerInfo!['completedOrders']} Aufträge',
                                icon: Icons.work_outline,
                              ),
                            
                            // Profil anzeigen Button
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: _navigateToProviderProfile,
                                icon: const Icon(Icons.person, color: Colors.white),
                                label: const Text('Profil anzeigen'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF14AD9F),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
            ],

            // Action Buttons
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _editItem(),
                    icon: const Icon(Icons.edit, color: Colors.white),
                    label: const Text('Bearbeiten'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14AD9F),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Show share button only for quotes (direct assignments)
                if (!isProject) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _shareAsPublicProject(),
                      icon: const Icon(Icons.share, color: Colors.white),
                      label: const Text('Öffentlich teilen'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _shareProject(),
                      icon: const Icon(Icons.share, color: Colors.white),
                      label: const Text('Teilen'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
