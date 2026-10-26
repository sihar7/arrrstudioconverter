"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

/**
 * Tekan lama (sentuh saja, bukan mouse) → onLong. `consume()` dipanggil di onClick:
 * true = klik ini sisa dari tekan lama, abaikan. Timer dibersihkan saat unmount.
 */
export function useLongPress(onLong: () => void, disabled = false, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);

  const onPointerDown = (e: PointerEvent) => {
    if (disabled || e.pointerType === "mouse") return;
    fired.current = false;
    cancel();
    timer.current = setTimeout(() => {
      fired.current = true;
      navigator.vibrate?.(10);
      onLong();
    }, ms);
  };

  const consume = () => {
    const was = fired.current;
    fired.current = false;
    return was;
  };

  return {
    consume,
    handlers: {
      onPointerDown,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: { preventDefault: () => void }) => fired.current && e.preventDefault(),
    },
  };
}
