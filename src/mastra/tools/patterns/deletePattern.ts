import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * DELETE PATTERN TOOL
 * Deletes a single pattern and removes it from timeline.
 */
export const deletePatternTool = createTool({
  id: "deletePattern",
  description: "Delete a specific pattern by name.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of the pattern to delete"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      console.log('\n🗑️  ========== DELETE PATTERN TOOL ==========');
      console.log('📥 Input:', JSON.stringify(context, null, 2));
      
      const track = readTrack();
      const { patternName } = context;

      if (!track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" does not exist.`,
        };
      }

      // Remove pattern from timeline
      track.timeline = track.timeline.filter((name) => name !== patternName);

      // Delete pattern
      delete track.patterns[patternName];

      writeTrack(track);
      
      const result = {
        success: true,
        message: `Deleted pattern "${patternName}" and removed all occurrences from timeline.`,
        remainingPatterns: Object.keys(track.patterns),
      };
      
      console.log('📤 Output:', JSON.stringify(result, null, 2));
      console.log('✅ DELETE PATTERN COMPLETE\n');
      
      return result;
    });
  },
});
