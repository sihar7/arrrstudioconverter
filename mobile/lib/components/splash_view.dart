import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Layar pembuka selama halaman pertama dimuat.
class SplashView extends StatelessWidget {
  const SplashView({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Tokens.surfaceBase,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: Image.asset('assets/brand/logo.png', width: 96, height: 96),
            ),
            const SizedBox(height: 28),
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Tokens.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
