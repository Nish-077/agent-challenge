import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Simple mutex to prevent race conditions when multiple tool calls happen simultaneously
let operationInProgress: Promise<any> | null = null;
async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  // Wait for any previous operation to complete
  while (operationInProgress) {
    await operationInProgress;
  }
  
  // Execute this operation
  const promise = operation();
  operationInProgress = promise;
  
  try {
    return await promise;
  } finally {
    operationInProgress = null;
  }
}

// Musical rule sets for different keys and moods
const MUSIC_RULES = {
  scales: {
    C_minor_pentatonic: ['C', 'Eb', 'F', 'G', 'Bb'],
    C_major_pentatonic: ['C', 'D', 'E', 'G', 'A'],
    C_minor: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  },
  octaves: {
    piano: [3, 4, 5],
    bass: [2, 3],
  },
  moods: {
    sad: { scale: 'C_minor_pentatonic', rhythm: 'sparse' },
    happy: { scale: 'C_major_pentatonic', rhythm: 'active' },
    chill: { scale: 'C_minor_pentatonic', rhythm: 'simple' },
    melancholic: { scale: 'C_minor', rhythm: 'sparse' },
    upbeat: { scale: 'C_major_pentatonic', rhythm: 'active' },
  },
};

// Command schema that MusicDirector will send
const ComposerCommandSchema = z.object({
  action: z.enum(['addTrackToPattern', 'removeTrackFromPattern', 'createPattern', 'updateTimeline', 'addPatternToTimeline', 'removePatternFromTimeline', 'clearTimeline', 'deleteAllPatterns', 'deletePattern']),
  payload: z.object({
    patternId: z.string().optional(),
    instrument: z.enum(['piano', 'bass', 'drums']).optional(),
    mood: z.enum(['sad', 'happy', 'chill', 'melancholic', 'upbeat']).optional(),
    rhythm: z.enum(['simple', 'sparse', 'active']).optional(),
    timeline: z.array(z.string()).optional(),
    position: z.number().optional(), // Position in timeline (0-based index, or -1 for append)
  }),
});

// Track structure
interface Track {
  tempo: number;
  key: string;
  timeline: string[];
  patterns: {
    [key: string]: Pattern;
  };
}

interface Pattern {
  id: string;
  length: number;
  tracks: {
    [instrument: string]: InstrumentTrack;
  };
}

interface InstrumentTrack {
  instrument: string;
  notes?: (string | null)[];
  style?: string;
}

export const composerTool = createTool({
  id: 'composer',
  description: 'Executes musical composition commands to modify the track.json file. Takes structured commands and applies deterministic music generation rules.',
  inputSchema: ComposerCommandSchema,
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    updatedTrack: z.any().optional(),
  }),
  execute: async ({ context }) => {
    // Use lock to prevent race conditions when multiple tool calls happen simultaneously
    return withLock(async () => {
      try {
        const command = context;
        const trackPath = path.join(process.cwd(), 'public', 'track.json');
      
      // Load current track
      const trackData = await fs.readFile(trackPath, 'utf-8');
      const track: Track = JSON.parse(trackData);

      // Execute the command
      let result: { success: boolean; message: string };

      switch (command.action) {
        case 'addTrackToPattern':
          result = await addTrackToPattern(track, command.payload);
          break;
        case 'removeTrackFromPattern':
          result = await removeTrackFromPattern(track, command.payload);
          break;
        case 'createPattern':
          result = await createPattern(track, command.payload);
          break;
        case 'updateTimeline':
          result = await updateTimeline(track, command.payload);
          break;
        case 'addPatternToTimeline':
          result = await addPatternToTimeline(track, command.payload);
          break;
        case 'removePatternFromTimeline':
          result = await removePatternFromTimeline(track, command.payload);
          break;
        case 'clearTimeline':
          result = await clearTimeline(track);
          break;
        case 'deleteAllPatterns':
          result = await deleteAllPatterns(track);
          break;
        case 'deletePattern':
          result = await deletePattern(track, command.payload);
          break;
        default:
          return { success: false, message: 'Unknown action' };
      }

      // Save updated track
      if (result.success) {
        await fs.writeFile(trackPath, JSON.stringify(track, null, 2), 'utf-8');
      }

      return {
        ...result,
        updatedTrack: result.success ? track : undefined,
      };
      } catch (error) {
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }); // Close withLock
  },
});

