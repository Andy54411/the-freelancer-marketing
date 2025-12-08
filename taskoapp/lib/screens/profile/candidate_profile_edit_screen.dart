import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:io';
import '../../services/job_application_service.dart';
import '../../widgets/taskilo_place_autocomplete.dart';
import '../common/file_viewer_screen.dart';

class CandidateProfileEditScreen extends StatefulWidget {
  final Map<String, dynamic> initialProfile;

  const CandidateProfileEditScreen({super.key, required this.initialProfile});

  @override
  State<CandidateProfileEditScreen> createState() =>
      _CandidateProfileEditScreenState();
}

class _CandidateProfileEditScreenState
    extends State<CandidateProfileEditScreen> {
  final JobApplicationService _service = JobApplicationService();
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  // Lists
  late List<Map<String, dynamic>> _experience;
  late List<Map<String, dynamic>> _education;
  late List<Map<String, dynamic>> _languages;
  late TextEditingController _skillsController;

  @override
  void initState() {
    super.initState();
    debugPrint(
      'CandidateProfileEditScreen: Initial Profile Data: ${widget.initialProfile}',
    );
    if (widget.initialProfile['experience'] != null) {
      debugPrint(
        'CandidateProfileEditScreen: Experience Data: ${widget.initialProfile['experience']}',
      );
    }

    _experience = List<Map<String, dynamic>>.from(
      widget.initialProfile['experience'] ?? [],
    );
    _education = List<Map<String, dynamic>>.from(
      widget.initialProfile['education'] ?? [],
    );
    _languages = List<Map<String, dynamic>>.from(
      widget.initialProfile['languages'] ?? [],
    );

    var skills = widget.initialProfile['skills'];
    String skillsText = '';
    if (skills is List) {
      skillsText = skills.join(', ');
    } else if (skills is String) {
      skillsText = skills;
    }
    _skillsController = TextEditingController(text: skillsText);
  }

  @override
  void dispose() {
    _skillsController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final skillsList = _skillsController.text
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      final data = {
        'experience': _experience,
        'education': _education,
        'languages': _languages,
        'skills': skillsList,
      };

      await _service.updateCandidateProfile(data);

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Profil gespeichert')));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler beim Speichern: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _editExperience(int index) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _ExperienceDialog(
        initialData: index >= 0 ? _experience[index] : null,
      ),
    );

    if (result != null) {
      setState(() {
        if (index >= 0) {
          _experience[index] = result;
        } else {
          _experience.add(result);
        }
      });
    }
  }

  void _deleteExperience(int index) {
    setState(() {
      _experience.removeAt(index);
    });
  }

  void _editEducation(int index) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) =>
          _EducationDialog(initialData: index >= 0 ? _education[index] : null),
    );

    if (result != null) {
      setState(() {
        if (index >= 0) {
          _education[index] = result;
        } else {
          _education.add(result);
        }
      });
    }
  }

  void _deleteEducation(int index) {
    setState(() {
      _education.removeAt(index);
    });
  }

  void _editLanguage(int index) async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) =>
          _LanguageDialog(initialData: index >= 0 ? _languages[index] : null),
    );

    if (result != null) {
      setState(() {
        if (index >= 0) {
          _languages[index] = result;
        } else {
          _languages.add(result);
        }
      });
    }
  }

  void _deleteLanguage(int index) {
    setState(() {
      _languages.removeAt(index);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil bearbeiten'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.save),
            onPressed: _isSaving ? null : _save,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildSectionHeader('Berufserfahrung', () => _editExperience(-1)),
            if (_experience.isEmpty)
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text(
                  'Keine Berufserfahrung eingetragen.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              ..._experience.asMap().entries.map((entry) {
                final exp = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(exp['title'] ?? 'Kein Titel'),
                    subtitle: Text(
                      '${exp['company'] ?? ''} • ${exp['startDate'] ?? ''}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (exp['certificateUrl'] != null)
                          const Padding(
                            padding: EdgeInsets.only(right: 8.0),
                            child: Icon(
                              Icons.description,
                              color: Colors.teal,
                              size: 20,
                            ),
                          ),
                        IconButton(
                          icon: const Icon(Icons.edit, color: Colors.teal),
                          onPressed: () => _editExperience(entry.key),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteExperience(entry.key),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 24),
            _buildSectionHeader('Bildungsweg', () => _editEducation(-1)),
            if (_education.isEmpty)
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text(
                  'Kein Bildungsweg eingetragen.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              ..._education.asMap().entries.map((entry) {
                final edu = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(edu['degree'] ?? 'Kein Abschluss'),
                    subtitle: Text(
                      '${edu['institution'] ?? ''} • ${edu['startDate'] ?? ''}',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (edu['certificateUrl'] != null)
                          const Padding(
                            padding: EdgeInsets.only(right: 8.0),
                            child: Icon(
                              Icons.description,
                              color: Colors.teal,
                              size: 20,
                            ),
                          ),
                        IconButton(
                          icon: const Icon(Icons.edit, color: Colors.teal),
                          onPressed: () => _editEducation(entry.key),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteEducation(entry.key),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 24),
            _buildSectionHeader('Sprachkenntnisse', () => _editLanguage(-1)),
            if (_languages.isEmpty)
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text(
                  'Keine Sprachkenntnisse eingetragen.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              ..._languages.asMap().entries.map((entry) {
                final lang = entry.value;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(lang['language'] ?? 'Keine Sprache'),
                    subtitle: Text(lang['level'] ?? ''),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, color: Colors.teal),
                          onPressed: () => _editLanguage(entry.key),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _deleteLanguage(entry.key),
                        ),
                      ],
                    ),
                  ),
                );
              }),

            const SizedBox(height: 24),
            const Text(
              'Fachkenntnisse',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _skillsController,
              decoration: const InputDecoration(
                labelText: 'Fähigkeiten (kommagetrennt)',
                border: OutlineInputBorder(),
                hintText: 'z.B. Flutter, React, Management',
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, VoidCallback onAdd) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        IconButton(
          icon: const Icon(Icons.add_circle, color: Colors.teal),
          onPressed: onAdd,
        ),
      ],
    );
  }
}

