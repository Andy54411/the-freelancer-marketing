import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/review_service.dart';
import '../../services/portfolio_service.dart';
import '../../services/chat_service.dart';
import '../provider/provider_details_screen.dart';

class ServiceDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> service;

  const ServiceDetailsScreen({
    super.key,
    required this.service,
  });

  @override
  State<ServiceDetailsScreen> createState() => _ServiceDetailsScreenState();
}

class _ServiceDetailsScreenState extends State<ServiceDetailsScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  bool _isFavorite = false;
  
  // Slide Panel für Portfolio
  bool _showSlidePanel = false;
  Map<String, dynamic>? _selectedPortfolioItem;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;
  
  // Daten für die erweiterten Funktionen
  List<Map<String, dynamic>> _reviews = [];
  List<Map<String, dynamic>> _portfolio = [];
  List<Map<String, dynamic>> _skills = [];
  List<Map<String, dynamic>> _servicePackages = [];
  List<Map<String, dynamic>> _faqs = [];
  List<Map<String, dynamic>> _languages = [];
  Map<String, dynamic> _reviewStats = {};
  
  bool _isLoadingReviews = true;
  bool _isLoadingPortfolio = true;
  bool _isLoadingExtras = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this); // Erweitert auf 4 Tabs
    _isFavorite = widget.service['isFavorite'] ?? false;
    
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
    
    _loadProviderData();
  }

  /// Lädt alle Provider-Daten parallel
  Future<void> _loadProviderData() async {
    final providerId = widget.service['id'] ?? widget.service['providerId'] ?? '';
    
    if (providerId.isEmpty) {
      debugPrint('⚠️ Provider ID nicht gefunden');
      return;
    }
    
    debugPrint('🔄 Lade erweiterte Provider-Daten für: $providerId');
    
    // Alle Services parallel laden
    await Future.wait([
      _loadReviews(providerId),
      _loadPortfolio(providerId),
      _loadExtras(providerId),
    ]);
  }
  
  /// Lädt Reviews und Review-Statistiken
  Future<void> _loadReviews(String providerId) async {
    try {
      setState(() => _isLoadingReviews = true);
      
      final results = await Future.wait([
        ReviewService.getProviderReviews(providerId),
        ReviewService.getReviewStats(providerId),
      ]);
      
      if (mounted) {
        setState(() {
          _reviews = results[0] as List<Map<String, dynamic>>;
          _reviewStats = results[1] as Map<String, dynamic>;
          _isLoadingReviews = false;
        });
      }
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Reviews: $e');
      if (mounted) {
        setState(() => _isLoadingReviews = false);
      }
    }
  }
  
  /// Lädt Portfolio-Daten
  Future<void> _loadPortfolio(String providerId) async {
    try {
      setState(() => _isLoadingPortfolio = true);
      
      final portfolio = await PortfolioService.getProviderPortfolio(providerId);
      
      if (mounted) {
        setState(() {
          _portfolio = portfolio;
          _isLoadingPortfolio = false;
        });
      }
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Portfolios: $e');
      if (mounted) {
        setState(() => _isLoadingPortfolio = false);
      }
    }
  }
  
  /// Lädt zusätzliche Daten (Skills, Packages, FAQs, Languages)
  Future<void> _loadExtras(String providerId) async {
    try {
      setState(() => _isLoadingExtras = true);
      
      final results = await Future.wait([
        PortfolioService.getProviderSkills(providerId),
        PortfolioService.getProviderServicePackages(providerId),
        PortfolioService.getProviderFAQs(providerId),
        PortfolioService.getProviderLanguages(providerId),
      ]);
      
      if (mounted) {
        setState(() {
          _skills = results[0];
          _servicePackages = results[1];
          _faqs = results[2];
          _languages = results[3];
          _isLoadingExtras = false;
        });
      }
      
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Extra-Daten: $e');
      if (mounted) {
        setState(() => _isLoadingExtras = false);
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar mit Service-Bild
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: const Color(0xFF14ad9f),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              IconButton(
                icon: Icon(
                  _isFavorite ? Icons.favorite : Icons.favorite_border,
                  color: Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
              IconButton(
                icon: const Icon(Icons.share, color: Colors.white),
                onPressed: _shareService,
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFF14ad9f).withValues(alpha: 0.8),
                      const Color(0xFF0f9d84).withValues(alpha: 0.9),
                    ],
                  ),
                ),
                child: Stack(
                  children: [
                    // Echtes Provider-Bild (Banner oder Hauptbild)
                    if (_hasValidProviderImage())
                      Positioned.fill(
                        child: Image.network(
                          _getProviderImage(),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return _buildFallbackHeader();
                          },
                        ),
                      )
                    else
                      _buildFallbackHeader(),
                    
                    // Gradient Overlay für bessere Lesbarkeit
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.1),
                              Colors.black.withValues(alpha: 0.3),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (_isPro())
                      Positioned(
                        top: 100,
                        right: 20,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'PRO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Provider Info Section
          SliverToBoxAdapter(
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.2),
                    backgroundImage: _hasValidProviderProfileImage()
                        ? NetworkImage(_getProviderProfileImage())
                        : null,
                    child: !_hasValidProviderProfileImage()
                        ? Text(
                            _getProviderInitials(),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF14ad9f),
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.service['providerName'] ?? 'Unbekannter Anbieter',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.star,
                              size: 16,
                              color: Colors.amber.shade600,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${widget.service['rating'] ?? 4.8}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '(${widget.service['reviewCount'] ?? 127} Bewertungen)',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.service['providerDescription'] ?? 
                          'Professioneller Service-Anbieter mit langjähriger Erfahrung.',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Tab Bar
          SliverPersistentHeader(
            pinned: true,
            delegate: _StickyTabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: const Color(0xFF14ad9f),
                unselectedLabelColor: Colors.grey.shade600,
                indicatorColor: const Color(0xFF14ad9f),
                isScrollable: true,
                tabs: const [
                  Tab(text: 'Übersicht'),
                  Tab(text: 'Portfolio'),
                  Tab(text: 'Bewertungen'),
                  Tab(text: 'FAQ'),
                ],
              ),
            ),
          ),

          // Tab Content
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildPortfolioTab(),
                _buildReviewsTab(),
                _buildFAQTab(),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Service-Beschreibung
          const Text(
            'Service-Beschreibung',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            widget.service['description'] ?? 
            widget.service['publicDescription'] ??
            widget.service['businessDescription'] ??
            'Professioneller Service mit höchster Qualität. Ich biete umfassende Lösungen für Ihre Anforderungen und sorge für eine termingerechte Umsetzung Ihrer Projekte.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.5,
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Skills & Fähigkeiten
          if (_skills.isNotEmpty) ...[
            const Text(
              'Fähigkeiten & Kompetenzen',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _skills.map((skill) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF14ad9f).withValues(alpha: 0.3)),
                ),
                child: Text(
                  skill['name'] ?? skill['skill'] ?? 'Skill',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF14ad9f),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              )).toList(),
            ),
            const SizedBox(height: 24),
          ],
          
          // Service Packages
          if (_servicePackages.isNotEmpty) ...[
            const Text(
              'Service-Pakete',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            ...(_servicePackages.take(2).map((package) => _buildServicePackageCard(package))),
            if (_servicePackages.length > 2)
              Center(
                child: TextButton(
                  onPressed: () => _showAllServicePackages(),
                  child: Text(
                    'Alle ${_servicePackages.length} Pakete anzeigen',
                    style: const TextStyle(color: Color(0xFF14ad9f)),
                  ),
                ),
              ),
            const SizedBox(height: 24),
          ],
          
          // Sprachen
          if (_languages.isNotEmpty) ...[
            const Text(
              'Sprachen',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            ...(_languages.map((lang) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(
                    Icons.language,
                    size: 16,
                    color: const Color(0xFF14ad9f),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    lang['language'] ?? '',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade800,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '(${lang['proficiency'] ?? 'Fließend'})',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ))),
            const SizedBox(height: 24),
          ],
          
          // Was Sie erhalten
          const Text(
            'Was Sie erhalten',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          
          ..._getServiceFeatures().map((feature) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle,
                  size: 16,
                  color: const Color(0xFF14ad9f),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    feature,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  /// Service Package Card Widget
  Widget _buildServicePackageCard(Map<String, dynamic> package) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  package['title'] ?? 'Service Package',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
              if (package['popular'] == true)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Beliebt',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (package['description']?.isNotEmpty == true)
            Text(
              package['description'],
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                'Ab €${package['price']?.toStringAsFixed(0) ?? '0'}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF14ad9f),
                ),
              ),
              const Spacer(),
              if (package['deliveryTime']?.isNotEmpty == true)
                Text(
                  package['deliveryTime'],
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  /// Portfolio Tab
  Widget _buildPortfolioTab() {
    if (_isLoadingPortfolio) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
        ),
      );
    }

    if (_portfolio.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.photo_library_outlined,
              size: 64,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              'Noch kein Portfolio verfügbar',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      );
    }

    return Stack(
      children: [
        // Haupt-Portfolio Grid
        GridView.builder(
          padding: const EdgeInsets.all(20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 0.8,
          ),
          itemCount: _portfolio.length,
          itemBuilder: (context, index) {
            final item = _portfolio[index];
            return _buildPortfolioCard(item);
          },
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
                    offset: Offset(2, 0),
                  ),
                ],
              ),
              child: _buildSlidePanel(),
            ),
          ),
      ],
    );
  }

  /// Portfolio Card Widget
  Widget _buildPortfolioCard(Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () => _showPortfolioDetail(item),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Portfolio Bild
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: item['imageUrl']?.isNotEmpty == true
                    ? ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                        child: Image.network(
                          item['imageUrl'],
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(
                              Icons.image_not_supported,
                              size: 32,
                              color: Colors.grey.shade400,
                            );
                          },
                        ),
                      )
                    : Icon(
                        Icons.photo_library_outlined,
                        size: 32,
                        color: Colors.grey.shade400,
                      ),
              ),
            ),
            // Portfolio Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['title'] ?? 'Portfolio Item',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (item['category']?.isNotEmpty == true)
                      Text(
                        item['category'],
                        style: TextStyle(
                          fontSize: 12,
                          color: const Color(0xFF14ad9f),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    const Spacer(),
                    if (item['completedAt']?.isNotEmpty == true)
                      Text(
                        item['completedAt'],
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey.shade600,
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

  Widget _buildReviewsTab() {
    if (_isLoadingReviews) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Reviews Summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Column(
                children: [
                  Text(
                    '${_reviewStats['averageRating']?.toStringAsFixed(1) ?? widget.service['rating']?.toStringAsFixed(1) ?? '4.8'}',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14ad9f),
                    ),
                  ),
                  Row(
                    children: List.generate(5, (index) {
                      final rating = _reviewStats['averageRating']?.toDouble() ?? 
                                   (widget.service['rating'] as num?)?.toDouble() ?? 4.8;
                      return Icon(
                        Icons.star,
                        size: 16,
                        color: index < rating.round() ? Colors.amber.shade600 : Colors.grey.shade300,
                      );
                    }),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_reviewStats['totalReviews'] ?? _reviews.length} Bewertungen',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_reviewStats['percentageDistribution'] != null)
                      ...([5, 4, 3, 2, 1].map((stars) => _buildRatingBar(
                        '$stars Stern${stars == 1 ? '' : 'e'}', 
                        (_reviewStats['percentageDistribution'][stars] ?? 0.0) / 100
                      )))
                    else
                      ..._buildDefaultRatingBars(),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Individual Reviews
        if (_reviews.isNotEmpty)
          ..._reviews.map((review) => _buildReviewCard(review))
        else
          _buildNoReviews(),
      ],
    );
  }

  /// Standard Rating Bars wenn keine echten Daten
  List<Widget> _buildDefaultRatingBars() {
    return [
      _buildRatingBar('5 Sterne', 0.8),
      _buildRatingBar('4 Sterne', 0.15),
      _buildRatingBar('3 Sterne', 0.03),
      _buildRatingBar('2 Sterne', 0.01),
      _buildRatingBar('1 Stern', 0.01),
    ];
  }

  /// Widget für keine Reviews
  Widget _buildNoReviews() {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.star_border,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'Noch keine Bewertungen vorhanden',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Seien Sie der Erste, der diesen Anbieter bewertet!',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildRatingBar(String label, double percentage) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Container(
              height: 6,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: percentage,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF14ad9f),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${(percentage * 100).round()}%',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewCard(Map<String, dynamic> review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.2),
                backgroundImage: review['customerAvatar']?.isNotEmpty == true
                    ? NetworkImage(review['customerAvatar'])
                    : null,
                child: review['customerAvatar']?.isEmpty != false
                    ? Text(
                        (review['customerName'] ?? 'K')[0].toUpperCase(),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF14ad9f),
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          review['customerName'] ?? 'Anonymer Kunde',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        if (review['isVerified'] == true) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Icons.verified,
                            size: 14,
                            color: const Color(0xFF14ad9f),
                          ),
                        ],
                      ],
                    ),
                    Row(
                      children: [
                        ...List.generate(5, (index) => Icon(
                          Icons.star,
                          size: 12,
                          color: index < (review['rating'] as num).round() ? Colors.amber.shade600 : Colors.grey.shade300,
                        )),
                        const SizedBox(width: 8),
                        Text(
                          review['date'] ?? '',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            review['comment'] ?? '',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.4,
            ),
          ),
          if (review['serviceType']?.isNotEmpty == true) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                review['serviceType'],
                style: TextStyle(
                  fontSize: 11,
                  color: const Color(0xFF14ad9f),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFAQTab() {
    if (_isLoadingExtras) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
        ),
      );
    }

    final faqs = _faqs.isNotEmpty ? _faqs : _getDefaultFAQs();

    return ListView(
      padding: const EdgeInsets.all(20),
      children: faqs.map((faq) => ExpansionTile(
        title: Text(
          faq['question'] ?? '',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        iconColor: const Color(0xFF14ad9f),
        collapsedIconColor: Colors.grey.shade600,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              faq['answer'] ?? '',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                height: 1.4,
              ),
            ),
          ),
        ],
      )).toList(),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ab €${widget.service['price'] ?? widget.service['hourlyRate'] ?? 49}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF14ad9f),
                ),
              ),
              Text(
                widget.service['hourlyRate'] != null ? 'pro Stunde' : 'Grundpreis',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Row(
              children: [
                // Chat Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _startChat,
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Chat'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF14ad9f),
                      side: const BorderSide(color: Color(0xFF14ad9f)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Booking Button
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _contactProvider,
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
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Helper Methods
  IconData _getServiceIcon() {
    final title = (widget.service['title'] ?? '').toLowerCase();
    if (title.contains('logo') || title.contains('design')) return Icons.palette;
    if (title.contains('web') || title.contains('website')) return Icons.web;
    if (title.contains('app') || title.contains('mobile')) return Icons.phone_android;
    if (title.contains('text') || title.contains('schreiben')) return Icons.edit;
    if (title.contains('video') || title.contains('film')) return Icons.videocam;
    if (title.contains('photo') || title.contains('foto')) return Icons.camera_alt;
    return Icons.work;
  }

  bool _isPro() {
    return widget.service['isPro'] == true || widget.service['level'] == 'pro';
  }

  String _getProviderInitials() {
    final name = widget.service['providerName'] ?? 'U';
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  List<String> _getServiceFeatures() {
    return [
      'Professionelle Umsetzung',
      'Termingerechte Lieferung',
      'Persönliche Betreuung',
      'Kostenlose Beratung',
      'Nachbetreuung inklusive',
    ];
  }

  // Action Methods
  void _toggleFavorite() {
    setState(() {
      _isFavorite = !_isFavorite;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          _isFavorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt',
        ),
        backgroundColor: const Color(0xFF14ad9f),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _shareService() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Service geteilt'),
        backgroundColor: Color(0xFF14ad9f),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _contactProvider() {
    // Hier kann das Booking Widget geöffnet werden
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Buchung wird geöffnet...'),
        backgroundColor: Color(0xFF14ad9f),
        duration: Duration(seconds: 2),
      ),
    );
  }

  /// Startet Chat mit Provider
  Future<void> _startChat() async {
    try {
      final providerId = widget.service['id'] ?? widget.service['providerId'] ?? '';
      final providerName = widget.service['providerName'] ?? widget.service['companyName'] ?? 'Anbieter';
      
      if (providerId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Provider ID nicht gefunden'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Hole die aktuelle User ID vom AuthService
      final authService = AuthService();
      final currentUser = authService.currentUser;
      
      if (currentUser == null) {
        // User ist nicht eingeloggt - zur Login-Seite weiterleiten
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bitte melden Sie sich an, um den Chat zu nutzen'),
            backgroundColor: Colors.orange,
          ),
        );
        // Hier könnte zur Login-Seite navigiert werden
        return;
      }
      
      final chatId = await ChatService.startChatWithProvider(
        providerId: providerId,
        providerName: providerName,
        customerId: currentUser.uid,
        customerName: currentUser.displayName ?? '${currentUser.profile?.firstName ?? ''} ${currentUser.profile?.lastName ?? ''}'.trim(),
      );
      
      debugPrint('✅ Chat gestartet: $chatId');
      
      // Navigation zur Chat-Seite (wenn vorhanden)
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Chat mit $providerName gestartet'),
            backgroundColor: const Color(0xFF14ad9f),
            action: SnackBarAction(
              label: 'Chat öffnen',
              textColor: Colors.white,
              onPressed: () {
                debugPrint('Navigate to chat: $chatId');
              },
            ),
          ),
        );
      }
      
    } catch (e) {
      debugPrint('❌ Fehler beim Starten des Chats: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Chat konnte nicht gestartet werden'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Zeigt alle Service-Packages in einem Modal
  void _showAllServicePackages() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Alle Service-Pakete',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _servicePackages.length,
                itemBuilder: (context, index) {
                  return _buildServicePackageCard(_servicePackages[index]);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Navigiert zu Provider Details mit Portfolio-Focus
  void _showPortfolioDetail(Map<String, dynamic> item) {
    debugPrint('🎯 SERVICE NAVIGATE TO PROVIDER - Öffne Portfolio Detail: ${item['title']}');
    
    // Navigiere zur Provider-Details-Seite mit Portfolio-Item
    final providerId = widget.service['id'] ?? widget.service['providerId'] ?? '';
    
    if (providerId.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ProviderDetailsScreen(
            providerId: providerId,
            selectedPortfolioItem: item,
            showPortfolioPanel: true,
          ),
        ),
      );
    }
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
        // Header mit Close Button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: Color(0xFF14ad9f),
            borderRadius: BorderRadius.only(
              topRight: Radius.circular(16),
            ),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: _hidePortfolioDetail,
                child: const Icon(
                  Icons.arrow_back_ios,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Portfolio Details',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header mit Bild
                if (item['imageUrl']?.isNotEmpty == true)
                  Container(
                    height: 250,
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        item['imageUrl'],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.image_not_supported,
                                    color: Colors.grey,
                                    size: 48,
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Bild konnte nicht geladen werden',
                                    style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                
                // Titel
                Text(
                  item['title'] ?? 'Portfolio Projekt',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Kategorie und Datum
                Row(
                  children: [
                    if (item['category']?.isNotEmpty == true) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          item['category'],
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF14ad9f),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const Spacer(),
                    ],
                    if (item['completedAt']?.isNotEmpty == true)
                      Text(
                        item['completedAt'],
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // Beschreibung
                if (item['description']?.isNotEmpty == true) ...[
                  const Text(
                    'Projektbeschreibung',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item['description'],
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Standard FAQs wenn keine Firebase-Daten vorhanden
  List<Map<String, dynamic>> _getDefaultFAQs() {
    return [
      {
        'question': 'Wie lange dauert die Bearbeitung?',
        'answer': 'Die Bearbeitungszeit hängt vom gewählten Service ab. In der Regel erfolgt eine erste Rückmeldung innerhalb von 24 Stunden.',
      },
      {
        'question': 'Kann ich Änderungen anfordern?',
        'answer': 'Ja, Änderungen sind möglich. Die Anzahl der kostenlosen Revisionen hängt vom gewählten Service-Paket ab.',
      },
      {
        'question': 'Wie läuft die Kommunikation ab?',
        'answer': 'Die gesamte Kommunikation erfolgt über die Taskilo-Plattform. Sie erhalten regelmäßige Updates zum Fortschritt.',
      },
      {
        'question': 'Welche Zahlungsmethoden werden akzeptiert?',
        'answer': 'Wir akzeptieren alle gängigen Zahlungsmethoden über Stripe, einschließlich Kreditkarten und SEPA-Lastschrift.',
      },
    ];
  }

  // Bild-Methoden für Header
  bool _hasValidProviderImage() {
    final imageUrl = _getProviderImage();
    return imageUrl.isNotEmpty && 
           !imageUrl.startsWith('blob:') && 
           (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
  }

  String _getProviderImage() {
    // Priorität: Banner > Image > Profile > Logo > andere
    final bannerImage = widget.service['profileBannerImage']?.toString() ?? '';
    if (bannerImage.isNotEmpty && !bannerImage.startsWith('blob:')) {
      return bannerImage;
    }
    
    final image = widget.service['image']?.toString() ?? '';
    if (image.isNotEmpty && !image.startsWith('blob:')) {
      return image;
    }
    
    final profilePicture = widget.service['profilePictureURL']?.toString() ?? '';
    if (profilePicture.isNotEmpty && !profilePicture.startsWith('blob:')) {
      return profilePicture;
    }
    
    final logoUrl = widget.service['logoURL']?.toString() ?? '';
    if (logoUrl.isNotEmpty && !logoUrl.startsWith('blob:')) {
      return logoUrl;
    }
    
    return '';
  }

  Widget _buildFallbackHeader() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _getServiceIcon(),
            size: 80,
            color: Colors.white.withValues(alpha: 0.9),
          ),
          const SizedBox(height: 16),
          Text(
            widget.service['title'] ?? widget.service['companyName'] ?? 'Service-Titel',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // Bild-Methoden für Provider-Avatar
  bool _hasValidProviderProfileImage() {
    final imageUrl = _getProviderProfileImage();
    return imageUrl.isNotEmpty && 
           !imageUrl.startsWith('blob:') && 
           (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
  }

  String _getProviderProfileImage() {
    // Priorität für Avatar: Profile > Logo > Avatar > andere
    final profilePicture = widget.service['profilePictureURL']?.toString() ?? '';
    if (profilePicture.isNotEmpty && !profilePicture.startsWith('blob:')) {
      return profilePicture;
    }
    
    final logoUrl = widget.service['logoURL']?.toString() ?? '';
    if (logoUrl.isNotEmpty && !logoUrl.startsWith('blob:')) {
      return logoUrl;
    }
    
    final avatarUrl = widget.service['avatarURL']?.toString() ?? '';
    if (avatarUrl.isNotEmpty && !avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    
    final image = widget.service['image']?.toString() ?? '';
    if (image.isNotEmpty && !image.startsWith('blob:')) {
      return image;
    }
    
    return '';
  }
}

// Delegate für sticky TabBar
class _StickyTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar child;

  _StickyTabBarDelegate(this.child);

  @override
  double get minExtent => child.preferredSize.height;

  @override
  double get maxExtent => child.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: child,
    );
  }

  @override
  bool shouldRebuild(_StickyTabBarDelegate oldDelegate) {
    return false;
  }
}
