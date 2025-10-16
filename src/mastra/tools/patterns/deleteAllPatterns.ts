import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

export const deleteAllPatternsTool = createTool({
  id: "deleteAllPatterns",
  description: "Delete all patterns and clear the timeline completely.",
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const patternCount = Object.keys(track.patterns).length;
      track.patterns = {};
      track.timeline = [];
      writeTrack(track);
      return {
        success: true,
        message: `Deleted all ${patternCount} patterns and cleared the timeline.`,
      };
    });
  },
});
