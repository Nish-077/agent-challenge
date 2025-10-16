import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * UPDATE PATTERN PROPERTIES TOOL
 * Modifies tempo or length of an existing pattern.
 */
export const updatePatternPropertiesTool = createTool({
  id: "updatePatternProperties",
  description: "Modify tempo or length of an existing pattern.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of the pattern to update"),
    tempo: z.number().min(40).max(200).optional().describe("New tempo in BPM"),
    length: z.number().min(2).max(16).optional().describe("New length in measures"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    pattern: z.any().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { patternName, tempo, length } = context;

      if (!track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" does not exist.`,
        };
      }

      const updates: string[] = [];

      if (tempo !== undefined) {
        track.patterns[patternName].tempo = tempo;
        updates.push(`tempo: ${tempo} BPM`);
      }

      if (length !== undefined) {
        track.patterns[patternName].length = length;
        updates.push(`length: ${length} measures`);
      }

      if (updates.length === 0) {
        return {
          success: false,
          message: "No properties provided to update. Specify tempo and/or length.",
        };
      }

      writeTrack(track);
      return {
        success: true,
        message: `Updated pattern "${patternName}": ${updates.join(", ")}`,
        pattern: track.patterns[patternName],
      };
    });
  },
});
