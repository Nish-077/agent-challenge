import { createTool } from "@mastra/core";
import { z } from "zod";
import { readTrack } from "../shared/utils";

/**
 * GET COMPOSITION TOOL
 * Returns the current state of the composition including timeline and all patterns.
 */
export const getCompositionTool = createTool({
  id: "getComposition",
  description: "View the current composition state including timeline and all patterns with their instruments.",
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    const track = readTrack();
    
    const patternNames = Object.keys(track.patterns);
    const patternSummaries = patternNames.map(name => {
      const pattern = track.patterns[name];
      const instruments = Object.keys(pattern.tracks);
      return `${name} (${pattern.length} measures, ${pattern.tempo} BPM): ${instruments.join(", ") || "empty"}`;
    });
    
    const summary = [
      `Timeline: ${track.timeline.length > 0 ? track.timeline.join(" → ") : "empty"}`,
      `Patterns: ${patternNames.length}`,
      ...patternSummaries
    ].join("\n");
    
    return {
      summary,
    };
  },
});
