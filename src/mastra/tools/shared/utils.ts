import fs from "fs";
import path from "path";

// Mutex lock for preventing race conditions
let isLocked = false;
const lockQueue: (() => void)[] = [];

export async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  while (isLocked) {
    await new Promise<void>((resolve) => lockQueue.push(resolve));
  }
  isLocked = true;
  try {
    return await operation();
  } finally {
    isLocked = false;
    const next = lockQueue.shift();
    if (next) next();
  }
}

// Track structure
export interface Track {
  tempo: number;
  key: string;
  timeline: string[];
  patterns: {
    [key: string]: {
      id: string;
      length: number;
      tempo?: number;
      tracks: {
        [instrument: string]: {
          instrument: string;
          notes?: (string | null)[];
          style?: string;
          volume?: number;
        };
      };
    };
  };
}

// Read track.json
export function readTrack(): Track {
  const trackPath = path.join(process.cwd(), "public", "track.json");
  const data = fs.readFileSync(trackPath, "utf-8");
  return JSON.parse(data);
}

// Write track.json
export function writeTrack(track: Track): void {
  const trackPath = path.join(process.cwd(), "public", "track.json");
  fs.writeFileSync(trackPath, JSON.stringify(track, null, 2), "utf-8");
}

/**
 * Semantic pattern names for better UX
 * Users can reference patterns by musical terms instead of technical IDs
 */
const SEMANTIC_NAMES = [
  "intro",
  "verse",
  "chorus",
  "bridge",
  "breakdown",
  "buildup",
  "drop",
  "outro",
];

/**
 * Generate next available pattern name with semantic naming
 * Priority: Use semantic names first, fallback to p1, p2, etc.
 * @param track - Current track state
 * @param preferredName - Optional preferred name (e.g., "intro", "verse")
 * @returns Available pattern name
 */
export function generatePatternName(track: Track, preferredName?: string): string {
  // If user provides a preferred name and it's available, use it
  if (preferredName && !track.patterns[preferredName]) {
    return preferredName;
  }

  // Try semantic names in order
  for (const name of SEMANTIC_NAMES) {
    if (!track.patterns[name]) {
      return name;
    }
  }

  // Fallback to p1, p2, p3... if all semantic names used
  let counter = 1;
  while (track.patterns[`p${counter}`]) {
    counter++;
  }
  return `p${counter}`;
}
