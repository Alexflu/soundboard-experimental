const readFiniteDuration = (audio: HTMLAudioElement) =>
  Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;

const getAudioDuration = (source: string): Promise<number | null> =>
  new Promise((resolve) => {
    const audio = new Audio(source);
    let settled = false;
    let forcedSeek = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', checkDuration);
      audio.removeEventListener('durationchange', checkDuration);
      audio.removeEventListener('timeupdate', checkDuration);
      audio.removeEventListener('error', onError);
      if (timeout) {
        clearTimeout(timeout);
      }
      audio.src = '';
    };

    const finish = (duration: number | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(duration);
    };

    function checkDuration() {
      const duration = readFiniteDuration(audio);
      if (duration !== null) {
        finish(duration);
        return;
      }

      if (!forcedSeek && audio.readyState >= 1) {
        forcedSeek = true;
        try {
          audio.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
          finish(null);
        }
      }
    }

    function onError() {
      finish(null);
    }

    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', checkDuration);
    audio.addEventListener('durationchange', checkDuration);
    audio.addEventListener('timeupdate', checkDuration);
    audio.addEventListener('error', onError);
    timeout = setTimeout(() => finish(readFiniteDuration(audio)), 5000);
    audio.load();
  });

export default getAudioDuration;
