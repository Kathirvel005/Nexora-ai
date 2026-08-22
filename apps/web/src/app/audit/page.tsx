"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Terminal, Shield, CheckCircle, XCircle, Search, Filter, User, Clock } from "lucide-react";

export default function AuditCenterPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState<"ALL" | "SUCCESS" | "FAILURE">("ALL");
  const [filterAction, setFilterAction] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch("/api/audit?limit=200");
        setLogs(Array.isArray(res) ? res : res.logs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const actions = ["ALL", ...Array.from(new Set(logs.map(l => l.action?.split("_")[0] || "OTHER")))];

  const filtered = logs.filter(l => {
    if (filterResult !== "ALL" && l.result !== filterResult) return false;
    if (filterAction !== "ALL" && !l.action?.startsWith(filterAction)) return false;
    if (search && !l.action?.toLowerCase().includes(search.toLowerCase()) &&
        !l.resource?.toLowerCase().includes(search.toLowerCase()) &&
        !l.actor_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const successCount = logs.filter(l => l.result === "SUCCESS").length;
  const failureCount = logs.filter(l => l.result === "FAILURE").length;

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" });
    } catch { return ts; }
  };

  const actionColor = (action: string) => {
    const a = action?.toLowerCase() || "";
    if (a.includes("login") || a.includes("auth")) return "text-cyan-400 bg-cyan-400/10";
    if (a.includes("create") || a.includes("add")) return "text-green-400 bg-green-400/10";
    if (a.includes("update") || a.includes("modify")) return "text-amber-400 bg-amber-400/10";
    if (a.includes("delete") || a.includes("remove")) return "text-red-400 bg-red-400/10";
    return "text-zinc-400 bg-zinc-400/10";
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-6 h-6 text-purple-400" />
              Audit Center
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Complete activity log and security audit trail</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-zinc-400">Live Monitoring</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: loading ? "—" : logs.length, icon: Terminal, color: "purple" },
            { label: "Successful", value: loading ? "—" : successCount, icon: CheckCircle, color: "green" },
            { label: "Failures", value: loading ? "—" : failureCount, icon: XCircle, color: "red" },
            { label: "Unique Actors", value: loading ? "—" : new Set(logs.map(l => l.actor_id)).size, icon: User, color: "cyan" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-${color}-400/10 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input pl-8 pr-3 py-1.5 rounded-lg text-xs w-48"
            />
          </div>
          <Filter className="w-4 h-4 text-zinc-500" />
          {(["ALL", "SUCCESS", "FAILURE"] as const).map(r => (
            <button key={r} onClick={() => setFilterResult(r)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${filterResult === r ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {r === "ALL" ? "All Results" : r}
            </button>
          ))}
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="glass-input px-3 py-1 rounded-full text-xs">
            {actions.slice(0, 15).map(a => <option key={a} value={a}>{a === "ALL" ? "All Actions" : a}</option>)}
          </select>
          <span className="text-xs text-zinc-500 ml-auto">{filtered.length} events</span>
        </div>

        {/* Audit Log Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Timestamp", "Actor", "Action", "Resource", "IP Address", "Result"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No audit events found
                  </td></tr>
                ) : (
                  filtered.slice(0, 100).map(l => (
                    <tr key={l.id} className={`hover:bg-white/[0.02] transition-colors text-sm ${l.result === "FAILURE" ? "bg-red-500/[0.02]" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          <span className="font-mono text-xs">{formatTime(l.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-3 h-3 text-zinc-500" />
                          </div>
                          <span className="text-xs text-zinc-400 font-mono">{l.actor_id?.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium font-mono ${actionColor(l.action)}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-xs truncate">{l.resource || "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{l.ip_address || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium ${l.result === "SUCCESS" ? "text-green-400" : "text-red-400"}`}>
                          {l.result === "SUCCESS" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {l.result}
                        </span>
                      </td>
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
