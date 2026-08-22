"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { BarChart3, AlertTriangle, TrendingUp, Activity, User, Zap, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

export default function WorkloadPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"score" | "tasks" | "hours">("score");
  const [showHighOnly, setShowHighOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [wlRes, empRes] = await Promise.all([
          apiFetch("/api/workload"),
          apiFetch("/api/employees?limit=200")
        ]);
        setData(wlRes);
        const empList: any[] = empRes.employees || [];
        const assignments: any[] = wlRes.assignments || [];
        // Merge employee names into assignments
        const merged = assignments.map((a: any) => {
          const emp = empList.find((e: any) => e.id === a.employee_id);
          return { ...a, name: emp?.name || a.employee_id?.slice(0, 8), designation: emp?.designation || "" };
        });
        setEmployees(merged);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = [...employees]
    .filter(e => !showHighOnly || e.score >= 70)
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "tasks") return b.tasks_count - a.tasks_count;
      return b.working_hours - a.working_hours;
    });

  const scoreColor = (score: number) => {
    if (score >= 80) return { text: "text-red-400", bg: "bg-red-500", pill: "bg-red-400/10 text-red-400" };
    if (score >= 60) return { text: "text-amber-400", bg: "bg-amber-500", pill: "bg-amber-400/10 text-amber-400" };
    return { text: "text-green-400", bg: "bg-green-500", pill: "bg-green-400/10 text-green-400" };
  };

  const topTeamData = data?.by_department?.slice(0, 8).map((d: any) => ({
    name: d.department?.replace(" Department", "").substring(0, 12) || "N/A",
    score: Math.round(d.avg_score || 0)
  })) || [];

  const radarData = [
    { subject: "Tasks", A: Math.round(data?.summary?.average_workload || 0) },
    { subject: "Hours", A: Math.round((data?.summary?.overloaded_count || 0) / Math.max(employees.length, 1) * 100) },
    { subject: "Pressure", A: Math.round(data?.summary?.overloaded_count || 0) },
    { subject: "Projects", A: Math.round(data?.summary?.critical_count || 0) },
  ];

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              Workload Intelligence
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Real-time workload distribution and capacity analysis</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Avg Workload", value: loading ? "—" : `${Math.round(data?.summary?.average_workload || 0)}%`, icon: Activity, color: "purple", sub: "Across all employees" },
            { label: "Overloaded", value: loading ? "—" : data?.summary?.overloaded_count || 0, icon: AlertTriangle, color: "amber", sub: ">80% workload" },
            { label: "Critical Load", value: loading ? "—" : data?.summary?.critical_count || 0, icon: Zap, color: "red", sub: ">90% workload" },
            { label: "Monitored", value: loading ? "—" : employees.length, icon: User, color: "green", sub: "Active employees" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-${color}-400/10 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-400 mt-1">{label}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Department chart */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Workload by Department
            </h3>
            {loading ? (
              <div className="h-48 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topTeamData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }}
                    formatter={(v: any) => [`${v}%`, "Workload"]}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {topTeamData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.score >= 80 ? "#ef4444" : entry.score >= 60 ? "#f59e0b" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Radar */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Capacity Pressure Radar
            </h3>
            {loading ? (
              <div className="h-48 bg-zinc-800 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#71717a", fontSize: 11 }} />
                  <Radar dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Filters + Table */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-zinc-400">Sort by:</span>
          {(["score", "tasks", "hours"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${sortBy === s ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {s === "score" ? "Workload Score" : s === "tasks" ? "Task Count" : "Working Hours"}
            </button>
          ))}
          <button onClick={() => setShowHighOnly(!showHighOnly)}
            className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${showHighOnly ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            <AlertTriangle className="w-3 h-3" />
            High Risk Only
          </button>
          <span className="text-xs text-zinc-500 ml-auto">{sorted.length} employees</span>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Employee", "Role", "Tasks", "Hours/Day", "Active Projects", "Deadline Pressure", "Workload Score"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No workload data found</td></tr>
                ) : sorted.slice(0, 100).map(e => {
                  const { text, bg, pill } = scoreColor(e.score);
                  return (
                    <tr key={e.employee_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{e.designation}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{e.tasks_count}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{e.working_hours?.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{e.active_projects}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${bg} rounded-full`} style={{ width: `${(e.deadline_pressure || 0) * 10}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400">{e.deadline_pressure}/10</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full ${bg} rounded-full`} style={{ width: `${e.score}%` }} />
                          </div>
                          <span className={`text-sm font-bold ${text}`}>{Math.round(e.score)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
