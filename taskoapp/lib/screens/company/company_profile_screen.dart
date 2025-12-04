import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/company.dart';
import '../../models/job_posting.dart';
import '../../widgets/jobs/job_card.dart';
import '../jobs/job_detail_screen.dart';

class CompanyProfileScreen extends StatefulWidget {
  final String companyId;

  const CompanyProfileScreen({super.key, required this.companyId});

  @override
  State<CompanyProfileScreen> createState() => _CompanyProfileScreenState();
}

class _CompanyProfileScreenState extends State<CompanyProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Future<Company?>? _companyFuture;
  Future<List<JobPosting>>? _jobsFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _companyFuture = _fetchCompany();
    _jobsFuture = _fetchJobs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<Company?> _fetchCompany() async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('companies')
          .doc(widget.companyId)
          .get();

      if (doc.exists && doc.data() != null) {
        return Company.fromMap(doc.data()!, doc.id);
      }
    } catch (e) {
      debugPrint('Error fetching company: $e');
    }
    return null;
  }

  Future<List<JobPosting>> _fetchJobs() async {
    try {
      // Try fetching from subcollection first (New Architecture)
      final snapshot = await FirebaseFirestore.instance
          .collection('companies')
          .doc(widget.companyId)
          .collection('jobs')
          .get();

      if (snapshot.docs.isNotEmpty) {
        return snapshot.docs
            .map((doc) => JobPosting.fromFirestore(doc))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching jobs: $e');
    }
    return [];
  }

  Future<void> _launchUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url)) {
      debugPrint('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Company?>(
        future: _companyFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError || !snapshot.hasData || snapshot.data == null) {
            return Scaffold(
              appBar: AppBar(title: const Text('Unternehmen')),
              body: const Center(child: Text('Unternehmen nicht gefunden')),
            );
          }

          final company = snapshot.data!;

          return NestedScrollView(
            headerSliverBuilder: (context, innerBoxIsScrolled) {
              return [
                SliverAppBar(
                  expandedHeight: 200.0,
                  floating: false,
                  pinned: true,
                  flexibleSpace: FlexibleSpaceBar(
                    background: company.headerImageUrl != null
                        ? Image.network(
                            company.headerImageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(color: Colors.teal.shade100),
                          )
                        : Container(color: Colors.teal.shade100),
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
                            if (company.logoUrl != null)
                              Container(
                                width: 80,
                                height: 80,
                                margin: const EdgeInsets.only(right: 16),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: Colors.grey.shade200,
                                  ),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    company.logoUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder:
                                        (context, error, stackTrace) =>
                                            const Icon(
                                              Icons.business,
                                              size: 40,
                                              color: Colors.teal,
                                            ),
                                  ),
                                ),
                              )
                            else
                              Container(
                                width: 80,
                                height: 80,
                                margin: const EdgeInsets.only(right: 16),
                                decoration: BoxDecoration(
                                  color: Colors.teal.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.business,
                                  size: 40,
                                  color: Colors.teal,
                                ),
                              ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    company.companyName,
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (company.industry != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        company.industry!,
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  if (company.city != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.location_on_outlined,
                                            size: 16,
                                            color: Colors.grey,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            company.city!,
                                            style: const TextStyle(
                                              color: Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        TabBar(
                          controller: _tabController,
                          labelColor: Colors.teal,
                          unselectedLabelColor: Colors.grey,
                          indicatorColor: Colors.teal,
                          tabs: const [
                            Tab(text: 'Über uns'),
                            Tab(text: 'Jobs'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ];
            },
            body: TabBarView(
              controller: _tabController,
              children: [
                // Tab 1: Über uns
                SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (company.description != null) ...[
                        const Text(
                          'Beschreibung',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          company.description!,
                          style: const TextStyle(fontSize: 16, height: 1.5),
                        ),
                        const SizedBox(height: 24),
                      ],
                      const Text(
                        'Details',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildDetailRow(
                        Icons.people_outline,
                        'Mitarbeiter',
                        company.employeeCount,
                      ),
                      _buildDetailRow(
                        Icons.calendar_today_outlined,
                        'Gründungsjahr',
                        company.foundedYear,
                      ),
                      _buildDetailRow(
                        Icons.business_outlined,
                        'Branche',
                        company.industry,
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Kontakt',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (company.website != null)
                        ListTile(
                          leading: const Icon(Icons.language),
                          title: Text(company.website!),
                          onTap: () => _launchUrl(company.website!),
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                        ),
                      if (company.email != null)
                        ListTile(
                          leading: const Icon(Icons.email_outlined),
                          title: Text(company.email!),
                          onTap: () => _launchUrl('mailto:${company.email}'),
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                        ),
                      if (company.phone != null)
                        ListTile(
                          leading: const Icon(Icons.phone_outlined),
                          title: Text(company.phone!),
                          onTap: () => _launchUrl('tel:${company.phone}'),
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                        ),
                      if (company.socialMedia != null &&
                          company.socialMedia!.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text(
                          'Social Media',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 16,
                          runSpacing: 16,
                          children: company.socialMedia!.entries.map((entry) {
                            return _buildSocialButton(entry.key, entry.value);
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),

                // Tab 2: Jobs
                FutureBuilder<List<JobPosting>>(
                  future: _jobsFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (!snapshot.hasData || snapshot.data!.isEmpty) {
                      return const Center(
                        child: Text('Keine offenen Stellen gefunden.'),
                      );
                    }

                    return ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: snapshot.data!.length,
                      itemBuilder: (context, index) {
                        final job = snapshot.data![index];
                        return JobCard(
                          job: job,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => JobDetailScreen(job: job),
                              ),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSocialButton(String platform, String url) {
    String iconUrl;
    Color color;

    switch (platform.toLowerCase()) {
      case 'linkedin':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/174/174857.png';
        color = const Color(0xFF0077B5);
        break;
      case 'facebook':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/733/733547.png';
        color = const Color(0xFF1877F2);
        break;
      case 'instagram':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png';
        color = const Color(0xFFE4405F);
        break;
      case 'twitter':
      case 'x':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/5969/5969020.png';
        color = Colors.black;
        break;
      case 'youtube':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png';
        color = const Color(0xFFFF0000);
        break;
      case 'tiktok':
        iconUrl = 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png';
        color = Colors.black;
        break;
      default:
        return ActionChip(
          label: Text(platform),
          onPressed: () => _launchUrl(url),
          avatar: const Icon(Icons.link, size: 16),
        );
    }

    return InkWell(
      onTap: () => _launchUrl(url),
      borderRadius: BorderRadius.circular(50),
      child: Container(
        width: 40,
        height: 40,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withValues(alpha: 0.2),
              spreadRadius: 1,
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Image.network(
          iconUrl,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) =>
              Icon(Icons.link, color: color, size: 20),
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              Text(value, style: const TextStyle(fontSize: 16)),
            ],
          ),
        ],
      ),
    );
  }
}
