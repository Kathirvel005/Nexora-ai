"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { PlayCircle, ShieldAlert, Activity, Users, Clock, Trash2, Info, CheckCircle, HelpCircle } from "lucide-react";

interface Simulation {
  id: string;
  name: string;
  scenario_config: any;
  baseline_snapshot: any;
  result_snapshot: any;
  confidence: number;
  recommendations: string[];
  status: string;
  created_at: string;
}

export default function SimulationLabPage() {
  const { apiFetch } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [history, setHistory] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Form State
  const [scenarioName, setScenarioName] = useState("Q3 High-Load Stress Test");
  const [absentIds, setAbsentIds] = useState<string[]>([]);
  const [wlChange, setWlChange] = useState(20); // +20%
  const [remotePct, setRemotePct] = useState(60); // 60%
  const [newHires, setNewHires] = useState(0);

  // Selected Simulation Result State
  const [activeSim, setActiveSim] = useState<any | null>(null);
  
  // Intervention comparison state
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionMetrics, setInterventionMetrics] = useState<any>(null);

  // Fetch employees and simulation history
  const loadData = async () => {
    try {
      setLoading(true);
      const empRes = await apiFetch("/api/employees?limit=100");
      setEmployees(empRes.data || []);

      const histData = await apiFetch("/api/simulations");
      setHistory(histData);
      
      if (histData.length > 0) {
        setActiveSim(histData[0]);
      }
    } catch (e) {
      console.error("Error loading simulation lab data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setShowIntervention(false);
    setInterventionMetrics(null);

    try {
      const payload = {
        name: scenarioName,
        scenario_config: {
          absent_employee_ids: absentIds,
          workload_change_pct: wlChange,
          remote_work_pct: remotePct,
          new_hires_count: newHires
        }
      };

      // Call API
      const result = await apiFetch("/api/simulations", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setActiveSim(result);
      
      // Refresh history list
      const histData = await apiFetch("/api/simulations");
      setHistory(histData);

    } catch (err) {
      console.error("Simulation run failed", err);
    } finally {
      // Small artificial delay to show scenario compiler
      setTimeout(() => {
        setRunning(false);
      }, 1000);
    }
  };

  // Run a mock intervention: redistributing workload + adding new hires
  const runInterventionSimulation = () => {
    if (!activeSim) return;
    
    // Simulate: Same absence, but workload decreases by 10% and 3 new hires are added
    const simulatedRisk = Math.max(12, Math.round(activeSim.result_snapshot.operational_risk * 0.45));
    const simulatedProd = Math.min(98, Math.round(activeSim.result_snapshot.productivity * 1.15));
    const simulatedAvail = Math.min(98, Math.round(activeSim.result_snapshot.availability * 1.10));
    const simulatedWl = Math.max(35, Math.round(activeSim.result_snapshot.workload * 0.75));

    setInterventionMetrics({
      productivity: simulatedProd,
      operational_risk: simulatedRisk,
      availability: simulatedAvail,
      workload: simulatedWl
    });
    setShowIntervention(true);
  };

  const deleteSim = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/simulations/${id}`, { method: "DELETE" });
      setHistory(prev => prev.filter(s => s.id !== id));
      if (activeSim?.id === id) {
        setActiveSim(null);
        setShowIntervention(false);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSelectAbsent = (id: string) => {
    setAbsentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-zinc-800 animate-pulse rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 glass-card animate-pulse rounded-xl"></div>
            <div className="h-96 glass-card animate-pulse rounded-xl lg:col-span-2"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  const baseline = activeSim?.baseline_snapshot || { productivity: 86, operational_risk: 21, availability: 94, workload: 58 };
  const simulated = activeSim?.result_snapshot || { productivity: 74, operational_risk: 38, availability: 81, workload: 76 };

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase flex items-center gap-2">
            <PlayCircle className="w-8 h-8 text-purple-400" />
            Simulation Lab
          </h1>
          <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
            Test organizational decisions and workload spillovers before making them
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Scenario Builder Form */}
          <div className="glass-card rounded-xl p-5 space-y-5 h-fit relative">
            <div className="border-b border-zinc-800/40 pb-3">
              <h3 className="font-bold text-sm tracking-wide text-zinc-200 uppercase">Scenario Builder</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Define parameters to stress-test capacity</p>
            </div>

            <form onSubmit={handleRun} className="space-y-4 text-xs">
              {/* Scenario Name */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Scenario Name</label>
                <input 
                  required
                  type="text"
                  className="w-full px-3 py-2 glass-input text-xs"
                  value={scenarioName}
                  onChange={e => setScenarioName(e.target.value)}
                />
              </div>

              {/* Absent Select */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Simulate Absences ({absentIds.length} Selected)
                </label>
                <div className="h-28 overflow-y-auto border border-zinc-800 rounded bg-zinc-950/20 p-2 space-y-1">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-zinc-800/30 rounded cursor-pointer text-[10px]">
                      <input 
                        type="checkbox"
                        checked={absentIds.includes(emp.id)}
                        onChange={() => handleSelectAbsent(emp.id)}
                        className="rounded bg-zinc-950 border-zinc-800 text-purple-500 focus:ring-0"
                      />
                      <span className="text-zinc-300 font-medium">{emp.name}</span>
                      <span className="text-zinc-500 font-mono ml-auto">{emp.designation}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Workload scale */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  <span>Workload Adjustment</span>
                  <span className="text-purple-400 font-mono">+{wlChange}%</span>
                </div>
                <input 
                  type="range" 
                  min="-30" 
                  max="100" 
                  value={wlChange}
                  onChange={e => setWlChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Remote percentage */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  <span>Remote Shift Target</span>
                  <span className="text-cyan-400 font-mono">{remotePct}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={remotePct}
                  onChange={e => setRemotePct(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* New hires */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Simulate New Hires</label>
                <input 
                  type="number" 
                  min="0" 
                  max="10" 
                  value={newHires}
                  onChange={e => setNewHires(Number(e.target.value))}
                  className="w-full px-3 py-2 glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={running}
                className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 font-bold text-xs uppercase tracking-wider text-white transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {running ? "Compiling Scenario..." : "Run Simulator"}
              </button>
            </form>

            {/* Run overlay spinner */}
            {running && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center space-y-3 z-20">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest animate-pulse">Building organizational scenario...</div>
              </div>
            )}
          </div>

          {/* Right Panel: Side-by-Side Comparison */}
          <div className="lg:col-span-2 space-y-6">
            
            {activeSim ? (
              <div className="glass-card rounded-xl p-5 space-y-6">
                
                {/* Header result */}
                <div className="flex justify-between items-start border-b border-zinc-800/40 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-200 uppercase">{activeSim.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-medium">Confidence Matrix Score: {Math.round(activeSim.confidence * 100)}%</p>
                  </div>
                  {!showIntervention && (
                    <button 
                      onClick={runInterventionSimulation}
                      className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded font-bold text-[9px] uppercase tracking-wider transition"
                    >
                      Redistribute Workload (Intervene)
                    </button>
                  )}
                </div>

                {/* Metric dials grid */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  
                  {/* Productivity dial */}
                  <div className="bg-zinc-950/20 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Productivity</span>
                    <div className="py-2.5">
                      <div className="text-zinc-500 text-[10px] line-through font-mono">{baseline.productivity}%</div>
                      <div className="text-xl font-black text-zinc-100">{simulated.productivity}%</div>
                      {showIntervention && (
                        <div className="text-xs text-green-400 font-bold font-mono mt-1">→ {interventionMetrics.productivity}%</div>
                      )}
                    </div>
                  </div>

                  {/* Operational Risk dial */}
                  <div className="bg-zinc-950/20 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Operational Risk</span>
                    <div className="py-2.5">
                      <div className="text-zinc-500 text-[10px] line-through font-mono">{baseline.operational_risk}%</div>
                      <div className="text-xl font-black text-amber-500">{simulated.operational_risk}%</div>
                      {showIntervention && (
                        <div className="text-xs text-green-400 font-bold font-mono mt-1">→ {interventionMetrics.operational_risk}%</div>
                      )}
                    </div>
                  </div>

                  {/* Availability dial */}
                  <div className="bg-zinc-950/20 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Availability</span>
                    <div className="py-2.5">
                      <div className="text-zinc-500 text-[10px] line-through font-mono">{baseline.availability}%</div>
                      <div className="text-xl font-black text-cyan-400">{simulated.availability}%</div>
                      {showIntervention && (
                        <div className="text-xs text-green-400 font-bold font-mono mt-1">→ {interventionMetrics.availability}%</div>
                      )}
                    </div>
                  </div>

                  {/* Workload dial */}
                  <div className="bg-zinc-950/20 border border-zinc-800/60 p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Workload rating</span>
                    <div className="py-2.5">
                      <div className="text-zinc-500 text-[10px] line-through font-mono">{baseline.workload}%</div>
                      <div className="text-xl font-black text-purple-400">{simulated.workload}%</div>
                      {showIntervention && (
                        <div className="text-xs text-green-400 font-bold font-mono mt-1">→ {interventionMetrics.workload}%</div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Recommendations and Intervention summary */}
                <div className="space-y-4 text-xs">
                  {/* Recommendations */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-300 uppercase tracking-wide text-[10px]">Simulation Recommendations:</h4>
                    <div className="space-y-1.5">
                      {activeSim.recommendations && activeSim.recommendations.map((rec: string, idx: number) => (
                        <div key={idx} className="flex gap-2 items-start text-zinc-400">
                          <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intervention Alert */}
                  {showIntervention && (
                    <div className="p-3.5 rounded-lg border border-green-500/15 bg-green-500/5 text-[11px] leading-relaxed text-zinc-400 flex items-start gap-2">
                      <Info className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-zinc-200 uppercase tracking-wide block mb-0.5">Projected Intervention Outcome</span>
                        By redistributing secondary task workload away from overloaded nodes and utilizing contractor support, projected **Operational Risk decreases from {simulated.operational_risk}% to {interventionMetrics.operational_risk}%**, while **Productivity recovers to {interventionMetrics.productivity}%**.
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center text-xs text-zinc-500">
                No simulations executed yet. Complete the Scenario Builder form to compile your first organizational simulation.
              </div>
            )}

            {/* Simulation History List */}
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm tracking-wide text-zinc-200 uppercase border-b border-zinc-800/40 pb-3">Simulation History</h3>
              
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-center text-xs text-zinc-500 py-6">No historical records saved.</div>
                ) : (
                  history.map((sim) => (
                    <div 
                      key={sim.id}
                      onClick={() => {
                        setActiveSim(sim);
                        setShowIntervention(false);
                      }}
                      className={`p-3.5 rounded-lg border cursor-pointer transition flex items-center justify-between text-xs hover:bg-zinc-800/10 ${
                        activeSim?.id === sim.id ? "border-purple-500/40 bg-purple-500/5" : "border-zinc-800/60 bg-zinc-950/10"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-zinc-200">{sim.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          Horizon: 30d ● Compiled on {new Date(sim.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block">Risk Shift</span>
                          <span className="font-bold text-amber-500">{sim.baseline_snapshot.operational_risk}% → {sim.result_snapshot.operational_risk}%</span>
                        </div>
                        <button 
                          onClick={(e) => deleteSim(sim.id, e)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800/30 transition"
                          title="Delete simulation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}
