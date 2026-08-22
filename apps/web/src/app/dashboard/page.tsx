"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, Activity, Heart, ShieldAlert, CheckSquare, 
  TrendingUp, TrendingDown, Bot, AlertTriangle, Play, Clock
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    headcount: 0,
    health: 84.5,
    risk: 22.4,
    productivity: 86.2,
    attendanceRate: 94.8,
    aiConfidence: 91.5
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [riskDistData, setRiskDistData] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Fetch headcount
        const empRes = await apiFetch("/api/employees?limit=1");
        const headcount = empRes.meta.total;

        // Fetch workloads
        const wlRes = await apiFetch("/api/workload");
        const avgWorkload = wlRes.summary.average_workload;

        // Fetch risks
        const riskRes = await apiFetch("/api/risk");
        const risksList = riskRes.risks || [];
        const avgRisk = risksList.length > 0 
          ? Number((risksList.reduce((acc: number, r: any) => acc + r.total_risk, 0) / risksList.length).toFixed(1)) 
          : 22.0;

        const highRiskCount = riskRes.summary.high_risk_count;
        const modRiskCount = riskRes.summary.moderate_risk_count;
        const lowRiskCount = riskRes.summary.low_risk_count;

        // Fetch notifications (alerts)
        const notifRes = await apiFetch("/api/notifications");
        setAlerts(notifRes.slice(0, 3));

        // Fetch audit logs (activities)
        const auditRes = await apiFetch("/api/audit");
        setActivities(auditRes.slice(0, 4));

        // Calculate derived values
        const calculatedHealth = Number((100 - avgRisk).toFixed(1));
        const activeAttendance = 94.0 + Number((Math.random() * 2).toFixed(1));
        const productivity = 88.0 - Number((wlRes.summary.overloaded_employees * 0.5).toFixed(1));

        setMetrics({
          headcount,
          health: calculatedHealth,
          risk: avgRisk,
          productivity: Math.round(productivity * 10) / 10,
          attendanceRate: activeAttendance,
          aiConfidence: 92.5
        });

        // Set risk distribution chart data
        setRiskDistData([
          { name: "Low Risk", value: lowRiskCount, color: "#10b981" },
          { name: "Moderate", value: modRiskCount, color: "#f59e0b" },
          { name: "High Risk", value: highRiskCount, color: "#ef4444" }
        ]);

        // Historical trend chart mock data matching database metrics
        setChartData([
          { date: "May", risk: 18.2, workload: 52.4, productivity: 88.5 },
          { date: "Jun", risk: 20.1, workload: 56.8, productivity: 87.2 },
          { date: "Jul", risk: avgRisk, workload: avgWorkload, productivity: productivity }
        ]);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-zinc-800 animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
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
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">
              Workforce Command Center
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
              Nexora Technologies ● Operational Status: <span className="text-green-400 font-bold">Stable</span>
            </p>
          </div>
          
          <button 
            onClick={() => router.push("/simulation")}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 font-semibold text-xs tracking-wider uppercase rounded-lg text-white transition shadow-lg shadow-purple-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Simulation Lab
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* Headcount */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Headcount</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.headcount}</div>
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                +4% vs last quarter
              </div>
            </div>
          </div>

          {/* Health index */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Workforce Health</span>
              <Heart className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.health}%</div>
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                +1.2% optimal
              </div>
            </div>
          </div>

          {/* Risk */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Operational Risk</span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.risk}%</div>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                +0.8% attention B
              </div>
            </div>
          </div>

          {/* Productivity */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Productivity</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.productivity}%</div>
              <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold mt-1">
                <TrendingDown className="w-3 h-3" />
                -1.4% overload burden
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Attendance Rate</span>
              <Clock className="w-4 h-4 text-green-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.attendanceRate}%</div>
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                +0.3% present
              </div>
            </div>
          </div>

          {/* AI Confidence */}
          <div className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">AI Confidence</span>
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-zinc-100">{metrics.aiConfidence}%</div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mt-1">
                Active models: v1.4
              </div>
            </div>
          </div>

        </div>

        {/* Charts & Analytical Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Interactive Trends Area Chart */}
          <div className="glass-card rounded-xl p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
              <div>
                <h3 className="font-bold text-sm tracking-wide text-zinc-200">Workforce Operational Trends</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Monthly historical progression</p>
              </div>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Workload
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Risk
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Productivity
                </span>
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fafafa" }}
                    itemStyle={{ fontSize: 11 }}
                    labelStyle={{ fontSize: 11, fontWeight: "bold" }}
                  />
                  <Area type="monotone" dataKey="workload" stroke="#a855f7" fillOpacity={0.1} fill="url(#colorPurple)" strokeWidth={2} />
                  <Area type="monotone" dataKey="risk" stroke="#f59e0b" fillOpacity={0.1} fill="url(#colorAmber)" strokeWidth={2} />
                  <Area type="monotone" dataKey="productivity" stroke="#06b6d4" fillOpacity={0.1} fill="url(#colorCyan)" strokeWidth={2} />
                  
                  {/* Gradients */}
                  <defs>
                    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution Bar Chart */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800/40 pb-3">
              <h3 className="font-bold text-sm tracking-wide text-zinc-200">Risk Categorization</h3>
              <p className="text-[10px] text-zinc-500 font-medium">Headcount by threat level</p>
            </div>
            
            <div className="h-64 flex flex-col justify-between">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a" }}
                      itemStyle={{ color: "#ffffff", fontSize: 11 }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-zinc-800/40">
                {riskDistData.map((item, idx) => (
                  <div key={idx}>
                    <div className="font-bold" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-zinc-500 font-medium">{item.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Lower Grid: Active Alerts & Real-time logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AI Intelligence Alerts */}
          <div className="glass-card rounded-xl p-5 lg:col-span-2 space-y-4">
            <div className="border-b border-zinc-800/40 pb-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-bold text-sm tracking-wide text-zinc-200">Active AI Intelligence Alerts</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Model-generated anomalies and recommendations</p>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">No active AI alerts.</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-3.5 rounded-lg border border-purple-500/15 bg-purple-500/5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-zinc-200">{alert.title}</div>
                      <div className="text-zinc-400 leading-relaxed">{alert.message}</div>
                      <div className="text-[9px] text-zinc-500 pt-1 font-semibold uppercase tracking-wider">
                        Insight Target: Core App Team B ● Confidence: 91%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Audit Stream */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="border-b border-zinc-800/40 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-wide text-zinc-200">Audit Log Stream</h3>
                <p className="text-[10px] text-zinc-500 font-medium">Platform operations security log</p>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-950/40">LIVE</span>
            </div>

            <div className="space-y-3.5">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">No recent activities.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div>
                    <div className="space-y-0.5">
                      <div className="text-zinc-300 font-semibold">
                        User <span className="text-purple-400 font-mono">{act.actor_id}</span> triggered <span className="font-bold">{act.action}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        Target: {act.resource} ● {new Date(act.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
