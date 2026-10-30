import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../components/offline_view.dart';
import '../components/splash_view.dart';
import '../config/app_config.dart';
import '../data/api_client.dart';
import '../screens/shell/app_shell.dart';
import '../state/player_store.dart';
import '../state/queue_store.dart';
import '../state/roblox_settings.dart';
import '../state/session_store.dart';
import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Akar app: menyusun store (Provider) lalu menampilkan splash → shell.
class ArrrApp extends StatelessWidget {
  const ArrrApp({super.key, required this.api});
  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SessionStore(api)..start()),
        ChangeNotifierProvider(create: (_) => RobloxSettings()..load()),
        ChangeNotifierProvider(create: (_) => PlayerStore(api)),
        ChangeNotifierProxyProvider<SessionStore, QueueStore>(
          create: (c) => QueueStore(api, c.read<SessionStore>()),
          update: (_, _, q) => q!,
        ),
      ],
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        home: const _Root(),
      ),
    );
  }
}

class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final s = context.watch<SessionStore>();
    final Widget child;
    if (s.loading) {
      child = const SplashView(key: ValueKey('splash'));
    } else if (s.me == null) {
      child = Scaffold(key: const ValueKey('offline'), body: OfflineView(message: s.error, onRetry: s.refresh));
    } else {
      child = const AppShell(key: ValueKey('shell'));
    }
    return AnimatedSwitcher(duration: Tokens.motion(context, Tokens.slow), child: child);
  }
}
