import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, mode = 'composer' } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get the music agent
    const agent = mastra.getAgent('musicAgent');

    if (!agent) {
      console.error('Music agent not found in mastra instance');
      return NextResponse.json(
        { error: 'Music agent not found' },
        { status: 500 }
      );
    }
    
    const maxSteps = 20;
    
    console.log('\n🎵 === AGENT REQUEST ===');
    console.log('Mode:', mode.toUpperCase());
    console.log('Prompt:', prompt);
    console.log('Max Steps:', maxSteps);
    console.log('======================\n');
    
    const result = await agent.generateVNext(prompt, {
      maxSteps, // Producer=20 (compose full tracks), Composer=2 (quick edits)
      toolChoice: 'auto', // Force tool calls
      // Memory disabled - will add back later if needed
    });

    console.log('\n📊 === AGENT COMPLETE ===');
    console.log('Finish Reason:', result.finishReason);
    console.log('Total tool calls:', result.toolCalls?.length || 0);
    
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('\n🔧 Tool Call Summary:');
      result.toolCalls.forEach((call: any, i: number) => {
        console.log(`  ${i + 1}. ${call.toolName || 'unknown'} - ${call.result?.success ? '✅' : '❌'}`);
      });
    } else {
      console.log('⚠️  No tool calls were made (agent responded with text only)');
    }
    console.log('========================\n');

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
