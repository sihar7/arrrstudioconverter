import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../components/buttons.dart';
import '../../../components/surfaces.dart';
import '../../../components/toast.dart';
import '../../../data/api_client.dart';
import '../../../data/models.dart';
import '../../../data/repositories.dart';
import '../../../state/roblox_settings.dart';
import '../../../state/session_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';
import '../../account/widgets/roblox_sheet.dart';

/// Upload satu lagu ke Roblox (Open Cloud) memakai API key tersimpan.
Future<void> showUploadSheet(BuildContext context, HistoryItem it, {required VoidCallback onDone}) {
  final settings = context.read<RobloxSettings>();
  if (!settings.ready) {
    showToast(context, 'Isi API key & Creator ID Roblox dulu');
    return showRobloxSheet(context);
  }
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _UploadSheet(item: it, onDone: onDone),
  );
}

class _UploadSheet extends StatefulWidget {
  const _UploadSheet({required this.item, required this.onDone});
  final HistoryItem item;
  final VoidCallback onDone;

  @override
  State<_UploadSheet> createState() => _UploadSheetState();
}

class _UploadSheetState extends State<_UploadSheet> {
  late final _name = TextEditingController(text: widget.item.title.length > 50 ? widget.item.title.substring(0, 50) : widget.item.title);
  bool _busy = false;
  String? _assetId;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _upload() async {
    final name = _name.text.trim();
    if (name.isEmpty) return setState(() => _error = 'Nama aset wajib diisi');
    final s = context.read<RobloxSettings>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await RobloxRepo(context.read<SessionStore>().api).upload(
        apiKey: s.apiKey,
        fileId: widget.item.fileId,
        creatorType: s.creatorType,
        creatorId: s.creatorId,
        displayName: name,
        historyId: widget.item.id,
      );
      if (!mounted) return;
      setState(() => _assetId = id ?? 'diproses');
      widget.onDone();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, 24 + inset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Upload ke Roblox', style: AppType.title),
          const SizedBox(height: 4),
          Text('Audio akan melewati moderasi Roblox dulu (biasanya beberapa menit).', style: AppType.bodySm),
          const SizedBox(height: 20),
          if (_assetId != null) ...[
            SurfaceCard(
              child: Row(children: [
                const Icon(Icons.check_circle_rounded, color: Tokens.success),
                const SizedBox(width: 12),
                Expanded(child: Text('Terupload · ID $_assetId', style: AppType.bodyMd)),
                IconCircleButton(
                  icon: Icons.copy_rounded,
                  label: 'Salin ID aset',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: _assetId!));
                    showToast(context, 'ID aset disalin');
                  },
                ),
              ]),
            ),
            const SizedBox(height: 16),
            SecondaryButton(label: 'Tutup', expand: true, onPressed: () => Navigator.pop(context)),
          ] else ...[
            Text('NAMA ASET', style: AppType.eyebrow),
            const SizedBox(height: 8),
            TextField(
              controller: _name,
              maxLength: 50,
              style: AppType.bodyMd,
              decoration: InputDecoration(
                filled: true,
                fillColor: Tokens.surfaceSunken,
                counterStyle: AppType.tabular,
                errorText: _error,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.radiusMd), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Tokens.radiusMd),
                  borderSide: const BorderSide(color: Tokens.focusRing, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 12),
            PrimaryButton(label: 'Upload sekarang', expand: true, loading: _busy, onPressed: _upload),
          ],
        ],
      ),
    );
  }
}
