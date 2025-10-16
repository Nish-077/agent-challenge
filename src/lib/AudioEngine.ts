import * as Tone from "tone";

// Types matching our track.json structure
export interface Track {
  tempo: number;
  key: string;
  timeline: string[];
  patterns: {
    [key: string]: Pattern;
  };
}

export interface Pattern {
  id: string;
  length: number;
  tempo?: number; // Optional per-pattern tempo override
  tracks: {
    [instrument: string]: InstrumentTrack;
  };
}

export interface DrumPattern {
  kick: number[];
  snare: number[];
  hihat: number[];
  intensity: "low" | "medium" | "high";
}

export interface InstrumentTrack {
  instrument: string;
  notes?: (string | string[] | null)[]; // Support both single notes and chord arrays
  style?: string; // Legacy - will be removed
  drumPattern?: DrumPattern;
  volume?: number;
  muted?: boolean;
}

export class AudioEngine {
  private synths: Map<string, Tone.PolySynth | Tone.Synth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth>;
  private drumSynths: {
    kick: Tone.MembraneSynth;
    snare: Tone.NoiseSynth;
    hihat: Tone.MetalSynth;
  } | null = null;
  private sequence: Tone.Sequence | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;
  private currentStep = 0;
  private onStepChange?: (timelineStep: number, patternId: string, patternStep: number) => void;

  constructor() {
    this.synths = new Map();
    // Don't initialize synths in constructor - wait for user interaction
  }

  /**
   * Set callback for when the playback step changes
   * @param callback - receives (timelineStep, patternId, patternStep/noteIndex)
   */
  setOnStepChange(callback: (timelineStep: number, patternId: string, patternStep: number) => void) {
    this.onStepChange = callback;
  }

