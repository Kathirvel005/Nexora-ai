"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Play, ChevronRight, ChevronLeft, LogOut, Bot, ShieldAlert, 
  GitBranch, PlayCircle, BarChart3, Clock, AlertTriangle, CheckCircle 
} from "lucide-react";

export default function ExecutiveDemoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // 6 Steps of the Showcase Scenario
  const steps = [
    {
      title: "1. Workforce Overview",
      description: "NEXORA AI continuously scans core HR signals. Today, the system raises a critical Operational Risk Alert on the dashboard: Engineering Team B shows elevated workload and disengagement stress.",
      element: (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-zinc-800/80 bg-zinc-900/30">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Live Alert Feed</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-ai"></span>
          </div>
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 flex gap-3 items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5">
              <div className="font-extrabold text-zinc-200 uppercase tracking-wide">Critical Operational Stress: Engineering Team B</div>
              <p className="text-zinc-400 leading-relaxed">
                Attrition risk index has spiked to <span className="text-red-400 font-bold">74.2%</span> due to task density overload (+18%) and arrival time disengagement anomalies.
              </p>
              <div className="text-[9px] text-zinc-500 font-mono">MODEL CONFIDENCE: 91% ● INSIGHT STAMP: TODAY 09:22 AM</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. Open Digital Twin Graph",
      description: "HR logs into the Digital Twin visualization. The org graph structures employees reporting lines. Zooming into the Engineering Team B node, the manager (Robert Stark) and reports show high-risk warning outlines.",
      element: (
        <div className="glass-card rounded-xl p-5 border border-zinc-800/80 bg-zinc-900/30 flex flex-col items-center justify-center min-h-60 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-[9px] font-mono text-zinc-500">DIGITAL TWIN RENDERER [ZOOM: 1.4x]</div>
          
          <div className="space-y-8 flex flex-col items-center z-10 w-full">
            {/* Manager Node */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-red-500 bg-zinc-950 flex items-center justify-center font-black text-xs text-red-400 shadow-lg shadow-red-500/25 animate-pulse-ai">
                RS
              </div>
              <span className="text-[9px] font-bold text-zinc-200 mt-2">Robert Stark (Manager)</span>
              <span className="text-[7px] text-zinc-500">Core App Team B</span>
            </div>

            {/* Sub-Nodes edge lines */}
            <div className="flex gap-12 relative w-full justify-center">
              <div className="absolute top-[-32px] w-24 h-8 border-x border-b border-red-500/40"></div>
              
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full border border-red-500 bg-zinc-950 flex items-center justify-center font-bold text-[9px] text-red-400">
                  AM
                </div>
                <span className="text-[8px] font-semibold text-zinc-300 mt-1">Alex Mercer</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full border border-red-500 bg-zinc-950 flex items-center justify-center font-bold text-[9px] text-red-400">
                  JV
                </div>
                <span className="text-[8px] font-semibold text-zinc-300 mt-1">Jordan Vance</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "3. Analyze Risk Factors",
      description: "Opening the Risk Intelligence dashboard, the system breaks down contributing disengagement vectors. Robert's team shows workload index overload and late arrivals. Crucially, they haven't taken a single day of leave in 90 days, indicating high burnout potential.",
      element: (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-zinc-800/80 bg-zinc-900/30">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Team B Risk Breakdown</h4>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Task Density Overload</span>
                <span className="font-bold text-red-400">78.4% (Overload)</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: "78%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Check-In Delay frequency</span>
                <span className="font-bold text-amber-500">62.0% (Warning)</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "62%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Burnout Index (90d Leave depletion)</span>
                <span className="font-bold text-red-500">92.0% (Critical)</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: "92%" }}></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Query AI Copilot",
      description: "HR opens the AI Copilot and prompts: 'Why is Team B at risk?' The assistant verifies credentials (enforcing role-based access), executes analysis tools, and explains that Robert Stark's team has high dependency and task density.",
      element: (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-zinc-800/80 bg-zinc-900/30 text-xs">
          <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
            <Bot className="w-4 h-4" /> Nexora AI Assistant
          </div>
          <div className="p-3.5 rounded-lg border border-purple-500/15 bg-purple-500/5 space-y-3">
            <p className="text-zinc-300 leading-relaxed">
              **Engineering Team B (Core App)** is at risk due to high task density.
            </p>
            <div className="space-y-1.5 text-[10px]">
              <span className="text-zinc-500 font-bold uppercase tracking-wider block">Evidence metrics:</span>
              <div className="text-zinc-400 font-medium">● Average workload score: 78.4% (max recommended 70%)</div>
              <div className="text-zinc-400 font-medium">● 3 employees have late check-ins {'>'}45m (disengagement signals)</div>
              <div className="text-zinc-400 font-medium">● Leave capacity deficit: 0 approved days off in 90 days.</div>
            </div>
            <div className="pt-2 border-t border-purple-500/10 text-[10px] text-zinc-400 font-semibold">
              <span className="text-zinc-500 block uppercase tracking-wider text-[8px] mb-0.5">Recommended Action:</span>
              Launch Simulation Lab to redistribute task volumes.
            </div>
          </div>
        </div>
      )
    },
    {
      title: "5. Setup What-If Simulation",
      description: "HR launches the Simulation Lab scenario builder. They simulate: redistributing 20% of Core App Team B's tasks to Product Growth, and adding a 2-person contractor staff buffer.",
      element: (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-zinc-800/80 bg-zinc-900/30 text-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4 text-purple-400" />
            Intervention Configuration
          </h4>
          <div className="space-y-3 font-mono text-[10px] text-zinc-400 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
            <div>SIMULATING CAPACITY SHIFT...</div>
            <div>[+] Target: Engineering Team B (Core App)</div>
            <div>[-] Workload offset: -15.0% redistribution</div>
            <div>[+] Support staff: +2 new contractor hires</div>
            <div>[+] Target remote ratio: 60% hybrid</div>
          </div>
        </div>
      )
    },
    {
      title: "6. Run Simulation & Observe Outcome",
      description: "HR clicks 'Run Simulation'. The what-if engine calculates task loads along reporting edges. The projected results confirm success: overall team Operational Risk falls from 38% to 17%, and Productivity rebounds to 91.0%!",
      element: (
        <div className="glass-card rounded-xl p-5 space-y-4 border border-zinc-800/80 bg-zinc-900/30 text-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Simulated projected improvements
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-zinc-950/20 border border-zinc-800 rounded-xl">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Operational Risk</span>
              <div className="text-zinc-500 line-through text-[10px] font-mono mt-1">38%</div>
              <div className="text-xl font-black text-green-400 mt-0.5">17%</div>
            </div>
            <div className="p-3 bg-zinc-950/20 border border-zinc-800 rounded-xl">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Productivity</span>
              <div className="text-zinc-500 line-through text-[10px] font-mono mt-1">74%</div>
              <div className="text-xl font-black text-green-400 mt-0.5">91%</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-green-500/15 bg-green-500/5 text-[10px] leading-relaxed text-zinc-400 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-200 uppercase tracking-wide block mb-0.5">Decision support recommendation</span>
              Scenario verified. Safe to proceed with Q3 task redistribution schedule.
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      router.push("/dashboard");
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-foreground flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background neon glows */}
      <div className="bg-glow top-[-200px] left-[-200px] bg-purple-500/10"></div>
      <div className="bg-glow bottom-[-200px] right-[-200px] bg-cyan-500/10"></div>

      {/* Cinematic Main Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10 p-6 md:p-8 glass-panel rounded-3xl border border-zinc-800/80 shadow-2xl relative">
        
        {/* Left Side: Mock Interactive Display */}
        <div className="flex flex-col justify-center min-h-[300px]">
          <div className="w-full">
            {steps[step].element}
          </div>
        </div>

        {/* Right Side: Showcase Story Control */}
        <div className="flex flex-col justify-between space-y-8">
          
          {/* Brand header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-black text-xs text-white">
                N
              </div>
              <span className="font-black text-xs uppercase tracking-wider text-zinc-300">
                Nexora Showcase Flow
              </span>
            </div>
            <button 
              onClick={() => router.push("/dashboard")}
              className="text-zinc-500 hover:text-zinc-200 text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5"
            >
              Exit Demo
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Explanation content */}
          <div className="space-y-4">
            {/* Step progress dots */}
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === step ? "w-8 bg-purple-500" : "w-2 bg-zinc-800"
                  }`}
                ></span>
              ))}
            </div>

            <h2 className="text-2xl font-black tracking-tight text-zinc-100 uppercase">
              {steps[step].title}
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium">
              {steps[step].description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-6 border-t border-zinc-800/40">
            <button
              disabled={step === 0}
              onClick={handlePrev}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 font-bold text-xs uppercase tracking-wider rounded-lg text-white transition shadow-lg shadow-purple-500/20"
            >
              {step === steps.length - 1 ? "Finish and Enter Command Center" : "Next Step"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
