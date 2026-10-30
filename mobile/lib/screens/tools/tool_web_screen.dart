import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../../components/loading_bar.dart';
import '../../components/offline_view.dart';
import '../../components/toast.dart';
import '../../config/app_config.dart';
import '../../services/download_service.dart';
import '../../services/file_chooser.dart';
import '../../services/link_policy.dart';
import '../../state/session_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';

/// Alat yang diproses AI di perangkat (Skybox, Hapus background, Upscale, dll.) memakai halaman web
/// di dalam app, dengan sesi login yang sama (cookie disuntikkan).
class ToolWebScreen extends StatefulWidget {
  const ToolWebScreen({super.key, required this.path, required this.title});
  final String path, title;

  static Future<void> open(BuildContext context, String path, String title) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ToolWebScreen(path: path, title: title)));

  @override
  State<ToolWebScreen> createState() => _ToolWebScreenState();
}

class _ToolWebScreenState extends State<ToolWebScreen> {
  late final WebViewController _web = _createController();
  double _progress = 0;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  WebViewController _createController() {
    final params = WebViewPlatform.instance is WebKitWebViewPlatform
        ? WebKitWebViewControllerCreationParams(
            allowsInlineMediaPlayback: true,
            mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
          )
        : const PlatformWebViewControllerCreationParams();

    final c = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Tokens.surfaceBase)
      ..addJavaScriptChannel(DownloadService.channelName, onMessageReceived: _onBridgeMessage)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (req) async {
          final uri = Uri.tryParse(req.url);
          if (uri == null || LinkPolicy.isInApp(uri)) return NavigationDecision.navigate;
          await LinkPolicy.openExternal(uri);
          return NavigationDecision.prevent;
        },
        onProgress: (p) {
          if (mounted) setState(() => _progress = p / 100);
        },
        onPageFinished: (_) => _web.runJavaScript(DownloadService.bridgeJs),
        onWebResourceError: (err) {
          if (err.isForMainFrame == true && mounted) setState(() => _failed = true);
        },
      ));

    final platform = c.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
      platform.setOnShowFileSelector(FileChooser.pick);
    } else if (platform is WebKitWebViewController) {
      platform.setAllowsBackForwardNavigationGestures(true);
    }
    return c;
  }

  Future<void> _start() async {
    final api = context.read<SessionStore>().api;
    final host = Uri.parse(AppConfig.webUrl).host;
    final cookies = WebViewCookieManager();
    for (final (name, value) in [(AppConfig.sessionCookie, api.sessionToken), (AppConfig.guestCookie, api.guestToken)]) {
      if (value != null) await cookies.setCookie(WebViewCookie(name: name, value: value, domain: host, path: '/'));
    }
    final ua = await _web.getUserAgent();
    await _web.setUserAgent('${ua ?? ''} ${AppConfig.userAgentTag}'.trim());
    _load();
  }

  void _load() {
    setState(() => _failed = false);
    _web.loadRequest(Uri.parse('${AppConfig.webUrl}${widget.path}'));
  }

  Future<void> _onBridgeMessage(JavaScriptMessage msg) async {
    final Map<String, dynamic> m;
    try {
      m = jsonDecode(msg.message) as Map<String, dynamic>;
    } catch (_) {
      return;
    }
    if (!mounted) return;
    final name = (m['name'] as String?) ?? 'arrr-file';
    switch (m['type']) {
      case 'start':
        showToast(context, 'Menyiapkan $name…');
      case 'file':
        final ok = await DownloadService.saveDataUrl(name, m['data'] as String? ?? '');
        if (!ok && mounted) showToast(context, 'Gagal menyimpan $name');
      case 'error':
        final href = Uri.tryParse(m['href'] as String? ?? '');
        if (href != null && href.scheme.startsWith('http') && await LinkPolicy.openExternal(href)) return;
        if (mounted) showToast(context, 'Gagal mengunduh $name');
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _web.canGoBack()) {
          await _web.goBack();
        } else if (context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Tokens.surfaceDeep,
          surfaceTintColor: Colors.transparent,
          title: Text(widget.title, style: AppType.heading),
          actions: [
            IconButton(tooltip: 'Muat ulang', icon: const Icon(Icons.refresh_rounded), onPressed: _web.reload),
          ],
          bottom: PreferredSize(preferredSize: const Size.fromHeight(2), child: LoadingBar(progress: _progress)),
        ),
        body: Stack(children: [
          WebViewWidget(controller: _web),
          if (_failed) Positioned.fill(child: OfflineView(onRetry: _load)),
        ]),
      ),
    );
  }
}
