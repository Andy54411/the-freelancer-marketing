import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:intl/intl.dart';
import '../../services/job_application_service.dart';
import '../../services/job_service.dart';
import '../../models/job_posting.dart';
import '../../utils/colors.dart';
import '../dashboard/dashboard_layout.dart';
import '../chat/application_chat_screen.dart';

class ApplicationDetailScreen extends StatefulWidget {
  final Map<String, dynamic> application;

  const ApplicationDetailScreen({super.key, required this.application});

  @override
  State<ApplicationDetailScreen> createState() =>
      _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  final JobApplicationService _applicationService = JobApplicationService();
  final JobService _jobService = JobService();
  late Map<String, dynamic> _application;
  JobPosting? _job;
  bool _isLoadingJob = true;
  DateTime? _selectedSlot;
  
  // 🎯 Meeting-Typ Selection State
  String? _selectedMeetingType;
  bool _isSubmittingSlot = false;

  @override
  void initState() {
    super.initState();
    _application = widget.application;
    _loadJobDetails();
  }

  Future<void> _loadJobDetails() async {
    if (_application['jobId'] != null) {
      try {
        final job = await _jobService.getJobById(_application['jobId']);
        if (mounted) {
          setState(() {
            _job = job;
            _isLoadingJob = false;
          });
        }
      } catch (e) {
        debugPrint('Error loading job details: $e');
        if (mounted) setState(() => _isLoadingJob = false);
      }
    } else {
      if (mounted) setState(() => _isLoadingJob = false);
    }
  }

  Future<void> _acceptSlot() async {
    if (_selectedSlot == null) return;

    // 🎯 Prüfe ob Meeting-Typ gewählt werden muss
    final allowCandidateChoice = _application['allowCandidateChoice'] ?? true;
    if (allowCandidateChoice && _selectedMeetingType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bitte wählen Sie eine Interview-Art aus!')),
      );
      return;
    }

    setState(() => _isSubmittingSlot = true);

    try {
      await _applicationService.acceptInterviewSlot(
        _application['id'],
        _application['companyId'],
        _selectedSlot!.toIso8601String(),
        meetingType: _selectedMeetingType,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Interview-Termin bestätigt!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmittingSlot = false);
      }
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Eingegangen';
      case 'reviewed':
        return 'In Prüfung';
      case 'interview':
        return 'Interview';
      case 'accepted':
        return 'Angenommen';
      case 'rejected':
        return 'Abgelehnt';
      case 'interview_accepted':
        return 'Termin bestätigt';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _application['status'] ?? 'pending';
    final isInterview = status == 'interview';
    final interviewMessage = _application['interviewMessage'] as String?;

    final rawSlots = _application['interviewSlots'] as List<dynamic>?;
    final slots = rawSlots
        ?.map((s) {
          try {
            if (s is String) {
              return DateTime.tryParse(s);
            } else if (s is Map) {
              // Handle legacy object format {date: "...", time: "..."}
              final dateStr = s['date']?.toString();
              final timeStr = s['time']?.toString();
              if (dateStr != null && timeStr != null) {
                final date = DateTime.parse(dateStr);
                final parts = timeStr.split(':');
                if (parts.length == 2) {
                  return DateTime(
                    date.year,
                    date.month,
                    date.day,
                    int.parse(parts[0]),
                    int.parse(parts[1]),
                  );
                }
              }
            }
          } catch (e) {
            debugPrint('Error parsing slot: $s - $e');
          }
          return null;
        })
        .whereType<DateTime>()
        .toList();

    return DashboardLayout(
      title: _application['jobTitle'] ?? 'Bewerbung',
      useGradientBackground: true,
      showBackButton: true,
      onBackPressed: () => Navigator.pop(context),
      showBottomNavigation: false,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 16),
            _buildChatButton(),
            const SizedBox(height: 24),

            // Job Details Section
            if (_isLoadingJob)
              const Center(child: CircularProgressIndicator())
            else if (_job != null) ...[
              _buildSectionCard(
                title: 'Stellenbeschreibung',
                child: Html(data: _job!.description),
              ),
              const SizedBox(height: 24),
            ],

