import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";
import { generateNotes, generateDrumStyle, inferMoodFromTrack, MOODS, RHYTHM_PATTERNS } from "../shared/musicGeneration";

/**
 * ADD TRACK TO PATTERN TOOL
 * Adds an instrument (piano, bass, or drums) to an existing pattern.
 * Automatically generates musical notes based on mood and rhythm.
 */
export const addTrackToPatternTool = createTool({
  id: "addTrackToPattern",
  description: "Add an instrument to a pattern with auto-generated musical notes.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of the pattern to add instrument to"),
    instrument: z.enum(["piano", "bass", "drums"]).describe("Instrument: piano, bass, or drums"),
    mood: z.enum(["sad", "happy", "chill", "melancholic", "upbeat"]).optional().describe("Musical mood, default is chill"),
    rhythm: z.enum(["simple", "sparse", "active"]).optional().describe("Rhythm density, default is simple"),
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
      const { patternName, instrument, mood: providedMood, rhythm: providedRhythm } = context;

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
      const newTrack: { instrument: string; style?: string; notes?: (string | null)[] } = { instrument };

      if (instrument === "drums") {
        newTrack.style = generateDrumStyle(mood as keyof typeof MOODS);
      } else if (instrument === "bass") {
        newTrack.notes = generateNotes(mood as keyof typeof MOODS, rhythm as keyof typeof RHYTHM_PATTERNS, "bass", patternLength);
      } else if (instrument === "piano") {
        newTrack.notes = generateNotes(mood as keyof typeof MOODS, rhythm as keyof typeof RHYTHM_PATTERNS, "piano", patternLength);
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
