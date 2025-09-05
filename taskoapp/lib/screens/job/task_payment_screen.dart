import 'package:flutter/material.dart';
import '../dashboard/dashboard_screen.dart';
import '../../utils/constants.dart';

class TaskPaymentScreen extends StatefulWidget {
  final Map<String, dynamic> taskData;

  const TaskPaymentScreen({
    super.key,
    required this.taskData,
  });

  @override
  State<TaskPaymentScreen> createState() => _TaskPaymentScreenState();
}

class _TaskPaymentScreenState extends State<TaskPaymentScreen> {
  bool _isProcessing = false;
  
  @override
  Widget build(BuildContext context) {
    final budget = widget.taskData['budget'] as double;
    final trustAndSupportFee = TaskiloConstants.trustAndSupportFeeEur; // Zentrale Konstante
    final total = budget + trustAndSupportFee;
    
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Bezahlung',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: const Color(0xFF14ad9f),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task Summary Card
            _buildTaskSummaryCard(),
            
            const SizedBox(height: 24),
            
            // Payment Summary
            _buildPaymentSummary(budget, trustAndSupportFee, total),
            
            const SizedBox(height: 24),
            
            // Payment Methods
            _buildPaymentMethods(),
            
            const SizedBox(height: 32),
            
            // Pay Button
            _buildPayButton(total),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskSummaryCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            spreadRadius: 0,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Auftrags-Zusammenfassung',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Service Provider
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFF14ad9f),
                backgroundImage: widget.taskData['service']['photoURL'] != null
                    ? NetworkImage(widget.taskData['service']['photoURL'])
                    : null,
                child: widget.taskData['service']['photoURL'] == null
                    ? const Icon(Icons.person, color: Colors.white, size: 20)
                    : null,
              ),
              
              const SizedBox(width: 12),
              
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.taskData['service']['displayName'] ?? 'Service Anbieter',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      widget.taskData['service']['category'] ?? 'Service',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Task Details
          _buildDetailRow('Titel', widget.taskData['title']),
          _buildDetailRow('Ort', widget.taskData['location']),
          _buildDetailRow('Datum', _formatDate(widget.taskData['selectedDate'])),
          if (widget.taskData['selectedTime'] != null)
            _buildDetailRow('Uhrzeit', widget.taskData['selectedTime']),
          if (widget.taskData['tags'].isNotEmpty)
            _buildDetailRow('Tags', (widget.taskData['tags'] as List).join(', ')),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentSummary(double budget, double trustAndSupportFee, double total) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            spreadRadius: 0,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Kosten-Übersicht',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 16),
          
          _buildPriceRow('Auftragswert', budget, false),
          _buildPriceRow('Vertrauens- & Hilfsgebühr', trustAndSupportFee, false),
          
          const Divider(height: 24),
          
          _buildPriceRow('Gesamt', total, true),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, bool isTotal) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.w600 : FontWeight.normal,
              color: Colors.black87,
            ),
          ),
          Text(
            '€${amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.w600 : FontWeight.normal,
              color: isTotal ? const Color(0xFF14ad9f) : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethods() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            spreadRadius: 0,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Zahlungsmethode',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 16),
          
          _buildPaymentMethodTile(
            'card',
            'Kreditkarte',
            Icons.credit_card,
            'Visa, Mastercard, American Express',
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTile(String value, String title, IconData icon, String subtitle) {
    // Nur Kreditkarte verfügbar, daher immer als ausgewählt anzeigen
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: const Color(0xFF14ad9f),
          width: 2,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: const Color(0xFF14ad9f),
            size: 24,
          ),
          
          const SizedBox(width: 12),
          
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF14ad9f),
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          
          const Icon(
            Icons.check_circle,
            color: Color(0xFF14ad9f),
            size: 24,
          ),
        ],
      ),
    );
  }

  Widget _buildPayButton(double total) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isProcessing ? null : () => _processPayment(total),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF14ad9f),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: _isProcessing
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Text(
                'Jetzt bezahlen €${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}.${date.month}.${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  Future<void> _processPayment(double total) async {
    setState(() => _isProcessing = true);
    
    try {
      // Hier würde die echte Stripe-Payment-Integration stattfinden
      // Für jetzt simulieren wir eine erfolgreiche Zahlung
      
      await Future.delayed(const Duration(seconds: 2));
      
      // Erfolgreich bezahlt - zeige Erfolg und navigiere zum Dashboard
      if (mounted) {
        _showPaymentSuccess(total);
      }
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Zahlung fehlgeschlagen: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  void _showPaymentSuccess(double total) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle,
              color: Color(0xFF14ad9f),
              size: 64,
            ),
            
            const SizedBox(height: 16),
            
            const Text(
              'Zahlung erfolgreich!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 8),
            
            Text(
              'Ihr Auftrag wurde erfolgreich erstellt und bezahlt.\nDer Service-Anbieter wird benachrichtigt.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
            
            const SizedBox(height: 24),
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(); // Dialog schließen
                  
                  // Zum Dashboard navigieren (Step 5)
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(
                      builder: (context) => const DashboardScreen(),
                    ),
                    (route) => false, // Alle vorherigen Routen entfernen
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF14ad9f),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Zum Dashboard',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
