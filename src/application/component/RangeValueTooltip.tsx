import React, { useEffect, useRef, useState } from 'react';

type TooltipState = {
  left: number;
  top: number;
  value: string;
};

const isRangeInput = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement && target.type === 'range';

const RangeValueTooltip = () => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerActive = useRef(false);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const hide = () => {
      clearHideTimer();
      setTooltip(null);
    };

    const scheduleHide = () => {
      clearHideTimer();
      hideTimer.current = setTimeout(() => setTooltip(null), 700);
    };

    const show = (input: HTMLInputElement) => {
      clearHideTimer();
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value);
      const ratio =
        max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
      const bounds = input.getBoundingClientRect();
      setTooltip({
        left: bounds.left + bounds.width * ratio,
        top: bounds.top - 6,
        value: `${Math.round(ratio * 100)}%`,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isRangeInput(event.target)) {
        return;
      }
      pointerActive.current = true;
      show(event.target);
    };

    const onInput = (event: Event) => {
      if (!isRangeInput(event.target)) {
        return;
      }
      show(event.target);
      if (!pointerActive.current) {
        scheduleHide();
      }
    };

    const onPointerEnd = () => {
      if (!pointerActive.current) {
        return;
      }
      pointerActive.current = false;
      scheduleHide();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('pointerup', onPointerEnd, true);
    document.addEventListener('pointercancel', onPointerEnd, true);
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, true);

    return () => {
      clearHideTimer();
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('pointerup', onPointerEnd, true);
      document.removeEventListener('pointercancel', onPointerEnd, true);
      window.removeEventListener('blur', hide);
      window.removeEventListener('resize', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  return tooltip ? (
    <output
      className="range-value-tooltip"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.value}
    </output>
  ) : null;
};

export default RangeValueTooltip;
