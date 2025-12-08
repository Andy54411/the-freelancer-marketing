import 'package:flutter/material.dart';
import '../../models/job_posting.dart';
import '../../services/job_application_service.dart';
import '../profile/candidate_profile_edit_screen.dart';
import '../common/file_viewer_screen.dart';

class JobApplicationScreen extends StatefulWidget {
  final JobPosting job;

  const JobApplicationScreen({super.key, required this.job});

  @override
  State<JobApplicationScreen> createState() => _JobApplicationScreenState();
}

class _JobApplicationScreenState extends State<JobApplicationScreen> {
  final JobApplicationService _applicationService = JobApplicationService();
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _birthDateController = TextEditingController();
  final TextEditingController _streetController = TextEditingController();
  final TextEditingController _zipController = TextEditingController();
  final TextEditingController _cityController = TextEditingController();
  final TextEditingController _countryController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();

  String _salutation = 'Herr';
  bool _isLoading = true;
  bool _isSubmitting = false;
  Map<String, dynamic>? _profile;

  // Attachments
  final List<Map<String, dynamic>> _cvAttachments = [];
  final List<Map<String, dynamic>> _coverLetterAttachments = [];
  final List<Map<String, dynamic>> _otherAttachments = [];

  final Set<String> _selectedAttachmentIds = {};

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _birthDateController.dispose();
    _streetController.dispose();
    _zipController.dispose();
    _cityController.dispose();
    _countryController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _applicationService.getCandidateProfile();
      debugPrint('JobApplicationScreen: Loaded profile: $profile');
      if (mounted) {
        setState(() {
          _profile = profile;
          _isLoading = false;

          // Clear existing lists to avoid duplicates on reload
          _cvAttachments.clear();
          _coverLetterAttachments.clear();
          _otherAttachments.clear();
          _selectedAttachmentIds.clear();
        });

        if (profile != null) {
          _salutation = profile['salutation'] ?? 'Herr';
          _firstNameController.text = profile['firstName'] ?? '';
          _lastNameController.text = profile['lastName'] ?? '';
          _emailController.text = profile['email'] ?? '';
          _phoneController.text = profile['phone'] ?? '';
          _birthDateController.text = profile['birthDate'] ?? '';
          _streetController.text = profile['street'] ?? '';
          _zipController.text = profile['zip'] ?? '';
          _cityController.text = profile['city'] ?? '';
          _countryController.text = profile['country'] ?? 'Deutschland';

          // Load CVs
          if (profile['cvUrl'] != null &&
              profile['cvUrl'].toString().isNotEmpty) {
            final id = 'cv_profile';
            _cvAttachments.add({
              'id': id,
              'name': profile['cvName'] ?? 'Lebenslauf',
              'url': profile['cvUrl'],
              'type': 'Lebenslauf',
              'source': 'profile',
            });
            _selectedAttachmentIds.add(id);
          }

          // Load Cover Letters
          if (profile['coverLetterUrl'] != null &&
              profile['coverLetterUrl'].toString().isNotEmpty) {
            final id = 'cl_profile';
            _coverLetterAttachments.add({
              'id': id,
              'name': profile['coverLetterName'] ?? 'Anschreiben',
              'url': profile['coverLetterUrl'],
              'type': 'Anschreiben',
              'source': 'profile',
            });
            _selectedAttachmentIds.add(id);
          }

          // Extract certificates from experience
          if (profile['experience'] != null && profile['experience'] is List) {
            int i = 0;
            for (var exp in profile['experience']) {
              if (exp['certificateUrl'] != null &&
                  exp['certificateUrl'].toString().isNotEmpty) {
                _otherAttachments.add({
                  'id': 'exp_$i',
                  'name':
                      exp['fileName'] ??
                      'Zeugnis - ${exp['company'] ?? 'Unbekannt'}',
                  'url': exp['certificateUrl'],
                  'type': 'Zeugnis',
                  'source': 'profile',
                });
                i++;
              }
            }
          }

          // Extract certificates from education
          if (profile['education'] != null && profile['education'] is List) {
            int i = 0;
            for (var edu in profile['education']) {
              if (edu['certificateUrl'] != null &&
                  edu['certificateUrl'].toString().isNotEmpty) {
                _otherAttachments.add({
                  'id': 'edu_$i',
                  'name':
                      edu['fileName'] ??
                      'Zeugnis - ${edu['institution'] ?? 'Unbekannt'}',
                  'url': edu['certificateUrl'],
                  'type': 'Zeugnis',
                  'source': 'profile',
                });
                i++;
              }
            }
          }

          // Extract qualifications
          if (profile['qualifications'] != null &&
              profile['qualifications'] is List) {
            int i = 0;
            for (var qual in profile['qualifications']) {
              if (qual['certificateUrl'] != null &&
                  qual['certificateUrl'].toString().isNotEmpty) {
                _otherAttachments.add({
                  'id': 'qual_$i',
                  'name':
                      qual['fileName'] ??
                      'Zertifikat - ${qual['name'] ?? 'Unbekannt'}',
                  'url': qual['certificateUrl'],
                  'type': 'Zertifikat',
                  'source': 'profile',
                });
                i++;
              }
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden des Profils: $e')),
        );
      }
    }
  }

