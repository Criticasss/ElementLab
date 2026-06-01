// Web Audio Synths for giving juicy gaming experience to the prototype
let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;

// Background music loops states
let musicInterval: any = null;
let isMusicPlaying = false;
let currentChordIndex = 0;
// Gentle atmospheric alchemical pads (G Major -> A Minor -> F Major -> G Major)
const chords = [
  [196.00, 246.94, 293.66, 392.00], // G3, B3, D4, G4 - G Major
  [220.00, 261.63, 329.63, 440.00], // A3, C4, E4, A4 - A minor
  [174.61, 220.00, 261.63, 349.23], // F3, A3, C4, F4 - F Major
  [196.00, 246.94, 329.63, 392.00]  // G3, B3, E4, G4 - Em7/G Major ambient inversion
];

export function startBackgroundMusic() {
  if (!isSoundEnabled || isMusicPlaying) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    isMusicPlaying = true;
    
    const playNextBeat = () => {
      if (!isMusicPlaying || !isSoundEnabled || !audioCtx) return;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const chord = chords[currentChordIndex];
      
      // Play a rolling progress of chords with slow attack and long release
      chord.forEach((freq, noteIdx) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + noteIdx * 0.4);
        
        // Dynamic envelope - super soft volume to be unintrusive bg music
        gain.gain.setValueAtTime(0, now + noteIdx * 0.4);
        gain.gain.linearRampToValueAtTime(0.015, now + noteIdx * 0.4 + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + noteIdx * 0.4 + 3.0);
        
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        
        osc.start(now + noteIdx * 0.4);
        osc.stop(now + noteIdx * 0.4 + 3.2);
      });
      
      currentChordIndex = (currentChordIndex + 1) % chords.length;
    };
    
    playNextBeat();
    if (musicInterval) clearInterval(musicInterval);
    musicInterval = setInterval(playNextBeat, 4200);
  } catch (error) {
    console.error("Music synthesis failed:", error);
  }
}

export function stopBackgroundMusic() {
  isMusicPlaying = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

export function toggleSound(force?: boolean): boolean {
  if (force !== undefined) {
    isSoundEnabled = force;
  } else {
    isSoundEnabled = !isSoundEnabled;
  }
  
  if (isSoundEnabled) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
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
