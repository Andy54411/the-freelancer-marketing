import 'package:flutter/material.dart';
import '../../models/job_posting.dart';
import '../../services/job_service.dart';
import '../../widgets/jobs/job_card.dart';
import 'job_detail_screen.dart';
import 'jobfinder_screen.dart';

class JobBoardScreen extends StatefulWidget {
  final String? initialSearchTerm;

  const JobBoardScreen({super.key, this.initialSearchTerm});

  @override
  State<JobBoardScreen> createState() => _JobBoardScreenState();
}

class _JobBoardScreenState extends State<JobBoardScreen> {
  final JobService _jobService = JobService();
  final TextEditingController _searchController = TextEditingController();
  List<JobPosting> _jobs = [];
  bool _isLoading = true;
  late String _searchTerm;
  String _location = '';

  @override
  void initState() {
    super.initState();
    _searchTerm = widget.initialSearchTerm ?? '';
    _searchController.text = _searchTerm;
    _loadJobs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadJobs() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final jobs = await _jobService.getJobs(
        searchTerm: _searchTerm,
        location: _location,
      );
      setState(() {
        _jobs = jobs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden der Jobs: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Jobbörse'),
        backgroundColor: Colors.teal,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active),
            tooltip: 'Mein Jobfinder',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const JobfinderScreen()),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Jobtitel, Stichworte oder Firma',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 0,
                      horizontal: 16,
                    ),
                  ),
                  onChanged: (value) {
                    _searchTerm = value;
                    // Debounce could be added here
                  },
                  onSubmitted: (_) => _loadJobs(),
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Ort oder PLZ',
                    prefixIcon: const Icon(Icons.location_on_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 0,
                      horizontal: 16,
                    ),
                  ),
                  onChanged: (value) {
                    _location = value;
                  },
                  onSubmitted: (_) => _loadJobs(),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loadJobs,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.teal,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'Jobs finden',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.teal),
                  )
                : _jobs.isEmpty
                ? const Center(child: Text('Keine Jobs gefunden'))
                : RefreshIndicator(
                    onRefresh: _loadJobs,
                    color: Colors.teal,
                    child: ListView.builder(
                      itemCount: _jobs.length,
                      itemBuilder: (context, index) {
                        return JobCard(
                          job: _jobs[index],
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    JobDetailScreen(job: _jobs[index]),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
