import 'package:flutter/material.dart';

class BottomActions extends StatelessWidget {
  const BottomActions({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              Navigator.pushNamed(context, '/login');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14ad9f),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
            ),
            child: const Text(
              'Jetzt Service buchen',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            Navigator.pushNamed(context, '/register');
          },
          child: const Text(
            'Service Anbieter werden',
            style: TextStyle(
              color: Color(0xFF14ad9f),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        // Responsive bottom spacing
        SizedBox(height: MediaQuery.of(context).viewPadding.bottom + 16),
      ],
    );
  }
}
