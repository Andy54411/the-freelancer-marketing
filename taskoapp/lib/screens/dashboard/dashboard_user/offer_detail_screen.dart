import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../utils/colors.dart';
import '../dashboard_layout.dart';
import 'incoming_offers_screen.dart';

class OfferDetailScreen extends StatefulWidget {
  final OfferItem offer;

  const OfferDetailScreen({
    super.key,
    required this.offer,
  });

  @override
  State<OfferDetailScreen> createState() => _OfferDetailScreenState();
}

class _OfferDetailScreenState extends State<OfferDetailScreen> {
  bool _isLoading = false;
  List<Map<String, dynamic>> _serviceItems = [];
  
  // 🎯 PROVIDER DETAILS STATE
  String _providerName = '';
  String _providerAvatar = '';
  double _providerRating = 0.0;
  String _providerCity = '';
  String _providerPostalCode = '';
  int _providerReviewCount = 0;
  bool _loadingProviderDetails = true;

  @override
  void initState() {
    super.initState();
    _loadServiceItems();
    _loadProviderDetails();  // Lade Provider-Details separat
  }

  Future<void> _loadServiceItems() async {
    try {
      if (widget.offer.sourceType == 'quote') {
        final proposalDoc = await FirebaseFirestore.instance
            .collection('quotes')
            .doc(widget.offer.projectId)
            .collection('proposals')
            .doc(widget.offer.id)
            .get();
        
        if (proposalDoc.exists) {
          final data = proposalDoc.data()!;
          setState(() {
            _serviceItems = List<Map<String, dynamic>>.from(data['serviceItems'] ?? []);
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading service items: $e');
    }
  }

  /// 🎯 LADE PROVIDER-DETAILS AUS COMPANIES COLLECTION
  Future<void> _loadProviderDetails() async {
    try {
      setState(() => _loadingProviderDetails = true);
      
      debugPrint('🔍 Loading provider details for companyUid: ${widget.offer.companyUid}');
      
      // Initialisiere mit Fallback-Werten aus widget.offer
      _providerName = widget.offer.providerName;
      _providerAvatar = widget.offer.providerAvatar;
      _providerRating = widget.offer.providerRating;
      
      debugPrint('📊 Initial provider name: $_providerName');
      
      // Falls bereits richtige Daten vorhanden, verwende sie ABER lade trotzdem Stadt/PLZ/Reviews
      if (_providerName.isNotEmpty && _providerName != 'Unbekannter Anbieter') {
        debugPrint('✅ Using existing provider data but still loading location/reviews');
        // NICHT RETURN! Lade trotzdem Stadt/PLZ/Reviews
      }
      
      // Prüfe ob companyUid vorhanden ist
      if (widget.offer.companyUid.isEmpty) {
        debugPrint('⚠️ No companyUid available, using fallback data');
        setState(() => _loadingProviderDetails = false);
        return;
      }
      
      // Ansonsten lade aus companies Collection
      debugPrint('🔍 Fetching from companies collection...');
      final companyDoc = await FirebaseFirestore.instance
          .collection('companies')
          .doc(widget.offer.companyUid)
          .get();
      
      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        debugPrint('✅ Company data found: ${companyData.toString()}');
        debugPrint('📍 Company city: ${companyData['city']}');
        debugPrint('📮 Company postal: ${companyData['postalCode']}');
        debugPrint('⭐ Company rating: ${companyData['averageRating']}');
        debugPrint('🏢 Company name: ${companyData['companyName']}');
        
        setState(() {
          _providerName = companyData['companyName'] ?? companyData['name'] ?? 'Unbekannter Anbieter';
          _providerAvatar = companyData['profileImage'] ?? companyData['avatar'] ?? '';
          _providerRating = (companyData['averageRating'] ?? 0.0).toDouble();
          
          // 🎯 Versuche verschiedene Feldnamen für Stadt
          _providerCity = companyData['city'] ?? 
                         companyData['address']?['city'] ?? 
                         companyData['location']?['city'] ??
                         companyData['businessAddress']?['city'] ??
                         '';
          
          // 🎯 Versuche verschiedene Feldnamen für PLZ  
          _providerPostalCode = companyData['postalCode'] ?? 
                               companyData['zipCode'] ?? 
                               companyData['address']?['postalCode'] ??
                               companyData['address']?['zipCode'] ??
                               companyData['location']?['postalCode'] ??
                               companyData['businessAddress']?['postalCode'] ??
                               '';
          
          // 🎯 Versuche verschiedene Feldnamen für Review-Count
          _providerReviewCount = (companyData['reviewCount'] ?? 
                                 companyData['totalReviews'] ?? 
                                 companyData['reviewsCount'] ??
                                 companyData['ratingsCount'] ??
                                 0).toInt();
        });
        
        debugPrint('🎯 Updated state - City: $_providerCity, PLZ: $_providerPostalCode, Reviews: $_providerReviewCount');
      } else {
        debugPrint('❌ Company document not found');
        // Fallback auf ursprüngliche Daten
        setState(() => _loadingProviderDetails = false);
      }
    } catch (e) {
      debugPrint('❌ Error loading provider details: $e');
      // Fallback auf ursprüngliche Daten
    } finally {
      setState(() => _loadingProviderDetails = false);
    }
  }

  Future<void> _acceptOffer() async {
    setState(() => _isLoading = true);
    
    try {
      if (widget.offer.sourceType == 'quote') {
        // Update proposal in subcollection
        await FirebaseFirestore.instance
            .collection('quotes')
            .doc(widget.offer.projectId)
            .collection('proposals')
            .doc(widget.offer.id)
            .update({
          'status': 'accepted',
          'acceptedAt': FieldValue.serverTimestamp(),
        });
        
        // Update quote status
        await FirebaseFirestore.instance
            .collection('quotes')
            .doc(widget.offer.projectId)
            .update({
          'status': 'accepted',
          'acceptedProposalId': widget.offer.id,
          'acceptedAt': FieldValue.serverTimestamp(),
        });
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Angebot erfolgreich angenommen!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, 'accepted');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Annehmen: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _declineOffer() async {
    setState(() => _isLoading = true);
    
    try {
      if (widget.offer.sourceType == 'quote') {
        // Update proposal in subcollection
        await FirebaseFirestore.instance
            .collection('quotes')
            .doc(widget.offer.projectId)
            .collection('proposals')
            .doc(widget.offer.id)
            .update({
          'status': 'declined',
          'declinedAt': FieldValue.serverTimestamp(),
        });
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Angebot abgelehnt!'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.pop(context, 'declined');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Ablehnen: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // DASHBOARD LAYOUT MIT INHALT
            Expanded(
              child: DashboardLayout(
                title: 'Angebotsdetails',
                useGradientBackground: true,
                showBackButton: true,
                onBackPressed: () => Navigator.pop(context),
                body: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Project Info Card
                      _buildProjectInfoCard(),
                      const SizedBox(height: 16),
                      
                      // Provider Info Card
                      _buildProviderInfoCard(),
                      const SizedBox(height: 16),
                      
                      // Offer Details Card
                      _buildOfferDetailsCard(),
                      const SizedBox(height: 16),
                      
                      // Service Items Card (if available)
                      if (_serviceItems.isNotEmpty) ...[
                        _buildServiceItemsCard(),
                        const SizedBox(height: 16),
                      ],
                      
                      // Message Card (if available)
                      if (widget.offer.message.isNotEmpty) ...[
                        _buildMessageCard(),
                        const SizedBox(height: 16),
                      ],
                      
                      // Action Buttons (only for pending offers)
                      if (widget.offer.status == 'pending') _buildActionButtons(),
                      
                      // Status Info for non-pending offers
                      if (widget.offer.status != 'pending') _buildStatusInfo(),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectInfoCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.85),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.assignment, color: TaskiloColors.primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Projektdetails',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const Spacer(),
                _StatusBadge(status: widget.offer.status),
              ],
            ),
            const SizedBox(height: 16),
            _buildDetailRow('Projekt', widget.offer.projectTitle),
            _buildDetailRow('Kategorie', widget.offer.projectCategory),
            _buildDetailRow('Projekt-ID', widget.offer.projectId),
          ],
        ),
      ),
    );
  }

  Widget _buildProviderInfoCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.85),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.business, color: TaskiloColors.primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Anbieter',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundImage: _providerAvatar.isNotEmpty
                      ? NetworkImage(_providerAvatar)
                      : null,
                  backgroundColor: TaskiloColors.primary,
                  child: _providerAvatar.isEmpty
                      ? Text(
                          _providerName.isNotEmpty 
                              ? _providerName[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 24,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _loadingProviderDetails
                          ? const Text(
                              'Lädt Anbieter-Daten...',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey,
                              ),
                            )
                          : Text(
                              _providerName,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                      if (!_loadingProviderDetails && _providerRating > 0) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              _providerRating.toStringAsFixed(1),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.black87,
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
            if (!_loadingProviderDetails) ...[
              const SizedBox(height: 16),
              _buildDetailRow('Stadt', _providerCity.isNotEmpty ? _providerCity : 'Nicht angegeben'),
              _buildDetailRow('Reviews', _providerReviewCount > 0 ? '$_providerReviewCount Bewertungen' : 'Keine Bewertungen'),
              _buildDetailRow('PLZ', _providerPostalCode.isNotEmpty ? _providerPostalCode : 'Nicht angegeben'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOfferDetailsCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.85),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.euro, color: TaskiloColors.primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Angebotsdetails',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Price highlight
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TaskiloColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TaskiloColors.primary.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.euro, color: TaskiloColors.primary, size: 28),
                  const SizedBox(width: 12),
                  Text(
                    '${widget.offer.proposedPrice.toStringAsFixed(0)}€',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: TaskiloColors.primary,
                    ),
                  ),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Angebotspreis',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                      Text(
                        'inkl. MwSt.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            _buildDetailRow('Zeitrahmen', widget.offer.proposedTimeline),
            if (widget.offer.availability.isNotEmpty)
              _buildDetailRow('Verfügbarkeit', widget.offer.availability),
            _buildDetailRow('Eingegangen', _formatDate(widget.offer.submittedAt)),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceItemsCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.85),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.list_alt, color: TaskiloColors.primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Leistungen',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ..._serviceItems.map((item) => _buildServiceItem(item)),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceItem(Map<String, dynamic> item) {
    final title = item['title'] ?? '';
    final description = item['description'] ?? '';
    final quantity = (item['quantity'] ?? 1).toDouble();
    final unitPrice = (item['unitPrice'] ?? 0).toDouble();
    final total = (item['total'] ?? unitPrice * quantity).toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              Text(
                '${total.toStringAsFixed(0)}€',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: TaskiloColors.primary,
                ),
              ),
            ],
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              description,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Menge: ${quantity.toStringAsFixed(quantity == quantity.roundToDouble() ? 0 : 1)}',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(width: 16),
              Text(
                'Einzelpreis: ${unitPrice.toStringAsFixed(0)}€',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMessageCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withValues(alpha: 0.95),
              Colors.white.withValues(alpha: 0.85),
            ],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.message, color: TaskiloColors.primary, size: 24),
                const SizedBox(width: 8),
                const Text(
                  'Nachricht vom Anbieter',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Text(
                widget.offer.message,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.black87,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        // Accept Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _acceptOffer,
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 2,
            ),
            child: _isLoading 
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text(
                    'Angebot annehmen',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 12),
        
        // Decline Button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: _isLoading ? null : _declineOffer,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.grey[700],
              side: BorderSide(color: Colors.grey[300]!),
              backgroundColor: Colors.grey[50],
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Angebot ablehnen',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusInfo() {
    String statusText;
    Color statusColor;
    IconData statusIcon;

    switch (widget.offer.status) {
      case 'accepted':
        statusText = 'Dieses Angebot wurde angenommen';
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'declined':
        statusText = 'Dieses Angebot wurde abgelehnt';
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
      default:
        statusText = 'Status: ${widget.offer.status}';
        statusColor = Colors.grey;
        statusIcon = Icons.info;
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: statusColor.withValues(alpha: 0.1),
          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
        ),
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(statusIcon, color: statusColor, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                statusText,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
          ),
        ],
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
      return 'Gestern';
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
    String text;
    Color color;

    switch (status) {
      case 'pending':
        text = 'Wartend';
        color = Colors.orange;
        break;
      case 'accepted':
        text = 'Angenommen';
        color = Colors.green;
        break;
      case 'declined':
        text = 'Abgelehnt';
        color = Colors.red;
        break;
      default:
        text = status;
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
