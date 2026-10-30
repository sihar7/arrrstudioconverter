import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../components/buttons.dart';
import '../../../components/toast.dart';
import '../../../components/track_tile.dart';
import '../../../config/app_config.dart';
import '../../../state/player_store.dart';
import '../../../state/queue_store.dart';
import '../../../state/session_store.dart';
import '../../../services/download_service.dart';
import '../../../theme/tokens.dart';
import '../../../theme/app_icons.dart';

/// Item antrean: status + progres; selesai → putar & simpan; gagal → coba lagi. Geser untuk hapus.
class QueueTile extends StatelessWidget {
  const QueueTile({super.key, required this.item});
  final QueueItem item;

  @override
  Widget build(BuildContext context) {
    final q = context.read<QueueStore>();
    final v = item.video;
    final result = item.job?.result;

    final (String subtitle, Color? color) = switch (item.status) {
      ItemStatus.ready => ([v.author, formatDuration(v.duration)].where((s) => s.isNotEmpty).join(' · '), null),
      ItemStatus.running => ('${item.stage} · ${item.progress}%', Tokens.textPrimary),
      ItemStatus.done => ('Selesai · ${result?.format.toUpperCase()} · ${formatBytes(result?.size ?? 0)}', Tokens.success),
      ItemStatus.error => (item.error ?? 'Gagal', Tokens.danger),
    };

    final Widget trailing = switch (item.status) {
      ItemStatus.ready => IconCircleButton(icon: AppIcons.x, label: 'Hapus dari antrean', onPressed: () => q.remove(item)),
      ItemStatus.running => const SizedBox(width: 44),
      ItemStatus.error => IconCircleButton(icon: AppIcons.arrowClockwise, label: 'Coba lagi', onPressed: () => q.retry(item)),
      ItemStatus.done => Row(mainAxisSize: MainAxisSize.min, children: [
          IconCircleButton(
            icon: AppIcons.playFill,
            label: 'Putar',
            onPressed: () => context.read<PlayerStore>().play(result!.fileId, title: v.title, subtitle: v.author),
          ),
          const SizedBox(width: 8),
          IconCircleButton(icon: AppIcons.downloadSimple, label: 'Simpan file', filled: true, onPressed: () => _save(context)),
        ]),
    };

    return Dismissible(
      key: ValueKey(item.key),
      direction: item.busy ? DismissDirection.none : DismissDirection.endToStart,
      onDismissed: (_) => q.remove(item),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 28),
        color: Tokens.danger.withValues(alpha: .15),
        child: const Icon(AppIcons.trash, color: Tokens.danger),
      ),
      child: TrackTile(
        thumbnail: v.thumbnail,
        title: v.title,
        subtitle: subtitle,
        subtitleColor: color,
        wideThumb: true,
        progress: item.busy ? item.progress / 100 : null,
        trailing: trailing,
      ),
    );
  }

  Future<void> _save(BuildContext context) async {
    final r = item.job!.result!;
    showToast(context, 'Menyiapkan ${r.filename}…');
    final api = context.read<SessionStore>().api;
    final ok = await DownloadService.saveRemote(Uri.parse('${AppConfig.api('/files/${r.fileId}')}?dl=1'), r.filename, api.authHeaders);
    if (!ok && context.mounted) showToast(context, 'Gagal menyimpan — file mungkin sudah kedaluwarsa');
  }
}
