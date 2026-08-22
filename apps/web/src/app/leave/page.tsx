"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, Clock, CheckCircle, XCircle, AlertTriangle, Plus, User, Filter } from "lucide-react";

export default function LeavePage() {
  const { apiFetch, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leave_type: "CASUAL",
    start_date: "",
    end_date: "",
    reason: ""
  });

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch("/api/leave?limit=200");
      const list: any[] = Array.isArray(res) ? res : [];
      setLeaves(list);
      setStats({
        total: list.length,
        pending: list.filter(l => l.status === "PENDING").length,
        approved: list.filter(l => l.status === "APPROVED").length,
        rejected: list.filter(l => l.status === "REJECTED").length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch("/api/leave", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ leave_type: "CASUAL", start_date: "", end_date: "", reason: "" });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(leaveId: string) {
    try {
      await apiFetch(`/api/leave/${leaveId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED", comments: "Approved via Nexora dashboard" })
      });
      await load();
    } catch (e) { console.error(e); }
  }

  async function handleReject(leaveId: string) {
    try {
      await apiFetch(`/api/leave/${leaveId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", comments: "Rejected via Nexora dashboard" })
      });
      await load();
    } catch (e) { console.error(e); }
  }

  const filtered = leaves.filter(l => {
    if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
    if (filterType !== "ALL" && l.leave_type !== filterType) return false;
    return true;
  });

  const statusColor = (s: string) => {
    if (s === "APPROVED") return "text-green-400 bg-green-400/10";
    if (s === "REJECTED") return "text-red-400 bg-red-400/10";
    return "text-amber-400 bg-amber-400/10";
  };

  const typeColor = (t: string) => {
    const map: Record<string, string> = {
      SICK: "text-red-400 bg-red-400/10",
      CASUAL: "text-blue-400 bg-blue-400/10",
      VACATION: "text-purple-400 bg-purple-400/10",
      MATERNITY: "text-pink-400 bg-pink-400/10",
      UNPAID: "text-zinc-400 bg-zinc-400/10",
    };
    return map[t] || "text-zinc-400 bg-zinc-400/10";
  };

  const daysDiff = (start: string, end: string) => {
    const s = new Date(start), e = new Date(end);
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  };

  const isHR = user?.role && ["HR_ADMIN", "HR_MANAGER", "SUPER_ADMIN"].includes(user.role);

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-purple-400" />
              Leave Management
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Manage and track employee leave requests</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Requests", value: stats.total, icon: CalendarDays, color: "purple" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "amber" },
            { label: "Approved", value: stats.approved, icon: CheckCircle, color: "green" },
            { label: "Rejected", value: stats.rejected, icon: XCircle, color: "red" },
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
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-zinc-500" />
          <div className="flex gap-2">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${filterStatus === f ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                {f === "ALL" ? "All Status" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {["ALL", "SICK", "CASUAL", "VACATION", "MATERNITY", "UNPAID"].map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${filterType === t ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
                {t === "ALL" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500 ml-auto">{filtered.length} requests</span>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Employee", "Leave Type", "Duration", "Dates", "Status", "Reason", isHR ? "Actions" : ""].filter(Boolean).map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No leave requests found</td></tr>
                ) : (
                  filtered.map(l => (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <span className="text-sm text-white">{l.employee_name || l.employee_id?.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(l.leave_type)}`}>
                          {l.leave_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {daysDiff(l.start_date, l.end_date)} day{daysDiff(l.start_date, l.end_date) !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {l.start_date} → {l.end_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(l.status)}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 max-w-xs truncate">{l.reason || "—"}</td>
                      {isHR && (
                        <td className="px-4 py-3">
                          {l.status === "PENDING" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprove(l.id)}
                                className="px-2 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs transition-all">
                                Approve
                              </button>
                              <button onClick={() => handleReject(l.id)}
                                className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-all">
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Request Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-panel rounded-2xl p-6 w-full max-w-md border border-zinc-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-400" />
                Request Leave
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Leave Type</label>
                  <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm">
                    {["SICK", "CASUAL", "VACATION", "MATERNITY", "UNPAID"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
                    <input type="date" required value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">End Date</label>
                    <input type="date" required value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Reason</label>
                  <textarea rows={3} required value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm resize-none"
                    placeholder="Briefly explain your leave reason..." />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
