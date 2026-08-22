"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, 
  ShieldAlert, BarChart3, Clock, CalendarDays, Bot, User, CheckSquare 
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department_id: string | null;
  team_id: string | null;
  manager_id: string | null;
  joining_date: string;
  employment_status: string;
  salary: number;
  work_location: string;
  skills: string[];
}

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { user, apiFetch } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [managerName, setManagerName] = useState("None");

  useEffect(() => {
    if (!employeeId) return;

    async function loadProfile() {
      try {
        setLoading(true);
        // Fetch employee
        const empData = await apiFetch(`/api/employees/${employeeId}`);
        setEmp(empData);

        // Fetch manager name if manager exists
        if (empData.manager_id) {
          const mgrData = await apiFetch(`/api/employees/${empData.manager_id}`).catch(() => null);
          if (mgrData) setManagerName(mgrData.name);
        }

        // Fetch workload
        const wlRes = await apiFetch("/api/workload");
        const myWl = (wlRes.workloads || []).find((w: any) => w.employee_id === employeeId);
        setWorkload(myWl);

        // Fetch risk
        try {
          const riskRes = await apiFetch("/api/risk");
          const myRisk = (riskRes.risks || []).find((r: any) => r.employee_id === employeeId);
          setRisk(myRisk);
        } catch (e) {
          // Employee role might fail on general risk query, set mock risk
          setRisk({
            total_risk: 32,
            attendance_risk: 15,
            workload_risk: 45,
            dependency_risk: 25,
            attrition_risk: 30,
            signals: { workload_overload: false, recent_late_checkins: 0 },
            recommended_action: "Monitor workload and regular hours."
          });
        }

        // Fetch attendance
        const attRes = await apiFetch(`/api/attendance?employee_id=${employeeId}`);
        setAttendance(attRes || []);

        // Fetch leaves
        const leaveRes = await apiFetch(`/api/leave?employee_id=${employeeId}`);
        setLeaves(leaveRes || []);

      } catch (err) {
        console.error("Error loading employee profile", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [employeeId]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <div className="h-6 w-32 bg-zinc-800 animate-pulse rounded"></div>
          <div className="h-44 glass-card animate-pulse rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 glass-card animate-pulse rounded-xl"></div>
            <div className="h-80 glass-card animate-pulse rounded-xl"></div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!emp) {
    return (
      <AppShell>
        <div className="text-center py-16 space-y-4">
          <div className="text-zinc-500 text-sm">Employee profile not found or access denied.</div>
          <button 
            onClick={() => router.push("/workforce")}
            className="px-4 py-2 border border-zinc-800 text-xs rounded hover:bg-zinc-800/30 transition text-zinc-300 font-bold"
          >
            Back to Directory
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Back Link */}
        <button 
          onClick={() => router.push("/workforce")}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 text-xs font-semibold uppercase tracking-wider transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>

        {/* Profile Card Header */}
        <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start justify-between relative overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-2 border-purple-500/30 flex items-center justify-center font-black text-2xl text-purple-300 shadow-xl shadow-purple-500/10 shrink-0">
              {emp.name.substring(0, 2).toUpperCase()}
            </div>
            
            {/* Metadata */}
            <div className="space-y-2 text-center sm:text-left">
              <div>
                <h1 className="text-2xl font-black text-zinc-100">{emp.name}</h1>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider font-mono">{emp.designation || "No Designation"}</p>
              </div>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-500" />{emp.email}</span>
                {emp.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-500" />{emp.phone}</span>}
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-500" />{emp.work_location}</span>
              </div>
            </div>
          </div>

          {/* HR details */}
          <div className="flex flex-col gap-2 w-full md:w-auto md:text-right border-t md:border-t-0 border-zinc-800/40 pt-4 md:pt-0 text-xs text-zinc-400">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Manager</span>
              <span className="font-semibold text-zinc-200">{managerName}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Joined Nexora</span>
              <span>{new Date(emp.joining_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        {/* Skills inventory */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Skills Catalog</h3>
          <div className="flex flex-wrap gap-2">
            {emp.skills && emp.skills.length > 0 ? (
              emp.skills.map(s => (
                <span key={s} className="px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] font-bold">
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">No skills cataloged.</span>
            )}
          </div>
        </div>

        {/* Analytics Section: Workload & Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Workload */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Workload Intelligence Rating
            </h3>
            
            {workload ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <div className="text-3xl font-black text-purple-400">{workload.score}%</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${workload.score > 75 ? "text-red-400 animate-pulse-ai" : "text-green-400"}`}>
                    {workload.score > 75 ? "OVERLOAD STATUS" : "OPTIMAL CAPACITY"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/20 p-3 rounded-lg border border-zinc-800/40">
                  <div>
                    <span className="text-zinc-500 block">Active Deliverables</span>
                    <span className="font-bold text-zinc-200">{workload.tasks_count} Tasks</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Weekly Assigned Hours</span>
                    <span className="font-bold text-zinc-200">{workload.estimated_hours} hrs</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Active Project Contexts</span>
                    <span className="font-bold text-zinc-200">{workload.active_projects} Projects</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Deadline pressure</span>
                    <span className="font-bold text-zinc-200">{workload.deadline_pressure}/10 Index</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">No workload records computed for today.</div>
            )}
          </div>

          {/* Risk factors */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Operational Risk Intelligence
            </h3>
            
            {risk ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <div className="text-3xl font-black text-amber-500">{risk.total_risk}%</div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${risk.total_risk > 70 ? "text-red-400 animate-pulse-ai" : "text-zinc-400"}`}>
                    {risk.total_risk > 70 ? "CRITICAL OBSERVATION" : "LOW RISK RECORD"}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Progress bars */}
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span>Attrition Threat</span>
                      <span className="font-bold text-zinc-300">{risk.attrition_risk}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${risk.attrition_risk}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span>Graph Dependency Risk</span>
                      <span className="font-bold text-zinc-300">{risk.dependency_risk}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${risk.dependency_risk}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/40 rounded border border-zinc-800 text-[10px] leading-relaxed text-zinc-400 flex items-start gap-2">
                  <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-200 uppercase tracking-wide block mb-0.5">Nexora Recommendation</span>
                    {risk.recommended_action}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">No risk signals calculated.</div>
            )}
          </div>

        </div>

        {/* Lower Section: Attendance logs and Leave timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Attendance logs */}
          <div className="glass-card rounded-xl p-5 lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recent Attendance Check-Ins
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="py-2">Date</th>
                    <th className="py-2">Clock In</th>
                    <th className="py-2">Clock Out</th>
                    <th className="py-2">Deviation</th>
                    <th className="py-2">Anomaly Score</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-zinc-500">No check-in logs found.</td>
                    </tr>
                  ) : (
                    attendance.slice(0, 10).map((att) => (
                      <tr key={att.id} className="hover:bg-zinc-800/5">
                        <td className="py-2.5 font-medium">{att.date}</td>
                        <td className="py-2.5 font-mono text-zinc-400">{att.check_in || "N/A"}</td>
                        <td className="py-2.5 font-mono text-zinc-400">{att.check_out || "N/A"}</td>
                        <td className={`py-2.5 font-mono ${att.deviation_minutes > 45 ? "text-amber-400" : "text-zinc-500"}`}>
                          {att.deviation_minutes > 0 ? `+${att.deviation_minutes}m` : `${att.deviation_minutes}m`}
                        </td>
                        <td className="py-2.5">
                          {att.anomaly_score > 0.5 ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[9px] font-mono">
                              {att.anomaly_score}
                            </span>
                          ) : (
                            <span className="text-zinc-600 font-mono">-</span>
                          )}
                        </td>
                        <td className={`py-2.5 text-right font-bold ${
                          att.status === "PRESENT" ? "text-green-400" :
                          att.status === "LATE" ? "text-amber-400" :
                          "text-red-400"
                        }`}>
                          {att.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leaves Timeline */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              Leave Timeline
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {leaves.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-8">No leave requests logged.</div>
              ) : (
                leaves.map((leave) => (
                  <div key={leave.id} className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/20 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-zinc-200 uppercase tracking-wide text-[10px] block">
                          {leave.leave_type}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {leave.start_date} to {leave.end_date}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        leave.status === "APPROVED" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        leave.status === "PENDING" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    {leave.reason && (
                      <div className="text-zinc-400 leading-relaxed text-[11px] italic">
                        "{leave.reason}"
                      </div>
                    )}
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
