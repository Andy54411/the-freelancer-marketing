import 'package:flutter/material.dart';
import '../../../services/portfolio_service.dart';

class ProviderPortfolioTab extends StatefulWidget {
  final String providerId;
  final Function(Map<String, dynamic>)? onPortfolioItemTap;

  const ProviderPortfolioTab({
    super.key,
    required this.providerId,
    this.onPortfolioItemTap,
  });

  @override
  State<ProviderPortfolioTab> createState() => _ProviderPortfolioTabState();
}

class _ProviderPortfolioTabState extends State<ProviderPortfolioTab> with TickerProviderStateMixin {
  List<Map<String, dynamic>> _portfolio = [];
  bool _isLoading = true;
  String? _error;
  bool _showSlidePanel = false;
  Map<String, dynamic>? _selectedPortfolioItem;
  AnimationController? _slideController;
  Animation<Offset>? _slideAnimation;

  @override
  void initState() {
    super.initState();
    
    // Nur lokales Slide Panel initialisieren, wenn KEIN Callback vorhanden ist
    if (widget.onPortfolioItemTap == null) {
      _slideController = AnimationController(
        duration: const Duration(milliseconds: 300),
        vsync: this,
      );
      _slideAnimation = Tween<Offset>(
        begin: const Offset(-1.0, 0.0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: _slideController!,
        curve: Curves.easeInOut,
      ));
    }
    
    _loadPortfolio();
  }

  @override
  void dispose() {
    _slideController?.dispose();
    super.dispose();
  }

  Future<void> _loadPortfolio() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      debugPrint('🎨 Lade Portfolio für Provider: ${widget.providerId}');
      final portfolio = await PortfolioService.getProviderPortfolio(widget.providerId);
      debugPrint('📸 Portfolio geladen: ${portfolio.length} Items');
      
      // Debug: Zeige Details der Portfolio-Items
      for (int i = 0; i < portfolio.length; i++) {
        final item = portfolio[i];
        debugPrint('📁 Portfolio Item $i:');
        debugPrint('  - Titel: ${item['title']}');
        
        final imageUrl = item['imageUrl']?.toString();
        if (imageUrl != null && imageUrl.isNotEmpty) {
          final truncated = imageUrl.length > 100 ? '${imageUrl.substring(0, 100)}...' : imageUrl;
          debugPrint('  - imageUrl: $truncated');
          debugPrint('  - imageUrl ist URL: ${imageUrl.startsWith('http')}');
          debugPrint('  - imageUrl ist Base64: ${imageUrl.startsWith('data:image/')}');
        } else {
          debugPrint('  - imageUrl: null oder leer');
        }
        
        debugPrint('  - images: ${item['images']}');
        debugPrint('  - Anzahl Bilder: ${item['images']?.length ?? 0}');
      }
      
