// Removed unused Track import

// Musical scales (pentatonic for better sound)
export const SCALES = {
  C_minor_pentatonic: ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "F4", "G4", "Bb4"],
  C_major_pentatonic: ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4"],
};

// Bass uses lower octaves
export const BASS_SCALES = {
  C_minor_pentatonic: ["C2", "Eb2", "F2", "G2", "Bb2", "C3", "Eb3", "F3"],
  C_major_pentatonic: ["C2", "D2", "E2", "G2", "A2", "C3", "D3", "E3"],
};

// Mood configurations with chord progressions and synth parameters
export const MOODS = {
  sad: {
    scale: "C_minor_pentatonic" as const,
    chords: [
      ["C4", "Eb4", "G4"], // Cm
      ["Bb3", "D4", "F4"], // Bb
      ["F3", "Ab3", "C4"], // Fm
      ["G3", "Bb3", "D4"], // Gm
    ],
    bassNotes: ["C2", "Bb2", "F2", "G2"],
    density: 0.7,
    // Synth parameters
    reverb: 0.5,              // More reverb for sadness
    attack: 0.1,              // Slower attack (softer)
    release: 1.5,             // Longer release (more sustain)
    brightness: 0.3,          // Darker tone
    tempo: 75,                // Slower tempo
    velocityRange: [0.4, 0.7], // Softer dynamics
    articulation: "legato" as const, // Smooth, connected
  },
  melancholic: {
    scale: "C_minor_pentatonic" as const,
    chords: [
      ["C4", "Eb4", "G4"],
      ["G3", "Bb3", "D4"],
      ["F3", "Ab3", "C4"],
      ["Eb3", "G3", "Bb3"],
    ],
    bassNotes: ["C2", "G2", "F2", "Eb2"],
    density: 0.75,
    // Synth parameters
    reverb: 0.45,
    attack: 0.08,
    release: 1.3,
    brightness: 0.35,
    tempo: 78,
    velocityRange: [0.45, 0.75],
    articulation: "legato" as const,
  },
  chill: {
    scale: "C_minor_pentatonic" as const,
    chords: [
      ["C4", "Eb4", "G4"],
      ["F3", "Ab3", "C4"],
      ["G3", "Bb3", "D4"],
      ["Eb3", "G3", "Bb3"],
    ],
    bassNotes: ["C2", "F2", "G2", "Eb2"],
    density: 0.65,
    // Synth parameters
    reverb: 0.35,             // Moderate reverb
    attack: 0.05,             // Medium attack
    release: 1.0,             // Medium release
    brightness: 0.5,          // Balanced tone
    tempo: 85,                // Medium tempo
    velocityRange: [0.5, 0.8], // Balanced dynamics
    articulation: "sustained" as const, // Long notes
  },
  happy: {
    scale: "C_major_pentatonic" as const,
    chords: [
      ["C4", "E4", "G4"], // C
      ["G3", "B3", "D4"], // G
      ["A3", "C4", "E4"], // Am
      ["F3", "A3", "C4"], // F
    ],
    bassNotes: ["C2", "G2", "A2", "F2"],
    density: 0.8,
    // Synth parameters
    reverb: 0.25,             // Less reverb for clarity
    attack: 0.01,             // Quick attack (bright)
    release: 0.8,             // Shorter release
    brightness: 0.75,         // Brighter tone
    tempo: 95,                // Faster tempo
    velocityRange: [0.65, 0.95], // Louder dynamics
    articulation: "staccato" as const, // Short, detached
  },
  upbeat: {
    scale: "C_major_pentatonic" as const,
    chords: [
      ["C4", "E4", "G4"],
      ["D4", "F4", "A4"],
      ["E4", "G4", "B4"],
      ["G3", "B3", "D4"],
    ],
    bassNotes: ["C2", "D2", "E2", "G2"],
    density: 0.85,
    // Synth parameters
    reverb: 0.2,              // Dry sound for energy
    attack: 0.005,            // Immediate attack
    release: 0.6,             // Quick release
    brightness: 0.85,         // Very bright
    tempo: 105,               // Fast tempo
    velocityRange: [0.7, 1.0], // Full dynamics
    articulation: "staccato" as const, // Punchy
  },
};

