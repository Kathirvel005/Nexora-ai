"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { ClipboardList, Download, Users, BarChart2, TrendingUp, AlertTriangle, Calendar, Activity } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

export default function ReportsPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch("/api/reports");
        setReport(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Extract data from report
  const empByDept = report?.workforce?.by_department?.map((d: any, i: number) => ({
    name: d.department?.replace(" Department", "").substring(0, 12),
    count: d.count,
    fill: COLORS[i % COLORS.length]
  })) || [];

  const statusPie = report?.workforce
    ? [
        { name: "Active", value: report.workforce.active_count || 0 },
        { name: "On Leave", value: report.workforce.on_leave_count || 0 },
        { name: "Inactive", value: report.workforce.inactive_count || 0 },
      ].filter(d => d.value > 0)
    : [];

  const leaveTypePie = Object.entries(report?.leave?.by_type || {}).map(([name, value]: [string, any]) => ({
    name, value: typeof value === "number" ? value : value.count || value
  }));

  const riskDist = [
    { name: "Low", value: report?.risk?.low_risk_count || 0, fill: "#10b981" },
    { name: "Moderate", value: report?.risk?.moderate_risk_count || 0, fill: "#f59e0b" },
    { name: "High", value: report?.risk?.high_risk_count || 0, fill: "#ef4444" },
  ];

  const StatBlock = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="flex flex-col">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
      {sub && <span className="text-xs text-zinc-600">{sub}</span>}
    </div>
  );

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-purple-400" />
              Executive Reports
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Comprehensive organizational analytics and workforce insights</p>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all">
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>

        {/* Section: Workforce Summary */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> Workforce Summary
          </h2>
          {loading ? (
            <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <StatBlock label="Total Headcount" value={report?.workforce?.total_employees || 0} />
              <StatBlock label="Active" value={report?.workforce?.active_count || 0} sub="Currently working" />
              <StatBlock label="On Leave" value={report?.workforce?.on_leave_count || 0} />
              <StatBlock label="Departments" value={report?.workforce?.department_count || 0} />
              <StatBlock label="Avg Tenure" value={`${report?.workforce?.avg_tenure_months?.toFixed(0) || 0}mo`} sub="Months" />
            </div>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dept Distribution */}
          <div className="glass-card rounded-xl p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" /> Headcount by Department
            </h3>
            {loading ? <div className="h-48 bg-zinc-800 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={empByDept} barSize={32}>
                  <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {empByDept.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Pie */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" /> Employment Status
            </h3>
            {loading ? <div className="h-48 bg-zinc-800 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leave Distribution */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Leave Requests by Type
            </h3>
            {loading ? <div className="h-48 bg-zinc-800 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={leaveTypePie} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                    {leaveTypePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Risk Distribution */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Risk Level Distribution
            </h3>
            {loading ? <div className="h-48 bg-zinc-800 rounded animate-pulse" /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={riskDist} barSize={60}>
                    <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskDist.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex gap-4 text-xs text-zinc-400">
                  <span>Average Risk: <span className="text-white font-medium">{report?.risk?.average_risk?.toFixed(1) || "—"}%</span></span>
                  <span>High Risk: <span className="text-red-400 font-medium">{report?.risk?.high_risk_count || 0} employees</span></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Attendance & Payroll Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" /> Attendance Overview
            </h3>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <StatBlock label="Total Records" value={report?.attendance?.total_records || 0} />
                <StatBlock label="Present" value={report?.attendance?.present_count || 0} />
                <StatBlock label="Absent" value={report?.attendance?.absent_count || 0} />
                <StatBlock label="Anomalies" value={report?.attendance?.anomaly_count || 0} sub="High deviation" />
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Payroll Summary
            </h3>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <StatBlock label="Total Records" value={report?.payroll?.total_records || 0} />
                <StatBlock label="Total Net Paid" value={`₹${((report?.payroll?.total_net_paid || 0) / 1000).toFixed(0)}K`} />
                <StatBlock label="Avg Net Salary" value={`₹${((report?.payroll?.avg_net_salary || 0) / 1000).toFixed(1)}K`} />
                <StatBlock label="Anomalies" value={report?.payroll?.anomaly_count || 0} sub="Irregular payroll" />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