            // My Application Data Section
            _buildApplicationDataSection(),
            const SizedBox(height: 24),

            if (isInterview && slots != null && slots.isNotEmpty) ...[
              _buildInterviewSection(interviewMessage, slots),
            ] else if (status == 'interview_accepted') ...[
              _buildAcceptedSection(),
            ] else ...[
              // Status Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Text(
                      'Aktueller Status:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _getStatusText(status),
                      style: TextStyle(color: TaskiloColors.primary),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildChatButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ApplicationChatScreen(
                applicationId: _application['id'],
                companyId: _application['companyId'],
                companyName: _application['companyName'] ?? 'Unternehmen',
              ),
            ),
          );
        },
        icon: const Icon(Icons.chat_bubble_outline),
        label: const Text('Nachricht an Unternehmen'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: TaskiloColors.primary,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: TaskiloColors.primary),
          ),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _application['companyName'] ?? 'Unbekanntes Unternehmen',
            style: const TextStyle(
              fontSize: 16,
              color: Colors.grey,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _application['jobTitle'] ?? 'Unbekannte Stelle',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 16, color: Colors.grey[400]),
              const SizedBox(width: 6),
              Text(
                'Beworben am: ${DateFormat('dd.MM.yyyy').format(DateTime.tryParse(_application['appliedAt'] ?? '') ?? DateTime.now())}',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildApplicationDataSection() {
    final profile =
        _application['applicantProfile'] as Map<String, dynamic>? ?? {};
    final personalData =
        _application['personalData'] as Map<String, dynamic>? ?? {};
    final message = _application['message'] as String?;
    final attachments = _application['attachments'] as List<dynamic>? ?? [];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: const Text(
            'Meine Bewerbungsdaten',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          childrenPadding: const EdgeInsets.all(20),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (message != null && message.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Anschreiben',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 8),
              Align(alignment: Alignment.centerLeft, child: Text(message)),
              const SizedBox(height: 24),
            ],

            // Personal Data
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Persönliche Daten',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              'Name',
              '${profile['firstName']} ${profile['lastName']}',
            ),
            _buildInfoRow('Email', profile['email'] ?? ''),
            if (profile['phone'] != null || personalData['phone'] != null)
              _buildInfoRow(
                'Telefon',
                profile['phone'] ?? personalData['phone'],
              ),
            if (profile['city'] != null || personalData['city'] != null)
              _buildInfoRow(
                'Ort',
                '${profile['zip'] ?? personalData['zip'] ?? ''} ${profile['city'] ?? personalData['city'] ?? ''}',
              ),

            const SizedBox(height: 24),

            // Experience if available
            if (profile['experience'] != null &&
                (profile['experience'] as List).isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Berufserfahrung',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 12),
              ...(profile['experience'] as List).map(
                (exp) => Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12.0),
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              exp['title'] ?? '',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ),
                          if (exp['startDate'] != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 8.0),
                              child: Text(
                                '${DateFormat('MM.yyyy').format(DateTime.parse(exp['startDate']))} - ${exp['endDate'] != null ? DateFormat('MM.yyyy').format(DateTime.parse(exp['endDate'])) : 'Heute'}',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${exp['company']} • ${exp['location']}',
                        style: TextStyle(
                          color: TaskiloColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (exp['description'] != null &&
                          (exp['description'] as String).isNotEmpty) ...[
                        const SizedBox(height: 8),
                        const Divider(height: 16, thickness: 0.5),
                        Text(
                          exp['description'],
                          style: const TextStyle(
                            fontSize: 13,
                            height: 1.4,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Education
            if (profile['education'] != null &&
                (profile['education'] as List).isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Ausbildung',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 12),
              ...(profile['education'] as List).map(
                (edu) => Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12.0),
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              edu['degree'] ?? '',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                            ),
                          ),
                          if (edu['startDate'] != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 8.0),
                              child: Text(
                                '${DateFormat('MM.yyyy').format(DateTime.parse(edu['startDate']))} - ${edu['endDate'] != null ? DateFormat('MM.yyyy').format(DateTime.parse(edu['endDate'])) : 'Heute'}',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${edu['institution']} • ${edu['location']}',
                        style: TextStyle(
                          color: TaskiloColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Qualifications
            if (profile['qualifications'] != null &&
                (profile['qualifications'] as List).isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Zertifikate & Weiterbildungen',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 8),
              ...(profile['qualifications'] as List).map(
                (qual) => Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.verified, size: 16, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              qual['name'] ?? '',
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (qual['issuer'] != null &&
                                (qual['issuer'] as String).isNotEmpty)
                              Text(
                                qual['issuer'],
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Skills & Languages
            if ((profile['skills'] != null &&
                    (profile['skills'] as List).isNotEmpty) ||
                (profile['languages'] != null &&
                    (profile['languages'] as List).isNotEmpty)) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Qualifikationen',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 8),

              if (profile['skills'] != null &&
                  (profile['skills'] as List).isNotEmpty) ...[
                const Text(
                  'Skills',
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: (profile['skills'] as List)
                      .map(
                        (skill) => Chip(
                          label: Text(
                            skill.toString(),
                            style: const TextStyle(fontSize: 12),
                          ),
                          backgroundColor: Colors.grey[100],
                          padding: EdgeInsets.zero,
                          materialTapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 12),
              ],

              if (profile['languages'] != null &&
                  (profile['languages'] as List).isNotEmpty) ...[
                const Text(
                  'Sprachen',
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                ),
                const SizedBox(height: 4),
                ...(profile['languages'] as List).map(
                  (lang) => Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(lang['language'] ?? ''),
                        Text(
                          lang['level'] ?? '',
                          style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
            ],

            // Framework Conditions
            if (profile['salaryExpectation'] != null ||
                profile['noticePeriod'] != null) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Rahmenbedingungen',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 8),
              if (profile['salaryExpectation'] != null)
                _buildInfoRow(
                  'Gehalt',
                  '${profile['salaryExpectation']['amount']} ${profile['salaryExpectation']['currency']} / ${profile['salaryExpectation']['period']}',
                ),
              if (profile['noticePeriod'] != null)
                _buildInfoRow(
                  'Kündigungsfrist',
                  '${profile['noticePeriod']['duration']} (${profile['noticePeriod']['timing']})',
                ),
              const SizedBox(height: 24),
            ],

            // Attachments
            if (attachments.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Anhänge',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 8),
              ...attachments.map(
                (att) => Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.attach_file,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          att['name'] ?? 'Dokument',
                          style: const TextStyle(color: Colors.blue),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _buildInterviewSection(
    String? interviewMessage,
    List<DateTime> slots,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: TaskiloColors.primary.withValues(alpha: 0.3),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: TaskiloColors.primary.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: TaskiloColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.calendar_month, color: TaskiloColors.primary),
              ),
              const SizedBox(width: 12),
              const Text(
                'Einladung zum Interview',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // 🎯 Meeting-Typ Anzeige
          _buildMeetingTypeInfo(),
          const SizedBox(height: 20),
          if (_application['isVideoCall'] == true)
            Container(
              margin: const EdgeInsets.only(bottom: 20),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.videocam, color: Colors.blue, size: 20),
                  const SizedBox(width: 8),
                  const Text(
                    'Video-Call Interview',
                    style: TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          if (interviewMessage != null && interviewMessage.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Html(data: interviewMessage),
            ),
          const SizedBox(height: 24),
          const Text(
            'Bitte wählen Sie einen Termin:',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...slots.map((slot) => _buildSlotCard(slot)),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _selectedSlot != null && !_isSubmittingSlot
                  ? _acceptSlot
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: TaskiloColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: _isSubmittingSlot
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Termin bestätigen',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAcceptedSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 64),
          const SizedBox(height: 16),
          const Text(
            'Interview bestätigt!',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.green,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Sie haben den Termin am ${DateFormat('dd.MM.yyyy HH:mm').format(DateTime.parse(_application['acceptedSlot'] ?? DateTime.now().toIso8601String()))} bestätigt.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: Colors.black87),
          ),
          if (_application['isVideoCall'] == true) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.videocam, color: TaskiloColors.primary),
                      const SizedBox(width: 8),
                      const Text(
                        'Video-Call Link:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SelectableText(
                    _application['videoLink'] ?? 'Link folgt',
                    style: const TextStyle(
                      color: Colors.blue,
                      decoration: TextDecoration.underline,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSlotCard(DateTime slot) {
    final isSelected = _selectedSlot == slot;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isSelected
            ? TaskiloColors.primary.withValues(alpha: 0.1)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? TaskiloColors.primary : Colors.grey[300]!,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => setState(() => _selectedSlot = slot),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: isSelected ? TaskiloColors.primary : Colors.grey,
                ),
                const SizedBox(width: 16),
                Text(
                  DateFormat('EEEE, dd.MM.yyyy - HH:mm', 'de_DE').format(slot),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                    color: isSelected ? TaskiloColors.primary : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // 🎯 Meeting-Typ Info Widget
  Widget _buildMeetingTypeInfo() {
    final allowCandidateChoice = _application['allowCandidateChoice'] ?? true;
    final meetingType = _application['meetingType'] as String?;
    
    if (!allowCandidateChoice && meetingType != null) {
      // Unternehmen hat spezifischen Typ gewählt
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _getMeetingTypeColor(meetingType).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _getMeetingTypeColor(meetingType).withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(_getMeetingTypeIcon(meetingType), 
                color: _getMeetingTypeColor(meetingType), size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Interview-Art: ${_getMeetingTypeLabel(meetingType)}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _getMeetingTypeColor(meetingType),
                    ),
                  ),
                  Text(
                    _getMeetingTypeDescription(meetingType),
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else {
      // Bewerber kann wählen
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: TaskiloColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: TaskiloColors.primary.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.tune, color: TaskiloColors.primary, size: 24),
                SizedBox(width: 12),
                Text(
                  'Wählen Sie Ihre bevorzugte Interview-Art:',
                  style: TextStyle(fontWeight: FontWeight.bold, color: TaskiloColors.primary),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildMeetingTypeOption('video', 'Video-Call', Icons.videocam, Colors.blue),
                const SizedBox(width: 12),
                _buildMeetingTypeOption('phone', 'Telefon', Icons.phone, Colors.green),
                const SizedBox(width: 12),
                _buildMeetingTypeOption('inperson', 'Persönlich', Icons.location_on, Colors.orange),
              ],
            ),
          ],
        ),
      );
    }
  }

  Widget _buildMeetingTypeOption(String type, String label, IconData icon, Color color) {
    final isSelected = _selectedMeetingType == type;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMeetingType = type),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.1) : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : Colors.grey.withValues(alpha: 0.3),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? color : Colors.grey, size: 20),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? color : Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getMeetingTypeColor(String type) {
    switch (type) {
      case 'video': return Colors.blue;
      case 'phone': return Colors.green;
      case 'inperson': return Colors.orange;
      default: return TaskiloColors.primary;
    }
  }

  IconData _getMeetingTypeIcon(String type) {
    switch (type) {
      case 'video': return Icons.videocam;
      case 'phone': return Icons.phone;
      case 'inperson': return Icons.location_on;
      default: return Icons.help;
    }
  }

  String _getMeetingTypeLabel(String type) {
    switch (type) {
      case 'video': return 'Video-Call';
      case 'phone': return 'Telefon';
      case 'inperson': return 'Persönlich';
      default: return 'Flexibel';
    }
  }

  String _getMeetingTypeDescription(String type) {
    switch (type) {
      case 'video': return 'Online Video-Meeting';
      case 'phone': return 'Telefonanruf';
      case 'inperson': return 'Vor Ort im Unternehmen';
      default: return 'Typ wird noch festgelegt';
    }
  }
}
