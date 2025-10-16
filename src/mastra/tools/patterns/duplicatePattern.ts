import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * DUPLICATE PATTERN TOOL
 * Creates a copy of an existing pattern with a new ID.
 */
export const duplicatePatternTool = createTool({
  id: "duplicatePattern",
  description: "Copy an existing pattern to create a new one.",
  inputSchema: z.object({
    sourcePatternName: z.string().describe("Name of pattern to copy"),
    newPatternName: z.string().describe("Name for the new duplicate pattern"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    pattern: z.any().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { sourcePatternName, newPatternName } = context;

      if (!track.patterns[sourcePatternName]) {
        return {
          success: false,
          message: `Source pattern "${sourcePatternName}" does not exist.`,
        };
      }

      if (track.patterns[newPatternName]) {
        return {
          success: false,
          message: `Pattern "${newPatternName}" already exists. Choose a different name.`,
        };
      }

      // Deep copy the source pattern
      track.patterns[newPatternName] = JSON.parse(
        JSON.stringify(track.patterns[sourcePatternName])
      );
      track.patterns[newPatternName].id = newPatternName;

      writeTrack(track);
      return {
        success: true,
        message: `Duplicated pattern "${sourcePatternName}" to "${newPatternName}".`,
        pattern: track.patterns[newPatternName],
      };
    });
  },
});
