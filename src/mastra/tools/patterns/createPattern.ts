import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock, generatePatternName } from "../shared/utils";

/**
 * CREATE PATTERN TOOL
 * Creates a new empty musical pattern with specified properties.
 * Patterns are the building blocks of your composition - think of them as sections like intro, verse, chorus.
 * After creating a pattern, use addTrackToPattern to add instruments to it.
 */
export const createPatternTool = createTool({
  id: "createPattern",
  description: "Create new empty pattern (intro/verse/chorus/etc). Add instruments with addTrackToPattern after.",
  inputSchema: z.object({
    patternName: z.string().optional().describe("intro, verse, chorus, bridge, outro - auto-generates if omitted"),
    tempo: z.number().min(40).max(200).optional().describe("BPM (40-200), uses track default if omitted"),
    length: z.number().min(2).max(16).optional().describe("Measures (2-16), default 4"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    pattern: z.any().optional(),
    patternName: z.string().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      console.log('\n🎨 ========== CREATE PATTERN TOOL ==========');
      console.log('📥 Input:', JSON.stringify(context, null, 2));
      
      const track = readTrack();
      const { patternName: providedPatternName, tempo, length = 4 } = context;
      let patternName = providedPatternName;
      
      // AUTO PATTERN NAMING: Generate semantic name if not provided
      if (!patternName) {
        patternName = generatePatternName(track);
        console.log(`   🎵 Auto-generated pattern name: "${patternName}"`);
      } else if (track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" already exists. Choose a different name or use updatePatternProperties to modify it.`,
        };
      }

      // Create new empty pattern
      track.patterns[patternName] = {
        id: patternName,
        length,
        tempo: tempo || track.tempo,
        tracks: {},
      };

      writeTrack(track);
      
      const result = {
        success: true,
        message: `Created pattern "${patternName}" (tempo: ${tempo || track.tempo} BPM, length: ${length} measures).`,
        pattern: track.patterns[patternName],
        patternName,
      };
      
      console.log('📤 Output:', JSON.stringify(result, null, 2));
      console.log('✅ CREATE PATTERN COMPLETE\n');
      
      return result;
    });
  },
});
