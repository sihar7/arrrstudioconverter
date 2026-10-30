import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Unduhan dari web (audio, ZIP skybox, gambar, .lua) → simpan sementara → lembar "Simpan/Bagikan" sistem.
///
/// WebView tidak bisa mengunduh sendiri. Web memicu unduhan lewat `<a download>` (+ `a.click()`),
/// jadi [bridgeJs] menangkap klik itu, membaca file DI DALAM halaman (blob: atau URL same-origin
/// dengan cookie sesi), lalu mengirim base64 ke Flutter lewat channel [channelName].
class DownloadService {
  DownloadService._();

  static const channelName = 'ArrrMobile';

  /// Dipasang sekali per dokumen (aman dipanggil berulang).
  static const String bridgeJs = r'''
(() => {
  if (window.__arrrMobile) return;
  window.__arrrMobile = true;
  const post = (m) => ArrrMobile.postMessage(JSON.stringify(m));
  const nameOf = (a) => {
    const n = a.getAttribute('download');
    if (n) return n;
    try { return decodeURIComponent(new URL(a.href).pathname.split('/').pop()) || 'arrr-file'; }
    catch (_) { return 'arrr-file'; }
  };
  const save = async (a) => {
    const name = nameOf(a);
    post({ type: 'start', name });
    try {
      const res = await fetch(a.href, { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const data = await new Promise((ok, fail) => {
        const r = new FileReader();
        r.onload = () => ok(r.result);
        r.onerror = fail;
        r.readAsDataURL(blob);
      });
      post({ type: 'file', name, data });
    } catch (e) {
      post({ type: 'error', name, href: a.href, message: String(e) });
    }
  };
  const isDownload = (a) => a instanceof HTMLAnchorElement && a.hasAttribute('download') && a.href;
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isDownload(this)) { save(this); return; }
    return nativeClick.call(this);
  };
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (!isDownload(a)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    save(a);
  }, true);
})();
''';

  /// Simpan data URL lalu buka lembar bagikan. Mengembalikan false bila gagal.
  static Future<bool> saveDataUrl(String fileName, String dataUrl) async {
    final comma = dataUrl.indexOf(',');
    if (comma < 0) return false;
    try {
      return await _share(fileName, base64Decode(dataUrl.substring(comma + 1)));
    } catch (_) {
      return false;
    }
  }

  /// Unduh file dari server (pakai header sesi) lalu buka lembar Simpan/Bagikan.
  static Future<bool> saveRemote(Uri url, String fileName, Map<String, String> headers) async {
    try {
      final res = await http.get(url, headers: headers);
      if (res.statusCode >= 400) return false;
      return await _share(fileName, res.bodyBytes);
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _share(String fileName, List<int> bytes) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/${_safeName(fileName)}');
    await file.writeAsBytes(bytes, flush: true);
    final result = await SharePlus.instance.share(ShareParams(files: [XFile(file.path)]));
    return result.status != ShareResultStatus.unavailable;
  }

  static String _safeName(String name) {
    final cleaned = name.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_').trim();
    return cleaned.isEmpty ? 'arrr-file' : cleaned;
  }
}
