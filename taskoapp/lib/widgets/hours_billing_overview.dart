import 'package:flutter/material.dart';
import '../utils/colors.dart';
import 'dart:ui';

class HoursBillingOverview extends StatelessWidget {
  final String orderId;
  final double originalHours;
  final double originalPrice;
  final double additionalHoursPaid;
  final double additionalPricePaid;
  final double pendingHours;
  final double pendingPrice;
  final double loggedHours;
  final double plannedHours;
  final double additionalHours;
  final double totalCost;
  final VoidCallback? onPaymentRequest;

  const HoursBillingOverview({
    super.key,
    required this.orderId,
    required this.originalHours,
    required this.originalPrice,
    required this.additionalHoursPaid,
    required this.additionalPricePaid,
    required this.pendingHours,
    required this.pendingPrice,
    required this.loggedHours,
    required this.plannedHours,
    required this.additionalHours,
    required this.totalCost,
    this.onPaymentRequest,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      color: Colors.white,
                      size: 24,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Stundenabrechnung & Zahlungsübersicht',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          shadows: [
                            Shadow(
                              color: Colors.black26,
                              offset: Offset(0, 1),
                              blurRadius: 2,
                            ),
                          ],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // GRUNDAUFTRAG Section
                _buildPaymentSection(
                  title: 'GRUNDAUFTRAG',
                  subtitle: 'Original geplant',
                  hours: originalHours,
                  price: originalPrice,
                  status: 'bezahlt',
                  icon: Icons.check_circle,
                  statusColor: Colors.lightGreen.shade300, // Helleres Grün für bessere Lesbarkeit
                  backgroundColor: Colors.green.shade50,
                ),

                const SizedBox(height: 12),

                // BEZAHLT Section  
                _buildPaymentSection(
                  title: 'BEZAHLT',
                  subtitle: 'Zusätzliche Stunden',
                  hours: additionalHoursPaid,
                  price: additionalPricePaid,
                  status: 'bezahlt',
                  icon: Icons.check_circle,
                  statusColor: Colors.lightGreen.shade300, // Helleres Grün für bessere Lesbarkeit
                  backgroundColor: Colors.green.shade50,
                ),

                const SizedBox(height: 12),

                // OFFEN Section
                _buildPaymentSection(
                  title: 'OFFEN',
                  subtitle: 'Ausstehende Zahlung',
                  hours: pendingHours,
                  price: pendingPrice,
                  status: 'offen',
                  icon: Icons.pending,
                  statusColor: Colors.orange,
                  backgroundColor: Colors.orange.shade50,
                  showPayButton: pendingPrice > 0,
                ),

                const SizedBox(height: 20),

                // Gesamtkosten
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Gesamtkosten',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '€${totalCost.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Stunden-Zusammenfassung
                _buildHoursSummary(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentSection({
    required String title,
    required String subtitle,
    required double hours,
    required double price,
    required String status,
    required IconData icon,
    required Color statusColor,
    required Color backgroundColor,
    bool showPayButton = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title and Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: statusColor, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: Colors.white.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 12),
          
          // Hours and Price
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${hours.toStringAsFixed(0)}h',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Stunden',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '€${price.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  if (showPayButton && onPaymentRequest != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: SizedBox(
                        height: 32,
                        child: ElevatedButton(
                          onPressed: onPaymentRequest,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: TaskiloColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: const Text(
                            'Jetzt bezahlen',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHoursSummary() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Stunden-Übersicht',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          _buildSummaryRow('Geloggte Stunden', loggedHours, Colors.blue),
          const SizedBox(height: 8),
          _buildSummaryRow('Geplant war', plannedHours, Colors.grey),
          const SizedBox(height: 8),
          _buildSummaryRow('Zusätzlich', additionalHours, 
              additionalHours >= 0 ? Colors.red : Colors.green, showSign: true),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, double hours, Color color, {bool showSign = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.8),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Text(
          '${showSign && hours > 0 ? '+' : ''}${hours.toStringAsFixed(0)}h',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ],
    );
  }
}
