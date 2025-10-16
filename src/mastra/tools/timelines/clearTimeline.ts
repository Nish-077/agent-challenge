import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * CLEAR TIMELINE TOOL
 * Removes all patterns from the timeline without deleting the patterns themselves.
 * Use this to start arranging from scratch while keeping your patterns.
 */
export const clearTimelineTool = createTool({
  id: "clearTimeline",
  description: "Clear the entire timeline without deleting patterns.",
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();

      const previousLength = track.timeline.length;
      track.timeline = [];

      writeTrack(track);
      return {
        success: true,
        message: `Cleared timeline (removed ${previousLength} entries).`,
      };
    });
  },
});
