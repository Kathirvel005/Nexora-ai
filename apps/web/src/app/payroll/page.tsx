"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Wallet, DollarSign, AlertTriangle, CheckCircle, TrendingUp, User, Filter } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export default function PayrollPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PAID">("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterAnomaly, setFilterAnomaly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [payRes, empRes] = await Promise.all([
          apiFetch("/api/payroll?limit=200"),
          apiFetch("/api/employees?limit=200")
        ]);
        const payList = Array.isArray(payRes) ? payRes : payRes.payroll || [];
        const empList = (empRes.employees || []) as any[];
        // Enrich with employee names
        const enriched = payList.map((p: any) => {
          const emp = empList.find((e: any) => e.id === p.employee_id);
          return { ...p, name: emp?.name || p.employee_id?.slice(0, 8), designation: emp?.designation || "" };
        });
        setRecords(enriched);
        setEmployees(empList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPaid = records.filter(r => r.status === "PAID").reduce((s, r) => s + (r.net_salary || 0), 0);
  const totalPending = records.filter(r => r.status === "PENDING").reduce((s, r) => s + (r.net_salary || 0), 0);
  const anomalyCount = records.filter(r => r.anomaly_score > 0.5).length;

  const months = ["ALL", ...Array.from(new Set(records.map(r => `${r.year}-${String(r.month).padStart(2, "0")}`)))].sort().reverse();

  const filtered = records.filter(r => {
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (filterAnomaly && r.anomaly_score <= 0.5) return false;
    if (filterMonth !== "ALL") {
      const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
      if (key !== filterMonth) return false;
    }
    return true;
  });

  // Chart: Net salary distribution by month
  const monthlyChart = (Array.from(
    records.reduce((acc, r) => {
      const key = `${String(r.month).padStart(2, "0")}/${r.year}`;
      acc.set(key, (acc.get(key) || 0) + (r.net_salary || 0));
      return acc;
    }, new Map<string, number>())
  ) as [string, number][]).map(([month, total]) => ({ month, total: Math.round(total) })).slice(-6);

  const formatCurrency = (v: number) => {
    if (v >= 1000000) return `₹${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-purple-400" />
              Payroll Center
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Payroll management with anomaly detection and audit trail</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Records", value: loading ? "—" : records.length, icon: Wallet, color: "purple", format: false },
            { label: "Total Paid", value: loading ? "—" : formatCurrency(totalPaid), icon: DollarSign, color: "green", format: false },
            { label: "Pending Payout", value: loading ? "—" : formatCurrency(totalPending), icon: TrendingUp, color: "amber", format: false },
            { label: "Payroll Anomalies", value: loading ? "—" : anomalyCount, icon: AlertTriangle, color: "red", format: false },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-${color}-400/10 flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-400 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Monthly Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Monthly Payroll Disbursement
          </h3>
          {loading ? (
            <div className="h-40 bg-zinc-800 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyChart} barSize={40}>
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: any) => [formatCurrency(v), "Net Payroll"]}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#a855f7">
                  {monthlyChart.map((_, i) => (
                    <Cell key={i} fill={i === monthlyChart.length - 1 ? "#a855f7" : "#6d28d9"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-zinc-500" />
          {(["ALL", "PAID", "PENDING"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${filterStatus === s ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {s === "ALL" ? "All Status" : s}
            </button>
          ))}
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="glass-input px-3 py-1 rounded-full text-xs">
            {months.map(m => <option key={m} value={m}>{m === "ALL" ? "All Months" : m}</option>)}
          </select>
          <button onClick={() => setFilterAnomaly(!filterAnomaly)}
            className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1 ${filterAnomaly ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            <AlertTriangle className="w-3 h-3" /> Anomalies Only
          </button>
          <span className="text-xs text-zinc-500 ml-auto">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Employee", "Period", "Base Salary", "Allowances", "Deductions", "Net Salary", "Status", "Anomaly"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500">No payroll records found</td></tr>
                ) : filtered.slice(0, 100).map(r => (
                  <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${r.anomaly_score > 0.5 ? "bg-red-500/[0.03]" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{r.name}</div>
                          <div className="text-xs text-zinc-500">{r.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 font-mono">
                      {String(r.month).padStart(2,"0")}/{r.year}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{formatCurrency(r.base_salary)}</td>
                    <td className="px-4 py-3 text-sm text-green-400">+{formatCurrency(r.allowances)}</td>
                    <td className="px-4 py-3 text-sm text-red-400">-{formatCurrency(r.deductions)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-white">{formatCurrency(r.net_salary)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "PAID" ? "bg-green-400/10 text-green-400" : "bg-amber-400/10 text-amber-400"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.anomaly_score > 0.5 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-400">{Math.round(r.anomaly_score * 100)}%</span>
                        </div>
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400/50" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