// Base rhythm patterns - per 4-step measure, designed for lo-fi beats
// Values: 0 = rest, 0.1-0.9 = ghost notes/dynamics, 1 = full accent
export const RHYTHM_PATTERNS = {
  // Original patterns
  simple: [1, 0, 1, 0],           // On-beat pattern - steady groove
  sparse: [1, 0, 0, 1],           // Minimal pattern - notes on 1 and 4
  active: [1, 0, 1, 1],           // Syncopated pattern - more variation
  
  // New patterns with dynamics
  shuffled: [1, 0, 0.7, 0],       // Swing feel with ghost notes
  dotted: [1, 0, 0, 1, 0, 1],     // Dotted rhythm (3/4 feel in 4/4)
  offbeat: [0, 1, 0, 1],          // Off-beat emphasis (reggae/ska feel)
  triplets: [1, 0, 0, 1, 0, 0, 1, 0, 0], // Triplet feel (divide by 3)
  syncopated: [1, 0, 0.5, 1, 0, 1, 0.5, 0], // Syncopation with accents
  steady: [1, 1, 1, 1],           // Continuous (every beat)
  half_time: [1, 0, 0, 0, 1, 0],  // Half-time feel (slow groove)
};

/**
 * Generate rhythm pattern scaled to desired length
 */
export function generateRhythmPattern(
  rhythm: keyof typeof RHYTHM_PATTERNS,
  length: number
): number[] {
  const basePattern = RHYTHM_PATTERNS[rhythm];
  const totalSteps = length * 4; // 4 beats per measure
  const result: number[] = [];

  for (let i = 0; i < totalSteps; i++) {
    result.push(basePattern[i % basePattern.length]);
  }

  return result;
}

/**
 * Generate musical notes for an instrument
 * @param playChords - If true, piano returns full chord arrays instead of arpeggios
 */
export function generateNotes(
  mood: keyof typeof MOODS = "chill",
  rhythm: keyof typeof RHYTHM_PATTERNS = "simple",
  instrument: "piano" | "bass" = "piano",
  patternLength: number = 4,
  playChords: boolean = true
): (string | string[] | null)[] {
  const moodConfig = MOODS[mood];
  const rhythmPattern = generateRhythmPattern(rhythm, patternLength);

  if (instrument === "bass") {
    const bassNotes = moodConfig.bassNotes;
    return rhythmPattern.map((shouldPlay, i) => {
      if (!shouldPlay) return null;
      const noteIndex = Math.floor(i / 4) % bassNotes.length;
      return bassNotes[noteIndex];
    });
  } else {
    // Piano
    const chords = moodConfig.chords;
    
    if (playChords) {
      // Return full chord arrays
      return rhythmPattern.map((shouldPlay, i) => {
        if (!shouldPlay) return null;

        // Only apply density reduction for sparse patterns
        if (rhythm === "sparse" && Math.random() > 0.7) return null;

        const chordIndex = Math.floor(i / 4) % chords.length;
        return chords[chordIndex]; // Return entire chord array
      });
    } else {
      // Return arpeggiated notes (legacy behavior)
      return rhythmPattern.map((shouldPlay, i) => {
        if (!shouldPlay) return null;

        // Only apply density reduction for sparse patterns
        if (rhythm === "sparse" && Math.random() > 0.7) return null;

        const chordIndex = Math.floor(i / 4) % chords.length;
        const chord = chords[chordIndex];
        const stepInMeasure = i % 4;
        const noteIndex = stepInMeasure % chord.length;
        return chord[noteIndex];
      });
    }
  }
}

/**
 * Generate melodic lines using scales
 * Creates singable, scale-based melodies with musical phrasing
 */
export function generateMelody(
  mood: keyof typeof MOODS = "chill",
  rhythm: keyof typeof RHYTHM_PATTERNS = "simple",
  patternLength: number = 4
): (string | null)[] {
  const moodConfig = MOODS[mood];
  const scale = SCALES[moodConfig.scale];
  const rhythmPattern = generateRhythmPattern(rhythm, patternLength);
  const chords = moodConfig.chords;
  
  let currentScaleIndex = 0; // Starting note in scale
  
  return rhythmPattern.map((shouldPlay, i) => {
    if (!shouldPlay) return null;
    
    const chordIndex = Math.floor(i / 4) % chords.length;
    const currentChord = chords[chordIndex];
    
    // 70% chance to use chord tones (consonant), 30% use scale notes (passing tones)
    if (Math.random() < 0.7) {
      // Pick a note from current chord
      return currentChord[Math.floor(Math.random() * currentChord.length)];
    } else {
      // Random walk through scale for melodic movement
      const move = Math.random();
      if (move < 0.4) {
        currentScaleIndex = Math.min(currentScaleIndex + 1, scale.length - 1); // Step up
      } else if (move < 0.7) {
        currentScaleIndex = Math.max(currentScaleIndex - 1, 0); // Step down
      }
      // else stay on same note
      
      return scale[currentScaleIndex];
    }
  });
}

/**
 * Generate bass lines with different playing styles
 */
