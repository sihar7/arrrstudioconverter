import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../components/buttons.dart';
import '../../../components/surfaces.dart';
import '../../../data/api_client.dart';
import '../../../data/repositories.dart';
import '../../../state/roblox_settings.dart';
import '../../../state/session_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';

/// Atur API key Open Cloud & Creator (user/grup). Key dicek ke server lalu disimpan di secure storage.
Future<void> showRobloxSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _RobloxSheet(),
    );

class _RobloxSheet extends StatefulWidget {
  const _RobloxSheet();

  @override
  State<_RobloxSheet> createState() => _RobloxSheetState();
}

class _RobloxSheetState extends State<_RobloxSheet> {
  late final RobloxSettings _s = context.read<RobloxSettings>();
  late final _key = TextEditingController(text: _s.apiKey);
  late final _id = TextEditingController(text: _s.creatorId);
  late String _type = _s.creatorType;
  bool _busy = false, _obscure = true;
  String? _keyError, _idError;

  @override
  void dispose() {
    _key.dispose();
    _id.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final key = _key.text.trim();
    var id = _id.text.trim();
    setState(() {
      _keyError = key.length < 20 ? 'API key tidak valid' : null;
      _idError = null;
    });
    if (_keyError != null) return;

    setState(() => _busy = true);
    try {
      final info = await RobloxRepo(context.read<SessionStore>().api).checkKey(key);
      if (!info.ok) {
        setState(() => _keyError = 'Key belum aktif atau scope asset:read/write kurang');
        return;
      }
      // Creator user kosong → pakai pemilik key
      if (id.isEmpty && _type == 'user' && info.ownerId != null) id = info.ownerId!;
      if (!RegExp(r'^\d{1,20}$').hasMatch(id)) {
        setState(() => _idError = 'Isi ${_type == 'user' ? 'User' : 'Group'} ID (angka)');
        return;
      }
      await _s.save(apiKey: key, creatorType: _type, creatorId: id);
      if (mounted) Navigator.pop(context);
    } on ApiException catch (e) {
      if (mounted) setState(() => _keyError = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _deco(String hint, String? error, {Widget? suffix}) => InputDecoration(
        hintText: hint,
        hintStyle: AppType.bodyMd.copyWith(color: Tokens.textTertiary, fontWeight: FontWeight.w400),
        errorText: error,
        filled: true,
        fillColor: Tokens.surfaceSunken,
        suffixIcon: suffix,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.radiusMd), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Tokens.radiusMd),
          borderSide: const BorderSide(color: Tokens.focusRing, width: 1.5),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, 24 + inset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Akun Roblox', style: AppType.title),
          const SizedBox(height: 4),
          Text('Buat API key di create.roblox.com → Open Cloud, scope asset:read & asset:write. Key hanya disimpan di HP ini.',
              style: AppType.bodySm),
          const SizedBox(height: 20),
          Text('API KEY', style: AppType.eyebrow),
          const SizedBox(height: 8),
          TextField(
            controller: _key,
            obscureText: _obscure,
            autocorrect: false,
            enableSuggestions: false,
            style: AppType.bodyMd,
            decoration: _deco(
              'Tempel API key',
              _keyError,
              suffix: IconButton(
                tooltip: _obscure ? 'Tampilkan key' : 'Sembunyikan key',
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: Tokens.textSecondary),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text('UPLOAD SEBAGAI', style: AppType.eyebrow),
          const SizedBox(height: 8),
          Row(children: [
            ChoiceChipPill(label: 'Akun saya', selected: _type == 'user', onTap: () => setState(() => _type = 'user')),
            const SizedBox(width: 8),
            ChoiceChipPill(label: 'Grup', selected: _type == 'group', onTap: () => setState(() => _type = 'group')),
          ]),
          const SizedBox(height: 12),
          TextField(
            controller: _id,
            keyboardType: TextInputType.number,
            style: AppType.bodyMd,
            decoration: _deco(_type == 'user' ? 'User ID (kosongkan = pemilik key)' : 'Group ID', _idError),
          ),
          const SizedBox(height: 20),
          PrimaryButton(label: 'Cek & simpan', expand: true, loading: _busy, onPressed: _save),
        ],
      ),
    );
  }
}