  /**
   * Initialize synthesizers for different instruments
   */
  private initializeSynths() {
    if (this.synths.size > 0) return; // Already initialized

    // Piano - PolySynth for multiple notes
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.005,
        decay: 0.3,
        sustain: 0.4,
        release: 1.2,
      },
      volume: -8,
    }).toDestination();

    // Bass - MembraneSynth for deep bass sounds
    const bass = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
      volume: -6,
    }).toDestination();

    // Kick Drum - MembraneSynth for punchy kicks
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
      volume: -8,
    }).toDestination();

    // Snare Drum - NoiseSynth for snappy snare
    const snare = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.2,
      },
      volume: -10,
    }).toDestination();

    // Hi-hat - MetalSynth for metallic hi-hat sound
    const hihat = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.05,
        release: 0.05,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -15,
    }).toDestination();

    // Add reverb for lo-fi effect
    const reverb = new Tone.Reverb({
      decay: 2.5,
      wet: 0.3,
    }).toDestination();

    piano.connect(reverb);
    bass.connect(reverb);

    this.synths.set("piano", piano);
    this.synths.set("bass", bass);
    
    // Store drum synths separately for pattern-based triggering
    this.drumSynths = { kick, snare, hihat };
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    await Tone.start();
    this.initializeSynths(); // Initialize synths after Tone.start()
    this.isInitialized = true;
  }

  /**
   * Load and parse a track, then set up the playback sequence
   */
  async loadTrack(track: Track) {
    await this.initialize();
    
    this.currentTrack = track;
    
    // Set tempo
    Tone.Transport.bpm.value = track.tempo;

    // Stop any existing sequence
    if (this.sequence) {
      // Stop immediately (time = 0) to avoid negative time errors
      this.sequence.stop(0);
      this.sequence.dispose();
    }

    // Create a new sequence if we have timeline data
    if (track.timeline.length > 0) {
      this.createSequence();
    }
  }

  /**
   * Create a Tone.Sequence that steps through the timeline
   */
  private createSequence() {
    if (!this.currentTrack || this.currentTrack.timeline.length === 0) return;

    const { timeline, patterns } = this.currentTrack;

    // Calculate total number of steps across all patterns in timeline
    // Use the actual notes array length, not pattern.length
    let totalSteps = 0;
    const stepToTimelineMap: { timelineIndex: number; patternStep: number }[] = [];
    
    timeline.forEach((patternId, timelineIndex) => {
      const pattern = patterns[patternId];
      if (pattern) {
        // Find the longest notes array in this pattern's tracks
        let maxSteps = pattern.length; // Default fallback
        Object.values(pattern.tracks).forEach((track) => {
          if (track.notes && track.notes.length > maxSteps) {
            maxSteps = track.notes.length;
          }
        });
        
        for (let i = 0; i < maxSteps; i++) {
          stepToTimelineMap.push({ timelineIndex, patternStep: i });
          totalSteps++;
        }
      }
    });

    // Track the last pattern to detect tempo changes
    let lastPatternId: string | null = null;
    
    this.sequence = new Tone.Sequence(
      (time, step) => {
        const { timelineIndex, patternStep } = stepToTimelineMap[step];
        const patternId = timeline[timelineIndex];
        const pattern = patterns[patternId];

        if (!pattern) return;

        // Handle per-pattern tempo changes
        // Only change tempo at the start of a new pattern (patternStep === 0) and if pattern changed
        if (patternStep === 0 && patternId !== lastPatternId) {
          const targetTempo = pattern.tempo ?? this.currentTrack!.tempo;
          const currentTempo = Tone.Transport.bpm.value;
          
          if (currentTempo !== targetTempo) {
            // Smooth tempo transition over the duration of one measure (4 quarter notes)
            // This prevents jarring tempo jumps
            Tone.Transport.bpm.rampTo(targetTempo, "1m", time);
          }
          
          lastPatternId = patternId;
        }

        // Notify UI about current timeline step and note position
        this.currentStep = timelineIndex;
        if (this.onStepChange) {
          // Schedule the callback slightly ahead so UI updates in sync
          Tone.Draw.schedule(() => {
            this.onStepChange?.(timelineIndex, patternId, patternStep);
          }, time);
        }

        // Play all tracks in the pattern at this step
        Object.values(pattern.tracks).forEach((track) => {
          this.playInstrumentTrack(track, patternStep, time);
        });
      },
      [...Array(totalSteps).keys()],
      "4n" // Quarter note subdivision
    );

    this.sequence.loop = true;
    this.sequence.loopStart = 0;
    this.sequence.loopEnd = totalSteps;
  }

  /**
   * Play a single instrument track at a specific step
   */
  private playInstrumentTrack(track: InstrumentTrack, stepIndex: number, time: number) {
    // Handle drum patterns (new system)
    if (track.instrument === "drums" && track.drumPattern && this.drumSynths) {
      const pattern = track.drumPattern;
      
      // Play kick if pattern has a hit at this step
      if (pattern.kick[stepIndex]) {
        const velocity = pattern.kick[stepIndex];
        this.drumSynths.kick.triggerAttackRelease("C1", "16n", time, velocity);
      }
      
      // Play snare if pattern has a hit at this step
      if (pattern.snare[stepIndex]) {
        const velocity = pattern.snare[stepIndex];
        this.drumSynths.snare.triggerAttackRelease("16n", time, velocity);
      }
      
      // Play hi-hat if pattern has a hit at this step
      if (pattern.hihat[stepIndex]) {
        const velocity = pattern.hihat[stepIndex];
        this.drumSynths.hihat.triggerAttackRelease("16n", time, velocity);
      }
      
      return;
    }

    // Handle note-based tracks (piano, bass)
    const synth = this.synths.get(track.instrument);
    if (!synth) return;

    if (track.notes && track.notes[stepIndex]) {
      const note = track.notes[stepIndex];
      if (note !== null) {
        // Handle chord arrays (piano playing full chords)
        if (Array.isArray(note)) {
          if (synth instanceof Tone.PolySynth) {
            synth.triggerAttackRelease(note, "2n", time); // Longer duration for chords
          }
        } 
        // Handle single notes (bass or arpeggiated piano)
        else {
          if (synth instanceof Tone.PolySynth) {
            synth.triggerAttackRelease(note, "8n", time);
          } else if (synth instanceof Tone.MembraneSynth) {
            synth.triggerAttackRelease(note, "8n", time);
          }
        }
      }
    }

    // Legacy: Handle old style-based drums (for backwards compatibility)
    if (track.style && synth instanceof Tone.NoiseSynth) {
      if (track.style.includes("loop")) {
        // Simple kick pattern on beats 1 and 3
        if (stepIndex % 4 === 0 || stepIndex % 4 === 2) {
          synth.triggerAttackRelease("16n", time);
        }
      }
    }
  }

  /**
   * Play the loaded track
   */
  async play() {
    await this.initialize();
    
    if (this.sequence) {
      this.sequence.start(0);
    }
    
    Tone.Transport.start();
  }

  /**
   * Pause playback
   */
  pause() {
    Tone.Transport.pause();
  }

  /**
   * Stop playback and reset to beginning
   */
  stop() {
    Tone.Transport.stop();
    if (this.sequence) {
      this.sequence.stop(0);
    }
  }

  /**
   * Resume playback
   */
  resume() {
    Tone.Transport.start();
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return Tone.Transport.state === "started";
  }

  /**
   * Get current playback position
   */
  getPosition(): number {
    return Tone.Transport.position as any;
  }

  /**
   * Update tempo
   */
  setTempo(bpm: number) {
    Tone.Transport.bpm.value = bpm;
    if (this.currentTrack) {
      this.currentTrack.tempo = bpm;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.sequence) {
      this.sequence.stop(0);
      this.sequence.dispose();
    }
    this.synths.forEach((synth) => synth.dispose());
    Tone.Transport.stop();
  }
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}
