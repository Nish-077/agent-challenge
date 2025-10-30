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
  instructions: `You are a lo-fi music composer AI that helps users create and edit music compositions.

⚙️ WORKFLOW GUIDANCE:
For creative requests (vibe/mood):
1. Create 2-4 patterns with appropriate moods and tempos
2. Add complementary instruments to each pattern
3. Arrange patterns into a timeline

For technical edits:
- Call the specific tool requested by the user
- Use getComposition to check current state

Make thoughtful musical decisions based on the user's intent.`,
  description:
    "An agent that composes lo-fi beats by interpreting natural language music requests. Supports two modes: Producer (creative) and Composer (precise).",
});
