import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * ADD PATTERN TO TIMELINE TOOL
 * Adds a single pattern to the timeline at a specific position.
 * Use this to add patterns one at a time instead of setting the entire timeline.
 */
export const addPatternToTimelineTool = createTool({
  id: "addPatternToTimeline",
  description: "Add a pattern to the timeline at a specific position or at the end.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of pattern to add"),
    position: z.number().optional().describe("Position index - if not provided, appends to end"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { patternName, position = -1 } = context;

      if (!track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" does not exist.`,
        };
      }

      // Add to timeline at specified position
      if (position === -1 || position >= track.timeline.length) {
        track.timeline.push(patternName);
        const finalPosition = track.timeline.length - 1;
        
        writeTrack(track);
        return {
          success: true,
          message: `Added pattern "${patternName}" to end of timeline at position ${finalPosition}.`,
        };
      } else {
        track.timeline.splice(position, 0, patternName);
        
        writeTrack(track);
        return {
          success: true,
          message: `Inserted pattern "${patternName}" at position ${position} in timeline.`,
        };
      }
    });
  },
});
