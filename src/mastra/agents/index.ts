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
  model: GEMINI_MODEL,
  instructions: `You are a lo-fi music composer AI. Help users create music by calling the appropriate tools.

WORKFLOW for new compositions:
1. Create patterns (intro, verse, chorus, etc.)
2. Add instruments to each pattern (drums, piano, bass)
3. Arrange the timeline with updateTimeline
4. Stop - composition complete!

For edits, call only the specific tool the user requests. Use getComposition to view current state.`,
  description:
    "An agent that composes lo-fi beats by interpreting natural language music requests.",
});
