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
    
    audioEngine.setOnStepChange((step, patternId) => {
      setCurrentStep(step);
      setCurrentPattern(patternId);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsComposing(true);
    
    try {
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      console.log('Full API response:', data);

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
    <main className="h-screen w-screen flex flex-col bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <section className="bg-black/30 backdrop-blur-md p-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">🎵 AI Lo-Fi Beats Generator</h1>
          <div className="flex items-center gap-4">
            <button onClick={handlePlay} disabled={!track || track.timeline.length === 0} className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button onClick={handleStop} disabled={!isPlaying} className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all backdrop-blur-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              ⏹ Stop
            </button>
            <div className="flex-1">
              <div className="text-white/70 text-sm mb-1">Timeline</div>
              <div className="flex gap-2">
                {track?.timeline.map((patternId, idx) => (
                  <div key={idx} className={`px-4 py-2 rounded-lg transition-all ${idx === currentStep ? "bg-white text-purple-900 font-bold scale-110" : "bg-white/20 text-white"}`}>
                    {patternId}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-white mb-4">Pattern Breakdown:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {track && Object.entries(track.patterns).map(([patternId, pattern]) => (
              <div key={patternId} className={`bg-white/10 backdrop-blur-md p-6 rounded-xl border-2 transition-all ${patternId === currentPattern ? "border-white scale-105" : "border-white/20"}`}>
                <h3 className="text-lg font-bold text-white mb-3">Pattern: {patternId}</h3>
                {Object.entries(pattern.tracks).map(([instrument, trackData]) => (
                  <div key={instrument} className="mb-3">
                    <div className="text-white/70 text-sm mb-1">{instrument}: {trackData.style || ""}</div>
                    {trackData.notes && (
                      <div className="flex gap-1">
                        {trackData.notes.map((note, idx) => (
                          <div key={idx} className={`w-12 h-8 rounded flex items-center justify-center text-xs ${note ? "bg-purple-500 text-white" : "bg-white/10 text-white/30"}`}>
                            {note || "–"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black/30 backdrop-blur-md p-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Tell the AI what to compose... (e.g., 'add bass to p1', 'create a sad pattern p4')" className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm" disabled={isComposing} />
            <button type="submit" disabled={isComposing || !prompt.trim()} className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isComposing ? "🎵 Composing..." : "🎹 Compose"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
