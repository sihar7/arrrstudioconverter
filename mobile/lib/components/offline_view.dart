import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'surfaces.dart';

/// Layar penuh saat server tidak terjangkau.
class OfflineView extends StatelessWidget {
  const OfflineView({super.key, required this.onRetry, this.message});

  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Tokens.surfaceBase,
      child: Center(
        child: EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'Tidak bisa terhubung',
          message: message ?? 'Periksa koneksi internet kamu, lalu coba lagi.',
          action: 'Coba lagi',
          onAction: onRetry,
        ),
      ),
    );
  }
}
