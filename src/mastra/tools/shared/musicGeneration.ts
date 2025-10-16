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

// Mood configurations with chord progressions
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
  },
};

// Base rhythm patterns - per 4-step measure, designed for lo-fi beats
export const RHYTHM_PATTERNS = {
  simple: [1, 0, 1, 0], // On-beat pattern - creates steady groove
  sparse: [1, 0, 0, 1], // Minimal pattern - notes on 1 and 4
  active: [1, 0, 1, 1], // Syncopated pattern - more rhythmic variation
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
 */
export function generateNotes(
  mood: keyof typeof MOODS = "chill",
  rhythm: keyof typeof RHYTHM_PATTERNS = "simple",
  instrument: "piano" | "bass" = "piano",
  patternLength: number = 4
): (string | null)[] {
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

/**
 * Generate drum style based on mood
 * Currently returns random style, mood parameter reserved for future use
 */
export function generateDrumStyle(_mood: keyof typeof MOODS = "chill"): string {
  const styles = ["lofi_loop_1", "lofi_loop_2", "lofi_loop_3"];
  return styles[Math.floor(Math.random() * styles.length)];
}

/**
 * Infer mood from existing patterns in track
 */
export function inferMoodFromTrack(): keyof typeof MOODS {
  // Could analyze track key/patterns here in the future
  // Currently returns safe default
  return "chill";
}
