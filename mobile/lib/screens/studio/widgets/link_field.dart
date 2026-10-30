import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../components/buttons.dart';
import '../../../components/toast.dart';
import '../../../state/queue_store.dart';
import '../../../theme/tokens.dart';
import '../../../theme/type.dart';
import '../../../theme/app_icons.dart';

/// Input link YouTube: tempel dari clipboard sekali ketuk, Enter/tombol → masuk antrean.
class LinkField extends StatefulWidget {
  const LinkField({super.key});

  @override
  State<LinkField> createState() => _LinkFieldState();
}

class _LinkFieldState extends State<LinkField> {
  final _ctrl = TextEditingController();
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
    _ctrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text?.trim() ?? '';
    if (text.isEmpty) {
      if (mounted) showToast(context, 'Clipboard kosong');
      return;
    }
    _ctrl.text = text;
    await _submit();
  }

  Future<void> _submit() async {
    final url = _ctrl.text.trim();
    if (url.isEmpty) return _focus.requestFocus();
    _focus.unfocus();
    final msg = await context.read<QueueStore>().addLink(url);
    if (!mounted) return;
    showToast(context, msg);
    if (msg.startsWith('Masuk') || msg.contains('lagu masuk')) _ctrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    final resolving = context.select<QueueStore, bool>((q) => q.resolving);
    final focused = _focus.hasFocus;
    return AnimatedContainer(
      duration: Tokens.motion(context, Tokens.fast),
      padding: const EdgeInsets.fromLTRB(16, 6, 6, 6),
      decoration: BoxDecoration(
        color: Tokens.surfaceRaised,
        borderRadius: BorderRadius.circular(Tokens.radiusPill),
        border: Border.all(color: focused ? Tokens.focusRing : Tokens.border, width: focused ? 1.5 : 1),
        boxShadow: focused ? Tokens.glow(.6) : null,
      ),
      child: Row(
        children: [
          const Icon(AppIcons.link, size: 18, color: Tokens.textTertiary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _ctrl,
              focusNode: _focus,
              keyboardType: TextInputType.url,
              textInputAction: TextInputAction.go,
              autocorrect: false,
              onSubmitted: (_) => _submit(),
              style: AppType.bodyMd,
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: 'youtube.com/watch?v=…',
                hintStyle: AppType.bodyMd.copyWith(color: Tokens.textTertiary, fontWeight: FontWeight.w400),
                semanticCounterText: 'Link YouTube',
              ),
            ),
          ),
          if (_ctrl.text.isEmpty)
            SecondaryButton(label: 'Tempel', icon: AppIcons.clipboardText, onPressed: resolving ? null : _paste)
          else
            PrimaryButton(label: 'Tambah', chevron: false, loading: resolving, onPressed: _submit),
        ],
      ),
    );
  }
}
