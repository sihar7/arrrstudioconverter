import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../components/surfaces.dart';
import '../../../components/toast.dart';
import '../../../config/app_config.dart';
import '../../../data/api_client.dart';
import '../../../data/models.dart';
import '../../../data/repositories.dart';
import '../../../services/download_service.dart';
import '../../../state/player_store.dart';
import '../../../state/session_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';
import 'upload_sheet.dart';
import '../../../theme/app_icons.dart';

/// Aksi satu item pustaka. Aksi berbahaya (hapus) dipisah di bawah & berwarna danger.
Future<void> showItemActions(BuildContext context, HistoryItem it, {required VoidCallback onChanged}) =>
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (sheet) {
        void close() => Navigator.pop(sheet);
        final api = context.read<SessionStore>().api;
        final assetId = it.roblox?.assetId;
        return Padding(
          padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                NetThumb(it.thumbnail, size: 52),
                const SizedBox(width: 14),
                Expanded(child: Text(it.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppType.heading.copyWith(fontSize: 16))),
              ]),
              const SizedBox(height: 16),
              if (it.fileAvailable) ...[
                _Action(AppIcons.play, 'Putar pratinjau', () {
                  close();
                  context.read<PlayerStore>().play(it.fileId, title: it.title, subtitle: it.artist ?? '');
                }),
                _Action(AppIcons.downloadSimple, 'Simpan ke perangkat', () async {
                  close();
                  final ok = await DownloadService.saveRemote(
                    Uri.parse('${AppConfig.api('/files/${it.fileId}')}?dl=1'),
                    '${it.title}.${it.format}',
                    api.authHeaders,
                  );
                  if (!ok && context.mounted) showToast(context, 'Gagal menyimpan file');
                }),
                if (assetId == null && it.robloxReady)
                  _Action(AppIcons.uploadSimple, 'Upload ke Roblox', () {
                    close();
                    showUploadSheet(context, it, onDone: onChanged);
                  }),
              ] else
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text('File sudah kedaluwarsa di server — convert ulang untuk memutar atau upload.', style: AppType.bodySm),
                ),
              if (assetId != null)
                _Action(AppIcons.copy, 'Salin ID aset ($assetId)', () {
                  Clipboard.setData(ClipboardData(text: assetId));
                  close();
                  showToast(context, 'ID aset disalin');
                }),
              const Divider(color: Tokens.border, height: 24),
              _Action(AppIcons.trash, 'Hapus dari pustaka', () async {
                close();
                try {
                  await LibraryRepo(api).remove([it.id]);
                  onChanged();
                } on ApiException catch (e) {
                  if (context.mounted) showToast(context, e.message);
                }
              }, danger: true),
            ],
          ),
        );
      },
    );

class _Action extends StatelessWidget {
  const _Action(this.icon, this.label, this.onTap, {this.danger = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final c = danger ? Tokens.danger : Tokens.textPrimary;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      minTileHeight: 52,
      leading: Icon(icon, color: c, size: 22),
      title: Text(label, style: AppType.bodyMd.copyWith(color: c)),
      onTap: onTap,
    );
  }
}
