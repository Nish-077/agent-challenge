import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * UPDATE TIMELINE TOOL
 * Sets the complete playback timeline for your composition.
 * The timeline is an ordered array of pattern IDs that defines the structure of your song.
 * Example: ["intro", "verse", "verse", "chorus", "verse", "outro"]
 * This is the main tool for arranging your composition.
 */
export const updateTimelineTool = createTool({
  id: "updateTimeline",
  description: "Arrange patterns into a complete song timeline.",
  inputSchema: z.object({
    timeline: z.array(z.string()).describe("Ordered array of pattern IDs, patterns can repeat"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    timeline: z.array(z.string()).optional(),
    totalSections: z.number().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      console.log('\n⏱️  ========== UPDATE TIMELINE TOOL ==========');
      console.log('📥 Input:', JSON.stringify(context, null, 2));
      
      const track = readTrack();
      const { timeline } = context;

      if (!timeline || !Array.isArray(timeline)) {
        return {
          success: false,
          message: "timeline must be an array of pattern IDs.",
        };
      }

      if (timeline.length === 0) {
        return {
          success: false,
          message: "timeline cannot be empty. Use clearTimeline to empty it.",
        };
      }

      // Check if timeline is already set to this exact arrangement
      const currentTimeline = JSON.stringify(track.timeline);
      const newTimeline = JSON.stringify(timeline);
      if (currentTimeline === newTimeline) {
        return {
          success: false,
          message: `Timeline is already set to this arrangement. The composition is complete - no need to call this again.`,
        };
      }

      // Validate that all patterns exist
      const invalidPatterns = timeline.filter((id: string) => !track.patterns[id]);
      if (invalidPatterns.length > 0) {
        return {
          success: false,
          message: `Invalid patterns: ${invalidPatterns.join(", ")}. Create missing patterns first.`,
        };
      }

      track.timeline = timeline;

      writeTrack(track);
      
      const result = {
        success: true,
        message: `Timeline updated: ${timeline.join(" → ")}. Your composition is now arranged and ready to play!`,
        timeline: track.timeline,
        totalSections: timeline.length,
      };
      
      console.log('📤 Output:', JSON.stringify(result, null, 2));
      console.log('✅ UPDATE TIMELINE COMPLETE\n');
      
      return result;
    });
  },
});
