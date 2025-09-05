import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class ServiceInfoCard extends StatefulWidget {
  final Map<String, dynamic> service;
  final double? radius;
  final EdgeInsets? padding;

  const ServiceInfoCard({
    super.key,
    required this.service,
    this.radius = 32, // Vergrößert von 25 auf 32
    this.padding = const EdgeInsets.all(20), // Vergrößert von 16 auf 20
  });

  @override
  State<ServiceInfoCard> createState() => _ServiceInfoCardState();
}

class _ServiceInfoCardState extends State<ServiceInfoCard> {
  double? _hourlyRate;
  String? _selectedSubcategory;

  @override
  void initState() {
    super.initState();
    _loadAdditionalServiceData();
  }

  /// Lädt zusätzliche Service-Daten (Stundensatz und Subkategorie) falls nicht bereits vorhanden
  Future<void> _loadAdditionalServiceData() async {
    try {
      // Prüfe ob Daten bereits in service vorhanden sind
      if (widget.service['hourlyRate'] != null) {
        _hourlyRate = (widget.service['hourlyRate'] as num?)?.toDouble();
      }
      if (widget.service['selectedSubcategory'] != null) {
        _selectedSubcategory = widget.service['selectedSubcategory'];
      }

      // Wenn Daten fehlen, lade sie aus der Datenbank
      if (_hourlyRate == null || _selectedSubcategory == null) {
        await _loadFromDatabase();
      }

      if (mounted) {
        setState(() {});
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Laden der Service-Daten: $e');
    }
  }

  /// Lädt fehlende Daten aus der Firebase-Datenbank
  Future<void> _loadFromDatabase() async {
    final providerId = widget.service['id'] ?? widget.service['providerId'];
    if (providerId == null) return;

    debugPrint('💰 Lade zusätzliche Daten für Provider: $providerId');

    // Versuche zuerst companies Collection
    final companyDoc = await FirebaseFirestore.instance
        .collection('companies')
        .doc(providerId)
        .get();

    if (companyDoc.exists) {
      final companyData = companyDoc.data()!;
      _hourlyRate ??= (companyData['hourlyRate'] as num?)?.toDouble();
      _selectedSubcategory ??= companyData['selectedSubcategory'];
      debugPrint('💰 Daten aus companies geladen: €$_hourlyRate/h, $_selectedSubcategory');
      return;
    }

    // Falls nicht in companies, versuche users Collection
    final userDoc = await FirebaseFirestore.instance
        .collection('users')
        .doc(providerId)
        .get();

    if (userDoc.exists) {
      final userData = userDoc.data()!;
      _hourlyRate ??= (userData['hourlyRate'] as num?)?.toDouble();
      _selectedSubcategory ??= userData['selectedSubcategory'];
      debugPrint('💰 Daten aus users geladen: €$_hourlyRate/h, $_selectedSubcategory');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            Colors.grey.shade50,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            spreadRadius: 0,
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: const Color(0xFF14ad9f).withValues(alpha: 0.05),
            spreadRadius: 0,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
      ),
      padding: widget.padding,
      child: Row(
        children: [
          // Service Avatar mit verbessertem Design - größer und prominenter
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF14ad9f).withValues(alpha: 0.25),
                  spreadRadius: 0,
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  spreadRadius: 0,
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: CircleAvatar(
              radius: widget.radius,
              backgroundColor: const Color(0xFF14ad9f),
              backgroundImage: _hasValidImageUrl()
                  ? NetworkImage(_getImageUrl())
                  : null,
              child: !_hasValidImageUrl()
                  ? Icon(
                      Icons.person_rounded,
                      color: Colors.white,
                      size: (widget.radius ?? 32) * 0.75, // Angepasst für bessere Proportionen
                    )
                  : null,
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Service Info - optimiert für bessere Raumnutzung
          Expanded(
            flex: 3, // Nimmt 3/5 des verfügbaren Platzes
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Provider Name - einzeilig optimiert
                Text(
                  widget.service['displayName'] ?? 
                  widget.service['providerName'] ?? 
                  widget.service['companyName'] ?? 
                  'Service Anbieter',
                  style: const TextStyle(
                    fontSize: 16, // Reduziert von 18 für einzeilige Darstellung
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                    height: 1.2,
                    letterSpacing: 0.2,
                  ),
                  maxLines: 1, // Auf eine Zeile beschränkt
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                
                // Kategorie mit kompakterem Design
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14ad9f).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFF14ad9f).withValues(alpha: 0.25),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    widget.service['category'] ?? 
                    widget.service['title'] ?? 
                    'Service',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF14ad9f),
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
                
                // Subkategorie kompakt
                if (_selectedSubcategory != null || widget.service['selectedSubcategory'] != null) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(
                        Icons.arrow_right_rounded,
                        size: 16,
                        color: Colors.grey[500],
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          _selectedSubcategory ?? widget.service['selectedSubcategory'],
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.1,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          
          const SizedBox(width: 12),
          
          // Rechte Spalte für Preis, Rating und Status
          Expanded(
            flex: 2, // Nimmt 2/5 des verfügbaren Platzes
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Hourly Rate prominent anzeigen - responsiv optimiert
                if (_hourlyRate != null || widget.service['hourlyRate'] != null) ...[
                  Container(
                    width: double.infinity, // Nutzt verfügbare Breite
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6), // Reduziert
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.green.shade50, Colors.green.shade100],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10), // Reduziert von 12
                      border: Border.all(
                        color: Colors.green.shade300,
                        width: 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.green.withValues(alpha: 0.1),
                          spreadRadius: 0,
                          blurRadius: 3,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.euro_rounded,
                              color: Colors.green.shade700,
                              size: 16, // Reduziert von 20
                            ),
                            const SizedBox(width: 2), // Reduziert von 4
                            Flexible(
                              child: Text(
                                '${_hourlyRate ?? widget.service['hourlyRate']}',
                                style: TextStyle(
                                  fontSize: 16, // Reduziert von 18
                                  color: Colors.green.shade700,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.2,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'pro Stunde',
                          style: TextStyle(
                            fontSize: 10, // Reduziert von 11
                            color: Colors.green.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6), // Reduziert von 8
                ],
                
                // Rating kompakt anzeigen - optimiert für kleine Breiten
                if (widget.service['rating'] != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3), // Reduziert
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(6), // Reduziert von 8
                      border: Border.all(
                        color: Colors.amber.shade200,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.star_rounded,
                          color: Colors.amber.shade700,
                          size: 14, // Reduziert von 16
                        ),
                        const SizedBox(width: 2), // Reduziert von 3
                        Flexible(
                          child: Text(
                            '${widget.service['rating']}',
                            style: TextStyle(
                              fontSize: 12, // Reduziert von 13
                              color: Colors.amber.shade700,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Flexible(
                          child: Text(
                            ' (${widget.service['reviewCount'] ?? 0})',
                            style: TextStyle(
                              fontSize: 9, // Reduziert von 10
                              color: Colors.grey[600],
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6), // Reduziert von 8
                ],
                
                // Verfügbarkeits-Indikator - kompakt
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2), // Reduziert
                  decoration: BoxDecoration(
                    color: Colors.green.shade100,
                    borderRadius: BorderRadius.circular(4), // Reduziert von 6
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 4, // Reduziert von 6
                        height: 4, // Reduziert von 6
                        decoration: BoxDecoration(
                          color: Colors.green.shade600,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 3), // Reduziert von 4
                      Flexible(
                        child: Text(
                          'Verfügbar',
                          style: TextStyle(
                            fontSize: 9, // Reduziert von 10
                            color: Colors.green.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
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
    );
  }

  // Helper Methods für sichere Bildanzeige
  bool _hasValidImageUrl() {
    final imageUrl = _getImageUrl();
    return imageUrl.isNotEmpty && 
           !imageUrl.startsWith('blob:') && 
           (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
  }

  String _getImageUrl() {
    // Priorität: photoURL > profilePictureURL > logoURL > image
    final photoUrl = widget.service['photoURL']?.toString() ?? '';
    if (photoUrl.isNotEmpty && !photoUrl.startsWith('blob:')) {
      return photoUrl;
    }
    
    final profilePicture = widget.service['profilePictureURL']?.toString() ?? '';
    if (profilePicture.isNotEmpty && !profilePicture.startsWith('blob:')) {
      return profilePicture;
    }
    
    final logoUrl = widget.service['logoURL']?.toString() ?? '';
    if (logoUrl.isNotEmpty && !logoUrl.startsWith('blob:')) {
      return logoUrl;
    }
    
    final image = widget.service['image']?.toString() ?? '';
    if (image.isNotEmpty && !image.startsWith('blob:')) {
      return image;
    }
    
    return '';
  }
}
