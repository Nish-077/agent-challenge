"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
  duration?: number;
}

interface ToolCallsDisplayProps {
  toolCalls: ToolCall[];
  isVisible: boolean;
}

export default function ToolCallsDisplay({ toolCalls, isVisible }: ToolCallsDisplayProps) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  if (!isVisible || toolCalls.length === 0) {
    return null;
  }

  // Check if all tool calls are completed/failed (composition done)
  const allCompleted = toolCalls.every(call => call.status === 'completed' || call.status === 'failed');
  const completedCount = toolCalls.filter(call => call.status === 'completed').length;
  const failedCount = toolCalls.filter(call => call.status === 'failed').length;
  const runningCount = toolCalls.filter(call => call.status === 'running').length;

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: ToolCall['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'running': return 'text-cyan-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-white';
    }
  };

  return (
    <>
      {/* Summary Bar - Show after tools complete */}
      <div className="mb-4 max-w-7xl mx-auto">
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔧</span>
              <div>
                <div className="text-white font-semibold">
                  {allCompleted ? 'Tool Execution Complete' : 'Executing Tools...'}
                </div>
                <div className="text-white/50 text-xs mt-0.5">
                  {completedCount > 0 && <span className="text-green-400">✅ {completedCount} completed</span>}
                  {failedCount > 0 && <span className="text-red-400 ml-2">❌ {failedCount} failed</span>}
                  {runningCount > 0 && <span className="text-cyan-400 ml-2 animate-pulse">⚡ {runningCount} running</span>}
                </div>
              </div>
            </div>

            {/* View Details Button */}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border border-purple-400/50 hover:from-purple-500/30 hover:to-cyan-500/30 transition-all"
            >
              <span>📋</span>
              <span>View Details</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{toolCalls.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Modal - Portal to body level */}
      {showHistoryModal && mounted && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8 px-4"
          onClick={() => setShowHistoryModal(false)}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            margin: 0,
          }}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-black border-2 border-white/20 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 4rem)', margin: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  🔧 Tool Execution History
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''} • 
                  <span className="text-green-400 ml-1">{completedCount} completed</span>
                  {failedCount > 0 && <span className="text-red-400 ml-1">• {failedCount} failed</span>}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tool Calls List - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
              <div className="space-y-3">
                {toolCalls.map((call, index) => (
                  <div
                    key={call.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/8 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-purple-500/20 text-purple-300 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm">
                          {index + 1}
                        </div>
                        <span className={`text-xl ${getStatusColor(call.status)}`}>
                          {getStatusIcon(call.status)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {call.name}
                          </div>
                          <div className="text-white/50 text-xs">
                            {call.duration && (
                              <div className="text-cyan-400">
                              {call.duration}ms
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                        call.status === 'completed'
                          ? 'bg-green-500/20 text-green-300 border border-green-400/50'
                          : call.status === 'failed'
                          ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                          : call.status === 'running'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 animate-pulse'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50'
                      }`}>
                        {call.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
