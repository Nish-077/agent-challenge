import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * REMOVE PATTERN FROM TIMELINE TOOL
 * Removes a pattern from the timeline by position or by pattern ID.
 * Note: This doesn't delete the pattern itself, just removes it from playback.
 */
export const removePatternFromTimelineTool = createTool({
  id: "removePatternFromTimeline",
  description: "Remove a pattern from the timeline by position or pattern ID.",
  inputSchema: z.object({
    patternName: z.string().optional().describe("Pattern name to remove first occurrence"),
    position: z.number().optional().describe("Position index to remove"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { patternName, position } = context;

      if (position === undefined && !patternName) {
        return {
          success: false,
          message: "Either position or patternName must be provided.",
        };
      }

      // Remove by position
      if (position !== undefined) {
        if (position < 0 || position >= track.timeline.length) {
          return {
            success: false,
            message: `Position ${position} is out of bounds. Timeline length: ${track.timeline.length}`,
          };
        }

        const removed = track.timeline.splice(position, 1);
        
        writeTrack(track);
        return {
          success: true,
          message: `Removed pattern "${removed[0]}" from timeline at position ${position}.`,
        };
      }

      // Remove by patternName (first occurrence)
      if (patternName) {
        const index = track.timeline.indexOf(patternName);
        if (index === -1) {
          return {
            success: false,
            message: `Pattern "${patternName}" not found in timeline.`,
          };
        }

        track.timeline.splice(index, 1);
        
        writeTrack(track);
        return {
          success: true,
          message: `Removed first occurrence of pattern "${patternName}" from timeline (was at position ${index}).`,
        };
      }

      return {
        success: false,
        message: "Either position or patternName must be provided.",
      };
    });
  },
});
