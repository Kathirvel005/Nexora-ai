"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [token, loading, router]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-dark-bg overflow-hidden font-sans">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 filter blur-3xl animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 filter blur-3xl animate-float" style={{ animationDelay: "-3s" }}></div>

      <div className="flex flex-col items-center gap-6 z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-black text-3xl text-white shadow-xl shadow-purple-500/25 animate-pulse-ai">
          N
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-wider text-zinc-100 uppercase">
            NEXORA
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            Establishing Secure Connection...
          </p>
        </div>
        
        {/* Loading Spinner */}
        <div className="w-8 h-8 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin mt-2"></div>
      </div>
    </div>
  );
}

