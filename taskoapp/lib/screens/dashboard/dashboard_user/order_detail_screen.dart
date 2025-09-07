import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/user_model.dart';
import '../../../models/order.dart';
import '../../../services/order_service.dart';
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

  void _openPayment() {
    // TODO: Implementiere Payment-Modal
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Payment-System wird bald verfügbar sein...'),
        backgroundColor: TaskiloColors.primary,
      ),
    );
  }

  String _formatPrice(int amountInCents, String? currency) {
    final amountInEuro = amountInCents / 100.0;
    return '${amountInEuro.toStringAsFixed(2)} ${currency ?? 'EUR'}';
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
                              _formatPrice(_order!.totalAmountPaidByBuyerInCents, _order!.currency),
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
          HoursBillingOverview(
            orderId: widget.orderId,
            originalHours: 0.0, // TODO: Aus Order-Daten oder separater TimeTracking API laden
            originalPrice: _order!.totalAmountInEuro,
            additionalHoursPaid: 0.0, // TODO: Aus TimeTracking API laden
            additionalPricePaid: 0.0,
            pendingHours: 0.0,
            pendingPrice: 0.0,
            loggedHours: 0.0, // TODO: Aus TimeTracking API laden
            plannedHours: 0.0, // TODO: Aus Order-Daten oder TimeTracking API laden
            additionalHours: 0.0, // TODO: Berechnen aus logged vs planned
            totalCost: _order!.totalAmountInEuro,
            onPaymentRequest: () => _openPayment(),
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
