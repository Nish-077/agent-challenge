import { MCPServer } from "@mastra/mcp"
// Direct imports to avoid bundler issues with barrel exports
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
import { musicAgent } from "../agents";

export const server = new MCPServer({
  name: "Lo-Fi Beats MCP Server",
  version: "1.0.0",
  description: "MCP server for AI-powered lo-fi beat composition. Exposes individual focused tools for pattern, track, and timeline operations, plus musicAgent for natural language composition.",
  tools: {
    // Pattern Management Tools
    createPatternTool,
    deletePatternTool,
    deleteAllPatternsTool,
    updatePatternPropertiesTool,
    duplicatePatternTool,
    // Track/Instrument Management Tools
    addTrackToPatternTool,
    removeTrackFromPatternTool,
    updateTrackPropertiesTool,
    // Timeline/Arrangement Management Tools
    updateTimelineTool,
    addPatternToTimelineTool,
    removePatternFromTimelineTool,
    clearTimelineTool,
  },
  agents: { musicAgent }, // Natural language agent - becomes tool "ask_musicAgent"
});