/**
 * Add a new instrument track to an existing pattern
 */
async function addTrackToPattern(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { patternId, instrument, mood, rhythm } = payload;

  if (!patternId || !instrument) {
    return { success: false, message: 'Missing patternId or instrument' };
  }

  // Create pattern if it doesn't exist
  if (!track.patterns[patternId]) {
    track.patterns[patternId] = {
      id: patternId,
      length: 4,
      tracks: {},
    };
  }

  const pattern = track.patterns[patternId];

  // Check if instrument already exists
  const exists = !!pattern.tracks[instrument];

  // Add or update the instrument track based on type
  if (instrument === 'drums') {
    pattern.tracks[instrument] = {
      instrument: 'drums',
      style: rhythm === 'active' ? 'lofi_loop_2' : 'lofi_loop_1',
    };
  } else {
    // Generate notes for melodic instruments
    const notes = generateNotes(instrument, mood, rhythm, pattern.length);
    pattern.tracks[instrument] = {
      instrument,
      notes,
    };
  }

  return {
    success: true,
    message: exists 
      ? `Updated ${instrument} in pattern ${patternId}`
      : `Added ${instrument} to pattern ${patternId}`,
  };
}

/**
 * Remove an instrument track from a pattern
 */
async function removeTrackFromPattern(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { patternId, instrument } = payload;

  if (!patternId || !instrument) {
    return { success: false, message: 'Missing patternId or instrument' };
  }

  if (!track.patterns[patternId]) {
    return { success: false, message: `Pattern ${patternId} does not exist` };
  }

  const pattern = track.patterns[patternId];

  if (!pattern.tracks[instrument]) {
    return { success: false, message: `${instrument} does not exist in ${patternId}` };
  }

  delete pattern.tracks[instrument];

  return {
    success: true,
    message: `Removed ${instrument} from pattern ${patternId}`,
  };
}

/**
 * Create a new pattern with initial instruments
 */
async function createPattern(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { patternId, mood, rhythm } = payload;

  if (!patternId) {
    return { success: false, message: 'Missing patternId' };
  }

  // Check if pattern exists
  const exists = !!track.patterns[patternId];
  
  // Create or update pattern
  const pattern: Pattern = exists 
    ? track.patterns[patternId]
    : {
        id: patternId,
        length: 4,
        tracks: {},
      };

  // If mood or rhythm is specified, add/update default instruments (drums + piano)
  if (mood || rhythm) {
    pattern.tracks.drums = {
      instrument: 'drums',
      style: rhythm === 'active' ? 'lofi_loop_2' : 'lofi_loop_1',
    };
    pattern.tracks.piano = {
      instrument: 'piano',
      notes: generateNotes('piano', mood, rhythm, 4),
    };
  }

  track.patterns[patternId] = pattern;

  return {
    success: true,
    message: exists
      ? mood || rhythm
        ? `Updated pattern ${patternId} with drums and piano`
        : `Pattern ${patternId} already exists (no changes)`
      : mood || rhythm 
        ? `Created pattern ${patternId} with drums and piano`
        : `Created empty pattern ${patternId}`,
  };
}

/**
 * Update the timeline sequence
 */
async function updateTimeline(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { timeline } = payload;

  if (!timeline || timeline.length === 0) {
    return { success: false, message: 'Missing or empty timeline' };
  }

  // Validate that all patterns in timeline exist
  for (const patternId of timeline) {
    if (!track.patterns[patternId]) {
      return { success: false, message: `Pattern ${patternId} does not exist` };
    }
  }

  track.timeline = timeline;

  return {
    success: true,
    message: `Updated timeline to [${timeline.join(', ')}]`,
  };
}

/**
 * Add a pattern to the timeline at a specific position
 */
async function addPatternToTimeline(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { patternId, position } = payload;

  if (!patternId) {
    return { success: false, message: 'Missing patternId' };
  }

  if (!track.patterns[patternId]) {
    return { success: false, message: `Pattern ${patternId} does not exist` };
  }

  // If position is -1 or undefined, append to end
  if (position === undefined || position === -1) {
    track.timeline.push(patternId);
    return {
      success: true,
      message: `Added pattern ${patternId} to end of timeline`,
    };
  }

  // Insert at specific position
  if (position < 0 || position > track.timeline.length) {
    return { success: false, message: `Invalid position ${position}. Timeline length is ${track.timeline.length}` };
  }

  track.timeline.splice(position, 0, patternId);

  return {
    success: true,
    message: `Added pattern ${patternId} at position ${position}`,
  };
}

