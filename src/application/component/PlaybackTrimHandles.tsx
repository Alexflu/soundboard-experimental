import React, { useEffect, useRef, useState } from 'react';

const MIN_TRIM_RANGE_SECONDS = 0.05;
const FULL_DURATION_TOLERANCE_SECONDS = 0.01;

type TrimHandle = 'start' | 'end';

type PlaybackTrimHandlesProps = {
  duration: number | null | undefined;
  startTime: number | undefined;
  endTime: number | undefined;
  onCommit: (startTime: number, endTime?: number) => void;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const formatTrimTime = (value: number) => {
  const hundredths = Math.max(0, Math.round(value * 100));
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const fraction = hundredths % 100;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
    fraction
  ).padStart(2, '0')}`;
};

const PlaybackTrimHandles = ({
  duration,
  startTime = 0,
  endTime,
  onCommit,
}: PlaybackTrimHandlesProps) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draftStart, setDraftStart] = useState(startTime);
  const [draftEnd, setDraftEnd] = useState(endTime ?? duration ?? 0);
  const [draggingHandle, setDraggingHandle] = useState<TrimHandle | null>(null);
  const activeHandle = useRef<TrimHandle | null>(null);
  const draftStartRef = useRef(draftStart);
  const draftEndRef = useRef(draftEnd);

  useEffect(() => {
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const minimumRange = Math.min(MIN_TRIM_RANGE_SECONDS, duration);
    const nextStart = clamp(startTime, 0, Math.max(0, duration - minimumRange));
    const nextEnd = clamp(
      endTime ?? duration,
      nextStart + minimumRange,
      duration
    );
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    draftStartRef.current = nextStart;
    draftEndRef.current = nextEnd;
  }, [duration, endTime, startTime]);

  useEffect(() => {
    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const progressElement = trackRef.current?.previousElementSibling;
    if (!(progressElement instanceof HTMLElement)) {
      return;
    }

    progressElement.style.left = `${(draftStart / duration) * 100}%`;
    progressElement.style.right = 'auto';
    progressElement.style.width = `${
      ((draftEnd - draftStart) / duration) * 100
    }%`;
  }, [draftEnd, draftStart, duration]);

  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const minimumRange = Math.min(MIN_TRIM_RANGE_SECONDS, duration);

  const updateTime = (handle: TrimHandle, nextTime: number) => {
    if (handle === 'start') {
      const nextStart = Math.min(
        clamp(nextTime, 0, duration),
        draftEndRef.current - minimumRange
      );
      draftStartRef.current = nextStart;
      setDraftStart(nextStart);
    } else {
      const nextEnd = Math.max(
        clamp(nextTime, 0, duration),
        draftStartRef.current + minimumRange
      );
      draftEndRef.current = nextEnd;
      setDraftEnd(nextEnd);
    }
  };

  const updateFromPointer = (handle: TrimHandle, clientX: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) {
      return;
    }

    updateTime(handle, ((clientX - bounds.left) / bounds.width) * duration);
  };

  const commit = () => {
    const savedEnd =
      duration - draftEndRef.current <= FULL_DURATION_TOLERANCE_SECONDS
        ? undefined
        : draftEndRef.current;
    onCommit(draftStartRef.current, savedEnd);
  };

  const beginDrag = (
    handle: TrimHandle,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    activeHandle.current = handle;
    setDraggingHandle(handle);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(handle, event.clientX);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!activeHandle.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    updateFromPointer(activeHandle.current, event.clientX);
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!activeHandle.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    activeHandle.current = null;
    setDraggingHandle(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commit();
  };

  const moveWithKeyboard = (
    handle: TrimHandle,
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const step = Math.max(0.1, duration / 100);
    const current =
      handle === 'start' ? draftStartRef.current : draftEndRef.current;
    updateTime(handle, current + direction * step);
    commit();
  };

  const draggingTime =
    draggingHandle === 'start' ? draftStart : draggingHandle ? draftEnd : null;

  return (
    <div className="playback-trim" ref={trackRef}>
      {draggingHandle && draggingTime !== null && (
        <span className="playback-trim-time">
          {draggingHandle === 'start' ? 'Start' : 'End'}{' '}
          {formatTrimTime(draggingTime)}
        </span>
      )}
      <button
        type="button"
        role="slider"
        className="playback-trim-handle playback-trim-start"
        style={{ left: `${(draftStart / duration) * 100}%` }}
        onPointerDown={(event) => beginDrag('start', event)}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={(event) => moveWithKeyboard('start', event)}
        draggable={false}
        aria-label="Playback start"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={draftStart}
        title="Drag to set playback start"
      />
      <button
        type="button"
        role="slider"
        className="playback-trim-handle playback-trim-end"
        style={{ left: `${(draftEnd / duration) * 100}%` }}
        onPointerDown={(event) => beginDrag('end', event)}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={(event) => moveWithKeyboard('end', event)}
        draggable={false}
        aria-label="Playback end"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={draftEnd}
        title="Drag to set playback end"
      />
    </div>
  );
};

export default PlaybackTrimHandles;
