import 'package:flutter/material.dart';
import '../../../services/portfolio_service.dart';

class ProviderPortfolioTab extends StatefulWidget {
  final String providerId;

  const ProviderPortfolioTab({
    super.key,
    required this.providerId,
  });

  @override
  State<ProviderPortfolioTab> createState() => _ProviderPortfolioTabState();
}

class _ProviderPortfolioTabState extends State<ProviderPortfolioTab> {
  List<Map<String, dynamic>> _portfolio = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPortfolio();
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

    return RefreshIndicator(
      onRefresh: _loadPortfolio,
      color: const Color(0xFF14ad9f),
      child: GridView.builder(
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
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header mit Bild-Gallerie
              if (item['imageUrl'] != null || (item['images'] as List?)?.isNotEmpty == true)
                Container(
                  height: 200,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                  ),
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: _buildDetailImage(item),
                  ),
                ),
              
              // Content
              Flexible(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Titel
                      Text(
                        item['title'] ?? 'Portfolio Projekt',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      
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
                                  fontSize: 12,
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
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Beschreibung
                      if (item['description'] != null && item['description'].toString().isNotEmpty) ...[
                        Text(
                          'Beschreibung',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item['description'].toString(),
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      
                      // Zusätzliche Details
                      if (item['clientName'] != null && item['clientName'].toString().isNotEmpty) ...[
                        _buildDetailRow('Kunde', item['clientName'].toString()),
                        const SizedBox(height: 8),
                      ],
                      
                      if (item['projectDuration'] != null && item['projectDuration'].toString().isNotEmpty) ...[
                        _buildDetailRow('Dauer', item['projectDuration'].toString()),
                        const SizedBox(height: 8),
                      ],
                      
                      // Tags
                      if (item['tags'] != null && (item['tags'] as List).isNotEmpty) ...[
                        const Text(
                          'Tags',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: (item['tags'] as List).map<Widget>((tag) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                tag.toString(),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              
              // Schließen Button
              Padding(
                padding: const EdgeInsets.all(20),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14ad9f),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('Schließen'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailImage(Map<String, dynamic> item) {
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
    
    if (availableImages.isEmpty) {
      return _buildPlaceholderImage();
    }
    
    final firstImage = availableImages.first;
    
    // Wenn nur ein Bild vorhanden ist
    if (availableImages.length == 1) {
      return Image.network(
        firstImage,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) {
          debugPrint('Fehler beim Laden des Detail-Bildes: $error');
          return _buildPlaceholderImage();
        },
      );
    }
    
    // Wenn mehrere Bilder vorhanden sind, zeige das erste mit Indikator
    return Stack(
      children: [
        Image.network(
          firstImage,
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
          errorBuilder: (context, error, stackTrace) {
            debugPrint('Fehler beim Laden des Detail-Bildes: $error');
            return _buildPlaceholderImage();
          },
        ),
        
        // Mehrere Bilder Indikator
        Positioned(
          top: 12,
          right: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.photo_library,
                  size: 14,
                  color: Colors.white,
                ),
                const SizedBox(width: 4),
                Text(
                  '${availableImages.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
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
          width: 60,
          child: Text(
            '$label:',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
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
