import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../theme/type.dart';

/// Judul dua nada ala referensi: bagian pertama terang, sisanya abu ("Convert lagu. siap Roblox.").
class TwoToneTitle extends StatelessWidget {
  const TwoToneTitle(this.lead, this.rest, {super.key, this.style = AppType.hero});

  final String lead, rest;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Text.rich(
        TextSpan(children: [
          TextSpan(text: lead, style: style),
          TextSpan(text: ' $rest', style: style.copyWith(color: Tokens.textTertiary)),
        ]),
      ),
    );
  }
}

/// Label kecil mono di atas section, opsional dot "live" berdenyut.
class Eyebrow extends StatefulWidget {
  const Eyebrow(this.text, {super.key, this.live = false});
  final String text;
  final bool live;

  @override
  State<Eyebrow> createState() => _EyebrowState();
}

class _EyebrowState extends State<Eyebrow> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.of(context).disableAnimations;
    if (widget.live && !reduce) {
      _c.repeat(reverse: true);
    } else {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.live) ...[
          FadeTransition(
            opacity: Tween(begin: .35, end: 1.0).animate(_c),
            child: Container(width: 6, height: 6, decoration: const BoxDecoration(color: Tokens.accent, shape: BoxShape.circle)),
          ),
          const SizedBox(width: 8),
        ],
        Text(widget.text.toUpperCase(), style: AppType.eyebrow),
      ],
    );
  }
}

/// Header section: eyebrow + judul + aksi opsional di kanan.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.eyebrow, this.trailing});
  final String title;
  final String? eyebrow;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[Eyebrow(eyebrow!), const SizedBox(height: 6)],
              Semantics(header: true, child: Text(title, style: AppType.heading)),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
