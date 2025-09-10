import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../dashboard_layout.dart';
import 'offer_detail_screen.dart';

class IncomingOffersScreen extends StatefulWidget {
  const IncomingOffersScreen({super.key});

  @override
  State<IncomingOffersScreen> createState() => _IncomingOffersScreenState();
}

class _IncomingOffersScreenState extends State<IncomingOffersScreen> {
  List<OfferItem> _offers = [];
  bool _isLoading = true;
  String _selectedFilter = 'all'; // all, pending, accepted, declined

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() => _isLoading = true);
    
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final offers = await _getIncomingOffers(user.uid);
      setState(() {
        _offers = offers;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading offers: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<List<OfferItem>> _getIncomingOffers(String currentUserId) async {
    final List<OfferItem> allOffers = [];

    debugPrint('🔍 Loading offers for current user: $currentUserId');

    try {
      // STEP 1: Get ALL quotes from the system without filtering by user ID first
      debugPrint('🔍 STEP 1: Getting ALL quotes from the system...');
      final allQuotesSnapshot = await FirebaseFirestore.instance
          .collection('quotes')
          .get();

      debugPrint('📋 Found ${allQuotesSnapshot.docs.length} total quotes in system');

      // STEP 2: For each quote, check if current user has access via any user field
      final relevantQuoteDocs = <String, DocumentSnapshot<Map<String, dynamic>>>{};
      final userFields = ['userId', 'customerUid', 'customerId', 'createdBy'];

      for (final quoteDoc in allQuotesSnapshot.docs) {
        final quoteData = quoteDoc.data();
        bool isRelevant = false;
        
        // Check if current user matches any user field in this quote
        for (final field in userFields) {
          final fieldValue = quoteData[field];
          if (fieldValue == currentUserId) {
            debugPrint('✅ Quote ${quoteDoc.id} is relevant: $field = $currentUserId');
            isRelevant = true;
            break;
          }
        }
        
        if (isRelevant) {
          relevantQuoteDocs[quoteDoc.id] = quoteDoc;
        }
      }

      debugPrint('📋 Found ${relevantQuoteDocs.length} quotes relevant to current user');

      // STEP 3: Get project_requests where current user is the customer
      final projectsSnapshot = await FirebaseFirestore.instance
          .collection('project_requests')
          .where('customerUid', isEqualTo: currentUserId)
          .get();

      debugPrint('📋 Found ${projectsSnapshot.docs.length} project_requests for current user');

      debugPrint('📋 Total unique quotes belonging to user: ${relevantQuoteDocs.length}');

      // STEP 4: Process project proposals
      for (final projectDoc in projectsSnapshot.docs) {
        final projectData = projectDoc.data();
        final projectTitle = projectData['title'] ?? 'Unbenanntes Projekt';
        final projectCategory = projectData['subcategory'] ?? projectData['category'] ?? 'Allgemein';

        // Check for proposals array in project document
        final proposals = projectData['proposals'] as List<dynamic>? ?? [];
        
        for (final proposal in proposals) {
          if (proposal is Map<String, dynamic>) {
            allOffers.add(OfferItem(
              id: proposal['id'] ?? proposal['companyUid'] ?? proposal['providerId'] ?? '',
              projectId: projectDoc.id,
              projectTitle: projectTitle,
              projectCategory: projectCategory,
              providerName: proposal['companyName'] ?? proposal['providerName'] ?? 'Unbekannter Anbieter',
              providerEmail: proposal['providerEmail'] ?? '',
              providerPhone: proposal['providerPhone'] ?? '',
              providerAvatar: proposal['providerAvatar'] ?? '',
              providerRating: (proposal['providerRating'] ?? 0.0).toDouble(),
              message: proposal['message'] ?? '',
              proposedPrice: (proposal['proposedPrice'] ?? proposal['totalAmount'] ?? 0.0).toDouble(),
              proposedTimeline: proposal['proposedTimeline'] ?? proposal['timeline'] ?? 'Nicht angegeben',
              availability: proposal['availability'] ?? 'Sofort verfügbar',
              submittedAt: _parseTimestamp(proposal['submittedAt'] ?? proposal['createdAt']),
              status: proposal['status'] ?? 'pending',
              companyUid: proposal['companyUid'] ?? proposal['providerId'] ?? '',
              sourceType: 'project_request',
            ));
          }
        }
      }

      // STEP 5: Process quote proposals from subcollections
      for (final quoteDoc in relevantQuoteDocs.values) {
        final quoteData = quoteDoc.data() ?? {};
        
        final quoteTitle = quoteData['title'] ?? 'Direkter Auftrag';
        final quoteCategory = quoteData['subcategory'] ?? quoteData['category'] ?? 'Allgemein';

        debugPrint('🔍 Processing quote: ${quoteDoc.id}');

        try {
          // Load ALL proposals from subcollection (no filtering)
          final proposalsSnapshot = await FirebaseFirestore.instance
              .collection('quotes')
              .doc(quoteDoc.id)
              .collection('proposals')
              .get();

          debugPrint('📋 Found ${proposalsSnapshot.docs.length} proposals for quote ${quoteDoc.id}');

          for (final proposalDoc in proposalsSnapshot.docs) {
            final proposal = proposalDoc.data();
            
            debugPrint('🎯 Processing proposal: ${proposalDoc.id}');
            debugPrint('📊 Proposal status: ${proposal['status']}');
            debugPrint('📊 Proposal data: ${proposal.toString()}');
            
            allOffers.add(OfferItem(
              id: proposalDoc.id,
              projectId: quoteDoc.id,
              projectTitle: quoteTitle,
              projectCategory: quoteCategory,
              providerName: proposal['companyName'] ?? proposal['providerName'] ?? 'Unbekannter Anbieter',
              providerEmail: proposal['providerEmail'] ?? '',
              providerPhone: proposal['providerPhone'] ?? '',
              providerAvatar: proposal['providerAvatar'] ?? '',
              providerRating: (proposal['providerRating'] ?? 0.0).toDouble(),
              message: proposal['message'] ?? '',
              proposedPrice: (proposal['proposedPrice'] ?? proposal['totalAmount'] ?? 0.0).toDouble(),
              proposedTimeline: proposal['proposedTimeline'] ?? proposal['timeline'] ?? 'Nicht angegeben',
              availability: proposal['availability'] ?? 'Sofort verfügbar',
              submittedAt: _parseTimestamp(proposal['createdAt']),
              status: proposal['status'] ?? 'pending',
              companyUid: proposal['companyUid'] ?? proposal['providerId'] ?? '',
              sourceType: 'quote',
            ));
          }
        } catch (e) {
          debugPrint('Error loading proposals for quote ${quoteDoc.id}: $e');
        }
      }

      // Sort by submission date (newest first)
      allOffers.sort((a, b) => b.submittedAt.compareTo(a.submittedAt));

      debugPrint('✅ Total offers found: ${allOffers.length}');
      for (final offer in allOffers) {
        debugPrint('📋 Offer: ${offer.providerName} - ${offer.status} - ${offer.proposedPrice}€');
      }

      return allOffers;
    } catch (e) {
      debugPrint('❌ Error in _getIncomingOffers: $e');
      return [];
    }
  }

  DateTime _parseTimestamp(dynamic timestamp) {
    if (timestamp == null) return DateTime.now();
    if (timestamp is Timestamp) return timestamp.toDate();
    if (timestamp is DateTime) return timestamp;
    if (timestamp is String) return DateTime.tryParse(timestamp) ?? DateTime.now();
    return DateTime.now();
  }

  List<OfferItem> get _filteredOffers {
    if (_selectedFilter == 'all') return _offers;
    return _offers.where((offer) => offer.status == _selectedFilter).toList();
  }

  Future<void> _handleOfferAction(OfferItem offer, String action) async {
    try {
      if (action == 'accept') {
        await _acceptOffer(offer);
      } else if (action == 'decline') {
        await _declineOffer(offer);
      }
      
      // Reload offers after action
      _loadOffers();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(action == 'accept' ? 'Angebot angenommen!' : 'Angebot abgelehnt!'),
            backgroundColor: action == 'accept' ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _acceptOffer(OfferItem offer) async {
    if (offer.sourceType == 'quote') {
      // Update proposal in subcollection
      await FirebaseFirestore.instance
          .collection('quotes')
          .doc(offer.projectId)
          .collection('proposals')
          .doc(offer.id)
          .update({
        'status': 'accepted',
        'acceptedAt': FieldValue.serverTimestamp(),
      });
      
      // Update quote status
      await FirebaseFirestore.instance
          .collection('quotes')
          .doc(offer.projectId)
          .update({
        'status': 'accepted',
        'acceptedProposalId': offer.id,
        'acceptedAt': FieldValue.serverTimestamp(),
      });
    } else {
      // Update proposal in project_requests array
      final projectDoc = await FirebaseFirestore.instance
          .collection('project_requests')
          .doc(offer.projectId)
          .get();
      
      if (projectDoc.exists) {
        final data = projectDoc.data()!;
        final proposals = List<Map<String, dynamic>>.from(data['proposals'] ?? []);
        
        for (int i = 0; i < proposals.length; i++) {
          final proposal = proposals[i];
          if ((proposal['id'] ?? proposal['companyUid'] ?? proposal['providerId']) == offer.id) {
            proposals[i]['status'] = 'accepted';
            proposals[i]['acceptedAt'] = FieldValue.serverTimestamp();
            break;
          }
        }
        
        await projectDoc.reference.update({
          'proposals': proposals,
          'status': 'in_progress',
        });
      }
    }
  }

  Future<void> _declineOffer(OfferItem offer) async {
    if (offer.sourceType == 'quote') {
      // Update proposal in subcollection
      await FirebaseFirestore.instance
          .collection('quotes')
          .doc(offer.projectId)
          .collection('proposals')
          .doc(offer.id)
          .update({
        'status': 'declined',
        'declinedAt': FieldValue.serverTimestamp(),
      });
    } else {
      // Update proposal in project_requests array
      final projectDoc = await FirebaseFirestore.instance
          .collection('project_requests')
          .doc(offer.projectId)
          .get();
      
      if (projectDoc.exists) {
        final data = projectDoc.data()!;
        final proposals = List<Map<String, dynamic>>.from(data['proposals'] ?? []);
        
        for (int i = 0; i < proposals.length; i++) {
          final proposal = proposals[i];
          if ((proposal['id'] ?? proposal['companyUid'] ?? proposal['providerId']) == offer.id) {
            proposals[i]['status'] = 'declined';
            proposals[i]['declinedAt'] = FieldValue.serverTimestamp();
            break;
          }
        }
        
        await projectDoc.reference.update({
          'proposals': proposals,
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Nicht angemeldet')),
      );
    }

    return DashboardLayout(
      title: 'Eingehende Angebote',
      useGradientBackground: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.white),
          onPressed: _loadOffers,
          tooltip: 'Aktualisieren',
        ),
      ],
      body: Column(
        children: [
          // Filter Row
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Filter:',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Alle',
                        value: 'all',
                        selected: _selectedFilter == 'all',
                        count: _offers.length,
                        onSelected: (value) => setState(() => _selectedFilter = value),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Wartend',
                        value: 'pending',
                        selected: _selectedFilter == 'pending',
                        count: _offers.where((o) => o.status == 'pending').length,
                        onSelected: (value) => setState(() => _selectedFilter = value),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Angenommen',
                        value: 'accepted',
                        selected: _selectedFilter == 'accepted',
                        count: _offers.where((o) => o.status == 'accepted').length,
                        onSelected: (value) => setState(() => _selectedFilter = value),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Abgelehnt',
                        value: 'declined',
                        selected: _selectedFilter == 'declined',
                        count: _offers.where((o) => o.status == 'declined').length,
                        onSelected: (value) => setState(() => _selectedFilter = value),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Offers List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : _filteredOffers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.inbox_outlined,
                              size: 64,
                              color: Colors.white.withValues(alpha: 0.5),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _selectedFilter == 'all' 
                                  ? 'Noch keine Angebote eingegangen'
                                  : 'Keine Angebote in dieser Kategorie',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.7),
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Angebote werden hier angezeigt, sobald Anbieter auf Ihre Projekte antworten.',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.5),
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadOffers,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredOffers.length,
                          itemBuilder: (context, index) {
                            final offer = _filteredOffers[index];
                            return _OfferCard(
                              offer: offer,
                              onAction: _handleOfferAction,
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

class _FilterChip extends StatelessWidget {
  final String label;
  final String value;
  final bool selected;
  final int count;
  final Function(String) onSelected;

  const _FilterChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.count,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onSelected(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected 
              ? Colors.white 
              : Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected 
                ? const Color(0xFF14AD9F)
                : Colors.white.withValues(alpha: 0.6),
            width: selected ? 2 : 1,
          ),
          boxShadow: selected ? [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ] : [],
        ),
        child: Text(
          '$label ($count)',
          style: TextStyle(
            color: selected 
                ? const Color(0xFF14AD9F)
                : Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  final OfferItem offer;
  final Function(OfferItem, String) onAction;

  const _OfferCard({
    required this.offer,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigate to offer detail screen
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OfferDetailScreen(offer: offer),
          ),
        ).then((result) {
          // Reload offers if status changed
          if (result != null) {
            Future.delayed(const Duration(milliseconds: 100), () {
              if (context.mounted) {
                final parentState = context.findAncestorStateOfType<_IncomingOffersScreenState>();
                parentState?._loadOffers();
              }
            });
          }
        });
      },
      child: Card(
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.95),
                Colors.white.withValues(alpha: 0.85),
              ],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with project info and status
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          offer.projectTitle,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          offer.projectCategory,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: offer.status),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Provider info
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundImage: offer.providerAvatar.isNotEmpty
                        ? NetworkImage(offer.providerAvatar)
                        : null,
                    backgroundColor: const Color(0xFF14AD9F),
                    child: offer.providerAvatar.isEmpty
                        ? Text(
                            offer.providerName.isNotEmpty 
                                ? offer.providerName[0].toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          offer.providerName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        if (offer.providerRating > 0) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.star, color: Colors.amber, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                offer.providerRating.toStringAsFixed(1),
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Offer details
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.euro, color: Color(0xFF14AD9F), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '${offer.proposedPrice.toStringAsFixed(0)}€',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF14AD9F),
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.schedule, color: Colors.grey, size: 16),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            offer.proposedTimeline,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (offer.message.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text(
                        'Nachricht:',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        offer.message,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Footer with timestamp and actions
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Eingegangen: ${_formatDate(offer.submittedAt)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[500],
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (offer.status == 'pending') ...[
                    // Kompakte Button-Row
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Ablehnen Button - subtil und modern
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => onAction(offer, 'decline'),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey.shade300, width: 1),
                                borderRadius: BorderRadius.circular(6),
                                color: Colors.grey.shade50,
                              ),
                              child: Text(
                                'Ablehnen',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Annehmen Button - kompakt
                        Material(
                          color: const Color(0xFF14AD9F),
                          borderRadius: BorderRadius.circular(6),
                          child: InkWell(
                            onTap: () => onAction(offer, 'accept'),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              child: const Text(
                                'Annehmen',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else if (offer.status == 'accepted') ...[
                    TextButton.icon(
                      onPressed: () {
                        // Navigate to project details or chat
                      },
                      icon: const Icon(Icons.message, size: 16),
                      label: const Text('Details'),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF14AD9F),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return 'vor ${difference.inMinutes} Min.';
      } else {
        return 'vor ${difference.inHours} Std.';
      }
    } else if (difference.inDays == 1) {
      return 'gestern';
    } else if (difference.inDays < 7) {
      return 'vor ${difference.inDays} Tagen';
    } else {
      return '${date.day}.${date.month}.${date.year}';
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    String label;
    IconData icon;

    switch (status) {
      case 'pending':
        backgroundColor = Colors.orange.withValues(alpha: 0.1);
        textColor = Colors.orange;
        label = 'Wartend';
        icon = Icons.hourglass_empty;
        break;
      case 'accepted':
        backgroundColor = Colors.green.withValues(alpha: 0.1);
        textColor = Colors.green;
        label = 'Angenommen';
        icon = Icons.check_circle;
        break;
      case 'declined':
        backgroundColor = Colors.red.withValues(alpha: 0.1);
        textColor = Colors.red;
        label = 'Abgelehnt';
        icon = Icons.cancel;
        break;
      default:
        backgroundColor = Colors.grey.withValues(alpha: 0.1);
        textColor = Colors.grey;
        label = status;
        icon = Icons.help;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}

// Data model for offers
class OfferItem {
  final String id;
  final String projectId;
  final String projectTitle;
  final String projectCategory;
  final String providerName;
  final String providerEmail;
  final String providerPhone;
  final String providerAvatar;
  final double providerRating;
  final String message;
  final double proposedPrice;
  final String proposedTimeline;
  final String availability;
  final DateTime submittedAt;
  final String status;
  final String companyUid;
  final String sourceType; // 'project_request' or 'quote'

  OfferItem({
    required this.id,
    required this.projectId,
    required this.projectTitle,
    required this.projectCategory,
    required this.providerName,
    required this.providerEmail,
    required this.providerPhone,
    required this.providerAvatar,
    required this.providerRating,
    required this.message,
    required this.proposedPrice,
    required this.proposedTimeline,
    required this.availability,
    required this.submittedAt,
    required this.status,
    required this.companyUid,
    required this.sourceType,
  });
}
