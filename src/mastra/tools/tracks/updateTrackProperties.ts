import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack, writeTrack, withLock } from "../shared/utils";

/**
 * UPDATE TRACK PROPERTIES TOOL
 * Updates volume of an instrument in a pattern.
 */
export const updateTrackPropertiesTool = createTool({
  id: "updateTrackProperties",
  description: "Update volume of an instrument in a pattern.",
  inputSchema: z.object({
    patternName: z.string().describe("Name of the pattern"),
    instrument: z.enum(["piano", "bass", "drums"]).describe("Instrument to update"),
    volume: z.number().min(0).max(1).describe("Volume level from 0 to 1, use 0 to mute"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    track: z.any().optional(),
  }),
  execute: async ({ context }) => {
    return withLock(async () => {
      const track = readTrack();
      const { patternName, instrument, volume } = context;

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

      track.patterns[patternName].tracks[instrument].volume = volume;

      writeTrack(track);
      return {
        success: true,
        message: `Updated ${instrument} in pattern "${patternName}": volume ${volume}`,
        track: track.patterns[patternName].tracks[instrument],
      };
    });
  },
});
