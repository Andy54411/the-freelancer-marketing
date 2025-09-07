import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Zeit-Erfassungswidget für Aufträge
/// Entspricht der Web-TimeTrackingManager Komponente
class TimeTrackingWidget extends StatefulWidget {
  final String orderId;
  final String customerName;
  final double originalPlannedHours;
  final double hourlyRate;
  final VoidCallback? onTimeSubmitted;

  const TimeTrackingWidget({
    super.key,
    required this.orderId,
    required this.customerName,
    required this.originalPlannedHours,
    required this.hourlyRate,
    this.onTimeSubmitted,
  });

  @override
  State<TimeTrackingWidget> createState() => _TimeTrackingWidgetState();
}

class _TimeTrackingWidgetState extends State<TimeTrackingWidget> {
  List<Map<String, dynamic>> timeEntries = [];
  bool loading = true;
  bool showAddForm = false;
  Map<String, dynamic>? editingEntry;
  bool showAllEntries = false;
  String providerName = 'Lädt...';

  // Form data
  DateTime selectedDate = DateTime.now();
  TimeOfDay startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay endTime = const TimeOfDay(hour: 17, minute: 0);
  double hours = 8.0;
  String description = '';
  String notes = '';
  bool travelTime = false;
  double travelCost = 0.0;
  bool isBreakTime = false;
  int breakMinutes = 0;

  @override
  void initState() {
    super.initState();
    _loadProviderData();
    _loadTimeTracking();
  }

  Future<void> _loadProviderData() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // Versuche zuerst companies collection
      final companyDoc = await FirebaseFirestore.instance
          .collection('companies')
          .doc(user.uid)
          .get();

      if (companyDoc.exists) {
        final companyData = companyDoc.data()!;
        setState(() {
          providerName = companyData['companyName'] ?? 
                       companyData['name'] ?? 
                       'Unbekannter Anbieter';
        });
        return;
      }

