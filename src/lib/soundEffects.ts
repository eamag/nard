import type { SoundName } from './gameTypes';

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private muted = false;

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playSound(name: SoundName): void {
    if (this.muted || typeof window === 'undefined') return;

    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;

      this.audioContext ??= new AudioContextConstructor();
      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const tone = (
        frequency: number,
        duration: number,
        offset = 0,
        volume = 0.035,
        type: OscillatorType = 'sine',
      ) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(volume, now + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + duration + 0.02);
      };

      switch (name) {
        case 'roll':
          tone(260, 0.05, 0, 0.025, 'triangle');
          tone(330, 0.06, 0.07, 0.025, 'triangle');
          break;
        case 'move':
          tone(390, 0.045, 0, 0.03, 'triangle');
          break;
        case 'undo':
          tone(250, 0.05, 0, 0.025, 'triangle');
          break;
        case 'confirm':
          tone(440, 0.06, 0, 0.03, 'sine');
          tone(660, 0.11, 0.06, 0.03, 'sine');
          break;
        case 'bot-move':
          tone(175, 0.07, 0, 0.03, 'triangle');
          break;
        case 'win':
          tone(523, 0.1, 0, 0.035, 'sine');
          tone(659, 0.1, 0.11, 0.035, 'sine');
          tone(784, 0.15, 0.22, 0.035, 'sine');
          break;
        case 'loss':
          tone(330, 0.1, 0, 0.03, 'triangle');
          tone(247, 0.17, 0.12, 0.03, 'triangle');
          break;
        case 'reset':
          tone(420, 0.05, 0, 0.02, 'sine');
          tone(520, 0.07, 0.05, 0.02, 'sine');
          break;
        case 'toggle':
          tone(620, 0.06, 0, 0.025, 'sine');
          break;
      }
    } catch {
      // Web Audio is optional; gameplay should never fail because audio was blocked.
    }
  }
}

export const soundManager = new SoundEffectsManager();
