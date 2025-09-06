import 'package:flutter/material.dart';

/// Taskilo App Colors - Zentrale Farbdefinitionen
class TaskiloColors {
  // Primärfarben (Taskilo Branding)
  static const Color primary = Color(0xFF14ad9f); // Taskilo Türkis/Teal
  static const Color primaryLight = Color(0xFF129a8f);
  static const Color primaryDark = Color(0xFF129488);
  static const Color accent = Color(0xFF0f9d84);

  // Hintergrundfarben
  static const Color background = Color(0xFFF5F5F5);
  static const Color surface = Colors.white;

  // Status-Farben
  static const Color success = Color(0xFF14ad9f);
  static const Color error = Color(0xFFE53935);
  static const Color warning = Color(0xFFFF9800);
  static const Color info = Color(0xFF2196F3);

  // Text-Farben
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textLight = Color(0xFFBDBDBD);

  // Gradient-Farben
  static const List<Color> primaryGradient = [
    Color(0xFF14ad9f),
    Color(0xFF0891b2), // teal-600
    Color(0xFF2563eb), // blue-600
  ];

  // Status-spezifische Farben für Aufträge
  static const Color orderActive = Color(0xFF2196F3); // Blau
  static const Color orderCompleted = Color(0xFF4CAF50); // Grün
  static const Color orderCancelled = Color(0xFFE53935); // Rot
  static const Color orderPending = Color(0xFFFF9800); // Orange
  static const Color orderInProgress = Color(0xFF9C27B0); // Lila

  // Utility Methods
  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'aktiv':
      case 'in_bearbeitung':
        return orderActive;
      case 'abgeschlossen':
      case 'zahlung_erhalten_clearing':
        return orderCompleted;
      case 'storniert':
        return orderCancelled;
      case 'pending':
      case 'fehlende_details':
        return orderPending;
      default:
        return textSecondary;
    }
  }

  static String getStatusDisplayText(String status) {
    switch (status.toLowerCase()) {
      case 'aktiv':
        return 'Aktiv';
      case 'in_bearbeitung':
        return 'In Bearbeitung';
      case 'abgeschlossen':
        return 'Abgeschlossen';
      case 'zahlung_erhalten_clearing':
        return 'Bezahlt';
      case 'storniert':
        return 'Storniert';
      case 'fehlende_details':
        return 'Fehlende Details';
      case 'pending':
        return 'Ausstehend';
      case 'completed':
        return 'Abgeschlossen';
      default:
        return status;
    }
  }
}