      if (mounted) {
        setState(() {
          _portfolio = portfolio;
          _isLoading = false;
        });
        debugPrint('✅ Portfolio State aktualisiert mit ${portfolio.length} Items');
      }
    } catch (e, stackTrace) {
      debugPrint('❌ Fehler beim Laden des Portfolios: $e');
      debugPrint('Stack trace: $stackTrace');
      if (mounted) {
        setState(() {
          _error = 'Fehler beim Laden des Portfolios. Bitte versuchen Sie es später erneut.';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
        ),
      );
    }

    if (_error != null) {
      return Center(
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
              _error!,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadPortfolio,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF14ad9f),
                foregroundColor: Colors.white,
              ),
              child: const Text('Erneut versuchen'),
            ),
          ],
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
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Dieser Anbieter hat noch keine Portfolio-Projekte hochgeladen.',
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

    return Stack(
      children: [
        // Haupt-Portfolio Grid
        RefreshIndicator(
          onRefresh: _loadPortfolio,
          color: const Color(0xFF14ad9f),
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 0.75,
            ),
            itemCount: _portfolio.length,
            itemBuilder: (context, index) {
              final item = _portfolio[index];
              return _buildPortfolioCard(item);
            },
          ),
        ),

        // Dunkler Overlay zum Schließen (MUSS UNTER dem Panel sein) - NUR wenn kein Callback vorhanden
        if (_showSlidePanel && widget.onPortfolioItemTap == null)
          GestureDetector(
            onTap: _hidePortfolioDetail,
            child: Container(
              width: double.infinity,
              height: double.infinity,
              color: Colors.black.withValues(alpha: 0.5),
            ),
          ),

        // Slide-In Panel (MUSS ÜBER dem Overlay sein) - NUR wenn kein Callback vorhanden
        if (_showSlidePanel && _selectedPortfolioItem != null && widget.onPortfolioItemTap == null && _slideAnimation != null)
          SlideTransition(
            position: _slideAnimation!,
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
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                  color: Colors.grey.shade100,
                ),
                child: _buildPortfolioImage(item),
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
                    // Titel
                    Text(
                      item['title'] ?? 'Portfolio Projekt',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    
                    // Kategorie
                    if (item['category'] != null && item['category'].toString().isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          item['category'].toString(),
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF14ad9f),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    
                    const Spacer(),
                    
                    // Abschlussdatum
                    if (item['completedAt'] != null && item['completedAt'].toString().isNotEmpty)
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 12,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item['completedAt'].toString(),
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey.shade600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
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

  Widget _buildPortfolioImage(Map<String, dynamic> item) {
    final imageUrl = item['imageUrl']?.toString();
    final images = item['images'] as List<dynamic>?;
    
    // Sammle alle verfügbaren URL-Bilder (keine Base64)
    List<String> availableImages = [];
    
    // Füge imageUrl hinzu wenn es eine gültige URL ist
    if (imageUrl != null && imageUrl.isNotEmpty && imageUrl != 'null' && imageUrl.startsWith('http')) {
      availableImages.add(imageUrl);
    }
    
    // Füge images Array hinzu wenn vorhanden (nur URLs)
    if (images != null && images.isNotEmpty) {
      for (final img in images) {
        final imgStr = img?.toString();
        if (imgStr != null && imgStr.isNotEmpty && imgStr != 'null' && imgStr.startsWith('http') && !availableImages.contains(imgStr)) {
          availableImages.add(imgStr);
        }
      }
    }
    
    // Verwende das erste gültige URL-Bild
    if (availableImages.isNotEmpty) {
      return ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        child: Image.network(
          availableImages.first,
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              width: double.infinity,
              height: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
                ),
              ),
            );
          },
          errorBuilder: (context, error, stackTrace) {
            debugPrint('Fehler beim Laden des Bildes: $error');
            debugPrint('Bild-URL: ${availableImages.first}');
            
            // Versuche das nächste Bild wenn verfügbar
            if (availableImages.length > 1) {
              return ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: Image.network(
                  availableImages[1],
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (context, error, stackTrace) {
                    debugPrint('Fehler beim Laden des zweiten Bildes: $error');
                    return _buildPlaceholderImage();
                  },
                ),
              );
            }
            
            return _buildPlaceholderImage();
          },
        ),
      );
    }

    return _buildPlaceholderImage();
  }

  Widget _buildPlaceholderImage() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
      ),
      child: Icon(
        Icons.image,
        size: 48,
        color: Colors.grey.shade400,
      ),
    );
  }

  void _showPortfolioDetail(Map<String, dynamic> item) {
    debugPrint('🎯 PROVIDER PORTFOLIO TAB - Portfolio Item geklickt');
    
    // Wenn ein Callback verfügbar ist, nutze ihn (für parent screen slide panel)
    if (widget.onPortfolioItemTap != null) {
      debugPrint('📲 CALLBACK VERFÜGBAR - Weitergabe an parent screen');
      widget.onPortfolioItemTap!(item);
    } else {
      // Fallback: Zeige lokales Slide Panel
      debugPrint('📱 LOKALES SLIDE PANEL - Zeige in Tab');
      setState(() {
        _selectedPortfolioItem = item;
        _showSlidePanel = true;
      });
      _slideController?.forward();
    }
  }

  void _hidePortfolioDetail() {
    _slideController?.reverse().then((_) {
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
                // Header mit Bild-Gallerie
                if (item['imageUrl'] != null || (item['images'] as List?)?.isNotEmpty == true)
                  Container(
                    height: 250,
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: _buildDetailImage(),
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
                    if (item['category'] != null && item['category'].toString().isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          item['category'].toString(),
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF14ad9f),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const Spacer(),
                    ],
                    if (item['completedAt'] != null && item['completedAt'].toString().isNotEmpty)
                      Text(
                        item['completedAt'].toString(),
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // Beschreibung
                if (item['description'] != null && item['description'].toString().isNotEmpty) ...[
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
                    item['description'].toString(),
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Zusätzliche Bilder wenn vorhanden
                if (item['images'] is List && (item['images'] as List).length > 1) ...[
                  const Text(
                    'Weitere Bilder',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1,
                    ),
                    itemCount: (item['images'] as List).length,
                    itemBuilder: (context, index) {
                      final imageUrl = (item['images'] as List)[index];
                      return Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.grey.shade300,
                            width: 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            imageUrl.toString(),
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: Colors.grey.shade200,
                                child: const Center(
                                  child: Icon(
                                    Icons.image_not_supported,
                                    color: Colors.grey,
                                    size: 32,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailImage() {
    if (_selectedPortfolioItem == null) return Container();
    
    final item = _selectedPortfolioItem!;
    
    // Haupt-Bild aus imageUrl oder erstes Bild aus images Array
    String? imageUrl;
    
    if (item['imageUrl'] != null && item['imageUrl'].toString().isNotEmpty) {
      imageUrl = item['imageUrl'].toString();
    } else if (item['images'] is List && (item['images'] as List).isNotEmpty) {
      imageUrl = (item['images'] as List).first.toString();
    }

    if (imageUrl == null || imageUrl.isEmpty) {
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
                'Kein Bild verfügbar',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
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
    );
  }
}