export function generateBassLine(
  mood: keyof typeof MOODS = "chill",
  rhythm: keyof typeof RHYTHM_PATTERNS = "simple",
  patternLength: number = 4,
  style: "root" | "walking" | "arpeggio" | "octaves" | "pedal" = "root"
): (string | null)[] {
  const moodConfig = MOODS[mood];
  const bassNotes = moodConfig.bassNotes;
  const chords = moodConfig.chords;
  const bassScale = BASS_SCALES[moodConfig.scale];
  const rhythmPattern = generateRhythmPattern(rhythm, patternLength);
  
  if (style === "root") {
    // Simple root notes following chord changes
    return rhythmPattern.map((shouldPlay, i) => {
      if (!shouldPlay) return null;
      const noteIndex = Math.floor(i / 4) % bassNotes.length;
      return bassNotes[noteIndex];
    });
  } 
  else if (style === "walking") {
    // Walking bass - stepwise motion through scale
    let currentBassIndex = 0;
    return rhythmPattern.map((shouldPlay, i) => {
      if (!shouldPlay) return null;
      
      const note = bassScale[currentBassIndex % bassScale.length];
      currentBassIndex++; // Walk up the scale
      return note;
    });
  } 
  else if (style === "arpeggio") {
    // Arpeggio - play chord tones in bass register
    return rhythmPattern.map((shouldPlay, i) => {
      if (!shouldPlay) return null;
      
      const chordIndex = Math.floor(i / 4) % chords.length;
      const chord = chords[chordIndex];
      // Transpose chord notes down 2 octaves for bass
      const chordNote = chord[i % chord.length];
      const bassnote = chordNote.replace(/\d/, (match) => String(parseInt(match) - 2));
      return bassnote;
    });
  } 
  else if (style === "octaves") {
    // Octave jumps for energy
    return rhythmPattern.map((shouldPlay, i) => {
      if (!shouldPlay) return null;
      
      const noteIndex = Math.floor(i / 4) % bassNotes.length;
      const rootNote = bassNotes[noteIndex];
      // Alternate between root and octave up
      const isOctaveUp = i % 2 === 1;
      if (isOctaveUp) {
        return rootNote.replace(/\d/, (match) => String(parseInt(match) + 1));
      }
      return rootNote;
    });
  } 
  else if (style === "pedal") {
    // Pedal tone - sustained root note ignoring chord changes
    const pedalNote = bassNotes[0]; // Use first root note
    return rhythmPattern.map((shouldPlay) => {
      if (!shouldPlay) return null;
      return pedalNote;
    });
  }
  
  // Default to root style
  return rhythmPattern.map((shouldPlay, i) => {
    if (!shouldPlay) return null;
    const noteIndex = Math.floor(i / 4) % bassNotes.length;
    return bassNotes[noteIndex];
  });
}

// Drum patterns for each mood - 16-step patterns (4 bars of 4 beats)
// 1 = hit, 0 = rest, values between for velocity/accent
export const DRUM_PATTERNS = {
  sad: {
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],      // Slow, steady (on 1 and 3)
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],     // Minimal backbeat
    hihat: [0, 0.3, 0, 0.3, 0, 0.3, 0, 0.3, 0, 0.3, 0, 0.3, 0, 0.3, 0, 0.3], // Sparse, soft
    intensity: "low" as const,
  },
  melancholic: {
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],      // Slightly syncopated
    snare: [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0], // Soft snare
    hihat: [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4],
    intensity: "low" as const,
  },
  chill: {
    kick: [1, 0, 0, 0.6, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.6, 0, 0],  // Syncopated lo-fi kick
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0], // Laid back snare
    hihat: [0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0, 0.7, 0, 0.5, 0], // Half-time feel with accents
    intensity: "medium" as const,
  },
  happy: {
    kick: [1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0],  // Bouncy kick
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],         // Strong backbeat
    hihat: [0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6, 0.8, 0.6], // Continuous
    intensity: "high" as const,
  },
  upbeat: {
    kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],      // Four-on-the-floor
    snare: [0, 0, 0, 0, 1, 0, 0.6, 0, 0, 0, 0, 0, 1, 0, 0.6, 0], // Snare with ghost notes
    hihat: [1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7, 1, 0.7], // Full energy
    intensity: "high" as const,
  },
};

export interface DrumPattern {
  kick: number[];
  snare: number[];
  hihat: number[];
  intensity: "low" | "medium" | "high";
}

/**
 * Generate drum pattern based on mood
 * Returns separate patterns for kick, snare, and hihat with velocity values
 */
export function generateDrumPattern(mood: keyof typeof MOODS = "chill"): DrumPattern {
  return DRUM_PATTERNS[mood];
}

/**
 * Infer mood from existing patterns in track
 */
export function inferMoodFromTrack(): keyof typeof MOODS {
  // Could analyze track key/patterns here in the future
  // Currently returns safe default
  return "chill";
}
