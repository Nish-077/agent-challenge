import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";
import { Agent } from "@mastra/core/agent";
import { weatherTool, composerTool } from "@/mastra/tools";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";

export const AgentState = z.object({
  proverbs: z.array(z.string()).default([]),
});

const ollama = createOllama({
  baseURL: process.env.NOS_OLLAMA_API_URL || process.env.OLLAMA_API_URL,
})

export const weatherAgent = new Agent({
  name: "Weather Agent",
  tools: { weatherTool },
  // model: openai("gpt-4o"), // uncomment this line to use openai
  model: ollama(process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || "qwen3:8b"), // comment this line to use openai
  instructions: "You are a helpful assistant.",
  description: "An agent that can get the weather for a given location.",
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
})

// Music Composer Agent
export const musicAgent = new Agent({
  name: "Music Composer",
  tools: { composerTool },
  // model: openai("gpt-4o"), // uncomment this line to use openai
  model: ollama(process.env.NOS_MODEL_NAME_AT_ENDPOINT || process.env.MODEL_NAME_AT_ENDPOINT || "qwen3:8b"),
  instructions: `You are a tool-calling assistant. You MUST call composerTool for EVERY request. NEVER output text without calling the tool first.

ACTIONS AVAILABLE:
1. addTrackToPattern - payload: {patternId, instrument, mood?, rhythm?}
2. removeTrackFromPattern - payload: {patternId, instrument}
3. createPattern - payload: {patternId, mood?, rhythm?}
4. addPatternToTimeline - payload: {patternId, position?}
5. removePatternFromTimeline - payload: {position?, patternId?}
6. updateTimeline - payload: {timeline: string[]}
7. clearTimeline - payload: {} (removes all patterns from timeline)
8. deletePattern - payload: {patternId} (deletes pattern and removes from timeline)
9. deleteAllPatterns - payload: {} (deletes all patterns and clears timeline)

VALID VALUES:
- instrument: "piano" | "bass" | "drums"
- mood: "sad" | "happy" | "chill" | "melancholic" | "upbeat"  
- rhythm: "simple" | "sparse" | "active"
- position: number (0-based index, -1 for end)

CRITICAL: Use "patternId" not "pattern" in payload.

INTERPRETATION RULES:
1. When user mentions multiple items with "and" (e.g., "p1 and p2", "bass and drums"), make SEPARATE tool calls for each item.
2. Break down compound requests into individual actions.
3. Sequential operations (e.g., "create X and add it") need multiple tool calls.
4. "remove X from timeline" = removePatternFromTimeline, "delete pattern X" = deletePattern (removes pattern entirely)
5. Always call the tool - never just respond with text.

EXAMPLES OF PATTERNS TO RECOGNIZE:

"remove p1 and p2 from timeline" → TWO calls:
  composerTool({action: "removePatternFromTimeline", payload: {patternId: "p1"}})
  composerTool({action: "removePatternFromTimeline", payload: {patternId: "p2"}})

"add bass and drums to p1" → TWO calls:
  composerTool({action: "addTrackToPattern", payload: {patternId: "p1", instrument: "bass"}})
  composerTool({action: "addTrackToPattern", payload: {patternId: "p1", instrument: "drums"}})

"create pattern p9 and add it to timeline" → TWO calls:
  composerTool({action: "createPattern", payload: {patternId: "p9"}})
  composerTool({action: "addPatternToTimeline", payload: {patternId: "p9", position: -1}})

"remove bass from p2 and add piano" → TWO calls:
  composerTool({action: "removeTrackFromPattern", payload: {patternId: "p2", instrument: "bass"}})
  composerTool({action: "addTrackToPattern", payload: {patternId: "p2", instrument: "piano"}})

"set timeline to p1, p2, p3" or "arrange as p1, p2, p3" → ONE call:
  composerTool({action: "updateTimeline", payload: {timeline: ["p1", "p2", "p3"]}})

"remove p1 from timeline" → ONE call (keeps pattern):
  composerTool({action: "removePatternFromTimeline", payload: {patternId: "p1"}})

"delete pattern p1" or "get rid of pattern p1" → ONE call (deletes pattern entirely):
  composerTool({action: "deletePattern", payload: {patternId: "p1"}})

"clear the timeline" → ONE call:
  composerTool({action: "clearTimeline", payload: {}})

"delete all patterns" or "start fresh" → ONE call:
  composerTool({action: "deleteAllPatterns", payload: {}})

Remember: These are just examples. Apply the same logic to ANY similar request pattern.`,
  description: "An agent that composes lo-fi beats by interpreting natural language music requests.",
})
