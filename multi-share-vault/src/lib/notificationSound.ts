const FORCED_NOTIFICATION_SOUND_URL = '/sonnerie.mp3';

function playFallbackBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      try { o.stop(); } catch { void 0 }
      try { ctx.close(); } catch { void 0 }
    }, 250);
  } catch {
    // ignore
  }
}

export async function playNotificationSound(): Promise<void> {
  try {
    // Forced sound from /public/sonnerie.mp3
    const audio = new Audio(FORCED_NOTIFICATION_SOUND_URL);
    audio.preload = 'auto';
    audio.volume = 1;
    await audio.play();
  } catch {
    playFallbackBeep();
  }
}