      // Fallback: users collection
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();

      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final firstName = userData['firstName'] ?? '';
        final lastName = userData['lastName'] ?? '';
        setState(() {
          providerName = '$firstName $lastName'.trim().isEmpty 
              ? 'Unbekannter Benutzer' 
              : '$firstName $lastName'.trim();
        });
        return;
      }

      setState(() {
        providerName = 'Unbekannter Nutzer';
      });
    } catch (error) {
      debugPrint('Fehler beim Laden der Provider-Daten: $error');
      setState(() {
        providerName = 'Fehler beim Laden';
      });
    }
  }

  Future<void> _loadTimeTracking() async {
    try {
      setState(() {
        loading = true;
      });

      debugPrint('🔄 Lade Zeiterfassung für Auftrag: ${widget.orderId}');

      final orderDoc = await FirebaseFirestore.instance
          .collection('auftraege')
          .doc(widget.orderId)
          .get();

      if (orderDoc.exists) {
        final orderData = orderDoc.data()!;
        debugPrint('📋 Auftragsdaten geladen: $orderData');
        
        final List<Map<String, dynamic>> entries = [];

        if (orderData['timeTracking']?['timeEntries'] != null) {
          final timeTrackingEntries = orderData['timeTracking']['timeEntries'] as List;
          debugPrint('⏰ TimeTracking-Einträge gefunden: ${timeTrackingEntries.length}');

          for (int index = 0; index < timeTrackingEntries.length; index++) {
            final entry = timeTrackingEntries[index];
            debugPrint('📝 Verarbeite Eintrag $index: $entry');

            // Status mapping
            String mappedStatus = 'logged';
            if (entry['status'] == 'paid' ||
                entry['status'] == 'platform_released' ||
                entry['status'] == 'transferred' ||
                entry['platformHoldStatus'] == 'transferred' ||
                entry['paymentStatus'] == 'paid' ||
                entry['paymentStatus'] == 'transferred') {
              mappedStatus = 'paid';
            } else if (entry['status'] == 'customer_approved' || 
                       entry['status'] == 'approved') {
              mappedStatus = 'approved';
            } else if (entry['status'] == 'customer_rejected' || 
                       entry['status'] == 'rejected') {
              mappedStatus = 'rejected';
            } else if (entry['status'] == 'submitted' || 
                       entry['status'] == 'pending_approval') {
              mappedStatus = 'submitted';
            }

            debugPrint('✅ Status gemappt: ${entry['status']} → $mappedStatus');

            entries.add({
              'id': entry['id'] ?? 'entry-$index',
              'date': entry['date'] ?? '',
              'startTime': entry['startTime'] ?? '',
              'endTime': entry['endTime'] ?? '',
              'hours': (entry['hours'] ?? 0).toDouble(),
              'description': entry['description'] ?? '',
              'category': entry['category'] ?? 'original',
              'status': mappedStatus,
              'billableAmount': (entry['billableAmount'] ?? 0).toDouble(),
              'travelCost': (entry['travelCost'] ?? 0).toDouble(),
              'travelTime': entry['travelTime'] ?? false,
              'notes': entry['notes'] ?? '',
            });
          }
        } else {
          debugPrint('⚠️ Keine TimeTracking-Einträge im Auftrag gefunden');
        }

        debugPrint('✅ ${entries.length} Zeiteinträge geladen: $entries');
        setState(() {
          timeEntries = entries;
        });
      } else {
        debugPrint('❌ Auftrag nicht gefunden: ${widget.orderId}');
      }
    } catch (error) {
      debugPrint('❌ Fehler beim Laden der Zeiterfassung: $error');
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  void _calculateHours() {
    final start = DateTime(2000, 1, 1, startTime.hour, startTime.minute);
    final end = DateTime(2000, 1, 1, endTime.hour, endTime.minute);
    final difference = end.difference(start);
    double calculatedHours = difference.inMinutes / 60.0;

    // Pausenzeit abziehen
    if (isBreakTime && breakMinutes > 0) {
      calculatedHours = (calculatedHours - (breakMinutes / 60.0)).clamp(0.0, 24.0);
    }

    setState(() {
      hours = calculatedHours.clamp(0.0, 24.0);
    });
  }

  /// Bestimmt automatisch die Kategorie basierend auf B2B/B2C Geschäftsmodell
  Future<String> _determineTimeCategory() async {
    try {
      // Lade Auftragsdaten um B2B vs B2C zu bestimmen
      final orderDoc = await FirebaseFirestore.instance
          .collection('auftraege')
          .doc(widget.orderId)
          .get();

      if (!orderDoc.exists) {
        debugPrint('❌ Auftrag nicht gefunden für Kategorie-Bestimmung');
        return 'original'; // Fallback
      }

      final orderData = orderDoc.data()!;
      debugPrint('📊 Analysiere Auftrag für B2B/B2C: $orderData');

      // 1. B2B INDICATORS - Geschäftskunden
      final bool isB2B = await _isB2BOrder(orderData);
      
      // 2. CURRENT LOGGED TIME vs PLANNED TIME
      final double totalLoggedHours = await _getTotalLoggedHours();
      final double plannedHours = widget.originalPlannedHours;

      debugPrint('⏱️ Geplant: ${plannedHours}h, Geloggt: ${totalLoggedHours}h');

      if (isB2B) {
        // B2B: Flexible Stundenabrechnung - alle Stunden über Planstunden sind "additional"
        if (totalLoggedHours >= plannedHours) {
          debugPrint('🏢 B2B: Zusätzliche Stunden - benötigt Kundenfreigabe');
          return 'additional';
        } else {
          debugPrint('🏢 B2B: Original geplante Stunden');
          return 'original';
        }
      } else {
        // B2C: Festpreis-Modell - alle Stunden sind normalerweise "original"
        // Nur bei expliziten Änderungsanfragen werden "additional" Stunden erfasst
        final bool hasChangeRequest = orderData['changeRequests'] != null && 
                                    (orderData['changeRequests'] as List).isNotEmpty;
        
        if (hasChangeRequest) {
          debugPrint('🛍️ B2C: Änderungsantrag vorhanden - zusätzliche Stunden');
          return 'additional';
        } else {
          debugPrint('🛍️ B2C: Festpreis - original Stunden');
          return 'original';
        }
      }
    } catch (error) {
      debugPrint('❌ Fehler bei Kategorie-Bestimmung: $error');
      return 'original'; // Sicherer Fallback
    }
  }

  /// Prüft ob es sich um einen B2B Auftrag handelt
  Future<bool> _isB2BOrder(Map<String, dynamic> orderData) async {
    // 1. PAYMENT TYPE CHECK - Wichtigster Indikator
    final String paymentType = orderData['paymentType'] ?? '';
    if (paymentType == 'b2c_fixed_price' || paymentType == 'b2c_hourly') {
      debugPrint('🛍️ B2C erkannt durch paymentType: $paymentType');
      return false; // Explizit B2C
    }
    if (paymentType == 'b2b_project' || paymentType == 'b2b_hourly') {
      debugPrint('🏢 B2B erkannt durch paymentType: $paymentType');
      return true; // Explizit B2B
    }

    // 2. CUSTOMER TYPE CHECK
    final String customerType = orderData['customerType'] ?? '';
    if (customerType == 'privat' || customerType == 'private') {
      debugPrint('🛍️ B2C erkannt durch customerType: $customerType');
      return false; // Privatkunden = B2C
    }
    if (customerType == 'business' || customerType == 'unternehmen') {
      debugPrint('🏢 B2B erkannt durch customerType: $customerType');
      return true; // Geschäftskunden = B2B
    }

    // 3. Kunde ist ein Unternehmen (hat companyName)
    if (orderData['customerCompanyName'] != null && 
        orderData['customerCompanyName'].toString().isNotEmpty) {
      debugPrint('🏢 B2B erkannt durch customerCompanyName');
      return true;
    }

    // 4. Bestellwert über B2B-Schwelle (z.B. > 500€)
    final int totalAmount = orderData['totalAmountPaidByBuyerInCents'] ?? 0;
    if (totalAmount > 50000) { // > 500€
      debugPrint('🏢 B2B erkannt durch hohen Bestellwert: ${totalAmount / 100}€');
      return true;
    }

    // 5. Projektbasierte Services (längere Laufzeit)
    final String category = orderData['selectedSubcategory'] ?? '';
    final List<String> b2bCategories = [
      'Consulting',
      'Software Development',
      'Marketing Services',
      'Business Strategy',
      'Project Management',
      'IT Services',
      'Accounting Services'
    ];
    
    if (b2bCategories.any((b2bCat) => category.toLowerCase().contains(b2bCat.toLowerCase()))) {
      debugPrint('🏢 B2B erkannt durch Service-Kategorie: $category');
      return true;
    }

    // 6. Expliziter B2B-Marker im Auftrag
    if (orderData['businessType'] == 'B2B' || orderData['isBusinessOrder'] == true) {
      debugPrint('🏢 B2B erkannt durch businessType/isBusinessOrder');
      return true;
    }

    // 7. Kunde-UID gehört zu einem Unternehmen
    final String customerUid = orderData['customerFirebaseUid'] ?? '';
    if (customerUid.isNotEmpty) {
      final bool isCustomerCompany = await _isCustomerACompany(customerUid);
      if (isCustomerCompany) {
        debugPrint('🏢 B2B erkannt durch Company-Prüfung');
        return true;
      }
    }

    debugPrint('🛍️ B2C als Fallback - keine B2B-Indikatoren gefunden');
    return false; // Default: B2C
  }

  /// Prüft ob der Kunde (customerFirebaseUid) ein Unternehmen ist
  Future<bool> _isCustomerACompany(String customerUid) async {
    try {
      // Prüfe companies collection
      final companyDoc = await FirebaseFirestore.instance
          .collection('companies')
          .doc(customerUid)
          .get();

      if (companyDoc.exists) {
        debugPrint('✅ Kunde ist ein Unternehmen (companies collection)');
        return true;
      }

      // Prüfe users collection für businessType
      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(customerUid)
          .get();

      if (userDoc.exists) {
        final userData = userDoc.data()!;
        final businessType = userData['businessType'] ?? '';
        final isBusinessUser = businessType == 'business' || 
                              businessType == 'company' ||
                              userData['accountType'] == 'business';
        
        if (isBusinessUser) {
          debugPrint('✅ Kunde ist Business-User (users collection)');
          return true;
        }
      }

      return false;
    } catch (error) {
      debugPrint('❌ Fehler bei Company-Prüfung: $error');
      return false; // Fallback bei Fehlern
    }
  }

  /// Berechnet bereits geloggte Gesamtstunden für diesen Auftrag
  Future<double> _getTotalLoggedHours() async {
    return timeEntries.fold<double>(0, (total, entry) => total + entry['hours']);
  }

  /// Berechnet den abrechenbare Betrag basierend auf Kategorie
  double _calculateBillableAmount(String category) {
    if (category == 'additional') {
      // Zusätzliche Stunden werden mit Stundensatz berechnet
      return hours * widget.hourlyRate;
    } else {
      // Original Stunden sind bereits im Grundpreis enthalten
      return 0.0;
    }
  }

  Future<void> _submitTimeEntry() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // B2B/B2C Detection: Dynamisch berechnen ob original oder additional
      String category = await _determineTimeCategory();
      double billableAmount = _calculateBillableAmount(category);

      // Hier würde die TimeTracker-Logik implementiert werden
      // Für jetzt einfacher Ansatz:
      final newEntry = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'date': selectedDate.toIso8601String().split('T')[0],
        'startTime': '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}',
        'endTime': '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}',
        'hours': hours,
        'description': description,
        'notes': notes,
        'travelTime': travelTime,
        'travelCost': travelCost * 100, // in Cents
        'category': category, // Dynamisch bestimmt basierend auf B2B/B2C
        'status': 'logged',
        'billableAmount': billableAmount,
      };

      // Temporär: Direkt zu lokaler Liste hinzufügen
      setState(() {
        timeEntries.add(newEntry);
        showAddForm = false;
        // Reset form
        selectedDate = DateTime.now();
        startTime = const TimeOfDay(hour: 9, minute: 0);
        endTime = const TimeOfDay(hour: 17, minute: 0);
        hours = 8.0;
        description = '';
        notes = '';
        travelTime = false;
        travelCost = 0.0;
        isBreakTime = false;
        breakMinutes = 0;
      });

      if (widget.onTimeSubmitted != null) {
        widget.onTimeSubmitted!();
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Zeiteintrag erfolgreich hinzugefügt'),
            backgroundColor: Color(0xFF14ad9f),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Speichern: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildStatisticCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        border: Border.all(color: color.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color.withValues(alpha: 0.8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: color.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
            ),
            SizedBox(height: 16),
            Text('Lade Zeiterfassung...'),
          ],
        ),
      );
    }

    // Statistiken berechnen
    final totalHours = timeEntries.fold<double>(0, (total, entry) => total + entry['hours']);
    final originalHours = timeEntries
        .where((entry) => entry['category'] == 'original')
        .fold<double>(0, (total, entry) => total + entry['hours']);
    final additionalHours = timeEntries
        .where((entry) => entry['category'] == 'additional')
        .fold<double>(0, (total, entry) => total + entry['hours']);

    return Column(
      children: [
        // Header Card
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withValues(alpha: 0.1),
                spreadRadius: 1,
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              // Header mit Gradient
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF14ad9f), Color(0xFF129488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.access_time,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Zeiterfassung',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.person, color: Colors.white70, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                providerName,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                '${widget.originalPlannedHours.toStringAsFixed(1)}h geplant',
                                style: const TextStyle(
                                  color: Colors.white70,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                '${widget.hourlyRate.toStringAsFixed(0)}€/h',
                                style: const TextStyle(
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          showAddForm = true;
                          editingEntry = null;
                        });
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Zeit hinzufügen'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF14ad9f),
                      ),
                    ),
                  ],
                ),
              ),

              // Statistik Cards
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: _buildStatisticCard(
                        'Gesamt',
                        '${totalHours.toStringAsFixed(1)}h',
                        Colors.grey,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatisticCard(
                        'Geplant',
                        '${originalHours.toStringAsFixed(1)}h',
                        Colors.blue,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatisticCard(
                        'Zusätzlich',
                        '${additionalHours.toStringAsFixed(1)}h',
                        Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildStatisticCard(
                        'Umsatz',
                        '0€',
                        Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Zeiteinträge Liste
        if (timeEntries.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.1),
                  spreadRadius: 1,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Column(
              children: [
                Icon(
                  Icons.schedule,
                  size: 48,
                  color: Colors.grey,
                ),
                SizedBox(height: 16),
                Text(
                  'Noch keine Zeiteinträge vorhanden',
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.grey,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Fügen Sie Ihre erste Arbeitszeit hinzu',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          )
        else
          ...timeEntries.take(showAllEntries ? timeEntries.length : 5).map((entry) {
            Color borderColor = Colors.grey;
            Color backgroundColor = Colors.white;
            
            switch (entry['status']) {
              case 'paid':
                borderColor = Colors.green.shade300;
                backgroundColor = Colors.green.shade50;
                break;
              case 'approved':
                borderColor = Colors.blue.shade300;
                backgroundColor = Colors.blue.shade50;
                break;
              case 'submitted':
                borderColor = Colors.orange.shade300;
                backgroundColor = Colors.orange.shade50;
                break;
              case 'rejected':
                borderColor = Colors.red.shade300;
                backgroundColor = Colors.red.shade50;
                break;
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: backgroundColor,
                border: Border.all(color: borderColor),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        entry['date'],
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        '${entry['startTime']} - ${entry['endTime']}',
                        style: const TextStyle(color: Colors.grey),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: entry['category'] == 'additional' 
                              ? Colors.orange.shade100 
                              : Colors.blue.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          entry['category'] == 'additional' ? 'Zusätzlich' : 'Geplant',
                          style: TextStyle(
                            fontSize: 12,
                            color: entry['category'] == 'additional' 
                                ? Colors.orange.shade800 
                                : Colors.blue.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    entry['description'],
                    style: const TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: borderColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${entry['hours'].toStringAsFixed(1)}h',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: borderColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: borderColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          entry['status'] == 'paid' ? 'Bezahlt' :
                          entry['status'] == 'approved' ? 'Genehmigt' :
                          entry['status'] == 'submitted' ? 'Eingereicht' :
                          entry['status'] == 'rejected' ? 'Abgelehnt' : 'Erfasst',
                          style: TextStyle(
                            fontSize: 12,
                            color: borderColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),

        // "Mehr anzeigen" Button
        if (timeEntries.length > 5)
          TextButton(
            onPressed: () {
              setState(() {
                showAllEntries = !showAllEntries;
              });
            },
            child: Text(
              showAllEntries 
                  ? 'Weniger anzeigen' 
                  : 'Alle ${timeEntries.length} Einträge anzeigen',
              style: const TextStyle(color: Color(0xFF14ad9f)),
            ),
          ),

        // Add Form Modal
        if (showAddForm)
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.1),
                  spreadRadius: 1,
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Neue Arbeitszeit hinzufügen',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Datum
                ListTile(
                  title: const Text('Datum'),
                  subtitle: Text(
                    '${selectedDate.day}.${selectedDate.month}.${selectedDate.year}',
                  ),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (date != null) {
                      setState(() {
                        selectedDate = date;
                      });
                    }
                  },
                ),
                
                // Start- und Endzeit
                Row(
                  children: [
                    Expanded(
                      child: ListTile(
                        title: const Text('Startzeit'),
                        subtitle: Text(startTime.format(context)),
                        onTap: () async {
                          final time = await showTimePicker(
                            context: context,
                            initialTime: startTime,
                          );
                          if (time != null) {
                            setState(() {
                              startTime = time;
                              _calculateHours();
                            });
                          }
                        },
                      ),
                    ),
                    Expanded(
                      child: ListTile(
                        title: const Text('Endzeit'),
                        subtitle: Text(endTime.format(context)),
                        onTap: () async {
                          final time = await showTimePicker(
                            context: context,
                            initialTime: endTime,
                          );
                          if (time != null) {
                            setState(() {
                              endTime = time;
                              _calculateHours();
                            });
                          }
                        },
                      ),
                    ),
                  ],
                ),
                
                // Stunden
                ListTile(
                  title: const Text('Stunden (berechnet)'),
                  subtitle: Text('${hours.toStringAsFixed(1)} Stunden'),
                ),
                
                // Beschreibung
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Beschreibung',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  onChanged: (value) {
                    description = value;
                  },
                ),
                
                const SizedBox(height: 16),
                
                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            showAddForm = false;
                          });
                        },
                        child: const Text('Abbrechen'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _submitTimeEntry,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14ad9f),
                        ),
                        child: const Text('Hinzufügen'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }
}
