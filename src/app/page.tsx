"use client";

import { useState, useEffect, useRef } from "react";
import { getAudioEngine, Track } from "@/lib/AudioEngine";
import ToolCallsDisplay from "./ToolCallsDisplay";

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
  duration?: number;
}

export default function LofiBeatGenerator() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [audioEngine] = useState(() => getAudioEngine());
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentPattern, setCurrentPattern] = useState<string>("");
  const [currentNoteStep, setCurrentNoteStep] = useState<number>(0);
  const [mode, setMode] = useState<'producer' | 'composer'>('producer'); // Default to producer mode for beginners
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpTab, setHelpTab] = useState<'quickstart' | 'producer' | 'composer' | 'reference'>('quickstart');
  const [threadId, setThreadId] = useState<string>(() => {
    // Generate a unique session ID on mount
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [showToolCalls, setShowToolCalls] = useState(false);
  
  const isPlayingRef = useRef(isPlaying);
  const isComposingRef = useRef(isComposing);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    isComposingRef.current = isComposing;
  }, [isComposing]);

  useEffect(() => {
    loadTrack();
    
    audioEngine.setOnStepChange((step, patternId, noteStep) => {
      setCurrentStep(step);
      setCurrentPattern(patternId);
      setCurrentNoteStep(noteStep);
    });

    const trackEventSource = new EventSource("/api/track-updates");

    trackEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "update") {
        // Always reload track during composing to show real-time progress
        // Only skip if playing (to avoid audio glitches)
        if (!isPlayingRef.current) {
          loadTrack();
        }
      }
    };

    trackEventSource.onerror = (error) => {
      console.error("Track SSE error:", error);
      trackEventSource.close();
    };

    return () => {
      trackEventSource.close();
    };
  }, [audioEngine, threadId]);

  const loadTrack = async () => {
    try {
      const response = await fetch("/track.json");
      const data = await response.json();
      setTrack(data);
      await audioEngine.loadTrack(data);
    } catch (error) {
      console.error("Error loading track:", error);
    }
  };

  const handlePlay = async () => {
    if (!track) return;
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentStep(0);
    setCurrentPattern("");
    setCurrentNoteStep(0);
  };

  const handleNewSession = async () => {
    if (confirm('🆕 Start a new session? This will clear the current composition and start fresh.')) {
      // Stop playback
      handleStop();
      
      // Clear the track.json via API
      try {
        const response = await fetch('/api/session/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          // Generate new session ID
          const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setThreadId(newSessionId);
          
          // Clear tool calls history
          setToolCalls([]);
          setShowToolCalls(false);
          
          // Reload empty track
          await loadTrack();
        }
      } catch (error) {
        console.error('Error starting new session:', error);
        alert('Failed to start new session');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsComposing(true);
    setShowToolCalls(true); // Show tool calls display when composing starts
    
    // Clear previous tool calls for new request
    setToolCalls([]);
    
    try {
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, threadId, mode }),
      });

      const data = await response.json();
      
      // Update threadId if server returns one
      if (data.threadId) {
        setThreadId(data.threadId);
      }

      // Extract tool calls for history display
      if (data.toolCalls && Array.isArray(data.toolCalls)) {
        setToolCalls(data.toolCalls);
      }

      if (data.success) {
        const toolResults = data.fullResult?.toolResults || [];
        const hasSuccess = toolResults.some((result: { payload?: { result?: { success?: boolean } } }) => result.payload?.result?.success);
        const composerMessage = toolResults[0]?.payload?.result?.message;
        
        if (!hasSuccess) {
          alert(composerMessage || 'Command processed but no changes made');
        }
        await loadTrack();
      } else {
        alert(`Error: ${data.details || data.error || 'Failed to process request'}`);
      }
    } catch (error) {
      console.error('Error calling music API:', error);
      alert('Failed to connect to music agent');
    } finally {
      setIsComposing(false);
      setPrompt("");
    }
  };

  // Smart contextual placeholder based on composition state
  const getSmartPlaceholder = () => {
    const hasPatterns = track && Object.keys(track.patterns).length > 0;
    const hasTimeline = track && track.timeline.length > 0;
    
    if (mode === 'producer') {
      if (!hasPatterns) {
        return "Describe your vibe... (e.g., 'I want to relax', 'night drive vibes', 'help me focus')";
      }
      return "Want more? Try another vibe... (e.g., 'something upbeat', 'make it sadder')";
    } else {
      // Composer mode
      if (!hasPatterns) {
        return "Start by creating a pattern... (e.g., 'create pattern intro')";
      }
      if (hasPatterns && !hasTimeline) {
        return "Add patterns to timeline... (e.g., 'add intro to timeline')";
      }
      return "Refine your track... (e.g., 'add drums to intro', 'make it faster')";
    }
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header with Logo and Playback */}
      <section className="sticky top-0 z-10 bg-gradient-to-r from-black/40 via-purple-900/30 to-black/40 backdrop-blur-lg border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto p-4">
          {/* Logo and Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-4 rounded-2xl shadow-xl">
                  <span className="text-4xl">🎵</span>
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
                  AI Lo-Fi Beats Generator
                </h1>
                <p className="text-white/60 text-sm mt-1">Powered by Nosana & Mastra</p>
              </div>
            </div>
            
            {/* Transport Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewSession}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-semibold rounded-xl transition-all backdrop-blur-sm hover:scale-105 active:scale-95 border border-white/20"
                title="Start New Session"
              >
                <span className="text-xl">🆕</span>
                <span>New Session</span>
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-semibold rounded-xl transition-all backdrop-blur-sm hover:scale-105 active:scale-95 border border-white/20"
                title="Help & Guide"
              >
                <span className="text-xl">ℹ️</span>
                <span>Help</span>
              </button>
              <button 
                onClick={handlePlay} 
                disabled={!track || track.timeline.length === 0} 
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <span className="text-2xl">{isPlaying ? "⏸" : "▶"}</span>
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button 
                onClick={handleStop} 
                disabled={!isPlaying} 
                className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <span className="text-2xl">⏹</span>
                <span>Stop</span>
              </button>
            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <span>🎼</span> Timeline
              </h2>
              <div className="text-xs text-white/50 font-mono">
                {track?.timeline.length || 0} step{track?.timeline.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {track?.timeline.map((patternId, idx) => (
                <div 
                  key={idx} 
                  className={`relative min-w-[100px] px-4 py-2.5 rounded-lg transition-all font-semibold text-center text-sm ${
                    idx === currentStep 
                      ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white scale-105 shadow-lg shadow-cyan-500/50" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  <div className="text-[10px] opacity-60 mb-0.5">Step {idx + 1}</div>
                  <div className="font-bold">{patternId}</div>
                  {idx === currentStep && isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3">
                      <div className="w-full h-full bg-cyan-300 rounded-full animate-ping absolute"></div>
                      <div className="w-full h-full bg-cyan-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}
              {(!track || track.timeline.length === 0) && (
                <div className="w-full text-center py-4 text-white/30 text-sm italic">
                  No patterns in timeline... Add patterns to start playing!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pattern Breakdown */}
      <section className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          {track && Object.keys(track.patterns).length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
              <h2 className="text-2xl font-black text-white">Pattern Breakdown</h2>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6">
            {track && Object.entries(track.patterns).map(([patternId, pattern]) => (
              <div 
                key={patternId} 
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-6 rounded-2xl border-2 transition-all duration-300 ${
                  patternId === currentPattern 
                    ? "border-cyan-400 shadow-lg shadow-cyan-500/30" 
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Pattern Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                      {patternId}
                    </h3>
                    {patternId === currentPattern && isPlaying && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 rounded-full border border-cyan-400/50">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-cyan-300 font-semibold">PLAYING</span>
                      </div>
                    )}
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/60 font-semibold">
                      {Object.keys(pattern.tracks).length} track{Object.keys(pattern.tracks).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {pattern.tempo && (
                      <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white/80 font-mono font-semibold">
                        {pattern.tempo} BPM
                      </span>
                    )}
                    <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white/60">
                      {pattern.length} bar{pattern.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Instrument Tracks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Object.entries(pattern.tracks).map(([instrument, trackData]) => {
                    const icon = instrument.includes('drum') ? '🥁' : instrument.includes('piano') ? '🎹' : '🎸';
                    const instrumentColor = instrument.includes('drum') 
                      ? 'from-rose-500 to-red-500' 
                      : instrument.includes('piano') 
                        ? 'from-cyan-500 to-blue-500' 
                        : 'from-green-500 to-emerald-500';
                    
                    return (
                      <div key={instrument} className="bg-black/30 rounded-xl p-4 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{icon}</span>
                            <span className="font-bold text-white capitalize text-lg">{instrument}</span>
                          </div>
                          {trackData.muted && (
                            <span className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-[10px] text-red-300 font-semibold">
                              MUTED
                            </span>
                          )}
                        </div>
                        
                        {/* Notes Grid */}
                        {trackData.notes && (
                          <div className="grid grid-cols-8 gap-1.5">
                            {trackData.notes.map((note, idx) => {
                              const isCurrentNote = patternId === currentPattern && idx === currentNoteStep && isPlaying;
                              
                              // Format note display - handle both single notes and chord arrays
                              let noteDisplay = "–";
                              if (note) {
                                if (Array.isArray(note)) {
                                  // Chord: show first and last note separated
                                  noteDisplay = note.length > 0 ? `${note[0]}-${note[note.length - 1]}` : "–";
                                } else {
                                  noteDisplay = note;
                                }
                              }
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                                    isCurrentNote
                                      ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-xl scale-110 ring-2 ring-cyan-300 ring-offset-2 ring-offset-black/20 z-10"
                                      : note 
                                        ? `bg-gradient-to-br ${instrumentColor} text-white shadow-md hover:scale-105` 
                                        : "bg-white/5 text-white/20 hover:bg-white/10"
                                  }`}
                                  title={Array.isArray(note) ? note.join(', ') : note || 'Rest'}
                                >
                                  <span className="truncate px-0.5">{noteDisplay}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Drums Pattern Indicator */}
                        {trackData.drumPattern && (
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="text-white/60 font-medium">
                              Kick • Snare • Hi-hat
                            </span>
                            <span className={`px-2 py-1 rounded font-semibold ${
                              trackData.drumPattern.intensity === 'high' ? 'bg-red-500/20 text-red-300' :
                              trackData.drumPattern.intensity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {trackData.drumPattern.intensity}
                            </span>
                          </div>
                        )}
                        
                        {/* Volume indicator */}
                        {trackData.volume !== undefined && trackData.volume !== 1 && (
                          <div className="mt-2 text-xs text-white/50 flex items-center gap-2">
                            <span>🔊</span>
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                style={{ width: `${trackData.volume * 100}%` }}
                              />
                            </div>
                            <span>{Math.round(trackData.volume * 100)}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {(!track || Object.keys(track.patterns).length === 0) && (
              <div className="col-span-full">
                <div className="bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border-2 border-dashed border-white/20 p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🎵</div>
                    <h3 className="text-3xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent mb-2">
                      Welcome to AI Lo-Fi Beats Generator
                    </h3>
                    <p className="text-white/60 text-lg">Two powerful modes to create your perfect lo-fi masterpiece</p>
                  </div>

                  {/* Two Modes Comparison */}
                  <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Producer Mode */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-400/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl">🎨</div>
                        <div>
                          <h4 className="text-xl font-bold text-purple-300">Producer Mode</h4>
                          <p className="text-white/50 text-sm">Perfect for beginners</p>
                        </div>
                      </div>
                      <p className="text-white/70 mb-4">Get instant, full tracks from simple vibes and moods.</p>
                      
                      <div className="space-y-3">
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">✨ "I want to relax"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ Creates full chill track instantly</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">🌙 "Night drive vibes"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ Atmospheric beat with perfect mood</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">🎵 "Help me focus"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ Study-optimized lo-fi track</div>
                        </div>
                      </div>
                    </div>

                    {/* Composer Mode */}
                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-400/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl">�</div>
                        <div>
                          <h4 className="text-xl font-bold text-cyan-300">Composer Mode</h4>
                          <p className="text-white/50 text-sm">For power users</p>
                        </div>
                      </div>
                      <p className="text-white/70 mb-4">Precise control over every musical detail.</p>
                      
                      <div className="space-y-3">
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">🎨 "Create pattern intro"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ New empty pattern created</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">🥁 "Add drums to intro"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ Drums layer added precisely</div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-white/50 text-xs mb-1">Try saying:</div>
                          <div className="text-white font-medium">🎸 "Add walking bass"</div>
                          <div className="text-cyan-400 text-xs mt-1">→ Melodic bassline with exact style</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features Overview */}
                  <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>💡</span>
                      <span>What This AI Can Do</span>
                    </h4>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="text-purple-300 font-semibold mb-2 text-sm">🎭 5 Moods</div>
                        <div className="text-white/60 text-xs space-y-1">
                          <div>• sad</div>
                          <div>• happy</div>
                          <div>• chill</div>
                          <div>• melancholic</div>
                          <div>• upbeat</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-cyan-300 font-semibold mb-2 text-sm">🎵 10 Rhythms</div>
                        <div className="text-white/60 text-xs space-y-1">
                          <div>• simple, sparse</div>
                          <div>• active, shuffled</div>
                          <div>• syncopated</div>
                          <div>• dotted, triplets</div>
                          <div>• + 3 more styles</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-green-300 font-semibold mb-2 text-sm">🎸 5 Bass Styles</div>
                        <div className="text-white/60 text-xs space-y-1">
                          <div>• root (sustained)</div>
                          <div>• walking (melodic)</div>
                          <div>• arpeggio (chords)</div>
                          <div>• octaves (jumping)</div>
                          <div>• pedal (drone)</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-pink-300 font-semibold mb-2 text-sm">🎹 Instruments</div>
                        <div className="text-white/60 text-xs space-y-1">
                          <div>• 🥁 Drums (3-voice)</div>
                          <div>• 🎹 Piano (chords/melody)</div>
                          <div>• 🎸 Bass (5 styles)</div>
                          <div>• Multiple patterns</div>
                          <div>• Timeline arrangement</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full border border-purple-400/30">
                      <span className="text-white/70">👇</span>
                      <span className="text-white font-medium">Choose a mode below and start creating!</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chat Section */}
      {/* AI Chat Interface */}
      <section className="bg-gradient-to-r from-black/50 via-purple-900/40 to-black/50 backdrop-blur-lg p-6 border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          {/* Mode Toggle with Description */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 px-1 py-1 bg-black/30 rounded-lg border border-white/10">
                <button
                  onClick={() => setMode('producer')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'producer'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  🎨 Producer
                </button>
                <button
                  onClick={() => setMode('composer')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'composer'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/50'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  🎹 Composer
                </button>
              </div>
              
              {/* Inline Mode Description */}
              <div className="text-sm text-white/60">
                {mode === 'producer' ? (
                  <span>Instant full tracks from vibes & moods</span>
                ) : (
                  <span>Precise control for detailed editing</span>
                )}
              </div>
            </div>
          </div>

          {/* Suggestion Chips - Mode-specific */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {(mode === 'producer' ? [
                { emoji: '✨', text: 'I want to relax' },
                { emoji: '🎯', text: 'Help me focus' },
                { emoji: '💪', text: 'Something upbeat' },
                { emoji: '😢', text: 'I feel sad' },
                { emoji: '🌙', text: 'Night drive vibes' },
                { emoji: '☕', text: 'Morning coffee mood' },
                { emoji: '🎵', text: 'Make me a lofi hip hop beat' },
                { emoji: '🎹', text: 'Create a jazzhop track' }
              ] : [
                { emoji: '🥁', text: 'add drums' },
                { emoji: '🎹', text: 'add piano' },
                { emoji: '🎸', text: 'add bass' },
                { emoji: '⚡', text: 'make it faster' },
                { emoji: '🐌', text: 'slow it down' },
                { emoji: '🔄', text: 'try a different mood' },
                { emoji: '🗑️', text: 'clear timeline' },
              ]).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => (suggestion as any).action ? (suggestion as any).action() : setPrompt(suggestion.text)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg border border-white/10 hover:border-purple-400/50 transition-all whitespace-nowrap hover:scale-105"
                >
                  <span>{suggestion.emoji}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tool Calls Display */}
          <ToolCallsDisplay toolCalls={toolCalls} isVisible={showToolCalls} />

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder={getSmartPlaceholder()}
                className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50 focus:bg-white/15 backdrop-blur-md transition-all text-lg"
                disabled={isComposing} 
              />
              {isComposing && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              )}
            </div>
            <button 
              type="submit" 
              disabled={isComposing || !prompt.trim()} 
              className="px-10 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95 text-lg"
            >
              {isComposing ? "✨ Working..." : (mode === 'producer' ? "🎨 Produce" : "🎹 Compose")}
            </button>
          </form>
        </div>
      </section>

      {/* Help Modal */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHelpModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-black border-2 border-white/20 rounded-2xl max-w-4xl w-full mx-4 max-h-[80vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                📚 Help & Reference Guide
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-white/60 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-6 pt-4 border-b border-white/10 flex-shrink-0">
              {[
                { id: 'quickstart' as const, icon: '🚀', label: 'Quick Start' },
                { id: 'producer' as const, icon: '🎨', label: 'Producer Mode' },
                { id: 'composer' as const, icon: '🎹', label: 'Composer Mode' },
                { id: 'reference' as const, icon: '📖', label: 'Music Reference' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setHelpTab(tab.id)}
                  className={`px-4 py-2 rounded-t-lg transition-all ${
                    helpTab === tab.id
                      ? 'bg-white/10 text-white border-b-2 border-cyan-400'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Quick Start Tab */}
              {helpTab === 'quickstart' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">🚀 Getting Started in 3 Steps</h3>
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-500/20 text-purple-300 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
                          <div>
                            <h4 className="text-white font-semibold mb-1">Choose Your Mode</h4>
                            <p className="text-white/60 text-sm">
                              <span className="text-purple-300">Producer Mode</span> for instant full tracks, or{' '}
                              <span className="text-cyan-300">Composer Mode</span> for precise control.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-500/20 text-purple-300 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
                          <div>
                            <h4 className="text-white font-semibold mb-1">Type Your Prompt</h4>
                            <p className="text-white/60 text-sm">
                              Describe what you want or use quick prompts below the chat.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-500/20 text-purple-300 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">3</div>
                          <div>
                            <h4 className="text-white font-semibold mb-1">Hit Play!</h4>
                            <p className="text-white/60 text-sm">
                              Watch your patterns appear above, then click the Play button to hear your creation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Producer Mode Tab */}
              {helpTab === 'producer' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-purple-300 mb-3">🎨 Producer Mode - Instant Full Tracks</h3>
                    <p className="text-white/70 mb-4">Perfect for beginners! Just describe your vibe and get a complete track.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">✨ What It Does:</h4>
                        <ul className="text-white/60 text-sm space-y-1 ml-4">
                          <li>• Creates 2-4 patterns automatically</li>
                          <li>• Adds drums, piano, and bass</li>
                          <li>• Arranges them into a timeline</li>
                          <li>• Makes all creative decisions for you</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-white font-semibold mb-2">💬 Example Prompts:</h4>
                        <div className="space-y-2">
                          <div className="bg-purple-500/10 rounded p-3 border border-purple-400/30">
                            <div className="text-white font-medium mb-1">"I want to relax"</div>
                            <div className="text-cyan-400 text-xs">→ Creates slow, chill track with piano, soft drums, and bass</div>
                          </div>
                          <div className="bg-purple-500/10 rounded p-3 border border-purple-400/30">
                            <div className="text-white font-medium mb-1">"Something upbeat and energetic"</div>
                            <div className="text-cyan-400 text-xs">→ Fast tempo, major key, high-intensity drums, active bass</div>
                          </div>
                          <div className="bg-purple-500/10 rounded p-3 border border-purple-400/30">
                            <div className="text-white font-medium mb-1">"Night drive vibes"</div>
                            <div className="text-cyan-400 text-xs">→ Melancholic, atmospheric, medium tempo with pedal bass</div>
                          </div>
                          <div className="bg-purple-500/10 rounded p-3 border border-purple-400/30">
                            <div className="text-white font-medium mb-1">"Make me a lofi hip hop beat"</div>
                            <div className="text-cyan-400 text-xs">→ 85 BPM, shuffled rhythm, walking bass, chill mood</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Composer Mode Tab */}
              {helpTab === 'composer' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-cyan-300 mb-3">🎹 Composer Mode - Precise Control</h3>
                    <p className="text-white/70 mb-4">For power users! Execute exact commands with surgical precision.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-semibold mb-2">⚡ How It Works:</h4>
                        <ul className="text-white/60 text-sm space-y-1 ml-4">
                          <li>• Checks current composition first (context-aware)</li>
                          <li>• Executes ONE specific action</li>
                          <li>• No creativity, just accuracy</li>
                          <li>• Uses defaults when parameters not specified</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-white font-semibold mb-2">🛠️ Available Commands:</h4>
                        <div className="space-y-2">
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Create pattern intro</div>
                            <div className="text-white/60 text-xs">Creates new empty pattern called "intro"</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Add drums to intro</div>
                            <div className="text-white/60 text-xs">Adds drums to existing pattern</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Add piano melody to verse</div>
                            <div className="text-white/60 text-xs">Adds melodic piano (not chords)</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Add bass with walking style</div>
                            <div className="text-white/60 text-xs">Melodic bass with stepwise motion</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Make it faster / Slow it down</div>
                            <div className="text-white/60 text-xs">Adjust tempo of current pattern</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Remove drums from intro</div>
                            <div className="text-white/60 text-xs">Removes specific instrument</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded p-3 border border-cyan-400/30">
                            <div className="text-white font-medium mb-1">Add intro to timeline</div>
                            <div className="text-white/60 text-xs">Adds pattern to playback sequence</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Music Reference Tab */}
              {helpTab === 'reference' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">📖 Music Reference</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-purple-300 font-semibold mb-3">🎭 5 Available Moods</h4>
                        <div className="space-y-2">
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">sad</div>
                            <div className="text-white/60 text-xs">Slow (75 BPM), dark, minimal</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">happy</div>
                            <div className="text-white/60 text-xs">Fast (95 BPM), bright, major key</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">chill</div>
                            <div className="text-white/60 text-xs">Medium (85 BPM), balanced</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">melancholic</div>
                            <div className="text-white/60 text-xs">Slow (78 BPM), introspective</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">upbeat</div>
                            <div className="text-white/60 text-xs">Very fast (105 BPM), energetic</div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-green-300 font-semibold mb-3">🎸 5 Bass Styles</h4>
                        <div className="space-y-2">
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">root</div>
                            <div className="text-white/60 text-xs">Sustained root notes (C2, F2, G2...)</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">walking</div>
                            <div className="text-white/60 text-xs">Stepwise melodic motion</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">arpeggio</div>
                            <div className="text-white/60 text-xs">Chord tones in bass register</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">octaves</div>
                            <div className="text-white/60 text-xs">Alternating root and octave</div>
                          </div>
                          <div className="bg-white/5 rounded p-2 border border-white/10">
                            <div className="text-white font-medium">pedal</div>
                            <div className="text-white/60 text-xs">Drone bass (sustained single note)</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h4 className="text-cyan-300 font-semibold mb-3">🎵 10 Rhythm Patterns</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {['simple', 'sparse', 'active', 'shuffled', 'dotted', 'offbeat', 'triplets', 'syncopated', 'steady', 'half_time'].map(rhythm => (
                            <div key={rhythm} className="bg-white/5 rounded p-2 border border-white/10">
                              <div className="text-white font-medium text-sm">{rhythm}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h4 className="text-pink-300 font-semibold mb-3">🎹 Instruments & Features</h4>
                        <ul className="text-white/60 text-sm space-y-1 ml-4">
                          <li>• 🥁 <strong className="text-white">Drums:</strong> 3-voice (kick, snare, hihat) with intensity levels</li>
                          <li>• 🎹 <strong className="text-white">Piano:</strong> Chords (default) or Melody (single notes)</li>
                          <li>• 🎸 <strong className="text-white">Bass:</strong> 5 different playing styles</li>
                          <li>• 🎵 <strong className="text-white">Patterns:</strong> Create multiple sections (intro, verse, chorus, etc.)</li>
                          <li>• ⏱️ <strong className="text-white">Tempo:</strong> Each pattern can have different BPM</li>
                          <li>• 📊 <strong className="text-white">Timeline:</strong> Arrange patterns in any order</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at Bottom */}
            <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