  Future<void> _submitApplication() async {
    if (!_formKey.currentState!.validate()) return;
    if (_profile == null) return;

    // Validate attachments
    bool hasCv = false;
    for (var att in _cvAttachments) {
      if (_selectedAttachmentIds.contains(att['id'])) {
        hasCv = true;
        break;
      }
    }

    if (!hasCv) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte fügen Sie mindestens einen Lebenslauf bei.'),
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final personalData = {
        'salutation': _salutation,
        'firstName': _firstNameController.text,
        'lastName': _lastNameController.text,
        'email': _emailController.text,
        'phone': _phoneController.text,
        'birthDate': _birthDateController.text,
        'street': _streetController.text,
        'zip': _zipController.text,
        'city': _cityController.text,
        'country': _countryController.text,
      };

      final allAttachments = [
        ..._cvAttachments,
        ..._coverLetterAttachments,
        ..._otherAttachments,
      ];

      final selectedAttachments = allAttachments
          .where((att) => _selectedAttachmentIds.contains(att['id']))
          .toList();

      await _applicationService.applyForJob(
        jobId: widget.job.id,
        companyId: widget.job.companyId,
        jobTitle: widget.job.title,
        companyName: widget.job.companyName,
        applicantProfile: _profile!,
        personalData: personalData,
        attachments: selectedAttachments,
        message: _messageController.text,
      );

      if (mounted) {
        Navigator.pop(context, true); // Success
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler beim Senden: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.month.toString().padLeft(2, '0')}.${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  Widget _buildOnlineProfileCard() {
    if (_profile == null) return const SizedBox.shrink();

    final experience = _profile!['experience'] as List? ?? [];
    final education = _profile!['education'] as List? ?? [];
    final languages = _profile!['languages'] as List? ?? [];
    final skills = _profile!['skills']; // Can be List or String?

    List<String> skillsList = [];
    if (skills is List) {
      skillsList = skills.map((e) => e.toString()).toList();
    } else if (skills is String) {
      skillsList = skills.split(',').map((e) => e.trim()).toList();
    }

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Online-Profil',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
              TextButton.icon(
                onPressed: () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          CandidateProfileEditScreen(initialProfile: _profile!),
                    ),
                  );
                  if (result == true) {
                    _loadProfile();
                  }
                },
                icon: const Icon(Icons.edit, size: 16),
                label: const Text('Bearbeiten'),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.teal,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          tilePadding: const EdgeInsets.symmetric(
            horizontal: 24.0,
            vertical: 8.0,
          ),
          childrenPadding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 24.0),
          initiallyExpanded: false,
          children: [
            if (experience.isEmpty &&
                education.isEmpty &&
                languages.isEmpty &&
                skillsList.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16.0),
                child: Text(
                  'Noch keine Profilinformationen hinterlegt.',
                  style: TextStyle(
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),

            // Berufserfahrung
            if (experience.isNotEmpty) ...[
              const Text(
                'Berufserfahrung',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ...experience.map((exp) {
                final start = _formatDate(exp['startDate']);
                final end =
                    exp['endDate'] != null &&
                        exp['endDate'].toString().isNotEmpty
                    ? _formatDate(exp['endDate'])
                    : 'Aktuell';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        exp['title'] ?? '',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${exp['company'] ?? ''} • ${exp['location'] ?? ''}',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$start - $end',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 13,
                        ),
                      ),
                      if (exp['description'] != null &&
                          exp['description'].toString().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          exp['description'],
                          style: const TextStyle(fontSize: 14, height: 1.4),
                        ),
                      ],
                      if (exp['fileName'] != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(
                              Icons.attachment,
                              size: 16,
                              color: Colors.teal,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                exp['fileName'],
                                style: const TextStyle(
                                  color: Colors.teal,
                                  fontSize: 13,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              }),
              const Divider(),
              const SizedBox(height: 24),
            ],

            // Bildungsweg
            if (education.isNotEmpty) ...[
              const Text(
                'Bildungsweg',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ...education.map((edu) {
                final start = _formatDate(edu['startDate']);
                final end =
                    edu['endDate'] != null &&
                        edu['endDate'].toString().isNotEmpty
                    ? _formatDate(edu['endDate'])
                    : 'Aktuell';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        edu['degree'] ?? '',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${edu['institution'] ?? ''} • ${edu['location'] ?? ''}',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$start - $end',
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 13,
                        ),
                      ),
                      if (edu['description'] != null &&
                          edu['description'].toString().isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          edu['description'],
                          style: const TextStyle(fontSize: 14, height: 1.4),
                        ),
                      ],
                      if (edu['fileName'] != null) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(
                              Icons.attachment,
                              size: 16,
                              color: Colors.teal,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                edu['fileName'],
                                style: const TextStyle(
                                  color: Colors.teal,
                                  fontSize: 13,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              }),
              const Divider(),
              const SizedBox(height: 24),
            ],

            // Sprachkenntnisse
            if (languages.isNotEmpty) ...[
              const Text(
                'Sprachkenntnisse',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ...languages.map(
                (lang) => Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        lang['language'] ?? '',
                        style: const TextStyle(fontSize: 15),
                      ),
                      Text(
                        lang['level'] ?? '',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(),
              const SizedBox(height: 24),
            ],

            // Fachkenntnisse
            if (skillsList.isNotEmpty) ...[
              const Text(
                'Fachkenntnisse',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: skillsList
                    .map(
                      (skill) => Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Text(
                          skill,
                          style: TextStyle(
                            color: Colors.grey.shade800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAttachmentCard({
    required String title,
    required String subtitle,
    required List<Map<String, dynamic>> attachments,
    required String uploadLabel,
    required VoidCallback onUpload,
    bool isRequired = false,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Row(
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
              if (!isRequired) ...[
                const SizedBox(width: 8),
                Text(
                  '(optional)',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade400,
                    fontWeight: FontWeight.normal,
                  ),
                ),
              ],
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4.0),
            child: Text(
              subtitle,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ),
          tilePadding: const EdgeInsets.symmetric(
            horizontal: 24.0,
            vertical: 8.0,
          ),
          childrenPadding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 24.0),
          initiallyExpanded: false,
          children: [
            const SizedBox(height: 16),
            if (attachments.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'Keine Dokumente gefunden.',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: isRequired
                        ? Colors.red.shade400
                        : Colors.grey.shade400,
                    fontSize: 14,
                  ),
                ),
              )
            else
              ...attachments.map((att) {
                final isSelected = _selectedAttachmentIds.contains(att['id']);
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFF0FDFA)
                        : Colors.white, // teal-50
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF99F6E4)
                          : Colors.grey.shade200, // teal-200
                    ),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Theme(
                    data: Theme.of(context).copyWith(
                      checkboxTheme: CheckboxThemeData(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(4),
                        ),
                        side: BorderSide(color: Colors.grey.shade400),
                      ),
                    ),
                    child: CheckboxListTile(
                      value: isSelected,
                      onChanged: (val) {
                        setState(() {
                          if (val == true) {
                            _selectedAttachmentIds.add(att['id']);
                          } else {
                            _selectedAttachmentIds.remove(att['id']);
                          }
                        });
                      },
                      title: Text(
                        att['name'],
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      secondary: IconButton(
                        icon: Icon(
                          Icons.visibility_outlined,
                          color: isSelected
                              ? Colors.teal
                              : Colors.grey.shade400,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => FileViewerScreen(
                                url: att['url'],
                                fileName: att['name'],
                              ),
                            ),
                          );
                        },
                        tooltip: 'Vorschau',
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 0,
                      ),
                      dense: true,
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                  ),
                );
              }),
            const SizedBox(height: 12),
            // Upload Button (Outline)
            InkWell(
              onTap: onUpload,
              borderRadius: BorderRadius.circular(6),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.upload_file,
                      size: 16,
                      color: Colors.black87,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      uploadLabel,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(
        0xFFF9FAFB,
      ), // Light gray background like web
      appBar: AppBar(
        title: const Text('Bewerbung'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _profile == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Kein Profil gefunden.'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Navigate to profile creation
                    },
                    child: const Text('Profil erstellen'),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bewerbung als ${widget.job.title}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${widget.job.companyName} • ${widget.job.location}',
                      style: TextStyle(fontSize: 16, color: Colors.grey[500]),
                    ),
                    const SizedBox(height: 32),

                    // Personal Data Card
                    Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: Colors.grey.shade200),
                      ),
                      color: Colors.white,
                      child: Theme(
                        data: Theme.of(
                          context,
                        ).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          title: const Text(
                            'Persönliche Daten',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                          tilePadding: const EdgeInsets.symmetric(
                            horizontal: 24.0,
                            vertical: 8.0,
                          ),
                          childrenPadding: const EdgeInsets.fromLTRB(
                            24.0,
                            0,
                            24.0,
                            24.0,
                          ),
                          initiallyExpanded: false,
                          children: [
                            DropdownButtonFormField<String>(
                              initialValue: _salutation,
                              decoration: const InputDecoration(
                                labelText: 'Anrede',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                              ),
                              items: ['Herr', 'Frau', 'Divers']
                                  .map(
                                    (e) => DropdownMenuItem(
                                      value: e,
                                      child: Text(e),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (val) =>
                                  setState(() => _salutation = val!),
                            ),
                            const SizedBox(height: 16),

                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _firstNameController,
                                    decoration: const InputDecoration(
                                      labelText: 'Vorname',
                                      border: OutlineInputBorder(),
                                      filled: true,
                                      fillColor: Color(0xFFF9FAFB),
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 16,
                                      ),
                                    ),
                                    readOnly: true,
                                    style: TextStyle(
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: TextFormField(
                                    controller: _lastNameController,
                                    decoration: const InputDecoration(
                                      labelText: 'Nachname',
                                      border: OutlineInputBorder(),
                                      filled: true,
                                      fillColor: Color(0xFFF9FAFB),
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 16,
                                      ),
                                    ),
                                    readOnly: true,
                                    style: TextStyle(
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _emailController,
                              decoration: const InputDecoration(
                                labelText: 'E-Mail',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                              ),
                              keyboardType: TextInputType.emailAddress,
                              validator: (v) =>
                                  v?.isEmpty ?? true ? 'Pflichtfeld' : null,
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _phoneController,
                              decoration: const InputDecoration(
                                labelText: 'Telefon (optional)',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                              ),
                              keyboardType: TextInputType.phone,
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _birthDateController,
                              decoration: const InputDecoration(
                                labelText: 'Geburtsdatum (optional)',
                                border: OutlineInputBorder(),
                                hintText: 'YYYY-MM-DD',
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                                suffixIcon: Icon(
                                  Icons.calendar_today,
                                  size: 20,
                                ),
                              ),
                              readOnly: true,
                              onTap: () async {
                                final DateTime? picked = await showDatePicker(
                                  context: context,
                                  initialDate: DateTime.now(),
                                  firstDate: DateTime(1900),
                                  lastDate: DateTime.now(),
                                );
                                if (picked != null) {
                                  setState(() {
                                    _birthDateController.text =
                                        "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
                                  });
                                }
                              },
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _streetController,
                              decoration: const InputDecoration(
                                labelText: 'Straße & Hausnummer (optional)',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),

                            Row(
                              children: [
                                Expanded(
                                  flex: 1,
                                  child: TextFormField(
                                    controller: _zipController,
                                    decoration: const InputDecoration(
                                      labelText: 'PLZ (optional)',
                                      border: OutlineInputBorder(),
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 16,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  flex: 2,
                                  child: TextFormField(
                                    controller: _cityController,
                                    decoration: const InputDecoration(
                                      labelText: 'Stadt (optional)',
                                      border: OutlineInputBorder(),
                                      contentPadding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 16,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _countryController,
                              decoration: const InputDecoration(
                                labelText: 'Land (optional)',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Online Profile Section
                    _buildOnlineProfileCard(),

                    const SizedBox(height: 24),

                    // Cover Letter Section
                    _buildAttachmentCard(
                      title: 'Anschreiben',
                      subtitle:
                          'Nutze dein gespeichertes Anschreiben oder lade ein neues hoch.',
                      attachments: _coverLetterAttachments,
                      uploadLabel: 'Weiteres Anschreiben hochladen',
                      onUpload: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Upload-Funktion in der App noch nicht verfügbar.',
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 24),

                    // CV Section
                    _buildAttachmentCard(
                      title: 'Lebenslauf',
                      subtitle:
                          'Nutze deinen gespeicherten Lebenslauf oder lade einen neuen hoch.',
                      attachments: _cvAttachments,
                      uploadLabel: 'Weiteren Lebenslauf hochladen',
                      onUpload: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Upload-Funktion in der App noch nicht verfügbar.',
                            ),
                          ),
                        );
                      },
                      isRequired: true,
                    ),

                    const SizedBox(height: 24),

                    // Other Attachments Section
                    _buildAttachmentCard(
                      title: 'Digitale Anhänge',
                      subtitle:
                          'Nutze deine gespeicherten Dokumente (Zeugnisse, Zertifikate).',
                      attachments: _otherAttachments,
                      uploadLabel: 'Weiteres Dokument hochladen',
                      onUpload: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Upload-Funktion in der App noch nicht verfügbar.',
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 32),
                    const Text(
                      'Nachricht an das Unternehmen',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _messageController,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        hintText: 'Schreibe hier deine Nachricht...',
                        border: OutlineInputBorder(),
                        filled: true,
                        fillColor: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitApplication,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          elevation: 0,
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
                                'Bewerbung absenden',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }
}
