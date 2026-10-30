import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../theme/type.dart';
import 'pressable.dart';

/// Tombol primer: pill silver berkilau + glow lembut, label mono + chevron (gaya referensi).
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
    this.expand = false,
    this.chevron = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading, expand, chevron;

  @override
  Widget build(BuildContext context) {
    final body = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading)
          const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Tokens.textOnAccent))
        else if (icon != null)
          Icon(icon, size: 18, color: Tokens.textOnAccent),
        if (loading || icon != null) const SizedBox(width: 10),
        Flexible(
          child: Text(label, overflow: TextOverflow.ellipsis, style: AppType.label.copyWith(color: Tokens.textOnAccent)),
        ),
        if (chevron && !loading) ...[
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right_rounded, size: 18, color: Tokens.textOnAccent),
        ],
      ],
    );
    return Pressable(
      label: label,
      haptic: true,
      onTap: loading ? null : onPressed,
      child: Container(
        height: Tokens.touch,
        padding: const EdgeInsets.symmetric(horizontal: 22),
        decoration: BoxDecoration(
          gradient: Tokens.silverSheen,
          borderRadius: BorderRadius.circular(Tokens.radiusPill),
          boxShadow: onPressed == null ? null : Tokens.glow(),
        ),
        child: body,
      ),
    );
  }
}

/// Tombol sekunder: pill gelap tenggelam, tanpa outline.
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({super.key, required this.label, this.onPressed, this.icon, this.danger = false, this.expand = false});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool danger, expand;

  @override
  Widget build(BuildContext context) {
    final color = danger ? Tokens.danger : Tokens.textPrimary;
    return Pressable(
      label: label,
      onTap: onPressed,
      child: Container(
        height: Tokens.touch,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(color: Tokens.surfaceSunken, borderRadius: BorderRadius.circular(Tokens.radiusPill)),
        child: Row(
          mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[Icon(icon, size: 18, color: color), const SizedBox(width: 10)],
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: AppType.label.copyWith(color: color))),
          ],
        ),
      ),
    );
  }
}

/// Tombol ikon bulat 44px (target sentuh penuh) dengan label aksesibilitas wajib.
class IconCircleButton extends StatelessWidget {
  const IconCircleButton({super.key, required this.icon, required this.label, this.onPressed, this.filled = false, this.size = 44});

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final bool filled;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      label: label,
      onTap: onPressed,
      scale: .9,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: filled ? null : Tokens.surfaceSunken,
          gradient: filled ? Tokens.silverSheen : null,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: size * .42, color: filled ? Tokens.textOnAccent : Tokens.textPrimary),
      ),
    );
  }
}
