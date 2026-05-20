// Web Audio Synths for giving juicy gaming experience to the prototype
let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;

export function toggleSound(force?: boolean): boolean {
  if (force !== undefined) {
    isSoundEnabled = force;
  } else {
    isSoundEnabled = !isSoundEnabled;
  }
  return isSoundEnabled;
}

export function playSound(type: "place" | "merge" | "quota" | "levelUp" | "click" | "fail" | "victory") {
  if (!isSoundEnabled) return;

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    switch (type) {
      case "click": {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case "place": {
        // Wooden hollow pop sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case "merge": {
        // Magical upward sparkling chime (2 rapid notes)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        const gain2 = audioCtx.createGain();
        
        osc1.type = "sine";
        osc2.type = "sine";
        
        osc1.frequency.setValueAtTime(392, now); // G4
        osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.15); // C5
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc2.frequency.setValueAtTime(523.25, now + 0.08); // C5
        osc2.frequency.exponentialRampToValueAtTime(784, now + 0.25); // G5
        gain2.gain.setValueAtTime(0.08, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.15);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.25);
        break;
      }
      case "quota": {
        // Satisfying metallic coin registers
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
        osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case "levelUp": {
        // Upward chord fanfare
        const frequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        frequencies.forEach((freq, index) => {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now + index * 0.08);
          gain.gain.setValueAtTime(0.05, now + index * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);
          
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          osc.start(now + index * 0.08);
          osc.stop(now + index * 0.08 + 0.26);
        });
        break;
      }
      case "fail": {
        // Disappointing slider downward
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.5);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case "victory": {
        // Big happy arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
        notes.forEach((freq, index) => {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + index * 0.06);
          gain.gain.setValueAtTime(0.06, now + index * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.4);
          
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          osc.start(now + index * 0.06);
          osc.stop(now + index * 0.06 + 0.4);
        });
        break;
      }
    }
  } catch (error) {
    console.error("Audio synthesis failed:", error);
  }
}
