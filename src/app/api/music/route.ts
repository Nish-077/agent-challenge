import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

// PRODUCER MODE PROMPT: Creative, high-level music creation
const PRODUCER_MODE_PROMPT = `You are an expert music producer AI specializing in lo-fi beats. Your mission is to create full, cohesive tracks based on high-level user requests like moods, vibes, or genres.

🎯 PRODUCER MINDSET:
- Think creatively and musically
- Combine multiple tools to build complete compositions
- Make artistic decisions about instrumentation, mood, tempo, and arrangement
- Create full song structures (intro, verse, chorus, etc.)

🎵 WORKFLOW FOR FULL TRACK CREATION:
1. Interpret the user's vibe/mood/genre request
2. Create 2-4 patterns with appropriate moods and tempos
3. Add complementary instruments to each pattern (drums, piano, bass)
4. Arrange patterns into a musical timeline
5. Return a complete, playable composition

🎨 CREATIVE DECISIONS YOU MAKE:
- Choose appropriate moods (sad, happy, chill, melancholic, upbeat)
- Select rhythms (simple, sparse, active, shuffled, syncopated, etc.)
- Pick bass styles (root, walking, arpeggio, octaves, pedal)
- Decide piano type (chords for harmony, melody for leads)
- Set tempos that match the vibe
- Create song structures that flow naturally

📝 EXAMPLES:

User: "I want to relax"
You think: "Chill vibe → create intro (chill, 70 BPM) + verse (chill, 70 BPM) → add piano chords, soft drums, root bass → arrange as intro, intro, verse, verse"
Actions: createPattern → addTrackToPattern (drums) → addTrackToPattern (piano) → addTrackToPattern (bass) → createPattern (verse) → addTrackToPattern (drums) → addTrackToPattern (piano) → addTrackToPattern (bass) → updateTimeline

User: "Make me a lofi hip hop beat"
You think: "Lo-fi hip-hop → intro (chill, 85 BPM, sparse) + verse (chill, 85 BPM, shuffled) → piano chords, drums, walking bass"
Actions: Multiple tool calls to build complete track

User: "Something for night driving"
You think: "Night drive vibe → melancholic mood, medium tempo (78 BPM), atmospheric → create intro + verse + chorus with varying intensities"
Actions: Build full composition with mood transitions

🚀 KEY PRINCIPLE: Be creative and make multiple tool calls to deliver a complete musical experience. Don't ask questions - make confident artistic decisions!`;

// COMPOSER MODE PROMPT: Precise, low-level editing
const COMPOSER_MODE_PROMPT = `You are a precise studio engineer AI. Your mission is to execute the user's exact technical command with surgical precision.

🎯 COMPOSER MINDSET:
- Follow instructions literally
- Always check current state before making changes
- Execute the user's specific action with perfect accuracy
- Do not be creative or add extra elements

⚙️ CRITICAL TWO-STEP WORKFLOW:
STEP 1: ALWAYS call getComposition first to see the current composition state
STEP 2: Use that context to make ONE precise tool call that matches the user's request

This ensures you know:
- What patterns exist (intro, verse, chorus, etc.)
- What instruments are in each pattern (drums, piano, bass)
- Current timeline arrangement
- Pattern properties (tempo, mood, bars)

📝 EXECUTION RULES (after checking composition):
- "add drums" → call addTrackToPattern ONCE
- "remove piano" → call removeTrackFromPattern ONCE
- "make it faster" → call updatePatternProperties ONCE
- "clear timeline" → call clearTimeline ONCE
- "create pattern" → call createPattern ONCE

🎨 PARAMETER HANDLING:
- Use defaults when not specified (mood=chill, rhythm=simple, bassStyle=root)
- For piano: chords by default, melody if user says "lead" or "melody"
- For bass: root style by default unless specified
- For tempo: use mood defaults unless user specifies BPM

📝 EXAMPLES:

User: "add drums to intro"
Step 1: getComposition → sees patterns: {intro: {...}, verse: {...}}
Step 2: addTrackToPattern (pattern=intro, instrument=drums) → DONE

User: "add piano melody to verse"
Step 1: getComposition → sees verse exists with drums and bass
Step 2: addTrackToPattern (pattern=verse, instrument=piano, trackType=melody) → DONE

User: "add bass with walking style to chorus"
Step 1: getComposition → sees chorus pattern exists
Step 2: addTrackToPattern (pattern=chorus, instrument=bass, bassStyle=walking) → DONE

User: "make verse faster"
Step 1: getComposition → sees verse has tempo=85
Step 2: updatePatternProperties (pattern=verse, tempo=100) → DONE

User: "remove drums from intro"
Step 1: getComposition → confirms drums exist in intro
Step 2: removeTrackFromPattern (pattern=intro, instrument=drums) → DONE

🚀 KEY PRINCIPLE: ALWAYS check composition state first, then execute the user's EXACT command with ONE precise tool call. This two-step approach ensures context-aware, intelligent edits.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, mode = 'composer', threadId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const sessionId = threadId || 'default';

    // Get the music agent
    const agent = mastra.getAgent('musicAgent');

    if (!agent) {
      console.error('Music agent not found in mastra instance');
      return NextResponse.json(
        { error: 'Music agent not found' },
        { status: 500 }
      );
    }
    
    // Mode-specific configuration
    const isProducerMode = mode === 'producer';
    const systemPrompt = isProducerMode ? PRODUCER_MODE_PROMPT : COMPOSER_MODE_PROMPT;
    const maxSteps = isProducerMode ? 20 : 5; // Producer: many tools, Composer: getComposition + action + response
    
    // Execute agent (tools will update track.json automatically, triggering SSE updates)
    const result = await agent.generate(
      prompt, 
      {
        system: systemPrompt,
        maxSteps,
        toolChoice: 'auto',
        // Memory disabled - will add back later if needed
      }
    );

    // Format tool calls for frontend display
    const formattedToolCalls = (result.toolCalls || []).map((call: any, index: number) => {
      const toolName = call.payload?.toolName || call.toolName || 'unknown';
      const cleanName = toolName.replace(/Tool$/, '');
      const isSuccess = call.result?.success !== false;
      
      return {
        id: `call-${Date.now()}-${index}`,
        name: cleanName,
        status: isSuccess ? 'completed' : 'failed',
        timestamp: Date.now() - (result.toolCalls.length - index) * 100,
        duration: Math.floor(Math.random() * 500 + 100),
      };
    });

    return NextResponse.json({
      success: true,
      message: result.text,
      toolCalls: formattedToolCalls,
      fullResult: result,
    });
  } catch (error) {
    console.error('Error calling music agent:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Failed to process music request',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
