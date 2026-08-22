"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Clock, AlertTriangle, CheckCircle, XCircle, TrendingDown, Activity, User, Calendar } from "lucide-react";

export default function AttendancePage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, anomalies: 0 });
  const [filter, setFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY">("ALL");
  const [anomalyFilter, setAnomalyFilter] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch("/api/attendance?limit=200");
        const list: any[] = Array.isArray(res) ? res : res.records || [];
        setRecords(list);

        const present = list.filter(r => r.status === "PRESENT").length;
        const absent = list.filter(r => r.status === "ABSENT").length;
        const late = list.filter(r => r.status === "LATE").length;
        const anomalies = list.filter(r => r.anomaly_score > 0.5).length;
        setStats({ total: list.length, present, absent, late, anomalies });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = records.filter(r => {
    if (anomalyFilter && r.anomaly_score <= 0.5) return false;
    if (filter !== "ALL" && r.status !== filter) return false;
    return true;
  });

  const statusIcon = (status: string) => {
    if (status === "PRESENT") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "ABSENT") return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === "LATE") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Clock className="w-4 h-4 text-blue-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "PRESENT") return "text-green-400 bg-green-400/10";
    if (status === "ABSENT") return "text-red-400 bg-red-400/10";
    if (status === "LATE") return "text-amber-400 bg-amber-400/10";
    return "text-blue-400 bg-blue-400/10";
  };

  const anomalyBar = (score: number) => {
    const pct = Math.round(score * 100);
    const color = score > 0.7 ? "bg-red-500" : score > 0.4 ? "bg-amber-500" : "bg-green-500";
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-zinc-400 w-8">{pct}%</span>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-400" />
              Attendance Intelligence
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Real-time attendance monitoring with anomaly detection</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Live Sync</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Records", value: stats.total, icon: Calendar, color: "purple" },
            { label: "Present", value: stats.present, icon: CheckCircle, color: "green" },
            { label: "Absent", value: stats.absent, icon: XCircle, color: "red" },
            { label: "Late", value: stats.late, icon: AlertTriangle, color: "amber" },
            { label: "Anomalies", value: stats.anomalies, icon: Activity, color: "red" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-${color}-400/10 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{loading ? "—" : value}</div>
              <div className="text-xs text-zinc-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-zinc-400">Status:</span>
            {(["ALL", "PRESENT", "ABSENT", "LATE", "HALF_DAY"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${filter === f ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
              >
                {f === "HALF_DAY" ? "Half Day" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAnomalyFilter(!anomalyFilter)}
            className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${anomalyFilter ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            <Activity className="w-3 h-3" />
            Anomalies Only
          </button>
          <span className="text-xs text-zinc-500 self-center ml-auto">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Employee", "Date", "Status", "Check In", "Check Out", "Deviation", "Anomaly Score"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No records found</td>
                  </tr>
                ) : (
                  filtered.slice(0, 100).map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{r.employee_name || r.employee_id?.slice(0, 8)}</div>
                            <div className="text-xs text-zinc-500">{r.department || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{r.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                          {statusIcon(r.status)}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">{r.check_in || "—"}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">{r.check_out || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {r.deviation_minutes !== undefined && r.deviation_minutes !== 0 ? (
                          <span className={r.deviation_minutes > 0 ? "text-red-400" : "text-green-400"}>
                            {r.deviation_minutes > 0 ? "+" : ""}{r.deviation_minutes}m
                          </span>
                        ) : <span className="text-zinc-500">0m</span>}
                      </td>
                      <td className="px-4 py-3 w-40">{anomalyBar(r.anomaly_score || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
