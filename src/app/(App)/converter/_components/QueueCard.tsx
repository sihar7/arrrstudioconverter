"use client";

import { Archive, CloudUpload, MusicDoubleNote } from "iconoir-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearFinished, enqueue, removeItem, type QueueItem } from "@/store/slices/converterSlice";
import { useT } from "@/hooks/useT";
import CardBox, { CardHeader } from "@/components/shared/CardBox";
import EmptyState from "@/components/shared/EmptyState";
import Button, { buttonClass } from "@/components/ui/Button";
import QueueItemRow from "./QueueItemRow";
import { zipUrl } from "../_service/converter.service";
import type { UploadBlock } from "@/type/roblox";

interface Props {
  playing: string | null;
  onTogglePlay: (fileId: string) => void;
  onUpload: (item: QueueItem) => void;
  blockReason: (item: QueueItem) => UploadBlock;
  uploadAllCount: number;
  onUploadAll: () => void;
}

export default function QueueCard({ playing, onTogglePlay, onUpload, blockReason, uploadAllCount, onUploadAll }: Props) {
  const items = useAppSelector((s) => s.converter.items);
  const dispatch = useAppDispatch();
  const { t, f } = useT();

  const ready = items.filter((i) => i.status === "idle" || i.status === "error").length;
  const doneIds = items.filter((i) => i.status === "done" && i.result).map((i) => i.result!.fileId);
  const finished = items.some((i) => i.status === "done" || i.status === "error");

  return (
    <CardBox className="rise overflow-hidden [animation-delay:60ms]">
      <CardHeader
        step={3}
        title={
          <>
            {t.converter.queue} <span className="ml-1 font-mono text-fg-3">{items.length}</span>
          </>
        }
        aside={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {finished && (
              <Button size="sm" variant="subtle" onClick={() => dispatch(clearFinished())}>
                {t.converter.clearDone}
              </Button>
            )}
            {doneIds.length >= 2 && (
              <a href={zipUrl(doneIds)} className={buttonClass("ghost", "sm")}>
                <Archive width={14} height={14} /> {t.converter.zip}
              </a>
            )}
            {uploadAllCount >= 2 && (
              <Button size="sm" variant="tonal" icon={<CloudUpload width={16} height={16} />} onClick={onUploadAll}>
                {f(t.converter.uploadAll, { n: uploadAllCount })}
              </Button>
            )}
            {ready > 0 && (
              <Button size="sm" variant="primary" onClick={() => dispatch(enqueue())}>
                {f(t.converter.convertAll, { n: ready })}
              </Button>
            )}
          </div>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<MusicDoubleNote width={22} height={22} />} title={t.converter.emptyTitle} sub={t.converter.emptySub} />
      ) : (
        <ul>
          {items.map((item) => (
            <QueueItemRow
              key={item.key}
              item={item}
              playing={Boolean(item.result && playing === item.result.fileId)}
              uploadBlock={blockReason(item)}
              onConvert={() => dispatch(enqueue([item.key]))}
              onRemove={() => dispatch(removeItem(item.key))}
              onTogglePlay={() => item.result && onTogglePlay(item.result.fileId)}
              onUpload={() => onUpload(item)}
            />
          ))}
        </ul>
      )}
    </CardBox>
  );
}
