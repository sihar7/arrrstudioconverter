import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/player_store.dart';
import '../theme/tokens.dart';
import '../theme/type.dart';
import 'buttons.dart';

/// Mini-player di atas bottom nav, muncul saat ada pratinjau aktif.
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.watch<PlayerStore>();
    return AnimatedSwitcher(
      duration: Tokens.motion(context, Tokens.base),
      transitionBuilder: (child, a) => SizeTransition(sizeFactor: a, alignment: Alignment.bottomCenter, child: FadeTransition(opacity: a, child: child)),
      child: !p.active
          ? const SizedBox.shrink()
          : Container(
              key: const ValueKey('mini'),
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              decoration: BoxDecoration(
                color: Tokens.surfaceSunken,
                borderRadius: BorderRadius.circular(Tokens.radiusMd),
                border: Border.all(color: Tokens.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 8, 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.bodyMd.copyWith(fontSize: 14)),
                              Text(p.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.bodySm.copyWith(fontSize: 12)),
                            ],
                          ),
                        ),
                        IconCircleButton(
                          icon: p.playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                          label: p.playing ? 'Jeda' : 'Putar',
                          filled: true,
                          size: 40,
                          onPressed: p.toggle,
                        ),
                        const SizedBox(width: 4),
                        IconCircleButton(icon: Icons.close_rounded, label: 'Tutup pemutar', size: 40, onPressed: p.stop),
                      ],
                    ),
                  ),
                  LinearProgressIndicator(value: p.fraction, minHeight: 2, backgroundColor: Colors.transparent),
                ],
              ),
            ),
    );
  }
}
