import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * REMOVE TRACK FROM PATTERN TOOL
 * Removes an instrument from a pattern.
 */
export const removeTrackFromPatternTool = createTool({
  id: "removeTrackFromPattern",
  description: "Remove an instrument from a pattern.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of the pattern"),
    instrument: z.enum(["piano", "bass", "drums"]).describe("Instrument to remove"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { patternName, instrument } = context;

      if (!track.patterns[patternName]) {
        return {
          success: false,
          message: `Pattern "${patternName}" does not exist.`,
        };
      }

      if (!track.patterns[patternName].tracks[instrument]) {
        return {
          success: false,
          message: `${instrument} does not exist in pattern "${patternName}". Available instruments: ${Object.keys(track.patterns[patternName].tracks).join(", ") || "none"}`,
        };
      }

      delete track.patterns[patternName].tracks[instrument];

      writeTrack(track);
      return {
        success: true,
        message: `Removed ${instrument} from pattern "${patternName}".`,
        remainingInstruments: Object.keys(track.patterns[patternName].tracks),
      };
    });
  },
});
