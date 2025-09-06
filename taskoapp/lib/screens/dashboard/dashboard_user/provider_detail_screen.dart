import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../dashboard_layout.dart';
import '../../../utils/colors.dart';
import '../../../services/portfolio_service.dart';
import '../../../components/portfolio_slide_panel.dart';

class ProviderDetailScreen extends StatefulWidget {
  final Map<String, dynamic> providerData;

  const ProviderDetailScreen({
    super.key,
    required this.providerData,
  });

  @override
  State<ProviderDetailScreen> createState() => _ProviderDetailScreenState();
}

class _ProviderDetailScreenState extends State<ProviderDetailScreen> 
    with TickerProviderStateMixin {
  Map<String, dynamic>? _fullProviderData;
  bool _isLoading = true;
  bool _isFavorite = false;
  late TabController _tabController;
  
  // Portfolio-Daten
  List<Map<String, dynamic>> _portfolio = [];
  bool _isLoadingPortfolio = true;
  
  // Slide Panel für Portfolio
  Map<String, dynamic>? _selectedPortfolioItem;
  bool _showPortfolioPanel = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadFullProviderData();
    final userId = widget.providerData['id'] ?? widget.providerData['userId'];
    debugPrint('🔍 INIT DEBUG - Provider Data: ${widget.providerData}');
    debugPrint('🔍 INIT DEBUG - Extracted userId: $userId');
    if (userId != null) {
      debugPrint('🔍 INIT DEBUG - Starting portfolio load for userId: $userId');
      _loadPortfolio(userId);
    } else {
      debugPrint('❌ INIT DEBUG - No userId found in provider data!');
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFullProviderData() async {
    try {
      final userId = widget.providerData['id'] ?? widget.providerData['userId'];
      debugPrint('🔍 FULL DATA DEBUG - Loading full data for userId: $userId');
      if (userId != null) {
        final doc = await FirebaseFirestore.instance
            .collection('companies')
            .doc(userId)
            .get();
        
        debugPrint('🔍 FULL DATA DEBUG - Document exists: ${doc.exists}');
        if (doc.exists) {
          debugPrint('🔍 FULL DATA DEBUG - Document data: ${doc.data()}');
          setState(() {
            _fullProviderData = doc.data();
            _isLoading = false;
          });
          // Portfolio nach dem Laden der vollständigen Daten neu laden
          debugPrint('🔍 FULL DATA DEBUG - Reloading portfolio after full data load');
          _loadPortfolio(userId);
        } else {
          debugPrint('❌ FULL DATA DEBUG - Document does not exist');
          setState(() {
            _fullProviderData = widget.providerData;
            _isLoading = false;
          });
        }
      } else {
        debugPrint('❌ FULL DATA DEBUG - No userId provided');
        setState(() {
          _fullProviderData = widget.providerData;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ FULL DATA DEBUG - Error loading provider data: $e');
      setState(() {
        _fullProviderData = widget.providerData;
        _isLoading = false;
      });
    }
  }

  /// Lädt Portfolio-Daten (genau wie service_details_screen)
  Future<void> _loadPortfolio(String providerId) async {
    try {
      debugPrint('🔍 PORTFOLIO DEBUG - Start loading for providerId: $providerId');
      setState(() => _isLoadingPortfolio = true);
      
      debugPrint('🔍 PORTFOLIO DEBUG - Calling PortfolioService.getProviderPortfolio...');
      final portfolio = await PortfolioService.getProviderPortfolio(providerId);
      
      debugPrint('🔍 PORTFOLIO DEBUG - Portfolio received: $portfolio');
      debugPrint('🔍 PORTFOLIO DEBUG - Portfolio type: ${portfolio.runtimeType}');
      debugPrint('🔍 PORTFOLIO DEBUG - Portfolio length: ${portfolio.length}');
      
      if (portfolio.isNotEmpty) {
        debugPrint('🔍 PORTFOLIO DEBUG - Portfolio items found:');
        for (int i = 0; i < portfolio.length; i++) {
          debugPrint('🔍 PORTFOLIO DEBUG - Item $i: ${portfolio[i]}');
        }
      } else {
        debugPrint('🔍 PORTFOLIO DEBUG - Portfolio is empty');
      }
      
      if (mounted) {
        setState(() {
          _portfolio = portfolio;
          _isLoadingPortfolio = false;
        });
        debugPrint('🔍 PORTFOLIO DEBUG - State updated successfully');
      } else {
        debugPrint('🔍 PORTFOLIO DEBUG - Widget not mounted, skipping state update');
      }
      
    } catch (e) {
      debugPrint('❌ PORTFOLIO DEBUG - Error loading portfolio: $e');
      debugPrint('❌ PORTFOLIO DEBUG - Error stackTrace: ${e.toString()}');
      if (mounted) {
        setState(() => _isLoadingPortfolio = false);
      }
    }
  }

  /// Zeigt Portfolio-Details im Slide Panel
  void _showPortfolioDetail(Map<String, dynamic> item) {
    debugPrint('🎯 PROVIDER SLIDE PANEL - Öffne Portfolio Detail: ${item['title']}');
    setState(() {
      _selectedPortfolioItem = item;
      _showPortfolioPanel = true;
    });
  }

  void _hidePortfolioDetail() {
    setState(() {
      _showPortfolioPanel = false;
      _selectedPortfolioItem = null;
    });
  }

  // Hilfsmethoden für Provider-Daten
  String _getProviderName() {
    final data = _fullProviderData ?? widget.providerData;
    return data['companyName'] ?? 'Unbekannter Anbieter';
  }

  String _getProviderCategory() {
    final data = _fullProviderData ?? widget.providerData;
    return data['selectedSubcategory'] ?? data['selectedCategory'] ?? 'Service';
  }

  String _getProviderLocation() {
    final data = _fullProviderData ?? widget.providerData;
    return data['location'] ?? 'Standort nicht verfügbar';
  }

  String _getProviderPrice() {
    final data = _fullProviderData ?? widget.providerData;
    return (data['hourlyRate'] ?? 0).toString();
  }

  String _getProviderProfileImage() {
    final data = _fullProviderData ?? widget.providerData;
    return data['profilePictureURL'] ?? 
           data['profilePictureFirebaseUrl'] ?? 
           data['step3']?['profilePictureURL'] ??
           data['profileBannerImage'] ?? 
           '';
  }

  bool _hasValidImageUrl(String? url) {
    if (url == null || url.isEmpty) return false;
    if (url.startsWith('blob:')) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  bool _hasValidProviderProfileImage() {
    final imageUrl = _getProviderProfileImage();
    return _hasValidImageUrl(imageUrl);
  }

  String _getProviderInitials() {
    final name = _getProviderName();
    if (name.isEmpty || name == 'Unbekannter Anbieter') return 'U';
    
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }

  Widget _buildBadgeRow(String label, dynamic listData) {
    if (listData == null) return const SizedBox.shrink();
    
    List<String> items = [];
    if (listData is List) {
      for (var item in listData) {
        if (item is Map<String, dynamic>) {
          // Für strukturierte Sprach-Daten
          if (label == 'Sprachen' && item.containsKey('language')) {
            final language = item['language']?.toString() ?? '';
            final proficiency = item['proficiency']?.toString() ?? '';
            if (language.isNotEmpty) {
              items.add(proficiency.isNotEmpty ? '$language ($proficiency)' : language);
            }
          }
          // Für andere strukturierte Daten - nur den Wert nehmen
          else if (item.containsKey('name')) {
            items.add(item['name'].toString());
          } else if (item.containsKey('value')) {
            items.add(item['value'].toString());
          } else {
            // Fallback: alle Werte der Map zusammenfügen
            items.add(item.values.join(' - '));
          }
        } else {
          // Einfache String-Werte
          items.add(item.toString());
        }
      }
    } else if (listData is String) {
      items = [listData];
    }
    
    if (items.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: items.map((item) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: Text(
                item,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withValues(alpha: 0.9),
                  fontWeight: FontWeight.w500,
                ),
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }

  void _toggleFavorite() {
    setState(() {
      _isFavorite = !_isFavorite;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_isFavorite ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _shareProvider() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Share-Funktion wird noch implementiert'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Widget _buildProviderHeader() {
    return DashboardCard(
      margin: const EdgeInsets.all(16),
      isGlassEffect: true,
      child: Column(
        children: [
          // Provider Image & Basic Info
          Row(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.2),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: CircleAvatar(
                  radius: 38,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  backgroundImage: _hasValidProviderProfileImage()
                      ? NetworkImage(_getProviderProfileImage())
                      : null,
                  child: !_hasValidProviderProfileImage()
                      ? Text(
                          _getProviderInitials(),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getProviderName(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getProviderCategory(),
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 16,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            _getProviderLocation(),
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (_getProviderPrice() != '0')
                      Text(
                        'ab ${_getProviderPrice()}€/h',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return DashboardLayout(
        title: 'Anbieter Details',
        showBackButton: true,
        useGradientBackground: true,
        showBottomNavigation: false,
        body: const Center(
          child: CircularProgressIndicator(
            color: Color(0xFF14ad9f),
          ),
        ),
      );
    }

    return Stack(
      children: [
        DashboardLayout(
          title: _getProviderName(),
          showBackButton: true,
          useGradientBackground: true,
          showBottomNavigation: false,
          tabs: const [
            Tab(text: 'Übersicht'),
            Tab(text: 'Bewertungen'),
            Tab(text: 'FAQ'),
          ],
          tabController: _tabController,
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
              onPressed: _shareProvider,
            ),
          ],
          body: Column(
            children: [
              // Provider Header Card
              _buildProviderHeader(),
              
              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildReviewsTab(),
                    _buildFAQTab(),
                  ],
                ),
              ),
              
              // Bottom Action Bar
              _buildBottomBar(),
            ],
          ),
        ),
        
        // Portfolio Slide Panel über alles
        PortfolioSlidePanel(
          portfolioItem: _selectedPortfolioItem,
          isVisible: _showPortfolioPanel,
          onClose: _hidePortfolioDetail,
        ),
      ],
    );
  }

  Widget _buildOverviewTab() {
    final data = _fullProviderData ?? widget.providerData;
    
    return DashboardList(
      children: [
        // Beschreibung
        if (data['description'] != null && data['description'].toString().isNotEmpty)
          DashboardCard(
            isGlassEffect: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Beschreibung',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  data['description'].toString(),
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),

        // Details
        DashboardCard(
          isGlassEffect: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Details',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),
              _buildDetailRow('Kategorie', data['selectedCategory'] ?? 'Nicht verfügbar'),
              if (data['selectedSubcategory'] != null)
                _buildDetailRow('Unterkategorie', data['selectedSubcategory']),
              if (data['hourlyRate'] != null && data['hourlyRate'] != 0)
                _buildDetailRow('Stundensatz', '${data['hourlyRate']}€/h'),
              if (data['phone'] != null)
                _buildDetailRow('Telefon', data['phone']),
              if (data['languages'] != null && data['languages'].isNotEmpty)
                _buildBadgeRow('Sprachen', data['languages']),
              if (data['skills'] != null && data['skills'].isNotEmpty)
                _buildBadgeRow('Skills', data['skills']),
            ],
          ),
        ),

        // Portfolio Vorschau
        _buildPortfolioPreview(),
      ],
    );
  }

  Widget _buildReviewsTab() {
    return DashboardList(
      children: [
        DashboardCard(
          isGlassEffect: true,
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.star_border,
                size: 64,
                color: Colors.white,
              ),
              SizedBox(height: 16),
              Text(
                'Noch keine Bewertungen vorhanden',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Seien Sie der Erste, der diesen Anbieter bewertet.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFAQTab() {
    final data = _fullProviderData ?? widget.providerData;
    final faqs = data['faqs'] as List<dynamic>?;

    if (faqs == null || faqs.isEmpty) {
      return DashboardList(
        children: [
          DashboardCard(
            isGlassEffect: true,
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.help_outline,
                  size: 64,
                  color: Colors.white,
                ),
                SizedBox(height: 16),
                Text(
                  'Keine FAQs verfügbar',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Dieser Anbieter hat noch keine häufig gestellten Fragen hinzugefügt.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      );
    }

    return DashboardList(
      children: faqs.map<Widget>((faq) {
        if (faq is Map<String, dynamic>) {
          final question = faq['question']?.toString() ?? 'Keine Frage';
          final answer = faq['answer']?.toString() ?? 'Keine Antwort';
          
          return DashboardCard(
            isGlassEffect: true,
            child: ExpansionTile(
              title: Text(
                question,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              iconColor: Colors.white,
              collapsedIconColor: Colors.white,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(
                    answer,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.9),
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          );
        }
        return const SizedBox.shrink();
      }).toList(),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.8),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Chat-Funktion wird noch implementiert'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                  ),
                ),
                child: const Text(
                  'Chat',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Buchung-Funktion wird noch implementiert'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF14ad9f),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Buchen',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Portfolio Vorschau Widget für Overview Tab
  Widget _buildPortfolioPreview() {
    return DashboardCard(
      isGlassEffect: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Portfolio',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              if (_portfolio.isNotEmpty)
                Text(
                  '${_portfolio.length} Projekte',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          
          if (_isLoadingPortfolio)
            const Center(
              child: CircularProgressIndicator(
                color: Colors.white,
              ),
            )
          else if (_portfolio.isEmpty)
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.photo_library_outlined,
                    size: 48,
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Noch kein Portfolio verfügbar',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              height: 200,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _portfolio.length,
                itemBuilder: (context, index) {
                  final item = _portfolio[index];
                  return Container(
                    margin: const EdgeInsets.only(right: 12),
                    child: _buildPortfolioCard(item),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  /// Portfolio Card Widget
  Widget _buildPortfolioCard(Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () => _showPortfolioDetail(item),
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Portfolio Bild
            Expanded(
              flex: 3,
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                  child: item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty
                      ? Image.network(
                          item['imageUrl'],
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: Colors.white.withValues(alpha: 0.1),
                            child: Icon(
                              Icons.image,
                              color: Colors.white.withValues(alpha: 0.6),
                              size: 32,
                            ),
                          ),
                        )
                      : Container(
                          color: Colors.white.withValues(alpha: 0.1),
                          child: Icon(
                            Icons.image,
                            color: Colors.white.withValues(alpha: 0.6),
                            size: 32,
                          ),
                        ),
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
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (item['description'] != null && item['description'].toString().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item['description'],
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
