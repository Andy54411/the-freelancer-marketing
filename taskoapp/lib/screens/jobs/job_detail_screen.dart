import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/job_posting.dart';
import '../../services/job_application_service.dart';
import '../../screens/company/company_profile_screen.dart';
import '../../screens/auth/login_screen.dart';

class JobDetailScreen extends StatefulWidget {
  final JobPosting job;

  const JobDetailScreen({super.key, required this.job});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  final JobApplicationService _applicationService = JobApplicationService();
  bool _isCheckingStatus = true;
  bool _hasApplied = false;
  bool _isApplying = false;

  @override
  void initState() {
    super.initState();
    _checkApplicationStatus();
  }

  Future<void> _checkApplicationStatus() async {
    try {
      final hasApplied = await _applicationService.hasApplied(widget.job.id);
      if (mounted) {
        setState(() {
          _hasApplied = hasApplied;
          _isCheckingStatus = false;
        });
      }
    } catch (e) {
      debugPrint('Error checking application status: $e');
      if (mounted) {
        setState(() {
          _isCheckingStatus = false;
        });
      }
    }
  }

  void _shareJob() {
    final String url = 'https://taskilo.de/jobs/${widget.job.id}';
    Share.share(
      'Schau dir diesen Job an: ${widget.job.title} bei ${widget.job.companyName}\n\n$url',
      subject: 'Jobempfehlung: ${widget.job.title}',
    );
  }

  Future<void> _handleApply() async {
    // 0. Check Authentication
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bitte melden Sie sich an, um sich zu bewerben.'),
            backgroundColor: Colors.orange,
          ),
        );
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
      return;
    }

    setState(() {
      _isApplying = true;
    });

    try {
      // 1. Check Profile
      final profile = await _applicationService.getCandidateProfile();
      if (profile == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Bitte vervollständigen Sie zuerst Ihr Kandidatenprofil auf der Website.',
              ),
              backgroundColor: Colors.orange,
            ),
          );
        }
        setState(() {
          _isApplying = false;
        });
        return;
      }

      // 2. Show Dialog for Cover Letter
      if (mounted) {
        final message = await showDialog<String>(
          context: context,
          builder: (context) => _ApplicationDialog(jobTitle: widget.job.title),
        );

        if (message != null) {
          // 3. Submit Application
          await _applicationService.applyForJob(
            jobId: widget.job.id,
            companyId: widget.job.companyId,
            jobTitle: widget.job.title,
            companyName: widget.job.companyName,
            applicantProfile: profile,
            message: message,
          );

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Bewerbung erfolgreich gesendet!'),
                backgroundColor: Colors.green,
              ),
            );
            setState(() {
              _hasApplied = true;
            });
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler bei der Bewerbung: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isApplying = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200.0,
            floating: false,
            pinned: true,
            backgroundColor: Colors.teal,
            actions: [
              IconButton(
                icon: const Icon(Icons.share, color: Colors.white),
                onPressed: _shareJob,
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                widget.job.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  shadows: [Shadow(color: Colors.black45, blurRadius: 2)],
                ),
              ),
              background: widget.job.headerImageUrl != null
                  ? Image.network(widget.job.headerImageUrl!, fit: BoxFit.cover)
                  : Container(
                      color: Colors.teal,
                      child: const Center(
                        child: Icon(
                          Icons.work,
                          size: 64,
                          color: Colors.white54,
                        ),
                      ),
                    ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (widget.job.logoUrl != null)
                        GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => CompanyProfileScreen(
                                companyId: widget.job.companyId,
                              ),
                            ),
                          ),
                          child: Container(
                            margin: const EdgeInsets.only(right: 16),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                widget.job.logoUrl!,
                                width: 60,
                                height: 60,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) =>
                                    Container(
                                      width: 60,
                                      height: 60,
                                      color: Colors.teal.shade50,
                                      child: const Icon(
                                        Icons.business,
                                        color: Colors.teal,
                                      ),
                                    ),
                              ),
                            ),
                          ),
                        ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GestureDetector(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => CompanyProfileScreen(
                                    companyId: widget.job.companyId,
                                  ),
                                ),
                              ),
                              child: Text(
                                widget.job.companyName,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(
                                  Icons.location_on,
                                  size: 16,
                                  color: Colors.grey[600],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  widget.job.location,
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildInfoRow(
                    Icons.work_outline,
                    'Anstellungsart',
                    widget.job.type,
                  ),
                  if (widget.job.careerLevel != null)
                    _buildInfoRow(
                      Icons.stairs,
                      'Karrierelevel',
                      widget.job.careerLevel!,
                    ),
                  if (widget.job.salaryRange != null)
                    _buildInfoRow(
                      Icons.euro,
                      'Gehalt',
                      _formatSalary(widget.job.salaryRange!),
                    ),
                  const SizedBox(height: 24),
                  const Divider(),
                  const SizedBox(height: 16),
                  const Text(
                    'Beschreibung',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.job.description,
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),
                  if (widget.job.tasks != null) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Deine Aufgaben',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.job.tasks!,
                      style: const TextStyle(fontSize: 16, height: 1.5),
                    ),
                  ],
                  if (widget.job.requirements != null) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Dein Profil',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.job.requirements!,
                      style: const TextStyle(fontSize: 16, height: 1.5),
                    ),
                  ],
                  if (widget.job.benefits != null) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Wir bieten',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.job.benefits!,
                      style: const TextStyle(fontSize: 16, height: 1.5),
                    ),
                  ],
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed:
                          (_isCheckingStatus || _hasApplied || _isApplying)
                          ? null
                          : _handleApply,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isApplying
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              _hasApplied
                                  ? 'Bereits beworben'
                                  : 'Jetzt bewerben',
                              style: const TextStyle(
                                fontSize: 18,
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
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.teal),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatSalary(Map<String, dynamic> salary) {
    final min = salary['min'];
    final max = salary['max'];
    final currency = salary['currency'] ?? 'EUR';

    if (min != null && max != null) {
      return '$min - $max $currency';
    } else if (min != null) {
      return 'Ab $min $currency';
    } else if (max != null) {
      return 'Bis $max $currency';
    }
    return '';
  }
}

class _ApplicationDialog extends StatefulWidget {
  final String jobTitle;

  const _ApplicationDialog({required this.jobTitle});

  @override
  State<_ApplicationDialog> createState() => _ApplicationDialogState();
}

class _ApplicationDialogState extends State<_ApplicationDialog> {
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Bewerbung für ${widget.jobTitle}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Möchten Sie eine persönliche Nachricht hinzufügen?',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _messageController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Ihre Nachricht an das Unternehmen...',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Abbrechen'),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop(_messageController.text);
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
          child: const Text(
            'Bewerbung absenden',
            style: TextStyle(color: Colors.white),
          ),
        ),
      ],
    );
  }
}
