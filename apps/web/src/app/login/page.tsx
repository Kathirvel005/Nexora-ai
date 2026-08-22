"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const success = await login(email, password);
      if (!success) {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-dark-bg p-4 overflow-hidden font-sans">
      
      {/* Background neon blur ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 filter blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 filter blur-3xl animate-float" style={{ animationDelay: "-3s" }}></div>

      {/* Central Login Card */}
      <div className="w-full max-w-md glass-card rounded-2xl p-8 z-10 text-center relative border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-xl">
        
        {/* Branding Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-purple-500/20 animate-pulse-ai">
            N
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-wide mb-1 text-zinc-100">
          NEXORA
        </h1>
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-8">
          Workforce Intelligence Platform
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Corporate Email
            </label>
            <input
              required
              type="email"
              placeholder="e.g. admin@nexora.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 glass-input text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 glass-input text-sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-purple-500 focus:ring-0 focus:ring-offset-0" />
              Remember device
            </label>
            <a href="#" className="text-purple-400 hover:text-purple-300 font-medium">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-4 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 font-bold text-sm text-white tracking-wide shadow-lg shadow-purple-500/25 transition disabled:opacity-50"
          >
            {submitting ? "Authenticating Session..." : "Establish Secure Session"}
          </button>
        </form>

        {/* Demo credentials panel */}
        <div className="mt-8 border-t border-zinc-800/60 pt-6 text-left">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
            Demo Credentials (Password: password123)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400 font-mono">
            <div>
              <span className="font-semibold text-purple-400">admin@nexora.ai</span> (HR Super Admin)
            </div>
            <div>
              <span className="font-semibold text-purple-400">executive@nexora.ai</span> (CEO Org-View)
            </div>
            <div>
              <span className="font-semibold text-purple-400">manager@nexora.ai</span> (Team B Mgr)
            </div>
            <div>
              <span className="font-semibold text-purple-400">employee@nexora.ai</span> (Team B Staff)
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
