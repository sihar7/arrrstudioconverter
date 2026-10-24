"use client";

import { PasteClipboard, Plus, Xmark } from "iconoir-react";
import CardBox from "@/components/shared/CardBox";
import Button from "@/components/ui/Button";
import Field, { Textarea } from "@/components/ui/Field";
import IconButton from "@/components/ui/IconButton";
import { useT } from "@/hooks/useT";
import { useAddSource } from "../_hooks/useAddSource";

export default function SourceCard() {
  const { t } = useT();
  const src = useAddSource();

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) src.setValue((v) => (v ? `${v}\n${text}` : text));
    } catch {
      /* izin clipboard ditolak — user bisa tempel manual */
    }
  };

  return (
    <CardBox className="rise p-5 sm:p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void src.submit();
        }}
      >
        <Field
          label={
            <>
              <span aria-hidden="true" className="mr-2.5 font-mono tracking-[0.1em] text-fg-3">01</span>
              {t.converter.sourceLabel}
            </>
          } hint={t.converter.sourceHelp} error={src.error}>
          {({ id, describedBy, invalid }) => (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <Textarea
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                rows={2}
                value={src.value}
                onChange={(e) => {
                  src.setValue(e.target.value);
                  if (src.error) src.setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void src.submit();
                  }
                }}
                placeholder={t.converter.sourcePlaceholder}
                spellCheck={false}
                autoComplete="off"
                className="min-h-[52px] flex-1 font-mono text-[13.5px]"
              />
              <div className="flex gap-2.5">
                <Button type="button" variant="ghost" onClick={paste} icon={<PasteClipboard width={16} height={16} />} className="flex-1 sm:flex-none">
                  {t.converter.paste}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={src.busy}
                  disabled={!src.value.trim()}
                  icon={<Plus width={16} height={16} />}
                  className="flex-1 sm:flex-none"
                >
                  {src.busy ? t.converter.adding : t.converter.add}
                </Button>
              </div>
            </div>
          )}
        </Field>
      </form>

      {src.suggestion && (
        <div className="rise mt-4 flex items-center gap-3 border-l-2 border-accent bg-bg py-2.5 pl-4 pr-2">
          <p className="flex-1 text-[13.5px] text-fg-2">{t.converter.playlistFound}</p>
          <Button size="sm" variant="ghost" loading={src.loadingPlaylist} onClick={src.addPlaylist}>
            {t.converter.addPlaylist}
          </Button>
          <IconButton label={t.common.close} size="sm" icon={<Xmark width={16} height={16} />} onClick={src.dismissSuggestion} />
        </div>
      )}
    </CardBox>
  );
}
