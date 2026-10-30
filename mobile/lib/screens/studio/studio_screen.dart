import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../components/buttons.dart';
import '../../components/surfaces.dart';
import '../../components/toast.dart';
import '../../components/typography.dart';
import '../../data/audio_options.dart';
import '../../data/models.dart';
import '../../state/queue_store.dart';
import '../../state/session_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import 'widgets/link_field.dart';
import 'widgets/options_sheet.dart';
import 'widgets/queue_tile.dart';
import 'widgets/quota_chip.dart';
import '../../theme/app_icons.dart';

/// Studio: tempel link → pilih gaya → convert. Antrean tampil langsung di bawah.
class StudioScreen extends StatelessWidget {
  const StudioScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final q = context.watch<QueueStore>();
    final limits = context.select<SessionStore, PlanLimits>((s) => s.limits);
    final pad = MediaQuery.paddingOf(context);

    return Stack(
      children: [
        const GlowBackdrop(),
        CustomScrollView(
          slivers: [
            SliverPadding(
              padding: EdgeInsets.fromLTRB(Tokens.gutter, pad.top + 12, Tokens.gutter, 0),
              sliver: SliverList.list(children: [
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.asset('assets/brand/logo.png', width: 36, height: 36),
                    ),
                    const SizedBox(width: 10),
                    Text('ARRR', style: AppType.heading.copyWith(fontSize: 17)),
                    const Spacer(),
                    const QuotaChip(),
                  ],
                ),
                const SizedBox(height: 36),
                const Eyebrow('Studio audio', live: true),
                const SizedBox(height: 14),
                const TwoToneTitle('Convert lagu,', 'langsung siap Roblox.'),
                const SizedBox(height: 12),
                Text('Tempel link YouTube atau playlist. Pilih gaya, lalu upload ke Roblox dari Pustaka.', style: AppType.bodyLg),
                const SizedBox(height: 24),
                const LinkField(),
                const SizedBox(height: 28),
                SectionHeader(
                  eyebrow: 'Gaya',
                  title: 'Preset',
                  trailing: SecondaryButton(
                    label: 'Atur',
                    icon: AppIcons.slidersHorizontal,
                    onPressed: () => showOptionsSheet(context),
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final p in Preset.all)
                      ChoiceChipPill(
                        label: p.label,
                        selected: q.presetId == p.id,
                        locked: !p.allowed(limits),
                        onTap: () {
                          if (!p.allowed(limits)) return showToast(context, '${p.label} tersedia di plan lebih tinggi');
                          HapticFeedback.selectionClick();
                          q.applyPreset(p);
                        },
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(_summary(q.options), style: AppType.tabular),
                const SizedBox(height: 32),
                SectionHeader(
                  eyebrow: q.runningCount > 0 ? 'Berjalan ${q.runningCount}' : 'Antrean',
                  title: q.items.isEmpty ? 'Antrean kosong' : '${q.items.length} lagu',
                  trailing: q.items.any((i) => i.status == ItemStatus.done || i.status == ItemStatus.error)
                      ? TextButton(onPressed: q.clearFinished, child: Text('Bersihkan', style: AppType.label.copyWith(color: Tokens.textSecondary)))
                      : null,
                ),
                const SizedBox(height: 8),
              ]),
            ),
            if (q.items.isEmpty)
              const SliverToBoxAdapter(
                child: EmptyState(
                  icon: AppIcons.musicNotesPlus,
                  title: 'Belum ada lagu',
                  message: 'Tempel link di atas, atau cari lagu di tab Cari.',
                ),
              )
            else
              SliverList.builder(
                itemCount: q.items.length,
                itemBuilder: (_, i) => QueueTile(item: q.items[i]),
              ),
            SliverToBoxAdapter(child: SizedBox(height: q.readyCount > 0 ? 96 : 24)),
          ],
        ),
        if (q.readyCount > 0)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: IgnorePointer(
              child: Container(
                height: 96,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Tokens.surfaceBase.withValues(alpha: 0), Tokens.surfaceBase],
                    stops: const [0, .55],
                  ),
                ),
              ),
            ),
          ),
        if (q.readyCount > 0)
          Positioned(
            left: Tokens.gutter,
            right: Tokens.gutter,
            bottom: 16,
            child: PrimaryButton(
              label: 'Convert ${q.readyCount} lagu',
              icon: AppIcons.lightning,
              expand: true,
              onPressed: q.runAll,
            ),
          ),
      ],
    );
  }

  static String _summary(AudioOptions o) {
    final parts = [
      o.format.toUpperCase(),
      '${o.bitrate} kbps',
      '${o.speed.toStringAsFixed(2)}×',
      if (o.pitch != 0) '${o.pitch > 0 ? '+' : ''}${o.pitch.toStringAsFixed(1)} st',
      if (o.bass != 0) 'bass +${o.bass.toStringAsFixed(0)}',
      if (o.reverb != 0) 'reverb ${o.reverb.toStringAsFixed(0)}%',
      if (o.spatial8d) '8D',
    ];
    return parts.join('  ·  ');
  }
}
