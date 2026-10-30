import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../components/mini_player.dart';
import '../../state/queue_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import '../account/account_screen.dart';
import '../library/library_screen.dart';
import '../search/search_screen.dart';
import '../studio/studio_screen.dart';
import '../tools/tools_screen.dart';
import '../../theme/app_icons.dart';

class _Tab {
  const _Tab(this.label, this.icon, this.activeIcon);
  final String label;
  final IconData icon, activeIcon;
}

/// Kerangka utama: 5 tab level atas (bottom nav ≤5), state tiap tab dipertahankan (IndexedStack).
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  /// Pindah tab dari layar mana pun (mis. "Buka antrean" setelah tambah dari pencarian).
  static void goTo(BuildContext context, int index) => context.findAncestorStateOfType<_AppShellState>()?._select(index);

  static const studio = 0, search = 1, library = 2, tools = 3, account = 4;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static final _tabs = [
    _Tab('Studio', AppIcons.waveform, AppIcons.waveformFill),
    _Tab('Cari', AppIcons.magnifyingGlass, AppIcons.magnifyingGlass),
    _Tab('Pustaka', AppIcons.books, AppIcons.booksFill),
    _Tab('Alat', AppIcons.squaresFour, AppIcons.squaresFourFill),
    _Tab('Akun', AppIcons.userCircle, AppIcons.userCircleFill),
  ];

  void _select(int i) {
    if (i != _index) setState(() => _index = i);
  }

  @override
  Widget build(BuildContext context) {
    final badge = context.select<QueueStore, int>((q) => q.pendingBadge);
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [StudioScreen(), SearchScreen(), LibraryScreen(), ToolsScreen(), AccountScreen()],
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const MiniPlayer(),
          DecoratedBox(
            decoration: const BoxDecoration(
              color: Tokens.surfaceDeep,
              border: Border(top: BorderSide(color: Tokens.border)),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                height: 64,
                child: Row(
                  children: [
                    for (var i = 0; i < _tabs.length; i++)
                      Expanded(
                        child: _NavItem(
                          tab: _tabs[i],
                          active: i == _index,
                          badge: i == AppShell.studio ? badge : 0,
                          onTap: () => _select(i),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.tab, required this.active, required this.badge, required this.onTap});
  final _Tab tab;
  final bool active;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? Tokens.textPrimary : Tokens.textTertiary;
    return Semantics(
      selected: active,
      button: true,
      label: badge > 0 ? '${tab.label}, $badge di antrean' : tab.label,
      excludeSemantics: true,
      child: InkResponse(
        onTap: onTap,
        radius: 32,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                AnimatedContainer(
                  duration: Tokens.motion(context, Tokens.base),
                  curve: Curves.easeOutCubic,
                  width: 52,
                  height: 30,
                  decoration: BoxDecoration(
                    color: active ? Tokens.surfaceSunken : Colors.transparent,
                    borderRadius: BorderRadius.circular(Tokens.radiusPill),
                  ),
                  child: Icon(active ? tab.activeIcon : tab.icon, size: 22, color: color),
                ),
                if (badge > 0)
                  Positioned(
                    right: 6,
                    top: -2,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 16),
                      height: 16,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(gradient: Tokens.silverSheen, borderRadius: BorderRadius.circular(8)),
                      child: Text('$badge', style: AppType.tabular.copyWith(fontSize: 10, color: Tokens.textOnAccent)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(tab.label, style: AppType.bodySm.copyWith(fontSize: 11, color: color, fontWeight: active ? FontWeight.w600 : FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
