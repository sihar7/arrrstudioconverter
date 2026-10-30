import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/models.dart';
import '../../../state/session_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';

/// Chip sisa token di header: cincin progres + angka.
class QuotaChip extends StatelessWidget {
  const QuotaChip({super.key});

  @override
  Widget build(BuildContext context) {
    final q = context.select<SessionStore, Quota?>((s) => s.me?.quota);
    if (q == null) return const SizedBox(height: 32);
    final text = q.unlimited ? '∞ token' : '${q.remaining}/${q.limit} token';
    return Semantics(
      label: q.unlimited ? 'Token tanpa batas' : 'Sisa ${q.remaining} dari ${q.limit} token',
      excludeSemantics: true,
      child: Container(
        height: 32,
        padding: const EdgeInsets.only(left: 6, right: 12),
        decoration: BoxDecoration(color: Tokens.surfaceSunken, borderRadius: BorderRadius.circular(Tokens.radiusPill)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(value: q.fraction, strokeWidth: 2.5, backgroundColor: Tokens.border),
            ),
            const SizedBox(width: 8),
            Text(text, style: AppType.tabular.copyWith(color: Tokens.textPrimary)),
          ],
        ),
      ),
    );
  }
}
