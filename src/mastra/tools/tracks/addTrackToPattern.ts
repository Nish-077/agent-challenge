import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";
import { generateNotes, generateMelody, generateBassLine, generateDrumPattern, inferMoodFromTrack, MOODS, RHYTHM_PATTERNS, DrumPattern } from "../shared/musicGeneration";

/**
 * ADD TRACK TO PATTERN TOOL
 * Adds an instrument (piano, bass, or drums) to an existing pattern.
 * Automatically generates musical notes based on mood and rhythm.
 */
export const addTrackToPatternTool = createTool({
  id: "addTrackToPattern",
  description: "Add instrument (piano/bass/drums) to pattern. Auto-generates musical notes. Piano plays chords by default (use trackType='melody' for lead lines). Bass has 5 styles. Drums auto-match mood with kick/snare/hihat. 10 rhythm patterns and 5 moods available.",
  inputSchema: z.object({
    patternName: z.string().describe("Pattern name to add instrument to"),
    instrument: z.enum(["piano", "bass", "drums"]).describe("piano (chords/melody), bass (low-end), or drums (percussion)"),
    mood: z.enum(["sad", "happy", "chill", "melancholic", "upbeat"]).optional().describe("sad=slow/dark, happy=bright/fast, chill=balanced (default), melancholic=sad-ish, upbeat=energetic"),
    rhythm: z.enum(["simple", "sparse", "active", "shuffled", "dotted", "offbeat", "triplets", "syncopated", "steady", "half_time"]).optional().describe("simple=on-beat (default), sparse=minimal, active=syncopated, shuffled=swing, dotted/offbeat/triplets/syncopated/steady/half_time=variations"),
    trackType: z.enum(["chords", "melody", "bass", "drums"]).optional().describe("chords=full harmony (piano default), melody=single-note lead line, bass/drums=auto. Use melody when user wants lead/solo."),
    bassStyle: z.enum(["root", "walking", "arpeggio", "octaves", "pedal"]).optional().describe("root=sustained (default), walking=stepwise motion, arpeggio=chord tones, octaves=jumps, pedal=sustained ignoring chords"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    track: z.any().optional(),
    patternName: z.string().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      console.log('\n🎸 ========== ADD TRACK TO PATTERN TOOL ==========');
      console.log('📥 Input:', JSON.stringify(context, null, 2));
      
      const track = readTrack();
      const { patternName, instrument, mood: providedMood, rhythm: providedRhythm, trackType, bassStyle } = context;

      if (!track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" does not exist.`,
        };
      }

      // SMART DEFAULTS
      const mood = providedMood || inferMoodFromTrack();
      if (!providedMood) {
        console.log(`   🎨 Smart default: Using mood "${mood}"`);
      }

      const rhythm = providedRhythm || "simple";
      if (!providedRhythm) {
        console.log(`   🥁 Smart default: Using rhythm "${rhythm}"`);
      }

      // Check if track already exists
      if (track.patterns[patternName].tracks[instrument]) {
        return {
          success: false,
          message: `${instrument} already exists in pattern "${patternName}". Use removeTrackFromPattern first if you want to replace it.`,
        };
      }

      // Get pattern length for correct note generation
      const patternLength = track.patterns[patternName].length || 4;

      // Generate new track
      const newTrack: { instrument: string; drumPattern?: DrumPattern; notes?: (string | string[] | null)[] } = { instrument };

      if (instrument === "drums") {
        newTrack.drumPattern = generateDrumPattern(mood as keyof typeof MOODS);
      } else if (instrument === "bass") {
        // Use bass style if provided, otherwise use root style
        const style = bassStyle || "root";
        newTrack.notes = generateBassLine(
          mood as keyof typeof MOODS, 
          rhythm as keyof typeof RHYTHM_PATTERNS, 
          patternLength, 
          style as "root" | "walking" | "arpeggio" | "octaves" | "pedal"
        );
      } else if (instrument === "piano") {
        // Determine if piano should play chords or melody
        const shouldPlayMelody = trackType === "melody";
        
        if (shouldPlayMelody) {
          // Generate melodic line using scales
          newTrack.notes = generateMelody(mood as keyof typeof MOODS, rhythm as keyof typeof RHYTHM_PATTERNS, patternLength);
        } else {
          // Piano plays full chords (default)
          newTrack.notes = generateNotes(mood as keyof typeof MOODS, rhythm as keyof typeof RHYTHM_PATTERNS, "piano", patternLength, true);
        }
      }

      track.patterns[patternName].tracks[instrument] = newTrack;

      writeTrack(track);
      
      const result = {
        success: true,
        message: `Added ${instrument} to pattern "${patternName}" with ${mood} mood and ${rhythm} rhythm.`,
        track: newTrack,
        patternName,
      };
      
      console.log('📤 Output:', JSON.stringify(result, null, 2));
      console.log('✅ ADD TRACK TO PATTERN COMPLETE\n');
      
      return result;
    });
  },
});
