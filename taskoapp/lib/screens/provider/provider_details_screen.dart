import 'package:flutter/material.dart';
import 'components/provider_portfolio_tab.dart';

class ProviderDetailsScreen extends StatefulWidget {
  final String providerId;
  final Map<String, dynamic>? providerData;
  final Map<String, dynamic>? selectedPortfolioItem;
  final bool showPortfolioPanel;

  const ProviderDetailsScreen({
    super.key,
    required this.providerId,
    this.providerData,
    this.selectedPortfolioItem,
    this.showPortfolioPanel = false,
  });

  @override
  State<ProviderDetailsScreen> createState() => _ProviderDetailsScreenState();
}

class _ProviderDetailsScreenState extends State<ProviderDetailsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _provider;
  bool _isLoading = true;
  String? _error;
  
  // Slide Panel für Portfolio
  bool _showSlidePanel = false;
  Map<String, dynamic>? _selectedPortfolioItem;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    
    // Slide Panel Animation Controller
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(-1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeInOut,
    ));
    
    _loadProviderDetails();
    
    // Prüfe, ob ein Portfolio-Item direkt angezeigt werden soll
    if (widget.showPortfolioPanel && widget.selectedPortfolioItem != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showPortfolioDetail(widget.selectedPortfolioItem!);
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadProviderDetails() async {
    try {
      if (widget.providerData != null) {
        // Verwende bereits vorhandene Provider-Daten
        _provider = widget.providerData!;
      } else {
        // Temporär: Fehlermeldung anzeigen
        _error = 'Provider Details können momentan nicht geladen werden';
      }
      
      if (_provider == null) {
        _error = 'Anbieter nicht gefunden';
      }
    } catch (e) {
      _error = 'Fehler beim Laden der Anbieter-Details: $e';
      debugPrint('Error loading provider details: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Haupt-Scaffold
        Scaffold(
          appBar: AppBar(
            title: const Text('Anbieter Details'),
            backgroundColor: Colors.white,
            foregroundColor: Colors.black,
            elevation: 0,
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF14ad9f)))
              : _error != null
                  ? _buildErrorWidget()
                  : _provider != null
                      ? _buildProviderDetails()
                      : _buildErrorWidget(),
          bottomNavigationBar: !_isLoading && _provider != null
              ? _buildBottomActions()
              : null,
        ),

        // Dunkler Overlay zum Schließen (MUSS UNTER dem Panel sein)
        if (_showSlidePanel)
          GestureDetector(
            onTap: _hidePortfolioDetail,
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: Colors.black.withValues(alpha: 0.5),
            ),
          ),

        // Slide-In Panel (MUSS ÜBER dem Overlay sein)
        if (_showSlidePanel && _selectedPortfolioItem != null)
          SlideTransition(
            position: _slideAnimation,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.85,
              height: double.infinity,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 10,
                    offset: Offset(5, 0),
                  ),
                ],
              ),
              child: _buildSlidePanel(),
            ),
          ),
      ],
    );
  }

  Widget _buildErrorWidget() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Anbieter nicht gefunden',
              style: TextStyle(
                fontSize: 18,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14ad9f),
                foregroundColor: Colors.white,
              ),
              child: const Text('Zurück'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProviderDetails() {
    return Column(
      children: [
        // Header mit Provider Info
        _buildHeader(),
        
        // Tabs
        Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF14ad9f),
            unselectedLabelColor: Colors.grey.shade600,
            indicatorColor: const Color(0xFF14ad9f),
            tabs: const [
              Tab(text: 'Übersicht'),
              Tab(text: 'Bewertungen'),
              Tab(text: 'Portfolio'),
            ],
          ),
        ),
        
        // Tab Content
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildOverviewTab(),
              _buildReviewsTab(),
              ProviderPortfolioTab(
                providerId: widget.providerId,
                onPortfolioItemTap: _showPortfolioDetail,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Profile Picture
              CircleAvatar(
                radius: 40,
                backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                backgroundImage: _provider!['profilePictureURL'] != null
                    ? NetworkImage(_provider!['profilePictureURL'])
                    : null,
                child: _provider!['profilePictureURL'] == null
                    ? const Icon(
                        Icons.person,
                        color: Color(0xFF14ad9f),
                        size: 40,
                      )
                    : null,
              ),
              const SizedBox(width: 20),
              
              // Provider Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _provider!['companyName'] ?? _provider!['name'] ?? 'Unbekannter Anbieter',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_provider!['companyName'] != null && (_provider!['name']?.toString().isNotEmpty ?? false))
                      Text(
                        _provider!['name'],
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    const SizedBox(height: 8),
                    if (_provider!['location'] != null && _provider!['location'].toString().isNotEmpty)
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 16,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _provider!['location'],
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              
              // Price Badge
              if (_provider!['hourlyRate'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: Text(
                    '${_provider!['hourlyRate']}€/h',
                    style: const TextStyle(
                      color: Color(0xFF14ad9f),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
            ],
          ),
          
          // Rating
          const SizedBox(height: 16),
          Row(
            children: [
              if (_provider!['rating'] != null && _provider!['rating'] > 0) ...[
                ...List.generate(5, (index) {
                  return Icon(
                    index < _provider!['rating'].floor()
                        ? Icons.star
                        : index < _provider!['rating']
                            ? Icons.star_half
                            : Icons.star_border,
                    color: Colors.amber.shade600,
                    size: 20,
                  );
                }),
                const SizedBox(width: 8),
                Text(
                  '${_provider!['rating'].toStringAsFixed(1)} (${_provider!['reviewCount'] ?? 0} Bewertungen)',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ] else ...[
                Text(
                  'Noch keine Bewertungen',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Description
          if (_provider!['description'] != null && _provider!['description'].toString().isNotEmpty) ...[
            const Text(
              'Beschreibung',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                _provider!['description'].toString(),
                style: const TextStyle(
                  fontSize: 16,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
          
          // Services
          const Text(
            'Angebotene Services',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          if (_provider!['services'] != null && (_provider!['services'] as List).isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: (_provider!['services'] as List).map<Widget>((service) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF14ad9f).withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    service.toString(),
                    style: const TextStyle(
                      color: Color(0xFF14ad9f),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              }).toList(),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                'Keine Services angegeben',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
          
          const SizedBox(height: 24),
          
          // Contact Info
          const Text(
            'Kontakt Information',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_provider!['email'] != null && _provider!['email'].toString().isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.email, size: 16, color: Color(0xFF14ad9f)),
                      const SizedBox(width: 8),
                      Text(
                        _provider!['email'].toString(),
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                if (_provider!['phone'] != null && _provider!['phone'].toString().isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 16, color: Color(0xFF14ad9f)),
                      const SizedBox(width: 8),
                      Text(
                        _provider!['phone'].toString(),
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                if (_provider!['website'] != null && _provider!['website'].toString().isNotEmpty) ...[
                  Row(
                    children: [
                      const Icon(Icons.language, size: 16, color: Color(0xFF14ad9f)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _provider!['website'].toString(),
                          style: const TextStyle(fontSize: 16),
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
    );
  }

  Widget _buildReviewsTab() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.star_outline,
              size: 64,
              color: Colors.grey,
            ),
            SizedBox(height: 16),
            Text(
              'Bewertungen',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Bewertungssystem wird bald verfügbar sein',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: [
                    // Contact Button
          Expanded(
            child: OutlinedButton(
              onPressed: () {
                _showContactOptions();
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF14ad9f)),
                foregroundColor: const Color(0xFF14ad9f),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Kontakt',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Book Button
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: () {
                _showBookingModal();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14ad9f),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Jetzt buchen',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showContactOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Kontakt aufnehmen',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              
              if (_provider!['email'] != null && _provider!['email'].toString().isNotEmpty)
                ListTile(
                  leading: const Icon(Icons.email, color: Color(0xFF14ad9f)),
                  title: const Text('E-Mail senden'),
                  subtitle: Text(_provider!['email'].toString()),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
              
              if (_provider!['phone'] != null && _provider!['phone'].toString().isNotEmpty)
                ListTile(
                  leading: const Icon(Icons.phone, color: Color(0xFF14ad9f)),
                  title: const Text('Anrufen'),
                  subtitle: Text(_provider!['phone'].toString()),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
              
              ListTile(
                leading: const Icon(Icons.chat, color: Color(0xFF14ad9f)),
                title: const Text('Chat starten'),
                subtitle: const Text('Direktnachricht senden'),
                onTap: () {
                  Navigator.pop(context);
                },
              ),
              
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _showBookingModal() {
    // Da BookingWidget TaskiloUser erwartet, konvertieren wir temporär
    // Dies ist eine vereinfachte Implementierung
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.9,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Buchungsanfrage',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Anbieter: ${_provider!['companyName'] ?? _provider!['name'] ?? 'Unbekannt'}',
                      style: const TextStyle(fontSize: 18),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: const Text(
                        'Booking System wird bald verfügbar sein',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF14ad9f),
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                      ),
                      child: const Text('Schließen'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Zeigt Portfolio-Details im Slide Panel
  void _showPortfolioDetail(Map<String, dynamic> item) {
    debugPrint('🎯 PROVIDER SLIDE PANEL - Öffne Portfolio Detail: ${item['title']}');
    setState(() {
      _selectedPortfolioItem = item;
      _showSlidePanel = true;
    });
    _slideController.forward();
  }

  void _hidePortfolioDetail() {
    _slideController.reverse().then((_) {
      setState(() {
        _showSlidePanel = false;
        _selectedPortfolioItem = null;
      });
    });
  }

  Widget _buildSlidePanel() {
    if (_selectedPortfolioItem == null) return Container();
    
    final item = _selectedPortfolioItem!;
    
    return Column(
      children: [
        // Header mit Schließen-Button
        Container(
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          decoration: BoxDecoration(
            color: const Color(0xFF14ad9f),
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(16),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  item['title'] ?? 'Portfolio Details',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: _hidePortfolioDetail,
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
        ),
        
        // Scrollbarer Inhalt
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hauptbild
                if (item['imageUrl']?.isNotEmpty == true)
                  Container(
                    width: double.infinity,
                    height: 200,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.grey.shade200,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        item['imageUrl'],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Icon(
                            Icons.image_not_supported,
                            size: 48,
                            color: Colors.grey.shade400,
                          );
                        },
                      ),
                    ),
                  ),
                
                const SizedBox(height: 20),
                
                // Titel und Beschreibung
                Text(
                  item['title'] ?? 'Portfolio Item',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                
                const SizedBox(height: 12),
                
                if (item['description']?.isNotEmpty == true)
                  Text(
                    item['description'],
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade700,
                      height: 1.5,
                    ),
                  ),
                
                const SizedBox(height: 20),
                
                // Zusätzliche Bilder (falls vorhanden)
                if (item['images']?.isNotEmpty == true) ...[
                  const Text(
                    'Weitere Bilder',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 120,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: item['images'].length,
                      itemBuilder: (context, index) {
                        final imageUrl = item['images'][index];
                        return Container(
                          width: 120,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            color: Colors.grey.shade200,
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.image_not_supported,
                                  color: Colors.grey.shade400,
                                );
                              },
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
                
                const SizedBox(height: 20),
                
                // Projekt-Details
                if (item['completedAt'] != null) ...[
                  _buildDetailRow('Abgeschlossen', item['completedAt']),
                  const SizedBox(height: 8),
                ],
                if (item['category'] != null) ...[
                  _buildDetailRow('Kategorie', item['category']),
                  const SizedBox(height: 8),
                ],
                if (item['tags']?.isNotEmpty == true) ...[
                  _buildDetailRow('Tags', item['tags'].join(', ')),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            '$label:',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
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
    );
  }
}
