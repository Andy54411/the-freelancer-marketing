import 'package:flutter/material.dart';
import '../../services/job_alert_service.dart';

class JobfinderScreen extends StatefulWidget {
  const JobfinderScreen({super.key});

  @override
  State<JobfinderScreen> createState() => _JobfinderScreenState();
}

class _JobfinderScreenState extends State<JobfinderScreen> {
  final JobAlertService _alertService = JobAlertService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _alerts = [];

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() => _isLoading = true);
    try {
      final alerts = await _alertService.getJobAlerts();
      if (mounted) {
        setState(() {
          _alerts = alerts;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler: $e')),
        );
      }
    }
  }

  Future<void> _deleteAlert(String alertId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Jobfinder löschen?'),
        content: const Text('Möchten Sie diesen Jobfinder wirklich löschen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Löschen'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _alertService.deleteJobAlert(alertId);
        _loadAlerts();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Jobfinder gelöscht')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Fehler: $e')),
          );
        }
      }
    }
  }

  Future<void> _toggleAlert(String alertId, bool isActive) async {
    try {
      await _alertService.toggleJobAlert(alertId, isActive);
      _loadAlerts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler: $e')),
        );
      }
    }
  }

  void _openCreateDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CreateJobfinderSheet(
        onCreated: () {
          Navigator.pop(context);
          _loadAlerts();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF14ad9f),
      appBar: AppBar(
        title: const Text('Mein Jobfinder'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF14ad9f), Color(0xFF0d7a70)],
          ),
        ),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : _alerts.isEmpty
                ? _buildEmptyState()
                : _buildAlertsList(),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateDialog,
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF14ad9f),
        icon: const Icon(Icons.add),
        label: const Text('Neuer Jobfinder'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_active,
              size: 80,
              color: Colors.white.withValues(alpha: 0.8),
            ),
            const SizedBox(height: 24),
            const Text(
              'Mein Jobfinder',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Mit dem Jobfinder erhältst du immer die neusten, auf dich zugeschnittenen Jobs bequem per Push-Benachrichtigung.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Wähle einfach deine Suchkriterien aus und erstelle deinen Jobfinder.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _openCreateDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF14ad9f),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.add),
              label: const Text(
                'Jobfinder erstellen',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsList() {
    return RefreshIndicator(
      onRefresh: _loadAlerts,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _alerts.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                'Du hast ${_alerts.length} aktive${_alerts.length == 1 ? 'n' : ''} Jobfinder',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
            );
          }

          final alert = _alerts[index - 1];
          final isActive = alert['active'] as bool? ?? true;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          alert['name'] ?? 'Mein Jobfinder',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Switch(
                        value: isActive,
                        onChanged: (value) => _toggleAlert(alert['id'], value),
                        activeTrackColor: const Color(0xFF14ad9f),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _buildCriteriaRow(
                    Icons.search,
                    'Suchbegriff',
                    alert['searchTerm'] ?? 'Alle',
                  ),
                  _buildCriteriaRow(
                    Icons.location_on,
                    'Standort',
                    alert['location'] ?? 'Überall',
                  ),
                  if (alert['category'] != null && (alert['category'] as String).isNotEmpty)
                    _buildCriteriaRow(
                      Icons.category,
                      'Kategorie',
                      alert['category'],
                    ),
                  if (alert['jobType'] != null && (alert['jobType'] as String).isNotEmpty)
                    _buildCriteriaRow(
                      Icons.work,
                      'Jobtyp',
                      alert['jobType'],
                    ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (alert['pushNotification'] == true)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.notifications,
                                size: 14,
                                color: const Color(0xFF14ad9f),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Push',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: const Color(0xFF14ad9f),
                                ),
                              ),
                            ],
                          ),
                        ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => _deleteAlert(alert['id']),
                        icon: const Icon(Icons.delete_outline),
                        color: Colors.red.shade400,
                        tooltip: 'Löschen',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCriteriaRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '-' : value,
              style: const TextStyle(fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Sheet zum Erstellen eines neuen Jobfinders
class _CreateJobfinderSheet extends StatefulWidget {
  final VoidCallback onCreated;

  const _CreateJobfinderSheet({required this.onCreated});

  @override
  State<_CreateJobfinderSheet> createState() => _CreateJobfinderSheetState();
}

class _CreateJobfinderSheetState extends State<_CreateJobfinderSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Mein Jobfinder');
  final _searchTermController = TextEditingController();
  final _locationController = TextEditingController();
  
  String? _selectedCategory;
  String? _selectedJobType;
  bool _pushNotification = true;
  bool _isSubmitting = false;

  final List<String> _categories = [
    'Hotel & Gastronomie',
    'IT & Technik',
    'Handwerk',
    'Verkauf & Handel',
    'Büro & Verwaltung',
    'Gesundheit & Pflege',
    'Bildung & Erziehung',
    'Sonstige',
  ];

  final List<String> _jobTypes = [
    'Vollzeit',
    'Teilzeit',
    'Minijob',
    'Freelance',
    'Praktikum',
    'Ausbildung',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _searchTermController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _createJobfinder() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      await JobAlertService().createJobAlert(
        name: _nameController.text.trim(),
        searchTerm: _searchTermController.text.trim().isNotEmpty
            ? _searchTermController.text.trim()
            : null,
        location: _locationController.text.trim().isNotEmpty
            ? _locationController.text.trim()
            : null,
        category: _selectedCategory,
        jobType: _selectedJobType,
        pushNotification: _pushNotification,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Jobfinder erfolgreich erstellt!'),
            backgroundColor: Color(0xFF14ad9f),
          ),
        );
        widget.onCreated();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Neuen Jobfinder erstellen',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Wähle deine Suchkriterien und werde benachrichtigt, wenn neue passende Jobs online gehen.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 24),

              // Name
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name des Jobfinders',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.bookmark),
                ),
                validator: (v) => v?.isEmpty ?? true ? 'Pflichtfeld' : null,
              ),
              const SizedBox(height: 16),

              // Suchbegriff
              TextFormField(
                controller: _searchTermController,
                decoration: const InputDecoration(
                  labelText: 'Suchbegriff (optional)',
                  hintText: 'z.B. Koch, Kellner, Rezeptionist',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.search),
                ),
              ),
              const SizedBox(height: 16),

              // Standort
              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(
                  labelText: 'Standort (optional)',
                  hintText: 'z.B. München, Berlin',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.location_on),
                ),
              ),
              const SizedBox(height: 16),

              // Kategorie
              DropdownButtonFormField<String>(
                initialValue: _selectedCategory,
                decoration: const InputDecoration(
                  labelText: 'Kategorie (optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.category),
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Alle Kategorien'),
                  ),
                  ..._categories.map((c) => DropdownMenuItem(
                        value: c,
                        child: Text(c),
                      )),
                ],
                onChanged: (v) => setState(() => _selectedCategory = v),
              ),
              const SizedBox(height: 16),

              // Jobtyp
              DropdownButtonFormField<String>(
                initialValue: _selectedJobType,
                decoration: const InputDecoration(
                  labelText: 'Jobtyp (optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.work),
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Alle Jobtypen'),
                  ),
                  ..._jobTypes.map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t),
                      )),
                ],
                onChanged: (v) => setState(() => _selectedJobType = v),
              ),
              const SizedBox(height: 24),

              // Push Notifications
              SwitchListTile(
                value: _pushNotification,
                onChanged: (v) => setState(() => _pushNotification = v),
                title: const Text('Push-Benachrichtigungen'),
                subtitle: const Text('Bei neuen passenden Jobs benachrichtigen'),
                activeTrackColor: const Color(0xFF14ad9f),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _createJobfinder,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14ad9f),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Jobfinder erstellen',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
