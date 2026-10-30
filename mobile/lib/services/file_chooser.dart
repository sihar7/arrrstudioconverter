import 'package:file_picker/file_picker.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

/// `<input type="file">` di Android WebView butuh pemilih file dari app (iOS sudah bawaan WKWebView).
class FileChooser {
  FileChooser._();

  static Future<List<String>> pick(FileSelectorParams params) async {
    final multiple = params.mode == FileSelectorMode.openMultiple;
    final types = params.acceptTypes.where((t) => t.trim().isNotEmpty).toList();
    final onlyImages = types.isNotEmpty && types.every((t) => t.startsWith('image/'));
    final onlyAudio = types.isNotEmpty && types.every((t) => t.startsWith('audio/'));

    final type = onlyImages ? FileType.image : (onlyAudio ? FileType.audio : FileType.any);
    final files = multiple
        ? await FilePicker.pickFiles(type: type)
        : [?await FilePicker.pickFile(type: type)];
    return files
        .map((f) => f.path)
        .whereType<String>()
        .map((p) => Uri.file(p).toString())
        .toList();
  }
}
