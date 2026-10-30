import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Garis progres tipis di atas saat pindah halaman.
class LoadingBar extends StatelessWidget {
  const LoadingBar({super.key, required this.progress});

  /// 0..1; bar hilang saat 1.
  final double progress;

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: progress < 1 ? 1 : 0,
      duration: Tokens.base,
      child: LinearProgressIndicator(
        value: progress,
        minHeight: 2,
        backgroundColor: Colors.transparent,
        color: Tokens.accent,
      ),
    );
  }
}