class _ExperienceDialog extends StatefulWidget {
  final Map<String, dynamic>? initialData;

  const _ExperienceDialog({this.initialData});

  @override
  State<_ExperienceDialog> createState() => _ExperienceDialogState();
}

class _ExperienceDialogState extends State<_ExperienceDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _companyController;
  late TextEditingController _locationController;
  late TextEditingController _startDateController;
  late TextEditingController _endDateController;
  late TextEditingController _descriptionController;

  String? _certificateUrl;
  String? _certificateName;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(
      text: widget.initialData?['title'],
    );
    _companyController = TextEditingController(
      text: widget.initialData?['company'],
    );
    _locationController = TextEditingController(
      text: widget.initialData?['location'],
    );
    _startDateController = TextEditingController(
      text: widget.initialData?['startDate'],
    );
    _endDateController = TextEditingController(
      text: widget.initialData?['endDate'],
    );
    _descriptionController = TextEditingController(
      text: widget.initialData?['description'],
    );
    _certificateUrl = widget.initialData?['certificateUrl'];
    _certificateName = widget.initialData?['fileName'];

    // Fallback: Wenn URL da ist, aber kein Name
    if (_certificateUrl != null &&
        (_certificateName == null || _certificateName!.isEmpty)) {
      _certificateName = 'Vorhandenes Zeugnis';
    }
  }

  Future<void> _pickAndUploadFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null) {
        setState(() => _isUploading = true);

        final file = File(result.files.single.path!);
        final fileName = result.files.single.name;
        final user = FirebaseAuth.instance.currentUser;

        if (user == null) throw Exception('Nicht eingeloggt');

        // Upload to Firebase Storage
        final ref = FirebaseStorage.instance.ref().child(
          'users/${user.uid}/certificates/${DateTime.now().millisecondsSinceEpoch}_$fileName',
        );

        await ref.putFile(file);
        final url = await ref.getDownloadURL();

        setState(() {
          _certificateUrl = url;
          _certificateName = fileName;
          _isUploading = false;
        });
      }
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler beim Upload: $e')));
      }
    }
  }

  Future<void> _selectDate(
    BuildContext context,
    TextEditingController controller,
  ) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      locale: const Locale('de', 'DE'),
    );
    if (picked != null) {
      setState(() {
        controller.text =
            "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.initialData == null
            ? 'Erfahrung hinzufügen'
            : 'Erfahrung bearbeiten',
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(labelText: 'Position'),
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TaskiloPlaceAutocomplete(
                  controller: _companyController,
                  labelText: 'Firma',
                  types: 'establishment',
                  restrictToDach: false,
                  onPlaceSelected: (place) {},
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TaskiloPlaceAutocomplete(
                  controller: _locationController,
                  labelText: 'Ort',
                  types: '(cities)',
                  restrictToDach: false,
                  onPlaceSelected: (place) {},
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _startDateController,
                  decoration: const InputDecoration(
                    labelText: 'Start (YYYY-MM-DD)',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: () => _selectDate(context, _startDateController),
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _endDateController,
                  decoration: const InputDecoration(
                    labelText: 'Ende (YYYY-MM-DD) - Leer für Aktuell',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: () => _selectDate(context, _endDateController),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(labelText: 'Beschreibung'),
                  maxLines: 3,
                ),
                const SizedBox(height: 24),

                // Certificate Upload
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Arbeitszeugnis',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          if (_certificateUrl != null)
                            Row(
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Colors.teal,
                                  size: 16,
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    _certificateName ?? 'Zeugnis vorhanden',
                                    style: const TextStyle(color: Colors.teal),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.visibility,
                                    color: Colors.teal,
                                    size: 20,
                                  ),
                                  onPressed: () {
                                    if (_certificateUrl != null) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              FileViewerScreen(
                                                url: _certificateUrl!,
                                                fileName:
                                                    _certificateName ??
                                                    'Dokument',
                                              ),
                                        ),
                                      );
                                    }
                                  },
                                  tooltip: 'Ansehen',
                                ),
                              ],
                            )
                          else
                            const Text(
                              'Kein Zeugnis ausgewählt',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (_isUploading)
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      ElevatedButton.icon(
                        onPressed: _pickAndUploadFile,
                        icon: const Icon(Icons.upload_file, size: 18),
                        label: Text(
                          _certificateUrl != null ? 'Ändern' : 'Upload',
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade100,
                          foregroundColor: Colors.black87,
                          elevation: 0,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Abbrechen'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, {
                'title': _titleController.text,
                'company': _companyController.text,
                'location': _locationController.text,
                'startDate': _startDateController.text,
                'endDate': _endDateController.text,
                'description': _descriptionController.text,
                'certificateUrl': _certificateUrl,
                'fileName': _certificateName,
              });
            }
          },
          child: const Text('Speichern'),
        ),
      ],
    );
  }
}

