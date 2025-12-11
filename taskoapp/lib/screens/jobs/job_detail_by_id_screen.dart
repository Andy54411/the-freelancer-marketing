import 'package:flutter/material.dart';
import '../../models/job_posting.dart';
import '../../services/job_service.dart';
import 'job_detail_screen.dart';

class JobDetailByIdScreen extends StatefulWidget {
  final String jobId;
  final String? companyId;

  const JobDetailByIdScreen({super.key, required this.jobId, this.companyId});

  @override
  State<JobDetailByIdScreen> createState() => _JobDetailByIdScreenState();
}

class _JobDetailByIdScreenState extends State<JobDetailByIdScreen> {
  final JobService _jobService = JobService();
  bool _isLoading = true;
  JobPosting? _job;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadJob();
  }

  Future<void> _loadJob() async {
    debugPrint('JobDetailByIdScreen: Loading job ${widget.jobId}, companyId: ${widget.companyId}');
    try {
      final job = await _jobService.getJobById(widget.jobId, companyId: widget.companyId);
      debugPrint('JobDetailByIdScreen: Job loaded: ${job?.title}');
      if (mounted) {
        if (job != null) {
          setState(() {
            _job = job;
            _isLoading = false;
          });
        } else {
          debugPrint('JobDetailByIdScreen: Job is null!');
          setState(() {
            _error = 'Job nicht gefunden (ID: ${widget.jobId})';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('JobDetailByIdScreen: Error loading job: $e');
      if (mounted) {
        setState(() {
          _error = 'Fehler beim Laden: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Job wird geladen...'),
          backgroundColor: Colors.teal,
        ),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_error != null || _job == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Fehler'),
          backgroundColor: Colors.teal,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.error_outline,
                  size: 64,
                  color: Colors.grey,
                ),
                const SizedBox(height: 16),
                Text(
                  _error ?? 'Job nicht gefunden',
                  style: const TextStyle(fontSize: 16),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'JobId: ${widget.jobId}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                Text(
                  'CompanyId: ${widget.companyId ?? "null"}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Zurueck'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return JobDetailScreen(job: _job!);
  }
}
