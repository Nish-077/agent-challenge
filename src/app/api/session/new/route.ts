import { NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import { join } from 'path';

export const dynamic = "force-dynamic";

// Default empty track structure
const emptyTrack = {
  tempo: 80,
  key: "C_minor",
  timeline: [],
  patterns: {}
};

export async function POST() {
  try {
    const trackPath = join(process.cwd(), "public", "track.json");
    
    // Reset track.json to empty state
    writeFileSync(trackPath, JSON.stringify(emptyTrack, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: 'New session started - track reset'
    });
  } catch (error) {
    console.error('Error resetting track:', error);
    return NextResponse.json(
      { error: 'Failed to reset track' },
      { status: 500 }
    );
  }
}