class _EducationDialog extends StatefulWidget {
  final Map<String, dynamic>? initialData;

  const _EducationDialog({this.initialData});

  @override
  State<_EducationDialog> createState() => _EducationDialogState();
}

class _EducationDialogState extends State<_EducationDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _degreeController;
  late TextEditingController _institutionController;
  late TextEditingController _locationController;
  late TextEditingController _startDateController;
  late TextEditingController _endDateController;
  late TextEditingController _descriptionController;

  String? _certificateUrl;
  String? _certificateName;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _degreeController = TextEditingController(
      text: widget.initialData?['degree'],
    );
    _institutionController = TextEditingController(
      text: widget.initialData?['institution'],
    );
    _locationController = TextEditingController(
      text: widget.initialData?['location'],
    );
    _startDateController = TextEditingController(
      text: widget.initialData?['startDate'],
    );
    _endDateController = TextEditingController(
      text: widget.initialData?['endDate'],
    );
    _descriptionController = TextEditingController(
      text: widget.initialData?['description'],
    );
    _certificateUrl = widget.initialData?['certificateUrl'];
    _certificateName = widget.initialData?['fileName'];

    if (_certificateUrl != null &&
        (_certificateName == null || _certificateName!.isEmpty)) {
      _certificateName = 'Vorhandenes Zeugnis';
    }
  }

  Future<void> _pickAndUploadFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
      );

      if (result != null) {
        setState(() => _isUploading = true);

        final file = File(result.files.single.path!);
        final fileName = result.files.single.name;
        final user = FirebaseAuth.instance.currentUser;

        if (user == null) throw Exception('Nicht eingeloggt');

        // Upload to Firebase Storage
        final ref = FirebaseStorage.instance.ref().child(
          'users/${user.uid}/certificates/${DateTime.now().millisecondsSinceEpoch}_$fileName',
        );

        await ref.putFile(file);
        final url = await ref.getDownloadURL();

        setState(() {
          _certificateUrl = url;
          _certificateName = fileName;
          _isUploading = false;
        });
      }
    } catch (e) {
      setState(() => _isUploading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler beim Upload: $e')));
      }
    }
  }

  Future<void> _selectDate(
    BuildContext context,
    TextEditingController controller,
  ) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      locale: const Locale('de', 'DE'),
    );
    if (picked != null) {
      setState(() {
        controller.text =
            "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.initialData == null
            ? 'Bildungsweg hinzufügen'
            : 'Bildungsweg bearbeiten',
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _degreeController,
                  decoration: const InputDecoration(labelText: 'Abschluss'),
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TaskiloPlaceAutocomplete(
                  controller: _institutionController,
                  labelText: 'Institution',
                  types: 'establishment',
                  restrictToDach: false,
                  onPlaceSelected: (place) {},
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TaskiloPlaceAutocomplete(
                  controller: _locationController,
                  labelText: 'Ort',
                  types: '(cities)',
                  restrictToDach: false,
                  onPlaceSelected: (place) {},
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _startDateController,
                  decoration: const InputDecoration(
                    labelText: 'Start (YYYY-MM-DD)',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: () => _selectDate(context, _startDateController),
                  validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _endDateController,
                  decoration: const InputDecoration(
                    labelText: 'Ende (YYYY-MM-DD) - Leer für Aktuell',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: () => _selectDate(context, _endDateController),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  decoration: const InputDecoration(labelText: 'Beschreibung'),
                  maxLines: 3,
                ),
                const SizedBox(height: 24),

                // Certificate Upload
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Zeugnis / Zertifikat',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          if (_certificateUrl != null)
                            Row(
                              children: [
                                const Icon(
                                  Icons.check_circle,
                                  color: Colors.teal,
                                  size: 16,
                                ),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    _certificateName ?? 'Zeugnis vorhanden',
                                    style: const TextStyle(color: Colors.teal),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.visibility,
                                    color: Colors.teal,
                                    size: 20,
                                  ),
                                  onPressed: () {
                                    if (_certificateUrl != null) {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              FileViewerScreen(
                                                url: _certificateUrl!,
                                                fileName:
                                                    _certificateName ??
                                                    'Dokument',
                                              ),
                                        ),
                                      );
                                    }
                                  },
                                  tooltip: 'Ansehen',
                                ),
                              ],
                            )
                          else
                            const Text(
                              'Kein Zeugnis ausgewählt',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (_isUploading)
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      ElevatedButton.icon(
                        onPressed: _pickAndUploadFile,
                        icon: const Icon(Icons.upload_file, size: 18),
                        label: Text(
                          _certificateUrl != null ? 'Ändern' : 'Upload',
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey.shade100,
                          foregroundColor: Colors.black87,
                          elevation: 0,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Abbrechen'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, {
                'degree': _degreeController.text,
                'institution': _institutionController.text,
                'location': _locationController.text,
                'startDate': _startDateController.text,
                'endDate': _endDateController.text,
                'description': _descriptionController.text,
                'certificateUrl': _certificateUrl,
                'fileName': _certificateName,
              });
            }
          },
          child: const Text('Speichern'),
        ),
      ],
    );
  }
}

