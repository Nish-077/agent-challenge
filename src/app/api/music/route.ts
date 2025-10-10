import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    console.log('Received prompt:', prompt);

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get the music agent
    console.log('Getting music agent...');
    const agent = mastra.getAgent('musicAgent');

    if (!agent) {
      console.error('Music agent not found in mastra instance');
      return NextResponse.json(
        { error: 'Music agent not found' },
        { status: 500 }
      );
    }

    console.log('Calling agent.generateVNext() with maxSteps: 5...');
    // Generate a response from the agent using VNext for v2 models
    // maxSteps allows the agent to make multiple tool calls in sequence
    // toolChoice: 'auto' lets the model continue across steps
    const result = await agent.generateVNext(prompt, {
      maxSteps: 5,
      toolChoice: 'auto', // Let model decide when to use tools (can continue across steps)
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('=== Step finished ===');
        console.log('Tool calls in this step:', toolCalls?.length || 0);
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc: any, idx) => {
            console.log(`  Tool ${idx + 1}: ${tc.toolName || 'unknown'}`);
          });
        }
        console.log('Finish reason:', finishReason);
        console.log('Has more steps:', finishReason !== 'stop');
        console.log('=====================');
      },
    });
    console.log('\n=== FINAL RESULT ===');
    console.log('Total steps taken:', result.steps?.length || 0);
    console.log('Total tool calls:', result.toolCalls?.length || 0);
    console.log('All tool calls:', JSON.stringify(result.toolCalls, null, 2));
    console.log('Result text:', result.text);
    console.log('===================\n');

    return NextResponse.json({
      success: true,
      message: result.text,
      toolCalls: result.toolCalls,
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
