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
  tracks: {
    [instrument: string]: InstrumentTrack;
  };
}

export interface InstrumentTrack {
  instrument: string;
  notes?: (string | null)[];
  style?: string;
}

export class AudioEngine {
  private synths: Map<string, Tone.PolySynth | Tone.Synth | Tone.NoiseSynth | Tone.MembraneSynth>;
  private sequence: Tone.Sequence | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;
  private currentStep = 0;
  private onStepChange?: (step: number, patternId: string) => void;

  constructor() {
    this.synths = new Map();
    // Don't initialize synths in constructor - wait for user interaction
  }

  /**
   * Set callback for when the playback step changes
   */
  setOnStepChange(callback: (step: number, patternId: string) => void) {
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

    // Drums - NoiseSynth for drum hits
    const drums = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
      },
      volume: -10,
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
    this.synths.set("drums", drums);
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    await Tone.start();
    this.initializeSynths(); // Initialize synths after Tone.start()
    this.isInitialized = true;
    console.log("Audio engine initialized");
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
      this.sequence.stop();
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
    // Each pattern has its own length (number of notes)
    let totalSteps = 0;
    const stepToTimelineMap: { timelineIndex: number; patternStep: number }[] = [];
    
    timeline.forEach((patternId, timelineIndex) => {
      const pattern = patterns[patternId];
      if (pattern) {
        for (let i = 0; i < pattern.length; i++) {
          stepToTimelineMap.push({ timelineIndex, patternStep: i });
          totalSteps++;
        }
      }
    });
    
    this.sequence = new Tone.Sequence(
      (time, step) => {
        const { timelineIndex, patternStep } = stepToTimelineMap[step];
        const patternId = timeline[timelineIndex];
        const pattern = patterns[patternId];

        if (!pattern) return;

        console.log('Playing timeline step:', timelineIndex, 'pattern:', patternId, 'note step:', patternStep);

        // Notify UI about current timeline step
        this.currentStep = timelineIndex;
        if (this.onStepChange) {
          // Schedule the callback slightly ahead so UI updates in sync
          Tone.Draw.schedule(() => {
            this.onStepChange?.(timelineIndex, patternId);
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
    console.log('Sequence created with', timeline.length, 'timeline patterns,', totalSteps, 'total steps, loop:', this.sequence.loop);
  }

  /**
   * Play a single instrument track at a specific step
   */
  private playInstrumentTrack(track: InstrumentTrack, stepIndex: number, time: number) {
    const synth = this.synths.get(track.instrument);
    if (!synth) return;

    // Handle note-based tracks (piano, bass)
    if (track.notes && track.notes[stepIndex]) {
      const note = track.notes[stepIndex];
      if (note !== null) {
        if (synth instanceof Tone.PolySynth) {
          synth.triggerAttackRelease(note, "8n", time);
        } else if (synth instanceof Tone.MembraneSynth) {
          synth.triggerAttackRelease(note, "8n", time);
        }
      }
    }

    // Handle style-based tracks (drums)
    if (track.style && synth instanceof Tone.NoiseSynth) {
      // Different drum patterns could be implemented here
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
      console.log('Starting playback - sequence.loop:', this.sequence.loop);
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
