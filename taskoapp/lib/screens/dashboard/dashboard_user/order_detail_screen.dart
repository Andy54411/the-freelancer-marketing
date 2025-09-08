import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart' as firestore;
import 'package:flutter_stripe/flutter_stripe.dart';
import '../../../models/user_model.dart';
import '../../../models/order.dart';
import '../../../services/order_service.dart';
import '../../../services/timetracker_service.dart';
import '../../../services/stripe_payment_service.dart';
import '../../../utils/colors.dart';
import '../../../widgets/hours_billing_overview.dart';
import '../../../widgets/time_tracking_widget.dart';
import '../../chat/order_chat_screen.dart';
import '../../support/support_screen.dart';
import '../dashboard_layout.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  final String? userId;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
    this.userId,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  Order? _order;
  bool _isLoading = true;
  String? _error;
  String? _successMessage;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Verwende die bestehende getOrder Methode aus OrderService
      final order = await OrderService.getOrder(widget.orderId);
      setState(() {
        _order = order;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Fehler beim Laden des Auftrags: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  // Neue Methoden für erweiterte Funktionalität (ähnlich der Web-Version)
  Future<void> _completeOrder() async {
    // Zeige Confirmation Dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Auftrag abschließen'),
        content: const Text(
          'Möchten Sie den Auftrag als erledigt markieren? '
          'Nach der Bestätigung wird das Geld an den Anbieter ausgezahlt.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Bestätigen'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        setState(() => _isLoading = true);
        
        // Verwende die neue OrderService completeOrderAsCustomer Methode
        await OrderService.completeOrderAsCustomer(
          widget.orderId,
          widget.userId ?? '',
          rating: 5, // Default rating
          review: 'Auftrag erfolgreich abgeschlossen',
          completionNotes: 'Kunde bestätigt Abschluss',
        );
        
        setState(() {
          _successMessage = 'Auftrag erfolgreich abgeschlossen! Das Geld wurde an den Anbieter ausgezahlt.';
          _isLoading = false;
        });
        
        // Reload order data
        await _loadOrder();
        
        // Clear success message after 5 seconds
        Future.delayed(const Duration(seconds: 5), () {
          if (mounted) {
            setState(() => _successMessage = null);
          }
        });
      } catch (e) {
        setState(() {
          _error = 'Fehler beim Abschließen des Auftrags: ${e.toString()}';
          _isLoading = false;
        });
      }
    }
  }

  void _openChat() {
    if (_order == null) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OrderChatScreen(
          orderId: widget.orderId,
          providerId: _order!.selectedAnbieterId,
          providerName: _order!.providerName,
          customerId: _order!.customerFirebaseUid,
          customerName: 'Kunde',
        ),
      ),
    );
  }

  void _contactSupport() {
    // Navigiere zum Support Screen
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SupportScreen(),
      ),
    );
  }

  /// Lädt TimeTracking-Daten aus der Datenbank
  Future<Map<String, dynamic>> _loadTimeTrackingData() async {
    try {
      final orderDoc = await firestore.FirebaseFirestore.instance
          .collection('auftraege')
          .doc(widget.orderId)
          .get();

      if (!orderDoc.exists) {
        return {};
      }

      final orderData = orderDoc.data()!;
      final timeTracking = orderData['timeTracking'];
      
      if (timeTracking == null) {
        return {};
      }

      final timeEntries = timeTracking['timeEntries'] as List<dynamic>? ?? [];
      
      // Berechne verschiedene Kategorien
      double originalHours = 0.0;
      double additionalHours = 0.0;
      double additionalHoursPaid = 0.0;
      double additionalPricePaid = 0.0;
      double pendingHours = 0.0;
      double pendingPrice = 0.0;
      
      debugPrint('🔍 Analyzing ${timeEntries.length} time entries...');
      
      for (final entry in timeEntries) {
        final hours = (entry['hours'] ?? 0).toDouble();
        final category = entry['category'] ?? 'original';
        final status = entry['status'] ?? 'logged';
        final billableAmount = (entry['billableAmount'] ?? 0).toDouble();
        final entryId = entry['id'] ?? 'unknown';
        
        debugPrint('  Entry $entryId:');
        debugPrint('    - Hours: $hours');
        debugPrint('    - Category: $category');
        debugPrint('    - Status: $status');
        debugPrint('    - BillableAmount: $billableAmount');
        
        if (category == 'original') {
          originalHours += hours;
          debugPrint('    → Added to originalHours (total: $originalHours)');
        } else if (category == 'additional') {
          additionalHours += hours;
          debugPrint('    → Added to additionalHours (total: $additionalHours)');
          
          if (status == 'paid' || status == 'transferred') {
            additionalHoursPaid += hours;
            additionalPricePaid += billableAmount / 100; // Convert from cents
            debugPrint('    → Added to PAID hours (total: $additionalHoursPaid)');
          } else if (status == 'logged' || status == 'submitted' || status == 'customer_approved') {
            pendingHours += hours;
            pendingPrice += billableAmount / 100; // Convert from cents
            debugPrint('    → Added to PENDING hours (total: $pendingHours, price: $pendingPrice)');
          }
        }
      }

      debugPrint('📊 FINAL TIME TRACKING RESULTS:');
      debugPrint('  🕒 Original Hours: $originalHours');
      debugPrint('  ➕ Additional Hours: $additionalHours'); 
      debugPrint('  💰 Additional Hours Paid: $additionalHoursPaid');
      debugPrint('  ⏳ PENDING Hours: $pendingHours');
      debugPrint('  💸 PENDING Price: €$pendingPrice');

      return {
        'originalHours': originalHours,
        'additionalHours': additionalHours,
        'additionalHoursPaid': additionalHoursPaid,
        'additionalPricePaid': additionalPricePaid,
        'pendingHours': pendingHours,
        'pendingPrice': pendingPrice,
        'totalLoggedHours': timeTracking['totalLoggedHours'] ?? 0.0,
        'originalPlannedHours': timeTracking['originalPlannedHours'] ?? 8.0,
        'timeEntries': timeEntries, // NEU: Füge die TimeEntries hinzu
      };
    } catch (error) {
      debugPrint('Fehler beim Laden der TimeTracking-Daten: $error');
      return {};
    }
  }

  /// Behandelt die Freigabe zusätzlicher Stunden (nur für Kunden)
  Future<void> _handleApproveAdditionalHours(Map<String, dynamic> timeData) async {
    final pendingHours = timeData['pendingHours']?.toDouble() ?? 0.0;
    final pendingPrice = timeData['pendingPrice']?.toDouble() ?? 0.0;
    
    if (pendingHours <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Keine Stunden zur Freigabe vorhanden'),
          backgroundColor: TaskiloColors.primary,
        ),
      );
      return;
    }

    // Zeige Bestätigungsdialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Zusätzliche Stunden freigeben'),
        content: Text(
          'Möchten Sie ${pendingHours.toStringAsFixed(1)}h zusätzliche Arbeitszeit für ${pendingPrice.toStringAsFixed(2)}€ freigeben?'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Freigeben'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      // Zeige Loading Indicator
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 16),
              Text('Stunden werden freigegeben...'),
            ],
          ),
          backgroundColor: TaskiloColors.primary,
          duration: Duration(seconds: 30),
        ),
      );

      try {
        // Verwende TimeTracker API für die Freigabe
        // Sammle alle "logged" TimeEntry IDs aus den Firestore Daten
        final timeEntryIds = <String>[];
        
        // Lade aktuelle TimeTracking Daten
        final timeTrackingData = await _loadTimeTrackingData();
        final timeEntries = timeTrackingData['timeEntries'] as List<dynamic>?;
        
        if (timeEntries != null) {
          for (final entry in timeEntries) {
            // Erweitere Suche um customer_approved additional entries
            if (entry['status'] == 'customer_approved' && entry['category'] == 'additional') {
              timeEntryIds.add(entry['id'] as String);
            }
          }
        }

        if (timeEntryIds.isEmpty) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          
          // Für Development/Testing: Erstelle Test-TimeEntries
          final shouldCreateTestData = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Keine Stunden gefunden'),
              content: const Text(
                'Es wurden keine Stunden zur Freigabe gefunden. '
                'Möchten Sie Test-Daten erstellen, um die Funktion zu testen?'
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Abbrechen'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TaskiloColors.primary,
                  ),
                  child: const Text('Test-Daten erstellen'),
                ),
              ],
            ),
          );

          if (shouldCreateTestData == true) {
            try {
              // Zeige Loading
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Row(
                    children: [
                      SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                      SizedBox(width: 16),
                      Text('Test-Daten werden erstellt...'),
                    ],
                  ),
                  backgroundColor: TaskiloColors.primary,
                  duration: Duration(seconds: 10),
                ),
              );

              // Erstelle Test-TimeEntries
              final testTimeEntryIds = await TimeTrackerService.createTestTimeEntries(
                orderId: _order!.id,
                count: 2, // Erstelle 2 Test-Entries
              );

              if (!mounted) return;
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
              
              // Verwende die Test-IDs für die Freigabe
              timeEntryIds.addAll(testTimeEntryIds);
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('✅ ${testTimeEntryIds.length} Test-TimeEntries erstellt!'),
                  backgroundColor: Colors.green,
                ),
              );
              
              // Warte kurz und lade Daten neu
              await Future.delayed(const Duration(seconds: 1));
              await _loadOrderData();
              
            } catch (e) {
              if (!mounted) return;
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('❌ Fehler beim Erstellen der Test-Daten: $e'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Keine Stunden zur Freigabe vorhanden'),
                backgroundColor: Colors.orange,
              ),
            );
            return;
          }
        }

        // API Call für Freigabe
        final result = await TimeTrackerService.approveHours(
          orderId: _order!.id,
          timeEntryIds: timeEntryIds,
        );

        if (!mounted) return;
        ScaffoldMessenger.of(context).hideCurrentSnackBar();

        if (result['success']) {
          final data = result['data'];
          debugPrint('🔍 APPROVAL RESULT DEBUG:');
          debugPrint('📊 Full data: $data');
          
          final totalHours = data['additionalHours'] ?? data['totalHours'] ?? timeEntryIds.length * 8;
          final paymentRequired = data['paymentRequired'] ?? false;
          final totalAmount = data['customerPays'] ?? data['totalAmount'] ?? 0;
          
          debugPrint('💰 totalAmount: $totalAmount');
          debugPrint('⏰ totalHours: $totalHours');
          debugPrint('💳 paymentRequired: $paymentRequired');

          // PAYMENT ist IMMER erforderlich wenn PaymentIntent vorhanden ist!
          final hasPaymentIntent = data['paymentIntentId'] != null;
          debugPrint('🔑 hasPaymentIntent: $hasPaymentIntent');

          if (hasPaymentIntent && totalAmount > 0) {
            debugPrint('🚀 STARTING PAYMENT PROCESS...');
            // Zusätzliche Zahlung erforderlich - SOFORT Payment starten
            _processPaymentFromApproval(data, timeEntryIds, totalHours);
          } else {
            debugPrint('✅ NO PAYMENT REQUIRED - SHOWING SUCCESS');
            // Erfolgreich ohne zusätzliche Zahlung
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('✅ ${totalHours}h erfolgreich freigegeben!'),
                backgroundColor: Colors.green,
              ),
            );
          }
          
          // Daten neu laden
          _loadOrderData();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Fehler bei der Freigabe: ${result['error']}'),
              backgroundColor: Colors.red,
            ),
          );
        }
        
        // Daten neu laden
        _loadOrderData();
      } catch (error) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Unerwarteter Fehler: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Startet Payment direkt nach Approval
  Future<void> _processPaymentFromApproval(Map<String, dynamic> data, List<String> timeEntryIds, int totalHours) async {
    debugPrint('🔥 _processPaymentFromApproval CALLED!');
    debugPrint('📊 Payment data: $data');
    
    final paymentIntentId = data['paymentIntentId'];
    final clientSecret = data['clientSecret'];
    final totalAmount = data['customerPays'] ?? 0;
    
    debugPrint('💳 PaymentIntentId: $paymentIntentId');
    debugPrint('🔐 ClientSecret: $clientSecret');
    debugPrint('💰 TotalAmount: $totalAmount');
    
    if (paymentIntentId != null && clientSecret != null) {
      debugPrint('✅ PAYMENT DATA OK - STARTING STRIPE PAYMENT SHEET');
      
      try {
        // Initialisiere Stripe Payment Sheet
        await Stripe.instance.initPaymentSheet(
          paymentSheetParameters: SetupPaymentSheetParameters(
            paymentIntentClientSecret: clientSecret,
            merchantDisplayName: 'Taskilo',
            style: ThemeMode.system,
          ),
        );
        
        debugPrint('💳 SHOWING STRIPE PAYMENT SHEET...');
        
        // Zeige Stripe Payment Sheet
        await Stripe.instance.presentPaymentSheet();
        
        debugPrint('✅ PAYMENT SHEET COMPLETED - CALLING WEBHOOK');
        
        // Payment erfolgreich - Webhook aufrufen für Status-Update
        await _confirmPaymentWithWebhook(paymentIntentId, data, timeEntryIds);
        
      } catch (error) {
        debugPrint('❌ STRIPE PAYMENT ERROR: $error');
        if (error is StripeException) {
          if (error.error.code == FailureCode.Canceled) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('💳 Zahlung abgebrochen'),
                backgroundColor: Colors.orange,
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('❌ Payment-Fehler: ${error.error.localizedMessage}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Unbekannter Payment-Fehler: $error'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } else {
      debugPrint('❌ PAYMENT DATA MISSING!');
    }
  }

  /// Bestätigt Payment über Webhook
  Future<void> _confirmPaymentWithWebhook(String paymentIntentId, Map<String, dynamic> data, List<String> timeEntryIds) async {
    debugPrint('🔗 PAYMENT CONFIRMED - WAITING FOR STRIPE WEBHOOK...');
    
    try {
      // Zeige Loading - Stripe webhook wird automatisch aufgerufen
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 16),
              Text('💳 Payment wird verarbeitet...'),
            ],
          ),
          backgroundColor: TaskiloColors.primary,
          duration: Duration(seconds: 5),
        ),
      );

      // Warte kurz und lade dann die Daten neu
      // Der Stripe Webhook unter /api/stripe-webhooks wird automatisch aufgerufen
      await Future.delayed(const Duration(seconds: 3));

      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      // Lade Daten neu, um die Stripe Webhook-Updates zu sehen
      await _loadOrderData();
      
      // Zeige Erfolgs-Nachricht
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ ${data['additionalHours']}h erfolgreich bezahlt! Status wird automatisch aktualisiert.'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 5),
        ),
      );
      
    } catch (error) {
      debugPrint('❌ WEBHOOK ERROR: $error');
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Fehler: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Bestätigt Payment direkt ohne Dialog
  Future<void> _confirmPaymentDirectly(Map<String, dynamic> paymentData, List<String> timeEntryIds) async {
    try {
      final paymentIntentClientSecret = paymentData['clientSecret'];
      
      if (paymentIntentClientSecret == null) {
        throw Exception('Client Secret fehlt');
      }

      debugPrint('💳 Initialisiere Stripe Payment Sheet...');
      
      // Initialisiere Payment Sheet
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: paymentIntentClientSecret,
          style: ThemeMode.system,
          merchantDisplayName: 'Taskilo',
        ),
      );

      debugPrint('📱 Zeige Payment Sheet...');
      
      // Zeige Payment Sheet
      await Stripe.instance.presentPaymentSheet();
      
      debugPrint('✅ Payment Sheet erfolgreich abgeschlossen');
      
      // Payment erfolgreich
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ Zahlung erfolgreich! ${paymentData['additionalHours']}h freigegeben'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 5),
        ),
      );
      
      // Lade Daten neu
      await _loadOrderData();
      
    } on StripeException catch (e) {
      debugPrint('❌ Stripe Error: ${e.error.localizedMessage}');
      
      if (e.error.code == FailureCode.Canceled) {
        // User hat Payment abgebrochen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Zahlung abgebrochen'),
            backgroundColor: Colors.orange,
          ),
        );
      } else {
        // Anderer Stripe Fehler
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Zahlungsfehler: ${e.error.localizedMessage}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (error) {
      debugPrint('❌ Payment Error: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Payment-Fehler: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Zeigt Payment Dialog für zusätzliche Stunden
  Future<void> _showPaymentDialog(int totalAmountInCents, int totalHours) async {
    final amountInEuro = totalAmountInCents / 100.0;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('💳 Zusätzliche Zahlung erforderlich'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Für die ${totalHours}h zusätzliche Arbeitszeit ist eine Zahlung erforderlich:'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: TaskiloColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: TaskiloColors.primary),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${totalHours}h zusätzlich:',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '€${amountInEuro.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: TaskiloColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Nach der Zahlung werden die Stunden automatisch freigegeben und das Geld an den Anbieter ausgezahlt.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Später bezahlen'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _processPayment(totalAmountInCents, totalHours);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Jetzt bezahlen'),
          ),
        ],
      ),
    );
  }

  /// Startet den Payment-Prozess für zusätzliche Stunden
  Future<void> _processPayment(int totalAmountInCents, int totalHours) async {
    if (!mounted) return;
    
    // Zeige Loading Dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
            ),
            const SizedBox(height: 16),
            const Text('Payment wird vorbereitet...'),
          ],
        ),
      ),
    );

    try {
      // Sammle die TimeEntry IDs für die Zahlung
      final timeTrackingData = await _loadTimeTrackingData();
      final timeEntries = timeTrackingData['timeEntries'] as List<dynamic>?;
      final timeEntryIds = <String>[];
      
      if (timeEntries != null) {
        for (final entry in timeEntries) {
          // Erweitere Suche für Payment um customer_approved additional entries
          if ((entry['status'] == 'logged' && entry['category'] == 'additional') ||
              (entry['status'] == 'customer_approved' && entry['category'] == 'additional')) {
            timeEntryIds.add(entry['id'] as String);
          }
        }
      }

      if (timeEntryIds.isEmpty) {
        if (!mounted) return;
        Navigator.pop(context); // Schließe Loading Dialog
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Keine zusätzlichen Stunden zum Bezahlen gefunden'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Hole User ID für Payment
      if (!mounted) return;
      final currentUser = Provider.of<TaskiloUser?>(context, listen: false);
      if (currentUser == null || _order == null) {
        if (!mounted) return;
        Navigator.pop(context);
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Benutzerinformationen nicht verfügbar'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      debugPrint('🔄 Creating Payment Intent for ${timeEntryIds.length} time entries...');
      debugPrint('💰 Amount: $totalAmountInCents¢ for ${totalHours}h');

      // Erstelle Payment Intent über die API
      final paymentResult = await StripePaymentService.createAdditionalHoursPaymentIntent(
        orderId: _order!.id,
        timeEntryIds: timeEntryIds,
        totalAmountInCents: totalAmountInCents,
        totalHours: totalHours,
        customerId: currentUser.uid,
        providerId: _order!.selectedAnbieterId,
      );

      if (!mounted) return;
      Navigator.pop(context); // Schließe Loading Dialog

      if (paymentResult['success']) {
        final paymentData = paymentResult['data'];
        
        debugPrint('✅ Payment Intent created: ${paymentData['paymentIntentId']}');
        
        // Zeige Payment Success Dialog
        _showPaymentSuccessDialog(
          paymentData: paymentData,
          timeEntryIds: timeEntryIds,
          totalHours: totalHours,
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Payment-Erstellung fehlgeschlagen: ${paymentResult['error']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      Navigator.pop(context); // Schließe Loading Dialog
      
      debugPrint('❌ Payment Process Exception: $error');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Unerwarteter Fehler: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Zeigt Success Dialog nach erfolgreicher Payment Intent Erstellung
  void _showPaymentSuccessDialog({
    required Map<String, dynamic> paymentData,
    required List<String> timeEntryIds,
    required int totalHours,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.payment, color: Colors.green.shade600),
            const SizedBox(width: 8),
            const Text('💳 Payment bereit'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Das Payment wurde erfolgreich vorbereitet!'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('✅ ${totalHours}h zusätzliche Stunden'),
                  Text('✅ €${(paymentData['totalAmount'] / 100).toStringAsFixed(2)} Zahlbetrag'),
                  Text('✅ Payment ID: ${paymentData['paymentIntentId'].substring(0, 15)}...'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Das Payment wird jetzt automatisch verarbeitet. Die Stunden werden freigegeben und das Geld an den Anbieter ausgezahlt.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _confirmPayment(paymentData, timeEntryIds);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Payment bestätigen'),
          ),
        ],
      ),
    );
  }

  /// Bestätigt das Payment und löst die Stripe Connect Auszahlung aus
  Future<void> _confirmPayment(
    Map<String, dynamic> paymentData,
    List<String> timeEntryIds,
  ) async {
    // Zeige Loading
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            SizedBox(width: 16),
            Text('💳 Payment wird verarbeitet...'),
          ],
        ),
        backgroundColor: TaskiloColors.primary,
        duration: Duration(seconds: 30),
      ),
    );

    try {
      debugPrint('🔄 Confirming payment: ${paymentData['paymentIntentId']}');
      
      // Bestätige Payment über die API
      final confirmResult = await StripePaymentService.confirmAdditionalHoursPayment(
        paymentIntentId: paymentData['paymentIntentId'],
        orderId: paymentData['orderId'],
        timeEntryIds: timeEntryIds,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();

      if (confirmResult['success']) {
        final data = confirmResult['data'];
        
        debugPrint('✅ Payment confirmed successfully');
        debugPrint('💰 Provider receives: ${data['providerNetAmount']}¢');
        debugPrint('🏦 Transfer ID: ${data['stripeTransferId']}');
        
        // Protokolliere die Transaktion für Auditing
        await StripePaymentService.logPaymentTransaction(paymentData: {
          'paymentIntentId': data['paymentIntentId'],
          'orderId': data['orderId'],
          'timeEntryIds': timeEntryIds,
          'transferAmount': data['transferAmount'],
          'platformFee': data['platformFee'],
          'providerNetAmount': data['providerNetAmount'],
          'stripeTransferId': data['stripeTransferId'],
          'approvedHours': data['approvedHours'],
          'paymentStatus': 'confirmed',
          'customerId': paymentData['customerId'],
          'providerId': paymentData['providerId'],
        });
        
        // Zeige Success Message
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ ${data['message']}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 5),
          ),
        );
        
        // Lade Order-Daten neu
        await _loadOrderData();
        
        // Zeige finalen Success Dialog
        _showFinalSuccessDialog(data);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Payment-Bestätigung fehlgeschlagen: ${confirmResult['error']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      
      debugPrint('❌ Payment Confirmation Exception: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Unerwarteter Fehler: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Zeigt finalen Success Dialog nach erfolgreicher Zahlung und Auszahlung
  void _showFinalSuccessDialog(Map<String, dynamic> paymentData) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green.shade600),
            const SizedBox(width: 8),
            const Text('🎉 Erfolgreich!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Zahlung und Auszahlung erfolgreich abgeschlossen!'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('✅ ${paymentData['approvedHours']}h wurden freigegeben'),
                  Text('✅ €${(paymentData['providerNetAmount'] / 100).toStringAsFixed(2)} an Anbieter ausgezahlt'),
                  Text('✅ Transfer ID: ${paymentData['stripeTransferId'].substring(0, 15)}...'),
                  Text('✅ Platform Fee: €${(paymentData['platformFee'] / 100).toStringAsFixed(2)}'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Die zusätzlichen Stunden wurden erfolgreich freigegeben und das Geld wurde direkt an das Verbundkonto des Anbieters ausgezahlt.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: TaskiloColors.primary,
            ),
            child: const Text('Verstanden'),
          ),
        ],
      ),
    );
  }

  /// Lädt die Auftragsdaten neu
  Future<void> _loadOrderData() async {
    await _loadOrder();
    // Trigger rebuild für TimeTracking Widget
    setState(() {});
  }

  String _formatPrice(int amountInCents, String? currency) {
    final amountInEuro = amountInCents / 100.0;
    return '${amountInEuro.toStringAsFixed(2)} ${currency ?? 'EUR'}';
  }

  Map<String, dynamic>? _cachedTimeData;

  int _calculateTotalCostInCents() {
    if (_order == null) return _order!.totalAmountPaidByBuyerInCents;
    
    // Verwende gecachte TimeData oder nur den ursprünglichen Preis
    if (_cachedTimeData != null) {
      final additionalPaidInCents = ((_cachedTimeData!['additionalPricePaid']?.toDouble() ?? 0.0) * 100).round();
      final pendingPriceInCents = ((_cachedTimeData!['pendingPrice']?.toDouble() ?? 0.0) * 100).round();
      return (_order!.totalAmountPaidByBuyerInCents + additionalPaidInCents + pendingPriceInCents).round();
    }
    
    return _order!.totalAmountPaidByBuyerInCents;
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    return '${date.day}.${date.month}.${date.year}';
  }

  Color _getStatusBackgroundColor(String status) {
    switch (status.toUpperCase()) {
      case 'PAYMENT_PENDING':
      case 'ZAHLUNG_ERHALTEN_CLEARING':
        return Colors.amber.shade100;
      case 'ACTIVE':
      case 'AKTIV':
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return Colors.blue.shade100;
      case 'COMPLETED':
      case 'ABGESCHLOSSEN':
      case 'PROVIDER_COMPLETED':
        return Colors.green.shade100;
      case 'CANCELLED':
      case 'STORNIERT':
      case 'ABGELEHNT_VOM_ANBIETER':
        return Colors.red.shade100;
      case 'BEZAHLT':
        return Colors.green.shade200;
      case 'FEHLENDE_DETAILS':
        return Colors.orange.shade100;
      default:
        return Colors.grey.shade100;
    }
  }

  Color _getStatusTextColor(String status) {
    switch (status.toUpperCase()) {
      case 'PAYMENT_PENDING':
      case 'ZAHLUNG_ERHALTEN_CLEARING':
        return Colors.amber.shade700;
      case 'ACTIVE':
      case 'AKTIV':
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return Colors.blue.shade700;
      case 'COMPLETED':
      case 'ABGESCHLOSSEN':
      case 'PROVIDER_COMPLETED':
        return Colors.green.shade700;
      case 'CANCELLED':
      case 'STORNIERT':
      case 'ABGELEHNT_VOM_ANBIETER':
        return Colors.red.shade700;
      case 'BEZAHLT':
        return Colors.green.shade800;
      case 'FEHLENDE_DETAILS':
        return Colors.orange.shade700;
      default:
        return Colors.grey.shade700;
    }
  }

  String _getStatusDisplayText(String status) {
    switch (status.toUpperCase()) {
      case 'PAYMENT_PENDING':
        return 'ZAHLUNG AUSSTEHEND';
      case 'ZAHLUNG_ERHALTEN_CLEARING':
        return 'ZAHLUNG EMPFANGEN';
      case 'ACTIVE':
      case 'AKTIV':
        return 'AKTIV';
      case 'ACCEPTED':
        return 'ANGENOMMEN';
      case 'IN_PROGRESS':
        return 'IN BEARBEITUNG';
      case 'COMPLETED':
      case 'ABGESCHLOSSEN':
        return 'ABGESCHLOSSEN';
      case 'PROVIDER_COMPLETED':
        return 'VOM ANBIETER ABGESCHLOSSEN';
      case 'CANCELLED':
      case 'STORNIERT':
        return 'STORNIERT';
      case 'ABGELEHNT_VOM_ANBIETER':
        return 'ABGELEHNT';
      case 'BEZAHLT':
        return 'BEZAHLT';
      case 'FEHLENDE_DETAILS':
        return 'DETAILS FEHLEN';
      default:
        return status.toUpperCase();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TaskiloUser?>(
      builder: (context, user, child) {
        return DashboardLayout(
          title: 'Auftrag Details',
          useGradientBackground: true,
          showBackButton: true,
          onBackPressed: () => Navigator.pop(context),
          showBottomNavigation: false,
          body: _buildContent(),
        );
      },
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadOrder,
              style: ElevatedButton.styleFrom(
                backgroundColor: TaskiloColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_order == null) {
      return const Center(
        child: Text('Auftrag nicht gefunden'),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Order Header Card - Glasmorphismus Style
          DashboardCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Service Title oben
                Text(
                  _order!.selectedSubcategory,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    decoration: TextDecoration.none,
                    shadows: [
                      Shadow(
                        color: Colors.black26,
                        offset: Offset(0, 1),
                        blurRadius: 2,
                      ),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 16),
                
                // Auftrag Badge
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    'Auftrag #${_order!.id.split('_').last}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white.withValues(alpha: 0.95),
                      decoration: TextDecoration.none,
                      letterSpacing: 0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // Status Badge
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: _getStatusBackgroundColor(_order!.status),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _getStatusTextColor(_order!.status).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    _getStatusDisplayText(_order!.status),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: _getStatusTextColor(_order!.status),
                      decoration: TextDecoration.none,
                      letterSpacing: 0.5,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Preis prominent anzeigen - Glass Style
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.green.shade600,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.euro_rounded, 
                          color: Colors.white, 
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Gesamtpreis',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.8),
                                decoration: TextDecoration.none,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _formatPrice(_calculateTotalCostInCents(), _order!.currency),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                decoration: TextDecoration.none,
                                shadows: [
                                  Shadow(
                                    color: Colors.black26,
                                    offset: Offset(0, 1),
                                    blurRadius: 2,
                                  ),
                                ],
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
          ),

          const SizedBox(height: 20),

          // Order Details Card
          DashboardCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      color: Colors.white,
                      size: 24,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Auftragsdetails',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        decoration: TextDecoration.none,
                        shadows: [
                          Shadow(
                            color: Colors.black26,
                            offset: Offset(0, 1),
                            blurRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                  
                
                _buildDetailRow('Auftrag-ID', _order!.id),
                if (_order!.providerName.isNotEmpty)
                  _buildDetailRow('Anbieter', _order!.providerName),
                if (_order!.selectedSubcategory.isNotEmpty)
                  _buildDetailRow('Service', _order!.selectedSubcategory),
                if (_order!.projectName != null && _order!.projectName!.isNotEmpty)
                  _buildDetailRow('Projekt', _order!.projectName!),
                _buildDetailRow('Bestellt am', _formatDate(_order!.paidAt)),
                _buildDetailRow('Erstellt am', _formatDate(_order!.createdAt)),
              ],
            ),
          ),          const SizedBox(height: 20),

          // Stundenabrechnung & Zahlungsübersicht (wie in der Web-Version)
          FutureBuilder<Map<String, dynamic>>(
            future: _loadTimeTrackingData(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              
              final timeData = snapshot.data ?? {};
              
              // Cache die TimeData für Gesamtpreis-Berechnung nur wenn sie sich geändert hat
              if (_cachedTimeData == null || _cachedTimeData != timeData) {
                _cachedTimeData = timeData;
              }
              
              return HoursBillingOverview(
                orderId: widget.orderId,
                originalHours: timeData['originalHours']?.toDouble() ?? 0.0,
                originalPrice: _order!.totalAmountInEuro,
                additionalHoursPaid: timeData['additionalHoursPaid']?.toDouble() ?? 0.0,
                additionalPricePaid: timeData['additionalPricePaid']?.toDouble() ?? 0.0,
                pendingHours: timeData['pendingHours']?.toDouble() ?? 0.0,
                pendingPrice: timeData['pendingPrice']?.toDouble() ?? 0.0,
                loggedHours: timeData['totalLoggedHours']?.toDouble() ?? 0.0,
                plannedHours: timeData['originalPlannedHours']?.toDouble() ?? 8.0,
                additionalHours: timeData['additionalHours']?.toDouble() ?? 0.0,
                totalCost: _order!.totalAmountInEuro + 
                          (timeData['additionalPricePaid']?.toDouble() ?? 0.0) + 
                          (timeData['pendingPrice']?.toDouble() ?? 0.0),
                onPaymentRequest: () => _handleApproveAdditionalHours(timeData),
              );
            },
          ),

          const SizedBox(height: 20),

          // TimeTracking Widget - nur für Provider sichtbar (wie in der Web-Version)
          Consumer<TaskiloUser?>(
            builder: (context, currentUser, child) {
              // Provider-Check: Zeige TimeTracking nur wenn der aktuelle User der Provider des Auftrags ist
              final isProvider = currentUser != null && 
                               _order != null && 
                               currentUser.uid == _order!.selectedAnbieterId;
              
              if (isProvider) {
                return Column(
                  children: [
                    TimeTrackingWidget(
                      orderId: widget.orderId,
                      customerName: 'Kunde', // Default customer name
                      originalPlannedHours: 8.0, // Default 8 hours planned
                      hourlyRate: 50.0, // Default hourly rate
                      onTimeSubmitted: () {
                        // Callback für erfolgreiche Zeiterfassung
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Zeit erfolgreich erfasst!'),
                            backgroundColor: TaskiloColors.primary,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                  ],
                );
              }
              // Für Kunden (Customer) wird TimeTracking nicht angezeigt
              return const SizedBox.shrink();
            },
          ),

          // Success Message (wie in der Web-Version)
          if (_successMessage != null) ...[
            DashboardCard(
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green.shade400),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _successMessage!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        decoration: TextDecoration.none,
                        shadows: [
                          Shadow(
                            color: Colors.black26,
                            offset: Offset(0, 1),
                            blurRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Status-spezifische Information für Kunden
          if (_order!.status.toUpperCase() == 'ZAHLUNG_ERHALTEN_CLEARING') ...[
            DashboardCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.hourglass_empty, color: Colors.orange.shade400),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Warten auf Anbieter-Bestätigung',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            decoration: TextDecoration.none,
                            shadows: [
                              Shadow(
                                color: Colors.black26,
                                offset: Offset(0, 1),
                                blurRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Ihre Zahlung wurde erfolgreich bearbeitet. Der Anbieter wurde benachrichtigt und wird den Auftrag bald bestätigen.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.9),
                      decoration: TextDecoration.none,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Chat Button für aktive Aufträge
          if (_order!.status.toUpperCase() == 'AKTIV') ...[
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [TaskiloColors.primary, Color(0xFF0d9488)],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: TaskiloColors.primary.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () => _openChat(),
                icon: const Icon(Icons.chat_bubble_outline, size: 20),
                label: const Text(
                  'Chat mit Anbieter öffnen',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.none,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          if (_order!.status.toUpperCase() == 'PROVIDER_COMPLETED') ...[
            DashboardCard(
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green.shade400),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Auftrag wurde vom Anbieter abgeschlossen',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            decoration: TextDecoration.none,
                            shadows: [
                              Shadow(
                                color: Colors.black26,
                                offset: Offset(0, 1),
                                blurRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Der Anbieter hat den Auftrag als erledigt markiert. Bitte prüfen Sie die Arbeit und bestätigen Sie den Abschluss.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withValues(alpha: 0.9),
                      decoration: TextDecoration.none,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Action Buttons für PROVIDER_COMPLETED
            Row(
              children: [
                // Chat Button
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF6366f1), Color(0xFF4f46e5)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF6366f1).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton.icon(
                      onPressed: () => _openChat(),
                      icon: const Icon(Icons.chat_bubble_outline, size: 20),
                      label: const Text(
                        'Chat',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.none,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Bestätigen Button
                Expanded(
                  flex: 2,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [TaskiloColors.primary, Color(0xFF0d9488)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: TaskiloColors.primary.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton.icon(
                      onPressed: () => _completeOrder(),
                      icon: const Icon(Icons.rate_review, size: 20),
                      label: const Text(
                        'Auftrag bestätigen & bewerten',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.none,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        foregroundColor: Colors.white,
                        shadowColor: Colors.transparent,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Standard Action Buttons - nur Support
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: TaskiloColors.primary,
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withValues(alpha: 0.2),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: OutlinedButton.icon(
              onPressed: () => _contactSupport(),
              icon: const Icon(Icons.help_outline, size: 20),
              label: const Text(
                'Support',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  decoration: TextDecoration.none,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: TaskiloColors.primary,
                backgroundColor: Colors.white,
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.white.withValues(alpha: 0.8),
                decoration: TextDecoration.none,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                decoration: TextDecoration.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
