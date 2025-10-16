import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { createPatternTool } from "../tools/patterns/createPattern";
import { deletePatternTool } from "../tools/patterns/deletePattern";
import { deleteAllPatternsTool } from "../tools/patterns/deleteAllPatterns";
import { updatePatternPropertiesTool } from "../tools/patterns/updatePatternProperties";
import { duplicatePatternTool } from "../tools/patterns/duplicatePattern";
import { addTrackToPatternTool } from "../tools/tracks/addTrackToPattern";
import { removeTrackFromPatternTool } from "../tools/tracks/removeTrackFromPattern";
import { updateTrackPropertiesTool } from "../tools/tracks/updateTrackProperties";
import { updateTimelineTool } from "../tools/timelines/updateTimeline";
import { addPatternToTimelineTool } from "../tools/timelines/addPatternToTimeline";
import { removePatternFromTimelineTool } from "../tools/timelines/removePatternFromTimeline";
import { clearTimelineTool } from "../tools/timelines/clearTimeline";
import { getCompositionTool } from "../tools/view/getComposition";

// Use Google Gemini model for better accuracy with tool calling
const GEMINI_MODEL = "google/gemini-2.5-flash";

// Music Composer Agent (instructions set dynamically based on mode)
export const musicAgent = new Agent({
  name: "Music Composer",
  tools: {
    // View/Inspection
    getCompositionTool,
    // Pattern Management
    createPatternTool,
    deletePatternTool,
    deleteAllPatternsTool,
    updatePatternPropertiesTool,
    duplicatePatternTool,
    // Track/Instrument Management
    addTrackToPatternTool,
    removeTrackFromPatternTool,
    updateTrackPropertiesTool,
    // Timeline/Arrangement Management
    updateTimelineTool,
    addPatternToTimelineTool,
    removePatternFromTimelineTool,
    clearTimelineTool,
  },
  // Using Google Gemini for better tool calling accuracy
  model: GEMINI_MODEL,
  // Memory disabled for now - will add back later if needed
  instructions: `You are a lo-fi music producer AI. When creating music, complete these steps IN ORDER:
1. Create 2-3 patterns (intro, verse, chorus)
2. Add ALL 3 instruments to EACH pattern: drums, piano, AND bass
3. Arrange the timeline ONCE with updateTimeline

After arranging the timeline, your job is COMPLETE - STOP calling tools. The song is done.`,
  description:
    "An agent that composes lo-fi beats by interpreting natural language music requests.",
});
