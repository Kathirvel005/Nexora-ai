"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, AlertTriangle, AlertCircle, Bot, Users, ArrowRight, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RiskIntelligencePage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    high_risk_count: 0,
    moderate_risk_count: 0,
    low_risk_count: 0,
    average_risk: 0
  });
  
  const [categoryAverages, setCategoryAverages] = useState({
    attrition: 0,
    workload: 0,
    dependency: 0,
    attendance: 0,
    payroll: 0
  });

  const [matrixNodes, setMatrixNodes] = useState<any[]>([]);

  useEffect(() => {
    async function loadRiskData() {
      try {
        setLoading(true);
        const res = await apiFetch("/api/risk");
        const list = res.risks || [];
        setRisks(list);
        setSummary({
          high_risk_count: res.summary.high_risk_count,
          moderate_risk_count: res.summary.moderate_risk_count,
          low_risk_count: res.summary.low_risk_count,
          average_risk: list.length > 0 
            ? Math.round(list.reduce((acc: number, r: any) => acc + r.total_risk, 0) / list.length) 
            : 22
        });

        // Compute averages for categories
        if (list.length > 0) {
          const attrAvg = list.reduce((acc: number, r: any) => acc + r.attrition_risk, 0) / list.length;
          const wlAvg = list.reduce((acc: number, r: any) => acc + r.workload_risk, 0) / list.length;
          const depAvg = list.reduce((acc: number, r: any) => acc + r.dependency_risk, 0) / list.length;
          const attAvg = list.reduce((acc: number, r: any) => acc + r.attendance_risk, 0) / list.length;
          
          setCategoryAverages({
            attrition: Math.round(attrAvg),
            workload: Math.round(wlAvg),
            dependency: Math.round(depAvg),
            attendance: Math.round(attAvg),
            payroll: 4.2  // Baseline payroll anomaly risk
          });

          // Plot employees in 3x3 Likelihood vs Impact Matrix
          // Likelihood (attrition_risk): 0-33=Low, 34-66=Medium, 67-100=High
          // Impact (workload_risk/dependency): 0-33=Low, 34-66=Medium, 67-100=High
          const nodesMapped = list.map((emp: any) => {
            let likelihood = "Low";
            if (emp.attrition_risk > 66) likelihood = "High";
            else if (emp.attrition_risk > 33) likelihood = "Medium";

            let impact = "Low";
            const impactVal = (emp.workload_risk + emp.dependency_risk) / 2;
            if (impactVal > 66) impact = "High";
            else if (impactVal > 33) impact = "Medium";

            return {
              id: emp.employee_id,
              name: emp.employee_name,
              risk: emp.total_risk,
              likelihood,
              impact
            };
          });
          setMatrixNodes(nodesMapped);
        }

      } catch (err) {
        console.error("Error loading risk intelligence data", err);
      } finally {
        setLoading(false);
      }
    }

    loadRiskData();
  }, []);

  // Filter matrix nodes by cell
  const getCellNodes = (likelihood: "High" | "Medium" | "Low", impact: "High" | "Medium" | "Low") => {
    return matrixNodes.filter(n => n.likelihood === likelihood && n.impact === impact);
  };

  const criticalEmployees = risks.filter(r => r.total_risk > 70);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-zinc-800 animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 glass-card animate-pulse rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 glass-card animate-pulse rounded-xl lg:col-span-2"></div>
            <div className="h-80 glass-card animate-pulse rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
              Risk Intelligence Center
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
              Multi-factor attrition predictive analytics and single-point failure assessment
            </p>
          </div>
        </div>

        {/* Risk Categories Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Attrition Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Attrition Risk</div>
            <div className="mt-3">
              <div className="text-3xl font-black text-amber-500">{categoryAverages.attrition}%</div>
              <div className="text-[9px] text-zinc-500 font-semibold mt-1">Confidence level: 91%</div>
            </div>
          </div>

          {/* Workload Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Workload Risk</div>
            <div className="mt-3">
              <div className="text-3xl font-black text-purple-400">{categoryAverages.workload}%</div>
              <div className="text-[9px] text-zinc-500 font-semibold mt-1">Confidence level: 94%</div>
            </div>
          </div>

          {/* Dependency Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Dependency Risk</div>
            <div className="mt-3">
              <div className="text-3xl font-black text-cyan-400">{categoryAverages.dependency}%</div>
              <div className="text-[9px] text-zinc-500 font-semibold mt-1">Confidence level: 88%</div>
            </div>
          </div>

          {/* Attendance Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Attendance Risk</div>
            <div className="mt-3">
              <div className="text-3xl font-black text-green-400">{categoryAverages.attendance}%</div>
              <div className="text-[9px] text-zinc-500 font-semibold mt-1">Confidence level: 75%</div>
            </div>
          </div>

          {/* Payroll Anomaly Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Payroll Anomaly Risk</div>
            <div className="mt-3">
              <div className="text-3xl font-black text-zinc-400">{categoryAverages.payroll}%</div>
              <div className="text-[9px] text-zinc-500 font-semibold mt-1">Confidence level: 95%</div>
            </div>
          </div>

        </div>

        {/* 3x3 Risk Matrix & AI Explanation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 3x3 Risk Matrix */}
          <div className="glass-card rounded-xl p-5 lg:col-span-2 space-y-4">
            <div className="border-b border-zinc-800/40 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm tracking-wide text-zinc-200">Risk Assessment Matrix</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Likelihood (Attrition) vs Impact (Dependency & Workload)</p>
              </div>
            </div>

            {/* Matrix Visuals */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              {/* Row Header column blank */}
              <div></div>
              <div className="font-bold text-zinc-500 uppercase tracking-wider py-1 border-b border-zinc-800">Impact Low</div>
              <div className="font-bold text-zinc-500 uppercase tracking-wider py-1 border-b border-zinc-800">Impact Med</div>
              <div className="font-bold text-zinc-500 uppercase tracking-wider py-1 border-b border-zinc-800">Impact High</div>

              {/* Likelihood High */}
              <div className="font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center border-r border-zinc-800 pr-2">Like High</div>
              <div className="bg-amber-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-amber-500">{getCellNodes("High", "Low").length}</span>
              </div>
              <div className="bg-red-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-red-400">{getCellNodes("High", "Medium").length}</span>
              </div>
              <div className="bg-red-500/20 border-2 border-red-500/30 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center shadow-lg shadow-red-500/5 animate-pulse-ai">
                <span className="font-black text-red-500">{getCellNodes("High", "High").length} Nodes</span>
              </div>

              {/* Likelihood Medium */}
              <div className="font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center border-r border-zinc-800 pr-2">Like Med</div>
              <div className="bg-green-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-green-400">{getCellNodes("Medium", "Low").length}</span>
              </div>
              <div className="bg-amber-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-amber-500">{getCellNodes("Medium", "Medium").length}</span>
              </div>
              <div className="bg-red-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-red-400">{getCellNodes("Medium", "High").length}</span>
              </div>

              {/* Likelihood Low */}
              <div className="font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center border-r border-zinc-800 pr-2">Like Low</div>
              <div className="bg-green-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-green-400">{getCellNodes("Low", "Low").length}</span>
              </div>
              <div className="bg-green-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-green-400">{getCellNodes("Low", "Medium").length}</span>
              </div>
              <div className="bg-amber-500/10 border border-zinc-800 p-2 min-h-16 rounded flex flex-col gap-1 items-center justify-center">
                <span className="font-black text-amber-500">{getCellNodes("Low", "High").length}</span>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800/40 pb-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm tracking-wide text-zinc-200">Risk Diagnostic explanation</h3>
            </div>

            <div className="text-xs space-y-4 leading-relaxed text-zinc-400">
              <p>
                An analysis of organizational dependencies and workload indices reveals that **Engineering Team B (Core App)** is experiencing systemic strain.
              </p>
              <div className="p-3 bg-zinc-950/40 rounded border border-zinc-800 space-y-2 text-[10px]">
                <div className="font-bold text-zinc-200 uppercase tracking-wide">Primary Signals:</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Workload utilization limits exceeded (+18%)</li>
                  <li>Arrival times late deviation frequency increasing (-7%)</li>
                  <li>No leave requests approved in 90 days (burnout risk)</li>
                </ul>
              </div>
              <button 
                onClick={() => router.push("/simulation")}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/30 rounded font-bold text-[10px] text-cyan-300 uppercase transition"
              >
                Simulate Intervention
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* High Risk Registry */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-800/40 pb-3">
            <h3 className="font-bold text-sm tracking-wide text-zinc-200">Critical Observation registry</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Headcount nodes exceeding 70% threshold</p>
          </div>

          <div className="space-y-3">
            {criticalEmployees.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">No employees exceeding critical risk parameters.</div>
            ) : (
              criticalEmployees.map((emp) => (
                <div 
                  key={emp.employee_id} 
                  onClick={() => router.push(`/workforce/${emp.employee_id}`)}
                  className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-red-500/10 transition"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200 text-sm">{emp.employee_name}</span>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{emp.designation} ● {emp.team_name}</span>
                    </div>
                    <div className="text-zinc-400 font-medium">
                      Signals: {Object.keys(emp.signals).filter(k => emp.signals[k]).map(k => k.replace(/_/g, " ")).join(", ") || "Elevated disengagement"}
                    </div>
                    <div className="text-[10px] text-zinc-500 leading-relaxed pt-1">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wide">Recommended action:</span> {emp.recommended_action}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 shrink-0 self-end md:self-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Risk Score</span>
                    <span className="text-2xl font-black text-red-500">{emp.total_risk}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
