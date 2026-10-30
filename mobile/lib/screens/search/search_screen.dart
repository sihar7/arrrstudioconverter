import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../components/buttons.dart';
import '../../components/surfaces.dart';
import '../../components/toast.dart';
import '../../components/track_tile.dart';
import '../../components/typography.dart';
import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../data/repositories.dart';
import '../../state/queue_store.dart';
import '../../state/session_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import '../../theme/app_icons.dart';

/// Cari lagu di YouTube (lewat backend) → tambah ke antrean. Scroll tak berujung.
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  late final YoutubeRepo _repo = YoutubeRepo(context.read<SessionStore>().api);

  final List<Video> _items = [];
  final Set<String> _added = {};
  String? _continuation;
  String _query = '';
  bool _loading = false;
  String? _error;
  int _seq = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 600) _more();
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _search(String q) async {
    q = q.trim();
    if (q.isEmpty) return;
    final seq = ++_seq;
    setState(() {
      _query = q;
      _loading = true;
      _error = null;
      _items.clear();
      _continuation = null;
    });
    try {
      final page = await _repo.search(q);
      if (!mounted || seq != _seq) return; // hasil basi dari pencarian sebelumnya
      setState(() {
        _items.addAll(page.items);
        _continuation = page.continuation;
      });
    } on ApiException catch (e) {
      if (mounted && seq == _seq) setState(() => _error = e.message);
    } finally {
      if (mounted && seq == _seq) setState(() => _loading = false);
    }
  }

  Future<void> _more() async {
    final c = _continuation;
    if (_loading || c == null) return;
    final seq = _seq;
    setState(() => _loading = true);
    try {
      final page = await _repo.search(_query, continuation: c);
      if (!mounted || seq != _seq) return;
      setState(() {
        _items.addAll(page.items.where((v) => !_items.any((x) => x.videoId == v.videoId)));
        _continuation = page.continuation;
      });
    } catch (_) {
      _continuation = null;
    } finally {
      if (mounted && seq == _seq) setState(() => _loading = false);
    }
  }

  void _add(Video v) {
    HapticFeedback.lightImpact();
    context.read<QueueStore>().addVideo(v);
    setState(() => _added.add(v.videoId));
    showToast(context, 'Masuk antrean Studio');
  }

  @override
  Widget build(BuildContext context) {
    final pad = MediaQuery.paddingOf(context);
    return CustomScrollView(
      controller: _scroll,
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      slivers: [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(Tokens.gutter, pad.top + 20, Tokens.gutter, 12),
          sliver: SliverList.list(children: [
            const TwoToneTitle('Cari lagu.', 'Sekali ketuk.', style: AppType.title),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(color: Tokens.surfaceRaised, borderRadius: BorderRadius.circular(Tokens.radiusPill), border: Border.all(color: Tokens.border)),
              child: Row(children: [
                const Icon(AppIcons.magnifyingGlass, size: 18, color: Tokens.textTertiary),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    textInputAction: TextInputAction.search,
                    onSubmitted: _search,
                    style: AppType.bodyMd,
                    decoration: InputDecoration(
                      border: InputBorder.none,
                      hintText: 'Judul lagu atau artis',
                      hintStyle: AppType.bodyMd.copyWith(color: Tokens.textTertiary, fontWeight: FontWeight.w400),
                    ),
                  ),
                ),
              ]),
            ),
          ]),
        ),
        if (_error != null)
          SliverToBoxAdapter(
            child: EmptyState(icon: AppIcons.warningCircle, title: 'Pencarian gagal', message: _error!, action: 'Coba lagi', onAction: () => _search(_query)),
          )
        else if (_items.isEmpty && !_loading)
          const SliverToBoxAdapter(
            child: EmptyState(
              icon: AppIcons.musicNotes,
              title: 'Mau convert lagu apa?',
              message: 'Ketik judul atau nama artis, lalu tekan cari di keyboard.',
            ),
          )
        else
          SliverList.builder(
            itemCount: _items.length,
            itemBuilder: (_, i) {
              final v = _items[i];
              final added = _added.contains(v.videoId);
              return TrackTile(
                thumbnail: v.thumbnail,
                title: v.title,
                subtitle: [v.author, formatDuration(v.duration)].where((s) => s.isNotEmpty).join(' · '),
                wideThumb: true,
                trailing: IconCircleButton(
                  icon: added ? AppIcons.check : AppIcons.plus,
                  label: added ? 'Sudah di antrean' : 'Tambah ke antrean',
                  filled: !added,
                  onPressed: added ? null : () => _add(v),
                ),
              );
            },
          ),
        SliverToBoxAdapter(
          child: SizedBox(
            height: 72,
            child: _loading ? const Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))) : null,
          ),
        ),
      ],
    );
  }
}
