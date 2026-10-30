import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../components/surfaces.dart';
import '../../components/track_tile.dart';
import '../../components/typography.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/repositories.dart';
import '../../state/session_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import 'widgets/item_actions_sheet.dart';
import '../../theme/app_icons.dart';

/// Pustaka = riwayat convert milik akun: putar, simpan, upload ke Roblox, salin ID.
class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  late final LibraryRepo _repo = LibraryRepo(context.read<SessionStore>().api);
  List<HistoryItem>? _items;
  String? _error;
  bool? _lastLoggedIn;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Muat ulang saat status login berubah (masuk/keluar dari tab Akun)
    final loggedIn = context.watch<SessionStore>().loggedIn;
    if (loggedIn != _lastLoggedIn) {
      _lastLoggedIn = loggedIn;
      if (loggedIn) {
        _load();
      } else {
        _items = null;
      }
    }
  }

  Future<void> _load() async {
    try {
      final items = await _repo.history();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionStore>();
    final pad = MediaQuery.paddingOf(context);

    Widget body;
    if (!session.loggedIn) {
      body = SliverToBoxAdapter(
        child: EmptyState(
          icon: AppIcons.lockSimple,
          title: 'Masuk untuk melihat Pustaka',
          message: 'Riwayat convert & upload Roblox tersimpan di akun Discord kamu.',
          action: session.signingIn ? 'Membuka Discord…' : 'Masuk dengan Discord',
          onAction: () => session.login(),
        ),
      );
    } else if (_error != null) {
      body = SliverToBoxAdapter(child: EmptyState(icon: AppIcons.warningCircle, title: 'Gagal memuat', message: _error!, action: 'Coba lagi', onAction: _load));
    } else if (_items == null) {
      body = const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(48), child: Center(child: CircularProgressIndicator(strokeWidth: 2))));
    } else if (_items!.isEmpty) {
      body = const SliverToBoxAdapter(
        child: EmptyState(icon: AppIcons.books, title: 'Pustaka masih kosong', message: 'Hasil convert akan muncul di sini.'),
      );
    } else {
      body = SliverList.builder(
        itemCount: _items!.length,
        itemBuilder: (_, i) {
          final it = _items![i];
          return TrackTile(
            thumbnail: it.thumbnail,
            title: it.title,
            subtitle: _subtitle(it),
            subtitleColor: it.roblox?.assetId != null ? Tokens.textPrimary : null,
            onTap: () => showItemActions(context, it, onChanged: _load),
            trailing: const Icon(AppIcons.dotsThreeVertical, color: Tokens.textTertiary),
          );
        },
      );
    }

    return RefreshIndicator(
      onRefresh: session.loggedIn ? _load : () async {},
      color: Tokens.textOnAccent,
      backgroundColor: Tokens.accent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(Tokens.gutter, pad.top + 20, Tokens.gutter, 12),
            sliver: SliverToBoxAdapter(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const TwoToneTitle('Pustaka.', 'Semua hasil convert.', style: AppType.title),
                if (_items != null && _items!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('${_items!.length} lagu · ketuk untuk putar, simpan, atau upload', style: AppType.bodySm),
                ],
              ]),
            ),
          ),
          body,
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  static String _subtitle(HistoryItem it) {
    final rb = it.roblox;
    if (rb?.assetId != null) return 'Roblox · ${rb!.assetId} · ${rb.state}';
    return [it.artist ?? '', it.format.toUpperCase(), formatDuration(it.duration), if (!it.fileAvailable) 'file kedaluwarsa']
        .where((s) => s.isNotEmpty)
        .join(' · ');
  }
}
