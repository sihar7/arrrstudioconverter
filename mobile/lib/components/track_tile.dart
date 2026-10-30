import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../theme/type.dart';
import 'pressable.dart';
import 'surfaces.dart';

/// Baris lagu: cover, judul, subjudul (+ progres opsional), aksi kanan.
class TrackTile extends StatelessWidget {
  const TrackTile({
    super.key,
    required this.thumbnail,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
    this.progress,
    this.subtitleColor,
    this.wideThumb = false,
  });

  final String thumbnail, title, subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  /// 0..1 → bar progres tipis di bawah subjudul.
  final double? progress;
  final Color? subtitleColor;
  final bool wideThumb;

  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: 10),
      child: Row(
        children: [
          NetThumb(thumbnail, size: 56, aspect: wideThumb ? 16 / 9 : 1),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppType.bodyMd),
                const SizedBox(height: 3),
                Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.bodySm.copyWith(color: subtitleColor)),
                if (progress != null) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(end: progress!.clamp(0, 1)),
                      duration: Tokens.motion(context, Tokens.slow),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, _) => LinearProgressIndicator(value: v, minHeight: 3),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 8), trailing!],
        ],
      ),
    );
    return onTap == null ? row : Pressable(onTap: onTap, scale: .98, label: title, child: row);
  }
}

String formatDuration(num? seconds) {
  if (seconds == null) return '';
  final s = seconds.round();
  final h = s ~/ 3600, m = (s % 3600) ~/ 60, r = s % 60;
  final mm = h > 0 ? m.toString().padLeft(2, '0') : '$m';
  return '${h > 0 ? '$h:' : ''}$mm:${r.toString().padLeft(2, '0')}';
}

String formatBytes(int bytes) {
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
  return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
}
