"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Compass, TrendingUp, TrendingDown, Activity, Calendar, Target, BarChart2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

const HORIZON_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "14 Days", value: 14 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
];

export default function PredictionsPage() {
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [horizon, setHorizon] = useState(30);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/predictions?horizon=${horizon}`);
        setPredictions(Array.isArray(res) ? res : res.predictions || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [horizon]);

  const types = ["ALL", ...Array.from(new Set(predictions.map(p => p.target_type)))];

  const filtered = predictions.filter(p => typeFilter === "ALL" || p.target_type === typeFilter);

  // Group by target_type for aggregated views
  const grouped: Record<string, any[]> = {};
  filtered.forEach(p => {
    if (!grouped[p.target_type]) grouped[p.target_type] = [];
    grouped[p.target_type].push(p);
  });

  const typeConfig: Record<string, { label: string; color: string; icon: React.ElementType; unit: string }> = {
    WORKFORCE_AVAILABILITY: { label: "Workforce Availability", color: "#10b981", icon: Activity, unit: "%" },
    WORKLOAD: { label: "Projected Workload", color: "#f59e0b", icon: BarChart2, unit: "%" },
    ATTENDANCE_RISK: { label: "Attendance Risk", color: "#ef4444", icon: TrendingDown, unit: "%" },
    OPERATIONAL_RISK: { label: "Operational Risk", color: "#a855f7", icon: Target, unit: "%" },
  };

  const avgConfidence = filtered.length > 0 
    ? Math.round(filtered.reduce((sum, p) => sum + p.confidence, 0) / filtered.length * 100)
    : 0;

  // Build chart data for each type
  const buildChartData = (items: any[]) => {
    return items.slice(0, 15).map((p, i) => ({
      day: `D+${i + 1}`,
      value: Math.round(p.predicted_value * 100) / 100,
      lower: Math.round(p.lower_bound * 100) / 100,
      upper: Math.round(p.upper_bound * 100) / 100,
      confidence: Math.round(p.confidence * 100),
    }));
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-purple-400" />
              Prediction Center
            </h1>
            <p className="text-zinc-400 text-sm mt-1">AI-powered workforce forecasting with confidence intervals</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Forecast horizon:</span>
            {HORIZON_OPTIONS.map(h => (
              <button key={h.value} onClick={() => setHorizon(h.value)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${horizon === h.value ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Forecasts", value: loading ? "—" : predictions.length, icon: Compass, color: "purple" },
            { label: "Avg Confidence", value: loading ? "—" : `${avgConfidence}%`, icon: Target, color: "green" },
            { label: "Forecast Horizon", value: `${horizon}d`, icon: Calendar, color: "cyan" },
            { label: "Forecast Types", value: loading ? "—" : Object.keys(typeConfig).filter(t => grouped[t]).length, icon: Activity, color: "amber" },
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

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-400">Filter by type:</span>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${typeFilter === t ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {t === "ALL" ? "All Types" : (typeConfig[t]?.label || t)}
            </button>
          ))}
        </div>

        {/* Charts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 h-64 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4" />
                <div className="h-full bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center text-zinc-500">
            <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No predictions found for this horizon. Try a different time range.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(grouped).map(([type, items]) => {
              const config = typeConfig[type] || { label: type, color: "#a855f7", icon: Activity, unit: "" };
              const chartData = buildChartData(items);
              const lastVal = items[items.length - 1]?.predicted_value;
              const firstVal = items[0]?.predicted_value;
              const trend = lastVal > firstVal;
              return (
                <div key={type} className="glass-card rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" style={{ color: config.color }} />
                      <h3 className="text-sm font-semibold text-white">{config.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{items.length} data points</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${trend ? "text-red-400" : "text-green-400"}`}>
                        {trend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(((lastVal - firstVal) / Math.max(firstVal, 0.01)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, color: "#fff", fontSize: 12 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((v: any, name: any) => [
                          `${v}${config.unit}`,
                          name === "value" ? "Predicted" : name === "upper" ? "Upper Bound" : "Lower Bound"
                        ]) as any}
                      />
                      <Line dataKey="upper" stroke={config.color} strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.4} />
                      <Line dataKey="lower" stroke={config.color} strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.4} />
                      <Line dataKey="value" stroke={config.color} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                    <span>Current: <span className="text-white font-medium">{firstVal?.toFixed(1)}{config.unit}</span></span>
                    <span>Projected: <span className="text-white font-medium">{lastVal?.toFixed(1)}{config.unit}</span></span>
                    <span>Confidence: <span className="text-green-400 font-medium">{Math.round((items[0]?.confidence || 0) * 100)}%</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed Table */}
        {filtered.length > 0 && (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Detailed Forecast Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Type", "Predicted Value", "Lower Bound", "Upper Bound", "Confidence", "Created"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.slice(0, 50).map(p => {
                    const cfg = typeConfig[p.target_type] || { label: p.target_type, color: "#a855f7", unit: "" };
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-zinc-300">{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-white">{p.predicted_value?.toFixed(2)}{cfg.unit}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{p.lower_bound?.toFixed(2)}{cfg.unit}</td>
                        <td className="px-4 py-3 text-sm text-zinc-400">{p.upper_bound?.toFixed(2)}{cfg.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${(p.confidence || 0) * 100}%` }} />
                            </div>
                            <span className="text-xs text-green-400">{Math.round((p.confidence || 0) * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{p.created_at?.slice(0, 10) || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
