import 'package:flutter/material.dart';

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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _isFavorite = widget.service['isFavorite'] ?? false;
  }

  @override
  void dispose() {
    _tabController.dispose();
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
                tabs: const [
                  Tab(text: 'Übersicht'),
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
            'Professioneller Service mit höchster Qualität. Ich biete umfassende Lösungen für Ihre Anforderungen und sorge für eine termingerechte Umsetzung Ihrer Projekte.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.5,
            ),
          ),
          
          const SizedBox(height: 24),
          
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

  Widget _buildReviewsTab() {
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
                    '${widget.service['rating'] ?? 4.8}',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14ad9f),
                    ),
                  ),
                  Row(
                    children: List.generate(5, (index) => Icon(
                      Icons.star,
                      size: 16,
                      color: index < 4 ? Colors.amber.shade600 : Colors.grey.shade300,
                    )),
                  ),
                ],
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${widget.service['reviewCount'] ?? 127} Bewertungen',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildRatingBar('5 Sterne', 0.8),
                    _buildRatingBar('4 Sterne', 0.15),
                    _buildRatingBar('3 Sterne', 0.03),
                    _buildRatingBar('2 Sterne', 0.01),
                    _buildRatingBar('1 Stern', 0.01),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Individual Reviews
        ..._getReviews().map((review) => _buildReviewCard(review)),
      ],
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
                child: Text(
                  review['customerName'][0].toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF14ad9f),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review['customerName'],
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    Row(
                      children: [
                        ...List.generate(5, (index) => Icon(
                          Icons.star,
                          size: 12,
                          color: index < review['rating'] ? Colors.amber.shade600 : Colors.grey.shade300,
                        )),
                        const SizedBox(width: 8),
                        Text(
                          review['date'],
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
            review['comment'],
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFAQTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: _getFAQs().map((faq) => ExpansionTile(
        title: Text(
          faq['question'],
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              faq['answer'],
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
                'Ab €${widget.service['price'] ?? 49}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF14ad9f),
                ),
              ),
              Text(
                'Grundpreis',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
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
                'Anbieter kontaktieren',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
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

  List<Map<String, dynamic>> _getReviews() {
    return [
      {
        'customerName': 'Maria Schmidt',
        'rating': 5,
        'date': 'vor 2 Wochen',
        'comment': 'Hervorragende Arbeit! Der Service war genau das, was ich gesucht habe. Sehr professionell und termingerecht geliefert.',
      },
      {
        'customerName': 'Thomas Weber',
        'rating': 5,
        'date': 'vor 1 Monat',
        'comment': 'Perfekte Kommunikation und tolle Ergebnisse. Kann ich nur weiterempfehlen!',
      },
      {
        'customerName': 'Anna Müller',
        'rating': 4,
        'date': 'vor 2 Monaten',
        'comment': 'Sehr zufrieden mit dem Service. Kleine Änderungswünsche wurden schnell umgesetzt.',
      },
    ];
  }

  List<Map<String, dynamic>> _getFAQs() {
    return [
      {
        'question': 'Wie lange dauert die Bearbeitung?',
        'answer': 'Die Bearbeitungszeit hängt vom gewählten Paket ab. Basic-Pakete werden in 3 Tagen geliefert, Premium-Pakete in bis zu 7 Tagen.',
      },
      {
        'question': 'Kann ich Änderungen anfordern?',
        'answer': 'Ja, abhängig vom gewählten Paket sind verschiedene Anzahlen von Revisionen inklusive. Weitere Änderungen können gegen Aufpreis vorgenommen werden.',
      },
      {
        'question': 'In welchen Formaten erhalte ich die Dateien?',
        'answer': 'Sie erhalten die Dateien in den gängigen Formaten (PNG, JPG, PDF). Bei Premium-Paketen sind auch Quelldateien (AI, PSD) enthalten.',
      },
      {
        'question': 'Wie läuft die Kommunikation ab?',
        'answer': 'Die gesamte Kommunikation erfolgt über die Taskilo-Plattform. Sie erhalten regelmäßige Updates zum Fortschritt Ihres Projekts.',
      },
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
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Chat mit Anbieter wird geöffnet...'),
        backgroundColor: Color(0xFF14ad9f),
        duration: Duration(seconds: 2),
      ),
    );
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

class _StickyTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _StickyTabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_StickyTabBarDelegate oldDelegate) {
    return tabBar != oldDelegate.tabBar;
  }
}