class _LanguageDialog extends StatefulWidget {
  final Map<String, dynamic>? initialData;

  const _LanguageDialog({this.initialData});

  @override
  State<_LanguageDialog> createState() => _LanguageDialogState();
}

class _LanguageDialogState extends State<_LanguageDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _languageController;
  String _level = 'Grundkenntnisse';

  final List<String> _levels = [
    'Grundkenntnisse',
    'Gut',
    'Fließend',
    'Verhandlungssicher',
    'Muttersprache',
  ];

  @override
  void initState() {
    super.initState();
    _languageController = TextEditingController(
      text: widget.initialData?['language'],
    );
    if (widget.initialData?['level'] != null &&
        _levels.contains(widget.initialData!['level'])) {
      _level = widget.initialData!['level'];
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.initialData == null
            ? 'Sprache hinzufügen'
            : 'Sprache bearbeiten',
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _languageController,
              decoration: const InputDecoration(labelText: 'Sprache'),
              validator: (v) => v!.isEmpty ? 'Pflichtfeld' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _level,
              decoration: const InputDecoration(labelText: 'Niveau'),
              items: _levels
                  .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                  .toList(),
              onChanged: (v) => setState(() => _level = v!),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Abbrechen'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, {
                'language': _languageController.text,
                'level': _level,
              });
            }
          },
          child: const Text('Speichern'),
        ),
      ],
    );
  }
}