/**
 * Remove a pattern from the timeline
 */
async function removePatternFromTimeline(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { position, patternId } = payload;

  if (position !== undefined) {
    // Remove by position
    if (position < 0 || position >= track.timeline.length) {
      return { success: false, message: `Invalid position ${position}. Timeline length is ${track.timeline.length}` };
    }
    const removed = track.timeline.splice(position, 1)[0];
    return {
      success: true,
      message: `Removed pattern ${removed} from position ${position}`,
    };
  } else if (patternId) {
    // Remove first occurrence of patternId
    const index = track.timeline.indexOf(patternId);
    if (index === -1) {
      return { success: false, message: `Pattern ${patternId} not found in timeline` };
    }
    track.timeline.splice(index, 1);
    return {
      success: true,
      message: `Removed pattern ${patternId} from timeline`,
    };
  }

  return { success: false, message: 'Must provide either position or patternId' };
}

/**
 * Clear the entire timeline
 */
async function clearTimeline(
  track: Track
): Promise<{ success: boolean; message: string }> {
  const count = track.timeline.length;
  track.timeline = [];
  return {
    success: true,
    message: `Cleared timeline (removed ${count} patterns)`,
  };
}

/**
 * Delete a specific pattern
 */
async function deletePattern(
  track: Track,
  payload: z.infer<typeof ComposerCommandSchema>['payload']
): Promise<{ success: boolean; message: string }> {
  const { patternId } = payload;

  if (!patternId) {
    return { success: false, message: 'Missing patternId' };
  }

  if (!track.patterns[patternId]) {
    return { success: false, message: `Pattern ${patternId} does not exist` };
  }

  // Remove pattern
  delete track.patterns[patternId];

  // Remove all occurrences from timeline
  const removedCount = track.timeline.filter(p => p === patternId).length;
  track.timeline = track.timeline.filter(p => p !== patternId);

  return {
    success: true,
    message: removedCount > 0
      ? `Deleted pattern ${patternId} and removed ${removedCount} occurrence(s) from timeline`
      : `Deleted pattern ${patternId}`,
  };
}

/**
 * Delete all patterns (but keep the timeline structure)
 */
async function deleteAllPatterns(
  track: Track
): Promise<{ success: boolean; message: string }> {
  const count = Object.keys(track.patterns).length;
  track.patterns = {};
  track.timeline = []; // Clear timeline too since patterns are gone
  return {
    success: true,
    message: `Deleted all patterns (${count} patterns removed, timeline cleared)`,
  };
}

/**
 * Generate notes for melodic instruments based on mood and rhythm
 */
function generateNotes(
  instrument: string,
  mood: string | undefined,
  rhythm: string | undefined,
  length: number
): (string | null)[] {
  const moodConfig = mood ? MUSIC_RULES.moods[mood as keyof typeof MUSIC_RULES.moods] : MUSIC_RULES.moods.chill;
  const scale = MUSIC_RULES.scales[moodConfig.scale as keyof typeof MUSIC_RULES.scales];
  const octaves = MUSIC_RULES.octaves[instrument as keyof typeof MUSIC_RULES.octaves] || [4];

  const notes: (string | null)[] = [];

  for (let i = 0; i < length; i++) {
    // Determine if this beat should have a note based on rhythm
    let shouldPlayNote = true;
    
    if (rhythm === 'sparse' || moodConfig.rhythm === 'sparse') {
      // Sparse: play on beats 1 and 3
      shouldPlayNote = i % 2 === 0;
    } else if (rhythm === 'simple' || moodConfig.rhythm === 'simple') {
      // Simple: skip last beat
      shouldPlayNote = i !== length - 1;
    }
    // Active: play all beats (default)

    if (shouldPlayNote) {
      // Pick a note from the scale
      const noteIndex = i % scale.length;
      const note = scale[noteIndex];
      const octave = octaves[Math.floor(i / scale.length) % octaves.length];
      notes.push(`${note}${octave}`);
    } else {
      notes.push(null);
    }
  }

  return notes;
}
