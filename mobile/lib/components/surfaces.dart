import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../theme/type.dart';
import 'buttons.dart';

/// Kartu permukaan terangkat. Kedalaman lewat tone, bukan garis.
class SurfaceCard extends StatelessWidget {
  const SurfaceCard({super.key, required this.child, this.padding = const EdgeInsets.all(20), this.outlined = false});
  final Widget child;
  final EdgeInsets padding;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: Tokens.surfaceRaised,
        borderRadius: BorderRadius.circular(Tokens.radiusLg),
        border: outlined ? Border.all(color: Tokens.border) : null,
      ),
      child: child,
    );
  }
}

/// Pendar silver di belakang hero — versi tenang dari "light beam" referensi. Murni dekoratif.
class GlowBackdrop extends StatelessWidget {
  const GlowBackdrop({super.key, this.height = 360});
  final double height;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: IgnorePointer(
        child: SizedBox(
          height: height,
          width: double.infinity,
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: const Alignment(.7, -1.15),
                      radius: 1.2,
                      colors: [Tokens.accentStrong.withValues(alpha: .16), Tokens.surfaceBase.withValues(alpha: 0)],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Empty state: ikon dalam tile + judul + subjudul + aksi opsional.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.action, this.onAction});
  final IconData icon;
  final String title, message;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(color: Tokens.surfaceRaised, borderRadius: BorderRadius.circular(Tokens.radiusMd)),
            child: Icon(icon, color: Tokens.accent, size: 26),
          ),
          const SizedBox(height: 18),
          Text(title, textAlign: TextAlign.center, style: AppType.heading),
          const SizedBox(height: 6),
          Text(message, textAlign: TextAlign.center, style: AppType.bodySm),
          if (action != null) ...[
            const SizedBox(height: 20),
            PrimaryButton(label: action!, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}

/// Chip pill (pilihan preset/format). Terpilih = silver, terkunci = ikon gembok.
class ChoiceChipPill extends StatelessWidget {
  const ChoiceChipPill({super.key, required this.label, required this.selected, this.locked = false, this.onTap});
  final String label;
  final bool selected, locked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Tokens.textOnAccent : (locked ? Tokens.textTertiary : Tokens.textPrimary);
    return Semantics(
      selected: selected,
      button: true,
      label: locked ? '$label, terkunci di plan ini' : label,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: Tokens.motion(context, Tokens.fast),
          constraints: const BoxConstraints(minHeight: 40),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: selected ? null : Tokens.surfaceSunken,
            gradient: selected ? Tokens.silverSheen : null,
            borderRadius: BorderRadius.circular(Tokens.radiusPill),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (locked) ...[Icon(Icons.lock_outline_rounded, size: 14, color: fg), const SizedBox(width: 6)],
              Text(label, style: AppType.bodySm.copyWith(color: fg, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Gambar jaringan dengan placeholder tone (tanpa layout shift).
class NetThumb extends StatelessWidget {
  const NetThumb(this.url, {super.key, this.size = 56, this.radius = Tokens.radiusSm, this.aspect = 1});
  final String url;
  final double size, radius, aspect;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: SizedBox(
        width: size * aspect,
        height: size,
        child: url.isEmpty
            ? const ColoredBox(color: Tokens.surfaceSunken, child: Icon(Icons.music_note_rounded, color: Tokens.textTertiary))
            : Image.network(
                url,
                fit: BoxFit.cover,
                cacheWidth: (size * aspect * 3).round(),
                errorBuilder: (_, _, _) => const ColoredBox(color: Tokens.surfaceSunken),
                frameBuilder: (_, child, frame, sync) => frame == null && !sync ? const ColoredBox(color: Tokens.surfaceSunken) : child,
              ),
      ),
    );
  }
}
