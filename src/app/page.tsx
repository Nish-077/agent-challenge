"use client";

import { useState, useEffect, useRef } from "react";
import { getAudioEngine, Track } from "@/lib/AudioEngine";

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
  const [threadId, setThreadId] = useState<string>(() => {
    // Generate a unique session ID on mount
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  
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

    console.log("Setting up SSE connection for track updates");
    const eventSource = new EventSource("/api/track-updates");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE received:", data);
      
      if (data.type === "update") {
        if (!isPlayingRef.current && !isComposingRef.current) {
          console.log("Track updated via SSE, reloading...");
          loadTrack();
        } else {
          console.log("Track updated but skipping reload (playing or composing)");
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
    };
  }, [audioEngine]);

  const loadTrack = async () => {
    try {
      const response = await fetch("/track.json");
      const data = await response.json();
      setTrack(data);
      await audioEngine.loadTrack(data);
      console.log("Track loaded:", data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsComposing(true);
    
    try {
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, threadId, mode }),
      });

      const data = await response.json();
      console.log('Full API response:', data);
      
      // Update threadId if server returns one
      if (data.threadId) {
        setThreadId(data.threadId);
      }

      if (data.success) {
        const toolResults = data.fullResult?.toolResults || [];
        const hasSuccess = toolResults.some((result: any) => result.payload?.result?.success);
        const composerMessage = toolResults[0]?.payload?.result?.message;
        
        if (hasSuccess) {
          console.log('✅ Composition updated:', composerMessage);
        } else {
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

  return (
    <main className="h-screen w-screen flex flex-col bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 overflow-hidden">
      {/* Header with Logo and Playback */}
      <section className="bg-gradient-to-r from-black/40 via-purple-900/30 to-black/40 backdrop-blur-lg p-6 border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          {/* Logo and Title */}
          <div className="flex items-center justify-between mb-6">
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
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">🎼 Timeline</h2>
              <div className="text-xs text-white/50">
                {track?.timeline.length || 0} patterns
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {track?.timeline.map((patternId, idx) => (
                <div 
                  key={idx} 
                  className={`min-w-[80px] px-4 py-3 rounded-xl transition-all font-bold text-center ${
                    idx === currentStep 
                      ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white scale-110 shadow-lg shadow-cyan-500/50" 
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {patternId}
                </div>
              ))}
              {(!track || track.timeline.length === 0) && (
                <div className="text-white/30 text-sm italic">No patterns yet... Start composing!</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pattern Breakdown */}
      <section className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
            <h2 className="text-2xl font-black text-white">Pattern Breakdown</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {track && Object.entries(track.patterns).map(([patternId, pattern]) => (
              <div 
                key={patternId} 
                className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-102 ${
                  patternId === currentPattern 
                    ? "border-cyan-400 shadow-lg shadow-cyan-500/30 scale-102" 
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                {/* Pattern Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                    {patternId}
                  </h3>
                  {pattern.tempo && (
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/70 font-mono">
                      {pattern.tempo} BPM
                    </span>
                  )}
                </div>

                {/* Instrument Tracks */}
                <div className="space-y-4">
                  {Object.entries(pattern.tracks).map(([instrument, trackData]) => {
                    const icon = instrument.includes('drum') ? '🥁' : instrument.includes('piano') ? '🎹' : '🎸';
                    return (
                      <div key={instrument} className="bg-black/20 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{icon}</span>
                            <span className="font-bold text-white capitalize">{instrument}</span>
                          </div>
                          {trackData.style && (
                            <span className="text-xs text-cyan-300 italic">({trackData.style})</span>
                          )}
                        </div>
                        {trackData.notes && (
                          <div className="flex gap-1 flex-wrap">
                            {trackData.notes.map((note, idx) => {
                              const isCurrentNote = patternId === currentPattern && idx === currentNoteStep && isPlaying;
                              return (
                                <div 
                                  key={idx} 
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                    isCurrentNote
                                      ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-xl scale-125 animate-[beat-pulse_0.3s_ease-in-out]"
                                      : note 
                                        ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:scale-110" 
                                        : "bg-white/5 text-white/20"
                                  }`}
                                  style={isCurrentNote ? {
                                    boxShadow: '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.4)'
                                  } : undefined}
                                >
                                  {note || "–"}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Active Indicator */}
                {patternId === currentPattern && (
                  <div className="absolute top-4 right-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping absolute"></div>
                      <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {(!track || Object.keys(track.patterns).length === 0) && (
              <div className="col-span-full text-center py-20">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-white/50 text-lg">No patterns yet</p>
                <p className="text-white/30 text-sm mt-2">Use the chat below to start composing!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Chat Interface */}
      <section className="bg-gradient-to-r from-black/50 via-purple-900/40 to-black/50 backdrop-blur-lg p-6 border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          {/* Session Info Bar */}
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
            </div>
          </div>

          {/* Mode Description */}
          <div className="mb-3 px-4 py-2 bg-black/30 rounded-lg border border-white/10">
            <p className="text-white/70 text-sm">
              {mode === 'producer' ? (
                <>
                  <span className="font-semibold text-purple-300">Producer Mode:</span> Get instant, full tracks with one command. 
                  <span className="text-white/50"> Perfect for beginners!</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-cyan-300">Composer Mode:</span> Fine-tune every detail with precise control. 
                  <span className="text-white/50"> For power users!</span>
                </>
              )}
            </p>
          </div>

          {/* Suggestion Chips - Mode-specific */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {mode === 'producer' ? [
              '✨ I want to relax',
              '🎯 Help me focus', 
              '💪 Something upbeat', 
              '😢 I feel sad',
              '🌙 Night drive vibes',
              '☕ Morning coffee mood',
              '🎵 Make me a lofi hip hop beat',
              '🎹 Create a jazzhop track'
            ] : [
              '🥁 add drums',
              '🎹 add piano',
              '🎸 add bass',
              '⚡ make it faster',
              '🐌 slow it down',
              '🎨 try a different version',
              '🗑️ start fresh',
              '📝 remove intro from timeline'
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(suggestion)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-full border border-white/10 hover:border-purple-400/50 transition-all whitespace-nowrap hover:scale-105"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                placeholder="Tell the AI what to compose... (e.g., 'add bass to p1', 'create a sad pattern p4')" 
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
              {isComposing ? "✨ Composing..." : "🎹 Compose"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
