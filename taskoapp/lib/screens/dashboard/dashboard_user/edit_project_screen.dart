import 'package:flutter/material.dart';
import '../../../models/project.dart';
import '../../../services/project_service.dart';
import '../dashboard_layout.dart';

class EditProjectScreen extends StatefulWidget {
  final Project? project;
  final Quote? quote;

  const EditProjectScreen({
    super.key,
    this.project,
    this.quote,
  }) : assert(project != null || quote != null);

  @override
  State<EditProjectScreen> createState() => _EditProjectScreenState();
}

class _EditProjectScreenState extends State<EditProjectScreen> {
  final ProjectService _projectService = ProjectService();
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  late TextEditingController _budgetController;
  late TextEditingController _timelineController;
  
  String _selectedStatus = 'active';
  String? _selectedCategory;
  String? _selectedPriority;
  bool _isLoading = false;

  bool get isProject => widget.project != null;
  
  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    if (isProject) {
      _titleController = TextEditingController(text: widget.project!.title);
      _descriptionController = TextEditingController(text: widget.project!.description);
      _budgetController = TextEditingController(
        text: widget.project!.estimatedBudget?.toString() ?? '',
      );
      _timelineController = TextEditingController(); // Projects don't have timeline
      _selectedStatus = widget.project!.status;
      _selectedCategory = widget.project!.category;
      _selectedPriority = widget.project!.priority;
    } else {
      _titleController = TextEditingController(text: widget.quote!.title);
      _descriptionController = TextEditingController(text: widget.quote!.description);
      _budgetController = TextEditingController(
        text: widget.quote!.estimatedBudget?.toString() ?? '',
      );
      _timelineController = TextEditingController(text: widget.quote!.timeline ?? '');
      _selectedStatus = widget.quote!.status;
      _selectedCategory = widget.quote!.category;
      _selectedPriority = widget.quote!.priority;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    _timelineController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final updates = {
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'status': _selectedStatus,
        'category': _selectedCategory,
        'priority': _selectedPriority,
        'estimatedBudget': _budgetController.text.isNotEmpty 
            ? double.tryParse(_budgetController.text) 
            : null,
      };

      if (!isProject) {
        // Add timeline for quotes
        updates['timeline'] = _timelineController.text.trim();
      }

      if (isProject) {
        await _projectService.updateProject(widget.project!.id, updates);
      } else {
        await _projectService.updateQuote(widget.quote!.id, updates);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${isProject ? 'Projekt' : 'Auftrag'} erfolgreich aktualisiert'),
            backgroundColor: const Color(0xFF14AD9F),
          ),
        );
        Navigator.of(context).pop(true); // Return true to indicate success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Speichern: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildFormField({
    required String label,
    required TextEditingController controller,
    String? Function(String?)? validator,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? hint,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: controller,
            validator: validator,
            maxLines: maxLines,
            keyboardType: keyboardType,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.1),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF14AD9F), width: 2),
              ),
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdownField({
    required String label,
    required String? value,
    required List<String> items,
    required void Function(String?) onChanged,
    String? hint,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: value,
            onChanged: onChanged,
            dropdownColor: const Color(0xFF14AD9F),
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.1),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF14AD9F), width: 2),
              ),
              contentPadding: const EdgeInsets.all(16),
            ),
            items: items.map((item) => DropdownMenuItem(
              value: item,
              child: Text(item, style: const TextStyle(color: Colors.white)),
            )).toList(),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DashboardLayout(
      title: '${isProject ? 'Projekt' : 'Auftrag'} bearbeiten',
      useGradientBackground: true,
      showBackButton: true,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title Field
              _buildFormField(
                label: 'Titel',
                controller: _titleController,
                hint: 'Geben Sie einen aussagekräftigen Titel ein',
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Titel ist erforderlich';
                  }
                  return null;
                },
              ),

              // Description Field
              _buildFormField(
                label: 'Beschreibung',
                controller: _descriptionController,
                maxLines: 4,
                hint: 'Beschreiben Sie Ihr ${isProject ? 'Projekt' : 'Auftrag'} im Detail',
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Beschreibung ist erforderlich';
                  }
                  return null;
                },
              ),

              // Timeline Field (only for quotes)
              if (!isProject)
                _buildFormField(
                  label: 'Zeitrahmen',
                  controller: _timelineController,
                  hint: 'z.B. 20.10.2023, 19:00 - 21:00 Uhr',
                ),

              // Budget Field
              _buildFormField(
                label: 'Budget (€)',
                controller: _budgetController,
                keyboardType: TextInputType.number,
                hint: 'Geschätztes Budget in Euro',
                validator: (value) {
                  if (value != null && value.isNotEmpty) {
                    if (double.tryParse(value) == null) {
                      return 'Bitte geben Sie eine gültige Zahl ein';
                    }
                  }
                  return null;
                },
              ),

              // Status Dropdown
              _buildDropdownField(
                label: 'Status',
                value: _selectedStatus,
                items: ['active', 'completed', 'paused', 'planning', 'pending', 'cancelled'],
                onChanged: (value) => setState(() => _selectedStatus = value!),
                hint: 'Wählen Sie den Status',
              ),

              // Category Field
              _buildDropdownField(
                label: 'Kategorie',
                value: _selectedCategory,
                items: [
                  'Hotel & Gastronomie',
                  'Handwerk & Reparaturen',
                  'Reinigung & Haushalt',
                  'IT & Digital',
                  'Consulting & Beratung',
                  'Events & Entertainment',
                  'Sonstige'
                ],
                onChanged: (value) => setState(() => _selectedCategory = value),
                hint: 'Wählen Sie eine Kategorie',
              ),

              // Priority Dropdown
              _buildDropdownField(
                label: 'Priorität',
                value: _selectedPriority,
                items: ['low', 'medium', 'high', 'urgent'],
                onChanged: (value) => setState(() => _selectedPriority = value),
                hint: 'Wählen Sie die Priorität',
              ),

              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveChanges,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14AD9F),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          '${isProject ? 'Projekt' : 'Auftrag'} speichern',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
