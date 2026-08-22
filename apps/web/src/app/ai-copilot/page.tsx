"use client";

import React, { useState, useRef, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Bot, Send, User, CheckCircle, HelpCircle, AlertCircle, Info, Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  // AI structured payload
  answer?: string;
  evidence?: string[];
  metrics?: any;
  confidence?: number;
  recommended_action?: string;
}

export default function AICopilotPage() {
  const { apiFetch } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-1",
      sender: "ai",
      text: "Hello! I am Nexora AI, your workforce intelligence assistant. You can ask me questions about team risks, workloads, attendance anomalies, or simulate scenarios.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Suggested prompts
  const suggestedPrompts = [
    "Which team has the highest workload risk?",
    "Explain today's attendance anomalies.",
    "What happens if five employees are absent tomorrow?",
    "Which departments need attention?",
    "Generate a workforce summary."
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ query: textToSend })
      });

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: response.answer,
        timestamp: response.timestamp || new Date().toISOString(),
        answer: response.answer,
        evidence: response.evidence || [],
        metrics: response.metrics || null,
        confidence: response.confidence || 0.90,
        recommended_action: response.recommended_action
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: err.message || "I apologize, but I encountered a security permission or data retrieval error processing your query.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <AppShell>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
        
        {/* Title */}
        <div className="shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase flex items-center gap-2">
            <Bot className="w-8 h-8 text-purple-400" />
            AI Copilot Assistant
          </h1>
          <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
            Natural language interface for workforce querying, prediction analysis, and diagnostics
          </p>
        </div>

        {/* Chat box wrapper */}
        <div className="flex-1 glass-panel rounded-2xl overflow-hidden border border-zinc-800/80 flex flex-col justify-between">
          
          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div key={m.id} className={`flex gap-3 max-w-2xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                    isUser 
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400" 
                      : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  }`}>
                    {isUser ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
                  </div>

                  {/* Bubble content */}
                  <div className="space-y-3">
                    <div className={`rounded-xl p-3.5 text-xs leading-relaxed ${
                      isUser 
                        ? "bg-purple-500/10 border border-purple-500/20 text-zinc-100" 
                        : "bg-zinc-900/40 border border-zinc-800/60 text-zinc-300"
                    }`}>
                      {m.text}
                    </div>

                    {/* AI Structured Data Presentation Card */}
                    {!isUser && m.answer && (
                      <div className="glass-card rounded-xl p-4 border border-zinc-800 space-y-4 max-w-xl text-xs">
                        
                        {/* Evidence section */}
                        {m.evidence && m.evidence.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Supporting Signals:</span>
                            <div className="space-y-1">
                              {m.evidence.map((ev, idx) => (
                                <div key={idx} className="flex gap-2 items-start text-[11px] text-zinc-400">
                                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <span>{ev}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Metrics display */}
                        {m.metrics && (
                          <div className="grid grid-cols-2 gap-2 bg-zinc-950/20 p-2.5 rounded border border-zinc-800/40 text-[10px]">
                            {Object.entries(m.metrics).map(([key, val]: any) => (
                              <div key={key}>
                                <span className="text-zinc-500 block capitalize">{key.replace(/_/g, " ")}</span>
                                <span className="font-bold text-zinc-200">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Confidence indicator */}
                        {m.confidence !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                              <span>Model Confidence</span>
                              <span className="text-purple-400 font-mono">{Math.round(m.confidence * 100)}%</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-1">
                              <div className="bg-purple-500 h-1 rounded-full animate-pulse-ai" style={{ width: `${m.confidence * 100}%` }}></div>
                            </div>
                          </div>
                        )}

                        {/* Recommended Action */}
                        {m.recommended_action && (
                          <div className="p-3 rounded border border-amber-500/15 bg-amber-500/5 text-[10px] leading-relaxed text-zinc-400 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-zinc-200 uppercase tracking-wide block mb-0.5">Recommended Intervention</span>
                              {m.recommended_action}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {/* AI Loading bubble */}
            {loading && (
              <div className="flex gap-3 mr-auto max-w-lg">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="glass-card rounded-xl px-4 py-3 text-xs text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                </div>
              </div>
            )}

            <div ref={scrollRef}></div>
          </div>

          {/* Preset Shortcuts panel */}
          <div className="px-4 py-2 border-t border-zinc-800/40 flex gap-2 overflow-x-auto shrink-0 bg-zinc-950/20">
            {suggestedPrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full border border-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 bg-zinc-900/30 cursor-pointer shrink-0 transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Form input bar */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-3"
            >
              <input 
                type="text" 
                placeholder="Ask NEXORA AI... e.g. Which team is at risk?" 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 glass-input text-xs"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold text-xs tracking-wider uppercase transition flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
