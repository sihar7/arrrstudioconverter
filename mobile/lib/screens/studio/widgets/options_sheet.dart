import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../components/surfaces.dart';
import '../../../components/toast.dart';
import '../../../state/queue_store.dart';
import '../../../state/session_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';

/// Pengaturan detail: format, bitrate, kecepatan, nada, efek — dibatasi sesuai plan.
Future<void> showOptionsSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _OptionsSheet(),
    );

class _OptionsSheet extends StatelessWidget {
  const _OptionsSheet();

  static const _bitrates = [96, 128, 192, 256, 320];
  static const _allFormats = ['mp3', 'ogg', 'm4a', 'wav', 'flac'];

  @override
  Widget build(BuildContext context) {
    final q = context.watch<QueueStore>();
    final p = context.watch<SessionStore>().limits;
    final o = q.options;

    void locked(String what) => showToast(context, '$what tersedia di plan lebih tinggi');

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: .78,
      maxChildSize: .94,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, 32),
        children: [
          Text('Pengaturan audio', style: AppType.title),
          const SizedBox(height: 4),
          Text('Plan ${p.id.toUpperCase()} · opsi terkunci butuh plan lebih tinggi', style: AppType.bodySm),
          const SizedBox(height: 24),
          _Label('Format'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final f in _allFormats)
              ChoiceChipPill(
                label: f.toUpperCase(),
                selected: o.format == f,
                locked: !p.formats.contains(f),
                onTap: () => p.formats.contains(f) ? q.setOptions(o.copyWith(format: f)) : locked(f.toUpperCase()),
              ),
          ]),
          if (o.format == 'm4a') ...[
            const SizedBox(height: 8),
            Text('M4A tidak bisa diupload ke Roblox — pakai MP3/OGG untuk Roblox.', style: AppType.bodySm.copyWith(color: Tokens.danger)),
          ],
          const SizedBox(height: 22),
          _Label('Bitrate'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final b in _bitrates)
              ChoiceChipPill(
                label: '$b',
                selected: o.bitrate == b,
                locked: b > p.maxBitrate,
                onTap: () => b > p.maxBitrate ? locked('$b kbps') : q.setOptions(o.copyWith(bitrate: b)),
              ),
          ]),
          const SizedBox(height: 22),
          _SliderRow(
            label: 'Kecepatan',
            value: o.speed,
            min: p.speed.$1,
            max: p.speed.$2,
            divisions: ((p.speed.$2 - p.speed.$1) / .05).round(),
            format: (v) => '${v.toStringAsFixed(2)}×',
            onChanged: (v) => q.setOptions(o.copyWith(speed: v)),
          ),
          _SwitchRow(
            label: 'Pertahankan nada',
            hint: 'Mati = gaya piringan (nightcore/slowed)',
            value: o.preservePitch,
            onChanged: (v) => q.setOptions(o.copyWith(preservePitch: v)),
          ),
          _SliderRow(
            label: 'Nada',
            value: o.pitch,
            min: -p.pitch,
            max: p.pitch,
            divisions: (p.pitch * 4).round().clamp(1, 200),
            format: (v) => '${v > 0 ? '+' : ''}${v.toStringAsFixed(1)} st',
            onChanged: (v) => q.setOptions(o.copyWith(pitch: v)),
          ),
          _SliderRow(
            label: 'Bass',
            value: o.bass,
            min: 0,
            max: 12,
            divisions: 24,
            enabled: p.effects.contains('eq'),
            onLocked: () => locked('Bass'),
            format: (v) => '+${v.toStringAsFixed(1)} dB',
            onChanged: (v) => q.setOptions(o.copyWith(bass: v)),
          ),
          _SliderRow(
            label: 'Reverb',
            value: o.reverb,
            min: 0,
            max: 60,
            divisions: 60,
            enabled: p.effects.contains('reverb'),
            onLocked: () => locked('Reverb'),
            format: (v) => '${v.toStringAsFixed(0)}%',
            onChanged: (v) => q.setOptions(o.copyWith(reverb: v)),
          ),
          _SwitchRow(
            label: 'Audio 8D',
            hint: 'Suara berputar di sekitar kepala',
            value: o.spatial8d,
            enabled: p.effects.contains('spatial8d'),
            onLocked: () => locked('8D'),
            onChanged: (v) => q.setOptions(o.copyWith(spatial8d: v)),
          ),
          _SwitchRow(
            label: 'Normalisasi volume',
            hint: 'Ratakan kekerasan suara',
            value: o.normalize,
            onChanged: (v) => q.setOptions(o.copyWith(normalize: v)),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) =>
      Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(text.toUpperCase(), style: AppType.eyebrow));
}

class _SliderRow extends StatelessWidget {
  const _SliderRow({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.divisions,
    required this.format,
    required this.onChanged,
    this.enabled = true,
    this.onLocked,
  });
  final String label;
  final double value, min, max;
  final int divisions;
  final String Function(double) format;
  final ValueChanged<double> onChanged;
  final bool enabled;
  final VoidCallback? onLocked;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? null : onLocked,
      child: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Text(label, style: AppType.bodyMd.copyWith(color: enabled ? Tokens.textPrimary : Tokens.textTertiary)),
              if (!enabled) ...[const SizedBox(width: 6), const Icon(Icons.lock_outline_rounded, size: 14, color: Tokens.textTertiary)],
              const Spacer(),
              Text(format(value), style: AppType.tabular),
            ]),
            Slider(
              value: value.clamp(min, max),
              min: min,
              max: max <= min ? min + 1 : max,
              divisions: divisions < 1 ? 1 : divisions,
              label: format(value),
              semanticFormatterCallback: format,
              onChanged: enabled ? onChanged : null,
            ),
          ],
        ),
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  const _SwitchRow({required this.label, required this.hint, required this.value, required this.onChanged, this.enabled = true, this.onLocked});
  final String label, hint;
  final bool value, enabled;
  final ValueChanged<bool> onChanged;
  final VoidCallback? onLocked;

  @override
  Widget build(BuildContext context) {
    return MergeSemantics(
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        onTap: enabled ? () => onChanged(!value) : onLocked,
        title: Row(children: [
          Text(label, style: AppType.bodyMd.copyWith(color: enabled ? Tokens.textPrimary : Tokens.textTertiary)),
          if (!enabled) ...[const SizedBox(width: 6), const Icon(Icons.lock_outline_rounded, size: 14, color: Tokens.textTertiary)],
        ]),
        subtitle: Text(hint, style: AppType.bodySm),
        trailing: Switch(
          value: value && enabled,
          onChanged: enabled ? onChanged : null,
          activeThumbColor: Tokens.textOnAccent,
          activeTrackColor: Tokens.accent,
          inactiveThumbColor: Tokens.textSecondary,
          inactiveTrackColor: Tokens.surfaceSunken,
          trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
        ),
      ),
    );
  }
}
